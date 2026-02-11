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

    // Get SendGrid API key
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@ageempower.example';

    if (!sendgridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    // Prepare SendGrid API request
    const emailPayload = {
      personalizations: [
        {
          to: [{ email: delivery.recipient_contact }],
          subject: delivery.subject || 'Notification from AgeEmpower',
        },
      ],
      from: { email: fromEmail },
      content: [
        {
          type: 'text/plain',
          value: delivery.body || 'You have a new notification.',
        },
      ],
    };

    // Call SendGrid API
    const startTime = Date.now();
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });
    const latency = Date.now() - startTime;

    // SendGrid returns 202 Accepted for successful queuing
    if (response.status !== 202) {
      const errorText = await response.text();

      // Log failed request to ledger
      await supabase
        .from('integration_requests')
        .insert({
          agency_id: delivery.agency_id,
          provider_type: 'email',
          provider_name: 'sendgrid',
          request_type: 'send_email',
          request_payload: { delivery_id, to: delivery.recipient_contact },
          response_status: response.status,
          error_message: errorText,
          latency_ms: latency,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
        });

      // Update provider health to failed
      await supabase.rpc('update_provider_health', {
        p_provider_name: 'sendgrid',
        p_agency_id: delivery.agency_id,
        p_health_status: 'failed',
        p_last_failure_at: new Date().toISOString(),
      }).catch(console.error);

      throw new Error(`SendGrid API error (${response.status}): ${errorText}`);
    }

    // Extract message ID from response headers
    const messageId = response.headers.get('x-message-id') || 'sendgrid-' + Date.now();

    // Update delivery with message ID
    const { error: updateError } = await supabase
      .from('notification_deliveries')
      .update({
        provider_message_id: messageId, // SendGrid message ID
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider_response: { message_id: messageId, status: 'accepted' },
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
        provider_type: 'email',
        provider_name: 'sendgrid',
        request_type: 'send_email',
        provider_request_id: messageId, // SendGrid message ID
        request_payload: { delivery_id, to: delivery.recipient_contact },
        response_payload: { message_id: messageId },
        response_status: 202,
        latency_ms: latency,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
      });

    if (ledgerError) {
      console.error('Failed to log to ledger:', ledgerError);
    }

    // Update provider health to healthy
    await supabase.rpc('update_provider_health', {
      p_provider_name: 'sendgrid',
      p_agency_id: delivery.agency_id,
      p_health_status: 'healthy',
      p_last_success_at: new Date().toISOString(),
    }).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        delivery_id,
        message_id: messageId,
        latency_ms: latency,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Email delivery error:', error);

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
