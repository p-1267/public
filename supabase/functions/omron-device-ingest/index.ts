import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Device-Id",
};

interface OmronDevicePayload {
  device_id: string;
  agency_id: string;
  resident_id: string;
  device_info: {
    model: string;
    serial_number: string;
    firmware_version: string;
    battery_level?: number;
  };
  measurements: Array<{
    measurement_type: 'blood_pressure' | 'weight' | 'temperature' | 'glucose';
    timestamp: string;
    values: {
      systolic?: number;
      diastolic?: number;
      pulse?: number;
      weight?: number;
      body_fat_percentage?: number;
      temperature?: number;
      glucose?: number;
      irregular_heartbeat?: boolean;
    };
    unit: string;
    measurement_id?: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const payload: OmronDevicePayload = await req.json();

    if (!payload.device_id || !payload.agency_id || !payload.resident_id || !payload.measurements) {
      throw new Error('Invalid Omron payload: missing required fields');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const providerRequestId = `omron-${payload.device_id}-${Date.now()}`;

    const { data: requestLog, error: requestError } = await supabase
      .from('integration_requests')
      .insert({
        agency_id: payload.agency_id,
        provider_type: 'medical_device',
        provider_name: 'omron',
        request_type: 'device_sync',
        provider_request_id: providerRequestId,
        request_payload: { device_id: payload.device_id, measurement_count: payload.measurements.length },
        started_at: new Date(startTime).toISOString(),
      })
      .select('id')
      .single();

    if (requestError) {
      throw new Error(`Failed to log integration request: ${requestError.message}`);
    }

    const { data: deviceRecord, error: deviceError } = await supabase
      .from('device_registry')
      .upsert({
        device_id: payload.device_id,
        resident_id: payload.resident_id,
        device_type: 'BLE_HEALTH_SENSOR',
        device_name: `Omron ${payload.device_info.model}`,
        manufacturer: 'Omron',
        model: payload.device_info.model,
        serial_number: payload.device_info.serial_number,
        firmware_version: payload.device_info.firmware_version,
        battery_level: payload.device_info.battery_level,
        trust_state: 'TRUSTED',
        capabilities: {
          medical_grade: true,
          measurement_types: payload.measurements.map(m => m.measurement_type),
        },
        last_seen_at: new Date().toISOString(),
        real_device_verified: true,
      }, { onConflict: 'device_id' })
      .select('id')
      .single();

    if (deviceError) {
      throw new Error(`Failed to register device: ${deviceError.message}`);
    }

    let metricsProcessed = 0;

    for (const measurement of payload.measurements) {
      const metricsToInsert = [];

      if (measurement.measurement_type === 'blood_pressure') {
        if (measurement.values.systolic) {
          metricsToInsert.push({
            resident_id: payload.resident_id,
            device_registry_id: deviceRecord.id,
            metric_category: 'BLOOD_PRESSURE',
            metric_type: 'systolic',
            value_numeric: measurement.values.systolic,
            unit: 'mmHg',
            confidence_level: 'HIGH',
            measurement_source: 'AUTOMATIC_DEVICE',
            recorded_at: measurement.timestamp,
            device_firmware_version: payload.device_info.firmware_version,
            device_battery_level: payload.device_info.battery_level,
            raw_data: {
              measurement_id: measurement.measurement_id,
              irregular_heartbeat: measurement.values.irregular_heartbeat,
            },
            data_source: 'REAL_DEVICE',
          });
        }

        if (measurement.values.diastolic) {
          metricsToInsert.push({
            resident_id: payload.resident_id,
            device_registry_id: deviceRecord.id,
            metric_category: 'BLOOD_PRESSURE',
            metric_type: 'diastolic',
            value_numeric: measurement.values.diastolic,
            unit: 'mmHg',
            confidence_level: 'HIGH',
            measurement_source: 'AUTOMATIC_DEVICE',
            recorded_at: measurement.timestamp,
            device_firmware_version: payload.device_info.firmware_version,
            device_battery_level: payload.device_info.battery_level,
            raw_data: {
              measurement_id: measurement.measurement_id,
              irregular_heartbeat: measurement.values.irregular_heartbeat,
            },
            data_source: 'REAL_DEVICE',
          });
        }

        if (measurement.values.pulse) {
          metricsToInsert.push({
            resident_id: payload.resident_id,
            device_registry_id: deviceRecord.id,
            metric_category: 'CARDIOVASCULAR',
            metric_type: 'heart_rate',
            value_numeric: measurement.values.pulse,
            unit: 'bpm',
            confidence_level: 'HIGH',
            measurement_source: 'AUTOMATIC_DEVICE',
            recorded_at: measurement.timestamp,
            device_firmware_version: payload.device_info.firmware_version,
            device_battery_level: payload.device_info.battery_level,
            raw_data: {
              measurement_id: measurement.measurement_id,
              irregular_heartbeat: measurement.values.irregular_heartbeat,
            },
            data_source: 'REAL_DEVICE',
          });
        }
      }

      if (measurement.measurement_type === 'weight' && measurement.values.weight) {
        metricsToInsert.push({
          resident_id: payload.resident_id,
          device_registry_id: deviceRecord.id,
          metric_category: 'BODY_COMPOSITION',
          metric_type: 'weight',
          value_numeric: measurement.values.weight,
          unit: measurement.unit,
          confidence_level: 'HIGH',
          measurement_source: 'AUTOMATIC_DEVICE',
          recorded_at: measurement.timestamp,
          device_firmware_version: payload.device_info.firmware_version,
          raw_data: {
            measurement_id: measurement.measurement_id,
            body_fat_percentage: measurement.values.body_fat_percentage,
          },
          data_source: 'REAL_DEVICE',
        });
      }

      if (measurement.measurement_type === 'temperature' && measurement.values.temperature) {
        metricsToInsert.push({
          resident_id: payload.resident_id,
          device_registry_id: deviceRecord.id,
          metric_category: 'VITAL_SIGNS',
          metric_type: 'temperature',
          value_numeric: measurement.values.temperature,
          unit: measurement.unit,
          confidence_level: 'HIGH',
          measurement_source: 'AUTOMATIC_DEVICE',
          recorded_at: measurement.timestamp,
          device_firmware_version: payload.device_info.firmware_version,
          raw_data: { measurement_id: measurement.measurement_id },
          data_source: 'REAL_DEVICE',
        });
      }

      if (measurement.measurement_type === 'glucose' && measurement.values.glucose) {
        metricsToInsert.push({
          resident_id: payload.resident_id,
          device_registry_id: deviceRecord.id,
          metric_category: 'METABOLIC',
          metric_type: 'glucose',
          value_numeric: measurement.values.glucose,
          unit: measurement.unit,
          confidence_level: 'HIGH',
          measurement_source: 'AUTOMATIC_DEVICE',
          recorded_at: measurement.timestamp,
          device_firmware_version: payload.device_info.firmware_version,
          raw_data: { measurement_id: measurement.measurement_id },
          data_source: 'REAL_DEVICE',
        });
      }

      if (metricsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('health_metrics')
          .insert(metricsToInsert);

        if (!insertError) {
          metricsProcessed += metricsToInsert.length;
        }
      }

      await supabase
        .from('device_data_events')
        .insert({
          device_registry_id: deviceRecord.id,
          resident_id: payload.resident_id,
          event_type: 'MEASUREMENT_RECEIVED',
          event_data: {
            measurement_type: measurement.measurement_type,
            measurement_id: measurement.measurement_id,
            values: measurement.values,
          },
          occurred_at: measurement.timestamp,
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
      .eq('id', requestLog.id);

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'omron',
        device_id: payload.device_id,
        measurements_processed: payload.measurements.length,
        metrics_created: metricsProcessed,
        latency_ms: latency,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Omron device ingest error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        provider: 'omron',
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
