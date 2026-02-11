import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Fitbit-Signature",
};

interface FitbitNotification {
  collectionType: string;
  date: string;
  ownerId: string;
  ownerType: string;
  subscriptionId: string;
}

interface FitbitUserMapping {
  fitbit_user_id: string;
  agency_id: string;
  resident_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const verify = url.searchParams.get('verify');
    if (verify) {
      return new Response(verify, {
        status: 204,
        headers: corsHeaders,
      });
    }
  }

  const startTime = Date.now();

  try {
    const notifications: FitbitNotification[] = await req.json();

    if (!Array.isArray(notifications)) {
      throw new Error('Invalid Fitbit payload: expected array of notifications');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let totalProcessed = 0;

    for (const notification of notifications) {
      const { data: userMapping, error: mappingError } = await supabase
        .from('external_user_mappings')
        .select('agency_id, resident_id')
        .eq('provider_type', 'fitbit')
        .eq('external_user_id', notification.ownerId)
        .single();

      if (mappingError || !userMapping) {
        console.warn(`No mapping found for Fitbit user ${notification.ownerId}`);
        continue;
      }

      const providerRequestId = `fitbit-${notification.ownerId}-${notification.collectionType}-${Date.now()}`;

      const { data: requestLog, error: requestError } = await supabase
        .from('integration_requests')
        .insert({
          agency_id: userMapping.agency_id,
          provider_type: 'health_platform',
          provider_name: 'fitbit',
          request_type: 'notification',
          provider_request_id: providerRequestId,
          request_payload: notification,
          started_at: new Date(startTime).toISOString(),
        })
        .select('id')
        .single();

      if (requestError) {
        console.error('Failed to log request:', requestError);
        continue;
      }

      const fitbitAccessToken = Deno.env.get('FITBIT_ACCESS_TOKEN');
      if (!fitbitAccessToken) {
        throw new Error('Fitbit access token not configured');
      }

      const apiEndpoints: Record<string, string> = {
        'activities': `https://api.fitbit.com/1/user/${notification.ownerId}/activities/date/${notification.date}.json`,
        'sleep': `https://api.fitbit.com/1.2/user/${notification.ownerId}/sleep/date/${notification.date}.json`,
        'body': `https://api.fitbit.com/1/user/${notification.ownerId}/body/date/${notification.date}.json`,
      };

      const endpoint = apiEndpoints[notification.collectionType];
      if (!endpoint) {
        console.warn(`Unknown collection type: ${notification.collectionType}`);
        continue;
      }

      const fitbitResponse = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${fitbitAccessToken}`,
        },
      });

      if (!fitbitResponse.ok) {
        throw new Error(`Fitbit API error: ${fitbitResponse.statusText}`);
      }

      const fitbitData = await fitbitResponse.json();

      const { data: deviceRecord } = await supabase
        .from('device_registry')
        .upsert({
          device_id: `fitbit-${notification.ownerId}`,
          resident_id: userMapping.resident_id,
          device_type: 'BLE_HEALTH_SENSOR',
          device_name: 'Fitbit Device',
          manufacturer: 'Fitbit',
          model: 'Unknown',
          trust_state: 'TRUSTED',
          capabilities: { fitbit_sync: true, collections: [notification.collectionType] },
          last_seen_at: new Date().toISOString(),
          real_device_verified: true,
        }, { onConflict: 'device_id' })
        .select('id')
        .single();

      if (deviceRecord) {
        if (notification.collectionType === 'activities' && fitbitData.summary) {
          await supabase.from('health_metrics').insert({
            resident_id: userMapping.resident_id,
            device_registry_id: deviceRecord.id,
            metric_category: 'ACTIVITY',
            metric_type: 'steps',
            value_numeric: fitbitData.summary.steps || 0,
            unit: 'steps',
            confidence_level: 'HIGH',
            measurement_source: 'AUTOMATIC_DEVICE',
            recorded_at: notification.date,
            raw_data: fitbitData,
            data_source: 'REAL_DEVICE',
          });
          totalProcessed++;
        }

        if (notification.collectionType === 'sleep' && fitbitData.sleep && fitbitData.sleep.length > 0) {
          const sleepMinutes = fitbitData.sleep[0].minutesAsleep;
          await supabase.from('health_metrics').insert({
            resident_id: userMapping.resident_id,
            device_registry_id: deviceRecord.id,
            metric_category: 'SLEEP',
            metric_type: 'sleep_duration',
            value_numeric: sleepMinutes / 60,
            unit: 'hours',
            confidence_level: 'HIGH',
            measurement_source: 'AUTOMATIC_DEVICE',
            recorded_at: notification.date,
            raw_data: fitbitData,
            data_source: 'REAL_DEVICE',
          });
          totalProcessed++;
        }
      }

      const latency = Date.now() - startTime;

      await supabase
        .from('integration_requests')
        .update({
          response_payload: { fitbit_data: fitbitData, metrics_processed: totalProcessed },
          response_status: 200,
          latency_ms: latency,
          completed_at: new Date().toISOString(),
        })
        .eq('id', requestLog.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'fitbit',
        notifications_processed: notifications.length,
        metrics_processed: totalProcessed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Fitbit webhook error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        provider: 'fitbit',
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
