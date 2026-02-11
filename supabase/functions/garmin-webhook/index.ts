import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GarminWebhookPayload {
  userAccessToken: string;
  summaries: Array<{
    userId: string;
    userAccessToken: string;
    summaryId: string;
    calendarDate: string;
    startTimeInSeconds: number;
    startTimeOffsetInSeconds: number;
    activityType: string;
    durationInSeconds: number;
    distanceInMeters?: number;
    steps?: number;
    activeKilocalories?: number;
    averageHeartRateInBeatsPerMinute?: number;
    maxHeartRateInBeatsPerMinute?: number;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const payload: GarminWebhookPayload = await req.json();

    if (!payload.summaries || !Array.isArray(payload.summaries)) {
      throw new Error('Invalid Garmin payload: missing summaries array');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let totalProcessed = 0;

    for (const summary of payload.summaries) {
      const { data: userMapping, error: mappingError } = await supabase
        .from('external_user_mappings')
        .select('agency_id, resident_id')
        .eq('provider_type', 'garmin')
        .eq('external_user_id', summary.userId)
        .single();

      if (mappingError || !userMapping) {
        console.warn(`No mapping found for Garmin user ${summary.userId}`);
        continue;
      }

      const providerRequestId = `garmin-${summary.userId}-${summary.summaryId}`;

      const { data: requestLog, error: requestError } = await supabase
        .from('integration_requests')
        .insert({
          agency_id: userMapping.agency_id,
          provider_type: 'health_platform',
          provider_name: 'garmin',
          request_type: 'activity_summary',
          provider_request_id: providerRequestId,
          request_payload: summary,
          started_at: new Date(startTime).toISOString(),
        })
        .select('id')
        .single();

      if (requestError) {
        console.error('Failed to log request:', requestError);
        continue;
      }

      const { data: deviceRecord } = await supabase
        .from('device_registry')
        .upsert({
          device_id: `garmin-${summary.userId}`,
          resident_id: userMapping.resident_id,
          device_type: 'BLE_HEALTH_SENSOR',
          device_name: 'Garmin Device',
          manufacturer: 'Garmin',
          model: 'Unknown',
          trust_state: 'TRUSTED',
          capabilities: { garmin_connect: true, activity_types: [summary.activityType] },
          last_seen_at: new Date().toISOString(),
          real_device_verified: true,
        }, { onConflict: 'device_id' })
        .select('id')
        .single();

      if (deviceRecord) {
        const metricsToInsert = [];

        if (summary.steps) {
          metricsToInsert.push({
            resident_id: userMapping.resident_id,
            device_registry_id: deviceRecord.id,
            metric_category: 'ACTIVITY',
            metric_type: 'steps',
            value_numeric: summary.steps,
            unit: 'steps',
            confidence_level: 'HIGH',
            measurement_source: 'AUTOMATIC_DEVICE',
            recorded_at: new Date(summary.startTimeInSeconds * 1000).toISOString(),
            raw_data: summary,
            data_source: 'REAL_DEVICE',
          });
        }

        if (summary.averageHeartRateInBeatsPerMinute) {
          metricsToInsert.push({
            resident_id: userMapping.resident_id,
            device_registry_id: deviceRecord.id,
            metric_category: 'CARDIOVASCULAR',
            metric_type: 'heart_rate',
            value_numeric: summary.averageHeartRateInBeatsPerMinute,
            unit: 'bpm',
            confidence_level: 'HIGH',
            measurement_source: 'AUTOMATIC_DEVICE',
            recorded_at: new Date(summary.startTimeInSeconds * 1000).toISOString(),
            raw_data: summary,
            data_source: 'REAL_DEVICE',
          });
        }

        if (summary.distanceInMeters) {
          metricsToInsert.push({
            resident_id: userMapping.resident_id,
            device_registry_id: deviceRecord.id,
            metric_category: 'ACTIVITY',
            metric_type: 'distance',
            value_numeric: summary.distanceInMeters,
            unit: 'meters',
            confidence_level: 'HIGH',
            measurement_source: 'AUTOMATIC_DEVICE',
            recorded_at: new Date(summary.startTimeInSeconds * 1000).toISOString(),
            raw_data: summary,
            data_source: 'REAL_DEVICE',
          });
        }

        if (metricsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('health_metrics')
            .insert(metricsToInsert);

          if (!insertError) {
            totalProcessed += metricsToInsert.length;
          }
        }

        await supabase
          .from('device_data_events')
          .insert({
            device_registry_id: deviceRecord.id,
            resident_id: userMapping.resident_id,
            event_type: 'ACTIVITY_COMPLETED',
            event_data: {
              activity_type: summary.activityType,
              duration_seconds: summary.durationInSeconds,
              summary_id: summary.summaryId,
            },
            occurred_at: new Date(summary.startTimeInSeconds * 1000).toISOString(),
          });
      }

      const latency = Date.now() - startTime;

      await supabase
        .from('integration_requests')
        .update({
          response_payload: { metrics_processed: totalProcessed },
          response_status: 200,
          latency_ms: latency,
          completed_at: new Date().toISOString(),
        })
        .eq('id', requestLog.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'garmin',
        summaries_processed: payload.summaries.length,
        metrics_processed: totalProcessed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Garmin webhook error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        provider: 'garmin',
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
