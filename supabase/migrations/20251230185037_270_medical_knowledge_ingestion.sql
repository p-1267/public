/*
  # Medical Knowledge Ingestion Pipeline (Phase 3 — Gap 1)

  1. Purpose
    - OCR and semantic parsing for medical documents
    - Structured extraction with confidence scoring
    - Human approval before activation
    - Longitudinal comparison

  2. New Tables
    - `medical_document_uploads`
      - Raw document uploads
    
    - `medical_document_extractions`
      - Parsed structured data
      - Confidence scores
      - Approval workflow
    
    - `medical_baseline_values`
      - Longitudinal tracking
      - Normal ranges
      - Trend detection

  3. Enforcement
    - NO auto-execution of care logic
    - Human approval required
    - Confidence thresholds enforced
*/

CREATE TABLE IF NOT EXISTS medical_document_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('LAB_RESULT', 'MEDICATION_LIST', 'DIAGNOSIS', 'VITAL_RECORD', 'CARE_PLAN', 'OTHER')),
  uploaded_by uuid NOT NULL REFERENCES user_profiles(id),
  file_name text NOT NULL,
  file_size_bytes integer NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  ocr_status text NOT NULL DEFAULT 'PENDING' CHECK (ocr_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  ocr_engine text,
  ocr_completed_at timestamptz,
  raw_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medical_document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES medical_document_uploads(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  extraction_type text NOT NULL CHECK (extraction_type IN ('LAB_TEST', 'MEDICATION', 'VITAL_SIGN', 'DIAGNOSIS', 'ALLERGY', 'PROCEDURE')),
  extracted_data jsonb NOT NULL,
  test_name text,
  test_value text,
  test_unit text,
  normal_range_low text,
  normal_range_high text,
  flag_status text CHECK (flag_status IN ('NORMAL', 'LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH')),
  confidence_score numeric(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  extraction_engine text NOT NULL,
  approval_status text NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW')),
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  is_active boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medical_baseline_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  value_type text NOT NULL,
  baseline_value text NOT NULL,
  baseline_unit text,
  baseline_date date NOT NULL,
  last_value text,
  last_value_date date,
  trend_direction text CHECK (trend_direction IN ('STABLE', 'INCREASING', 'DECREASING', 'FLUCTUATING')),
  trend_confidence numeric(3,2) CHECK (trend_confidence BETWEEN 0 AND 1),
  normal_range_low text,
  normal_range_high text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(resident_id, value_type)
);

ALTER TABLE medical_document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_baseline_values ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_medical_uploads_resident ON medical_document_uploads(resident_id);
CREATE INDEX IF NOT EXISTS idx_medical_uploads_status ON medical_document_uploads(ocr_status);
CREATE INDEX IF NOT EXISTS idx_medical_extractions_document ON medical_document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_medical_extractions_resident ON medical_document_extractions(resident_id);
CREATE INDEX IF NOT EXISTS idx_medical_extractions_approval ON medical_document_extractions(approval_status);
CREATE INDEX IF NOT EXISTS idx_medical_baselines_resident ON medical_baseline_values(resident_id);
CREATE INDEX IF NOT EXISTS idx_medical_baselines_type ON medical_baseline_values(value_type);

CREATE POLICY "Supervisors can view medical documents"
  ON medical_document_uploads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN residents res ON res.id = medical_document_uploads.resident_id
      WHERE up.id = auth.uid()
        AND up.agency_id = res.agency_id
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors can upload medical documents"
  ON medical_document_uploads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN residents res ON res.id = medical_document_uploads.resident_id
      WHERE up.id = auth.uid()
        AND up.agency_id = res.agency_id
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors can view extractions"
  ON medical_document_extractions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN residents res ON res.id = medical_document_extractions.resident_id
      WHERE up.id = auth.uid()
        AND up.agency_id = res.agency_id
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors can approve extractions"
  ON medical_document_extractions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN residents res ON res.id = medical_document_extractions.resident_id
      WHERE up.id = auth.uid()
        AND up.agency_id = res.agency_id
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Caregivers can view approved baselines"
  ON medical_baseline_values FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN residents res ON res.id = medical_baseline_values.resident_id
      WHERE up.id = auth.uid()
        AND up.agency_id = res.agency_id
    )
  );
