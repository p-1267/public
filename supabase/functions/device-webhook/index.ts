import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Parse incoming device payload
    const payload = await req.json();

    // Validate payload has required fields
    if (!payload.device_id || !payload.agency_id) {
      throw new Error('Missing required fields: device_id, agency_id');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const startTime = Date.now();

    // Ingest device data into staging
    const { data: stagingResult, error: stagingError } = await supabase.rpc('ingest_device_data', {
      p_agency_id: payload.agency_id,
      p_device_id: payload.device_id,
      p_resident_id: payload.resident_id || null,
      p_raw_payload: payload,
    });

    if (stagingError) {
      throw new Error(`Failed to ingest device data: ${stagingError.message}`);
    }

    const stagingId = stagingResult;

    // Process device data to vitals
    const { data: vitalsResult, error: vitalsError } = await supabase.rpc('process_device_data_to_vitals', {
      p_staging_id: stagingId,
    });

    if (vitalsError) {
      console.error('Failed to process vitals:', vitalsError);
    }

    const latency = Date.now() - startTime;

    // Log to integration ledger
    const { error: ledgerError } = await supabase
      .from('integration_requests')
      .insert({
        agency_id: payload.agency_id,
        provider_type: 'device',
        provider_name: 'device-webhook',
        request_type: 'ingest_device_data',
        provider_request_id: payload.device_id + '-' + Date.now(),
        request_payload: { staging_id: stagingId, device_id: payload.device_id },
        response_payload: { staging_id: stagingId, vitals_created: vitalsResult?.vitals_created || 0 },
        response_status: 200,
        latency_ms: latency,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
      });

    if (ledgerError) {
      console.error('Failed to log to ledger:', ledgerError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        staging_id: stagingId,
        vitals_created: vitalsResult?.vitals_created || 0,
        latency_ms: latency,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Device webhook error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
