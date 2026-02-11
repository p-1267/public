/*
  # WP8: SMS + Email Notifications (REAL DELIVERY)
  
  NO "sent=true" WITHOUT PROVIDER CONFIRMATION.
  Must track: queued → sent → delivered / failed
  
  1. Notification queue
    - SMS via Twilio (or equivalent)
    - Email via SendGrid (or equivalent)
    - Tracks provider message ID
  
  2. Delivery tracking
    - Provider delivery status
    - Async status updates
    - Delivery webhooks
  
  3. Opt-out & quiet hours
    - Respects user preferences
    - Logs suppression reasons
*/

-- Notification delivery queue
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- 'sms', 'email'
  recipient_type text NOT NULL, -- 'family', 'caregiver', 'supervisor', 'senior'
  recipient_id uuid, -- user_profile id
  recipient_contact text NOT NULL, -- phone or email
  
  -- Content
  subject text,
  body text NOT NULL,
  template_id text,
  template_vars jsonb,
  
  -- Provider tracking
  provider_id uuid REFERENCES integration_providers(id) ON DELETE SET NULL,
  provider_message_id text, -- REQUIRED for real delivery
  
  -- Status lifecycle
  status text NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'failed', 'bounced', 'suppressed'
  status_reason text,
  queued_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  
  -- Cost tracking
  cost_cents int, -- Provider cost (for SMS especially)
  
  -- Related entities
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  resident_id uuid REFERENCES residents(id) ON DELETE SET NULL,
  alert_id uuid, -- Link to intelligence_signals or other alerts
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_deliveries_agency ON notification_deliveries(agency_id, created_at DESC);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status, queued_at DESC);
CREATE INDEX idx_notification_deliveries_provider_msg ON notification_deliveries(provider_message_id);
CREATE INDEX idx_notification_deliveries_recipient ON notification_deliveries(recipient_id);

-- Notification preferences (opt-out, quiet hours)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  -- Preferences
  sms_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  quiet_hours_start time, -- e.g., '22:00'
  quiet_hours_end time, -- e.g., '08:00'
  timezone text DEFAULT 'UTC',
  
  -- Contact info
  preferred_phone text,
  preferred_email text,
  
  -- Opt-out tracking
  sms_opted_out_at timestamptz,
  email_opted_out_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_notification_prefs_user ON notification_preferences(user_id, agency_id);

-- Notification suppression log (why notifications were blocked)
CREATE TABLE IF NOT EXISTS notification_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  suppression_reason text NOT NULL, -- 'opted_out', 'quiet_hours', 'rate_limited', 'invalid_contact'
  would_have_sent_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX idx_notification_suppressions_agency ON notification_suppressions(agency_id, would_have_sent_at DESC);

-- RLS policies
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency's notification deliveries"
  ON notification_deliveries FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can manage notification deliveries"
  ON notification_deliveries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view and update their notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their agency's notification suppressions"
  ON notification_suppressions FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );
