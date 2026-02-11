/*
  # Provider & Pharmacy Messaging System

  1. New Tables
    - `provider_messages` - messages to/from providers and pharmacies
    - `message_attachments_external` - attachments for provider messages
    - `provider_message_templates` - quick message templates

  2. Security
    - Seniors can send messages on their own behalf
    - Family admin can send messages on behalf of resident when authorized
    - All messages are audited
*/

-- Provider messages
CREATE TABLE IF NOT EXISTS provider_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id),
  provider_name text NOT NULL,
  provider_type text NOT NULL CHECK (provider_type IN ('DOCTOR', 'CLINIC', 'PHARMACY', 'LAB', 'IMAGING', 'SPECIALIST', 'HOSPITAL', 'OTHER')),
  direction text NOT NULL CHECK (direction IN ('OUTBOUND', 'INBOUND')),
  subject text NOT NULL,
  message_body text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('APPOINTMENT_REQUEST', 'REFILL_REQUEST', 'QUESTION', 'SYMPTOM_REPORT', 'FOLLOW_UP', 'GENERAL', 'URGENT')),
  is_urgent boolean DEFAULT false,
  sent_by_user_id uuid NOT NULL REFERENCES user_profiles(id),
  sent_on_behalf_of_resident boolean DEFAULT false,
  original_language text,
  translated_message_body text,
  status text NOT NULL DEFAULT 'SENT' CHECK (status IN ('DRAFT', 'SENT', 'DELIVERED', 'READ', 'REPLIED', 'CLOSED')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz,
  parent_message_id uuid REFERENCES provider_messages(id),
  related_appointment_id uuid REFERENCES appointments(id),
  related_medication_id uuid REFERENCES resident_medications(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_messages_resident ON provider_messages(resident_id);
CREATE INDEX idx_provider_messages_provider ON provider_messages(provider_id);
CREATE INDEX idx_provider_messages_status ON provider_messages(status);
CREATE INDEX idx_provider_messages_type ON provider_messages(message_type);
CREATE INDEX idx_provider_messages_sent ON provider_messages(sent_at);

-- Message attachments for provider messages
CREATE TABLE IF NOT EXISTS message_attachments_external (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES provider_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_attachments_external_message ON message_attachments_external(message_id);

-- Quick message templates
CREATE TABLE IF NOT EXISTS provider_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('APPOINTMENT_REQUEST', 'REFILL_REQUEST', 'QUESTION', 'SYMPTOM_REPORT', 'FOLLOW_UP', 'GENERAL', 'URGENT')),
  subject_template text NOT NULL,
  body_template text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_message_templates_agency ON provider_message_templates(agency_id);
CREATE INDEX idx_provider_message_templates_type ON provider_message_templates(message_type);

-- Seed default templates
INSERT INTO provider_message_templates (agency_id, template_name, message_type, subject_template, body_template, sort_order)
SELECT 
  a.id,
  'Request Appointment',
  'APPOINTMENT_REQUEST',
  'Appointment Request',
  'I would like to schedule an appointment. Please let me know your available times.',
  1
FROM agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM provider_message_templates
  WHERE agency_id = a.id AND template_name = 'Request Appointment'
);

INSERT INTO provider_message_templates (agency_id, template_name, message_type, subject_template, body_template, sort_order)
SELECT 
  a.id,
  'Refill Request',
  'REFILL_REQUEST',
  'Medication Refill Request',
  'I need a refill for my medication: [MEDICATION_NAME]. My last refill was on [LAST_REFILL_DATE].',
  2
FROM agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM provider_message_templates
  WHERE agency_id = a.id AND template_name = 'Refill Request'
);

INSERT INTO provider_message_templates (agency_id, template_name, message_type, subject_template, body_template, sort_order)
SELECT 
  a.id,
  'Running Late',
  'GENERAL',
  'Running Late for Appointment',
  'I am running approximately [MINUTES] minutes late for my appointment today. I am on my way.',
  3
FROM agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM provider_message_templates
  WHERE agency_id = a.id AND template_name = 'Running Late'
);

INSERT INTO provider_message_templates (agency_id, template_name, message_type, subject_template, body_template, sort_order)
SELECT 
  a.id,
  'Side Effect Report',
  'SYMPTOM_REPORT',
  'Medication Side Effect',
  'I am experiencing side effects from [MEDICATION_NAME]: [SYMPTOMS]. Please advise.',
  4
FROM agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM provider_message_templates
  WHERE agency_id = a.id AND template_name = 'Side Effect Report'
);

INSERT INTO provider_message_templates (agency_id, template_name, message_type, subject_template, body_template, sort_order)
SELECT 
  a.id,
  'Question About Test Results',
  'FOLLOW_UP',
  'Question About Recent Test Results',
  'I have a question about my recent test results. Could you please explain [SPECIFIC_QUESTION]?',
  5
FROM agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM provider_message_templates
  WHERE agency_id = a.id AND template_name = 'Question About Test Results'
);

-- Enable RLS
ALTER TABLE provider_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments_external ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_message_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_messages
CREATE POLICY "Seniors can view own provider messages"
  ON provider_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM senior_resident_links srl
    WHERE srl.resident_id = provider_messages.resident_id
      AND srl.senior_user_id = auth.uid() AND srl.status = 'active'
  ));

CREATE POLICY "Seniors can send provider messages"
  ON provider_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM senior_resident_links srl
      WHERE srl.resident_id = provider_messages.resident_id
        AND srl.senior_user_id = auth.uid() AND srl.status = 'active'
    )
    AND sent_by_user_id = auth.uid()
    AND sent_on_behalf_of_resident = false
  );

CREATE POLICY "Family can view linked resident provider messages"
  ON provider_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM family_resident_links frl
    WHERE frl.resident_id = provider_messages.resident_id
      AND frl.family_user_id = auth.uid() AND frl.status = 'active'
  ));

CREATE POLICY "Family admin can send messages on behalf when authorized"
  ON provider_messages FOR INSERT TO authenticated
  WITH CHECK (
    check_family_admin_control(auth.uid(), provider_messages.resident_id)
    AND sent_by_user_id = auth.uid()
  );

CREATE POLICY "Agency staff can view resident provider messages"
  ON provider_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN residents r ON r.agency_id = up.agency_id
    WHERE up.id = auth.uid() AND r.id = provider_messages.resident_id
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR'))
  ));

-- RLS Policies for message_attachments_external
CREATE POLICY "View attachments with message access"
  ON message_attachments_external FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM provider_messages pm WHERE pm.id = message_attachments_external.message_id
  ));

CREATE POLICY "Add attachments to own messages"
  ON message_attachments_external FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM provider_messages pm
    WHERE pm.id = message_attachments_external.message_id
      AND pm.sent_by_user_id = auth.uid()
  ));

-- RLS Policies for provider_message_templates
CREATE POLICY "Users can view agency templates"
  ON provider_message_templates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.agency_id = provider_message_templates.agency_id
  ));