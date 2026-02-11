/*
  # WP8: External Integrations - Infrastructure
  
  Creates the foundational tables for REAL external integrations.
  NO STUBS OR MOCKS - All integrations must execute real provider calls.
  
  1. Integration Providers
    - Tracks enabled providers (Twilio, SendGrid, OpenAI, etc.)
    - API keys stored securely
    - Health status
  
  2. Integration Request Ledger
    - Every external call logged
    - Request/response tracking
    - Latency measurement
    - Error capture
  
  3. Integration Health
    - Real-time health per provider
    - Degradation mode tracking
    - Retry backoff state
*/

-- Integration providers (Twilio, SendGrid, OpenAI, etc.)
CREATE TABLE IF NOT EXISTS integration_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  provider_type text NOT NULL, -- 'voice_transcription', 'sms', 'email', 'translation', 'device', 'ehr'
  provider_name text NOT NULL, -- 'openai', 'twilio', 'sendgrid', 'google_translate', etc.
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}', -- API keys, endpoints, etc. (encrypted in production)
  health_status text NOT NULL DEFAULT 'unknown', -- 'healthy', 'degraded', 'failed', 'unknown'
  last_health_check timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_providers_agency ON integration_providers(agency_id);
CREATE INDEX idx_integration_providers_type ON integration_providers(provider_type, enabled);
CREATE INDEX idx_integration_providers_health ON integration_providers(health_status);

-- Integration request ledger (MANDATORY for observability)
CREATE TABLE IF NOT EXISTS integration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES integration_providers(id) ON DELETE SET NULL,
  provider_type text NOT NULL,
  provider_name text NOT NULL,
  request_type text NOT NULL, -- 'transcribe', 'translate', 'send_sms', 'send_email', 'ingest_device_data', etc.
  request_id text, -- Provider's tracking ID
  request_payload jsonb,
  response_status int, -- HTTP status or equivalent
  response_payload jsonb,
  error_message text,
  latency_ms int,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_requests_agency ON integration_requests(agency_id, created_at DESC);
CREATE INDEX idx_integration_requests_provider ON integration_requests(provider_id, created_at DESC);
CREATE INDEX idx_integration_requests_type ON integration_requests(request_type, created_at DESC);
CREATE INDEX idx_integration_requests_status ON integration_requests(response_status);

-- Integration health tracking
CREATE TABLE IF NOT EXISTS integration_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
  check_type text NOT NULL, -- 'ping', 'auth', 'quota'
  status text NOT NULL, -- 'pass', 'fail', 'degraded'
  response_time_ms int,
  error_message text,
  metadata jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_health_provider ON integration_health(provider_id, checked_at DESC);
CREATE INDEX idx_integration_health_status ON integration_health(status, checked_at DESC);

-- RLS policies for integration tables
ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency's integration providers"
  ON integration_providers FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage integration providers"
  ON integration_providers FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their agency's integration requests"
  ON integration_requests FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can create integration requests"
  ON integration_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their agency's integration health"
  ON integration_health FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can create integration health checks"
  ON integration_health FOR INSERT
  TO authenticated
  WITH CHECK (true);
