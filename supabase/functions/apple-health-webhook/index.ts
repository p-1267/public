import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Apple-Signature",
};

interface AppleHealthPayload {
  user_id: string;
  agency_id: string;
  resident_id: string;
  metrics: Array<{
    type: string;
    value: number;
    unit: string;
    start_date: string;
    end_date: string;
    source_name: string;
    source_version: string;
    device?: {
      name: string;
      manufacturer: string;
      model: string;
      hardware: string;
      software: string;
    };
  }>;
  source: {
    name: string;
    version: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const payload: AppleHealthPayload = await req.json();

    if (!payload.agency_id || !payload.resident_id || !payload.metrics || !Array.isArray(payload.metrics)) {
      throw new Error('Invalid Apple Health payload: missing required fields');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const providerRequestId = `apple-health-${payload.user_id}-${Date.now()}`;

    const { data: requestLog, error: requestError } = await supabase
      .from('integration_requests')
      .insert({
        agency_id: payload.agency_id,
        provider_type: 'health_platform',
        provider_name: 'apple_health',
        request_type: 'sync_metrics',
        provider_request_id: providerRequestId,
        request_payload: { user_id: payload.user_id, metric_count: payload.metrics.length },
        started_at: new Date(startTime).toISOString(),
      })
      .select('id')
      .single();

    if (requestError) {
      throw new Error(`Failed to log integration request: ${requestError.message}`);
    }

    const requestId = requestLog.id;
    let metricsProcessed = 0;
    let deviceId: string | null = null;

    for (const metric of payload.metrics) {
      if (metric.device) {
        const { data: deviceRecord, error: deviceError } = await supabase
          .from('device_registry')
          .upsert({
            device_id: `apple-health-${metric.device.hardware || 'unknown'}`,
            resident_id: payload.resident_id,
            device_type: 'BLE_HEALTH_SENSOR',
            device_name: metric.device.name || 'Apple Health Device',
            manufacturer: metric.device.manufacturer || 'Apple',
            model: metric.device.model || 'Unknown',
            firmware_version: metric.device.software || 'unknown',
            trust_state: 'TRUSTED',
            capabilities: { apple_health: true, source: metric.source_name },
            last_seen_at: new Date().toISOString(),
            real_device_verified: true,
          }, { onConflict: 'device_id' })
          .select('id')
          .single();

        if (!deviceError && deviceRecord) {
          deviceId = deviceRecord.id;
        }
      }

      const metricTypeMap: Record<string, { category: string, type: string, unit: string }> = {
        'HKQuantityTypeIdentifierHeartRate': { category: 'CARDIOVASCULAR', type: 'heart_rate', unit: 'bpm' },
        'HKQuantityTypeIdentifierOxygenSaturation': { category: 'BLOOD_CIRCULATION', type: 'spo2', unit: '%' },
        'HKQuantityTypeIdentifierBloodPressureSystolic': { category: 'BLOOD_PRESSURE', type: 'systolic', unit: 'mmHg' },
        'HKQuantityTypeIdentifierBloodPressureDiastolic': { category: 'BLOOD_PRESSURE', type: 'diastolic', unit: 'mmHg' },
        'HKQuantityTypeIdentifierStepCount': { category: 'ACTIVITY', type: 'steps', unit: 'steps' },
        'HKQuantityTypeIdentifierSleepAnalysis': { category: 'SLEEP', type: 'sleep_duration', unit: 'hours' },
        'HKQuantityTypeIdentifierRespiratoryRate': { category: 'CARDIOVASCULAR', type: 'respiratory_rate', unit: 'breaths/min' },
      };

      const mapped = metricTypeMap[metric.type] || { category: 'OTHER', type: metric.type, unit: metric.unit };

      const { error: vitalError } = await supabase
        .from('health_metrics')
        .insert({
          resident_id: payload.resident_id,
          device_registry_id: deviceId,
          metric_category: mapped.category,
          metric_type: mapped.type,
          value_numeric: metric.value,
          unit: mapped.unit,
          confidence_level: 'HIGH',
          measurement_source: 'AUTOMATIC_DEVICE',
          recorded_at: metric.end_date,
          device_firmware_version: metric.source_version,
          raw_data: { apple_health_type: metric.type, source_name: metric.source_name },
          data_source: 'REAL_DEVICE',
        });

      if (!vitalError) {
        metricsProcessed++;
      }

      await supabase
        .from('device_data_events')
        .insert({
          device_registry_id: deviceId,
          resident_id: payload.resident_id,
          event_type: 'METRIC_RECORDED',
          event_data: {
            metric_type: mapped.type,
            value: metric.value,
            unit: mapped.unit,
            source: 'apple_health',
          },
          occurred_at: metric.end_date,
        });
    }

    const latency = Date.now() - startTime;

    await supabase
      .from('integration_requests')
      .update({
        response_payload: { metrics_processed: metricsProcessed },
        response_status: 200,
        latency_ms: latency,
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'apple_health',
        metrics_processed: metricsProcessed,
        request_id: providerRequestId,
        latency_ms: latency,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Apple Health webhook error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        provider: 'apple_health',
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
