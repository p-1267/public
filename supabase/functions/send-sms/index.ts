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
    const { delivery_id } = await req.json();

    if (!delivery_id) {
      throw new Error('delivery_id is required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get delivery details
    const { data: delivery, error: deliveryError } = await supabase
      .from('notification_deliveries')
      .select('*')
      .eq('id', delivery_id)
      .single();

    if (deliveryError || !delivery) {
      throw new Error(`Delivery not found: ${delivery_id}`);
    }

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Prepare Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      To: delivery.recipient_contact,
      From: fromNumber,
      Body: delivery.body || 'Notification from AgeEmpower',
    });

    // Call Twilio API
    const startTime = Date.now();
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();

      // Log failed request to ledger
      await supabase
        .from('integration_requests')
        .insert({
          agency_id: delivery.agency_id,
          provider_type: 'sms',
          provider_name: 'twilio',
          request_type: 'send_sms',
          request_payload: { delivery_id, to: delivery.recipient_contact },
          response_status: response.status,
          error_message: errorText,
          latency_ms: latency,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
        });

      // Update provider health to failed
      await supabase.rpc('update_provider_health', {
        p_provider_name: 'twilio',
        p_agency_id: delivery.agency_id,
        p_health_status: 'failed',
        p_last_failure_at: new Date().toISOString(),
      }).catch(console.error);

      throw new Error(`Twilio API error (${response.status}): ${errorText}`);
    }

    const message = await response.json();

    // Update delivery with real Twilio message SID
    const { error: updateError } = await supabase
      .from('notification_deliveries')
      .update({
        provider_message_id: message.sid, // Real Twilio SID
        status: message.status === 'queued' || message.status === 'sent' ? 'sent' : message.status,
        sent_at: new Date().toISOString(),
        provider_response: message,
      })
      .eq('id', delivery_id);

    if (updateError) {
      console.error('Failed to update delivery:', updateError);
    }

    // Log to integration ledger
    const { error: ledgerError } = await supabase
      .from('integration_requests')
      .insert({
        agency_id: delivery.agency_id,
        provider_type: 'sms',
        provider_name: 'twilio',
        request_type: 'send_sms',
        provider_request_id: message.sid, // Real Twilio message SID
        request_payload: { delivery_id, to: delivery.recipient_contact },
        response_payload: message,
        response_status: 201,
        latency_ms: latency,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
      });

    if (ledgerError) {
      console.error('Failed to log to ledger:', ledgerError);
    }

    // Update provider health to healthy
    await supabase.rpc('update_provider_health', {
      p_provider_name: 'twilio',
      p_agency_id: delivery.agency_id,
      p_health_status: 'healthy',
      p_last_success_at: new Date().toISOString(),
    }).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        delivery_id,
        message_sid: message.sid,
        status: message.status,
        latency_ms: latency,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('SMS delivery error:', error);

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
