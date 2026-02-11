/*
  # Documents & Results Management System

  1. New Tables
    - `document_categories` - types of documents
    - `resident_documents` - uploaded documents and files
    - `document_shares` - sharing permissions per family member
    - `document_access_log` - audit trail of document access

  2. Security
    - Enable RLS on all tables
    - Seniors can view and manage their documents
    - Family can view shared documents
    - Family admin can manage all documents when authorized
*/

-- Document categories
CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default categories
INSERT INTO document_categories (name, description, icon, sort_order) VALUES
  ('Medical Records', 'Doctor notes, discharge summaries, medical history', 'file-medical', 1),
  ('Lab Results', 'Blood work, imaging, test results', 'flask', 2),
  ('Prescriptions', 'Medication prescriptions and refill records', 'pills', 3),
  ('Insurance', 'Insurance cards, claims, EOBs', 'shield', 4),
  ('Legal', 'Advance directives, POA, living will', 'gavel', 5),
  ('Care Plans', 'Care plans, dietary restrictions, protocols', 'clipboard-list', 6),
  ('Invoices', 'Bills, receipts, financial records', 'receipt', 7),
  ('Photos', 'Photos and images', 'camera', 8),
  ('Other', 'Miscellaneous documents', 'folder', 9)
ON CONFLICT (name) DO NOTHING;

-- Resident documents
CREATE TABLE IF NOT EXISTS resident_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  category_id uuid REFERENCES document_categories(id),
  title text NOT NULL,
  description text,
  file_name text NOT NULL,
  file_size integer,
  file_type text,
  storage_path text NOT NULL,
  document_date date,
  related_appointment_id uuid REFERENCES appointments(id),
  related_test_id uuid REFERENCES lab_tests(id),
  tags text[],
  is_sensitive boolean DEFAULT false,
  uploaded_by uuid NOT NULL REFERENCES user_profiles(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_resident_documents_resident ON resident_documents(resident_id);
CREATE INDEX idx_resident_documents_category ON resident_documents(category_id);
CREATE INDEX idx_resident_documents_date ON resident_documents(document_date);
CREATE INDEX idx_resident_documents_tags ON resident_documents USING gin(tags);

-- Document shares (per-family-member permissions)
CREATE TABLE IF NOT EXISTS document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES resident_documents(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES user_profiles(id),
  can_view boolean DEFAULT true,
  can_download boolean DEFAULT true,
  shared_by uuid NOT NULL REFERENCES user_profiles(id),
  shared_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(document_id, shared_with_user_id)
);

CREATE INDEX idx_document_shares_document ON document_shares(document_id);
CREATE INDEX idx_document_shares_user ON document_shares(shared_with_user_id);

-- Document access log
CREATE TABLE IF NOT EXISTS document_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES resident_documents(id) ON DELETE CASCADE,
  accessed_by uuid NOT NULL REFERENCES user_profiles(id),
  access_type text NOT NULL CHECK (access_type IN ('VIEW', 'DOWNLOAD', 'SHARE', 'DELETE')),
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

CREATE INDEX idx_document_access_log_document ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_user ON document_access_log(accessed_by);
CREATE INDEX idx_document_access_log_timestamp ON document_access_log(accessed_at);

-- Enable RLS
ALTER TABLE resident_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resident_documents
CREATE POLICY "Seniors can view own documents"
  ON resident_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM senior_resident_links srl
    WHERE srl.resident_id = resident_documents.resident_id
      AND srl.senior_user_id = auth.uid() AND srl.status = 'active'
  ));

CREATE POLICY "Seniors can manage own documents"
  ON resident_documents FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM senior_resident_links srl
    WHERE srl.resident_id = resident_documents.resident_id
      AND srl.senior_user_id = auth.uid() AND srl.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM senior_resident_links srl
    WHERE srl.resident_id = resident_documents.resident_id
      AND srl.senior_user_id = auth.uid() AND srl.status = 'active'
  ));

CREATE POLICY "Family can view shared documents"
  ON resident_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM document_shares ds
    WHERE ds.document_id = resident_documents.id
      AND ds.shared_with_user_id = auth.uid()
      AND ds.can_view = true
      AND (ds.expires_at IS NULL OR ds.expires_at > now())
  ));

CREATE POLICY "Family admin can manage all documents when authorized"
  ON resident_documents FOR ALL TO authenticated
  USING (check_family_admin_control(auth.uid(), resident_documents.resident_id))
  WITH CHECK (check_family_admin_control(auth.uid(), resident_documents.resident_id));

CREATE POLICY "Agency staff can view resident documents"
  ON resident_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN residents r ON r.agency_id = up.agency_id
    WHERE up.id = auth.uid() AND r.id = resident_documents.resident_id
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR'))
  ));

-- RLS Policies for document_shares
CREATE POLICY "Seniors can manage document shares"
  ON document_shares FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM resident_documents rd
    JOIN senior_resident_links srl ON srl.resident_id = rd.resident_id
    WHERE rd.id = document_shares.document_id
      AND srl.senior_user_id = auth.uid() AND srl.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM resident_documents rd
    JOIN senior_resident_links srl ON srl.resident_id = rd.resident_id
    WHERE rd.id = document_shares.document_id
      AND srl.senior_user_id = auth.uid() AND srl.status = 'active'
  ));

CREATE POLICY "Family admin can manage document shares when authorized"
  ON document_shares FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM resident_documents rd
    WHERE rd.id = document_shares.document_id
      AND check_family_admin_control(auth.uid(), rd.resident_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM resident_documents rd
    WHERE rd.id = document_shares.document_id
      AND check_family_admin_control(auth.uid(), rd.resident_id)
  ));

CREATE POLICY "Users can view their document shares"
  ON document_shares FOR SELECT TO authenticated
  USING (shared_with_user_id = auth.uid());

-- RLS Policies for document_access_log
CREATE POLICY "View access log for accessible documents"
  ON document_access_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM resident_documents rd WHERE rd.id = document_access_log.document_id
  ));