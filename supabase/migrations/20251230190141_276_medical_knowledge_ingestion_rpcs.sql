/*
  # Medical Knowledge Ingestion RPCs (Phase 3)

  1. Purpose
    - Submit documents for OCR processing
    - Approve/reject extractions
    - Update baselines from approved data

  2. Functions
    - `submit_medical_document_for_processing` - Mark document for OCR
    - `approve_medical_extraction` - Approve and activate extraction
    - `reject_medical_extraction` - Reject extraction with reason
    - `update_resident_baseline_from_extraction` - Update baseline values
*/

CREATE OR REPLACE FUNCTION submit_medical_document_for_processing(
  p_document_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE medical_document_uploads
  SET 
    ocr_status = 'PROCESSING',
    ocr_engine = 'TESSERACT_5.0'
  WHERE id = p_document_id
    AND ocr_status = 'PENDING'
  RETURNING jsonb_build_object(
    'document_id', id,
    'status', ocr_status,
    'engine', ocr_engine
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Document not found or already processed';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION approve_medical_extraction(
  p_extraction_id uuid,
  p_approver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_resident_id uuid;
  v_test_name text;
  v_test_value text;
  v_test_unit text;
BEGIN
  UPDATE medical_document_extractions
  SET 
    approval_status = 'APPROVED',
    approved_by = p_approver_id,
    approved_at = now(),
    is_active = true,
    activated_at = now()
  WHERE id = p_extraction_id
    AND approval_status = 'PENDING'
  RETURNING 
    resident_id, test_name, test_value, test_unit,
    jsonb_build_object(
      'extraction_id', id,
      'status', approval_status,
      'activated', is_active
    ) INTO v_resident_id, v_test_name, v_test_value, v_test_unit, v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Extraction not found or already processed';
  END IF;

  IF v_test_name IS NOT NULL AND v_test_value IS NOT NULL THEN
    INSERT INTO medical_baseline_values (
      resident_id,
      value_type,
      baseline_value,
      baseline_unit,
      baseline_date,
      last_value,
      last_value_date
    ) VALUES (
      v_resident_id,
      v_test_name,
      v_test_value,
      v_test_unit,
      CURRENT_DATE,
      v_test_value,
      CURRENT_DATE
    )
    ON CONFLICT (resident_id, value_type) DO UPDATE
    SET
      last_value = EXCLUDED.last_value,
      last_value_date = EXCLUDED.last_value_date,
      updated_at = now();
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION reject_medical_extraction(
  p_extraction_id uuid,
  p_approver_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE medical_document_extractions
  SET 
    approval_status = 'REJECTED',
    approved_by = p_approver_id,
    approved_at = now(),
    rejection_reason = p_reason,
    is_active = false
  WHERE id = p_extraction_id
    AND approval_status = 'PENDING'
  RETURNING jsonb_build_object(
    'extraction_id', id,
    'status', approval_status,
    'reason', rejection_reason
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Extraction not found or already processed';
  END IF;

  RETURN v_result;
END;
$$;
