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
    const { job_id } = await req.json();

    if (!job_id) {
      throw new Error('job_id is required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('voice_transcription_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${job_id}`);
    }

    // Download audio file from Supabase Storage
    const { data: audioFile, error: downloadError } = await supabase.storage
      .from('audio')
      .download(job.audio_storage_path);

    if (downloadError || !audioFile) {
      throw new Error(`Failed to download audio: ${downloadError?.message || 'Unknown error'}`);
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Prepare audio file for OpenAI
    const formData = new FormData();
    formData.append('file', audioFile, job.audio_filename);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json'); // Get more metadata

    // Call OpenAI Whisper API
    const startTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const transcription = await response.json();

    // Extract provider request ID from response headers
    const providerRequestId = response.headers.get('x-request-id') || 'openai-whisper';

    // Update job with real transcript
    const { error: updateError } = await supabase
      .from('voice_transcription_jobs')
      .update({
        status: 'completed',
        transcript_text: transcription.text,
        confidence_score: transcription.confidence || null,
        language_detected: transcription.language || null,
        provider_job_id: providerRequestId,
        provider_response: transcription,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job_id);

    if (updateError) {
      console.error('Failed to update job:', updateError);
    }

    // Log to integration ledger
    const { error: ledgerError } = await supabase
      .from('integration_requests')
      .insert({
        agency_id: job.agency_id,
        provider_type: 'voice_transcription',
        provider_name: 'openai-whisper',
        request_type: 'transcribe_audio',
        provider_request_id: providerRequestId,
        request_payload: { job_id, audio_filename: job.audio_filename },
        response_payload: transcription,
        response_status: 200,
        latency_ms: latency,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
      });

    if (ledgerError) {
      console.error('Failed to log to ledger:', ledgerError);
    }

    // Update provider health to healthy
    await supabase.rpc('update_provider_health', {
      p_provider_name: 'openai-whisper',
      p_agency_id: job.agency_id,
      p_health_status: 'healthy',
      p_last_success_at: new Date().toISOString(),
    }).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        job_id,
        transcript: transcription.text,
        provider_request_id: providerRequestId,
        latency_ms: latency,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Voice transcription error:', error);

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
