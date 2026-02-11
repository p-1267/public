/*
  # Document Management RPCs

  RPC functions for document upload, sharing, and access control
*/

-- Upload document
CREATE OR REPLACE FUNCTION upload_document(
  p_resident_id uuid,
  p_title text,
  p_file_name text,
  p_storage_path text,
  p_category_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_file_size integer DEFAULT NULL,
  p_file_type text DEFAULT NULL,
  p_document_date date DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_is_sensitive boolean DEFAULT false,
  p_auto_share_with_family boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document_id uuid;
  v_family_user_id uuid;
BEGIN
  INSERT INTO resident_documents (
    resident_id, category_id, title, description, file_name,
    file_size, file_type, storage_path, document_date, tags,
    is_sensitive, uploaded_by
  ) VALUES (
    p_resident_id, p_category_id, p_title, p_description, p_file_name,
    p_file_size, p_file_type, p_storage_path, p_document_date, p_tags,
    p_is_sensitive, auth.uid()
  ) RETURNING id INTO v_document_id;

  -- Auto-share with all linked family members if enabled
  IF p_auto_share_with_family THEN
    FOR v_family_user_id IN
      SELECT family_user_id FROM family_resident_links
      WHERE resident_id = p_resident_id AND status = 'active'
    LOOP
      INSERT INTO document_shares (document_id, shared_with_user_id, shared_by)
      VALUES (v_document_id, v_family_user_id, auth.uid())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_document_id;
END;
$$;

-- Share document with specific user
CREATE OR REPLACE FUNCTION share_document(
  p_document_id uuid,
  p_shared_with_user_id uuid,
  p_can_view boolean DEFAULT true,
  p_can_download boolean DEFAULT true,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share_id uuid;
BEGIN
  INSERT INTO document_shares (
    document_id, shared_with_user_id, can_view, can_download,
    shared_by, expires_at
  ) VALUES (
    p_document_id, p_shared_with_user_id, p_can_view, p_can_download,
    auth.uid(), p_expires_at
  )
  ON CONFLICT (document_id, shared_with_user_id)
  DO UPDATE SET
    can_view = p_can_view,
    can_download = p_can_download,
    expires_at = p_expires_at,
    shared_at = now()
  RETURNING id INTO v_share_id;

  RETURN v_share_id;
END;
$$;

-- Revoke document share
CREATE OR REPLACE FUNCTION revoke_document_share(
  p_document_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM document_shares
  WHERE document_id = p_document_id AND shared_with_user_id = p_user_id;

  RETURN FOUND;
END;
$$;

-- Log document access
CREATE OR REPLACE FUNCTION log_document_access(
  p_document_id uuid,
  p_access_type text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO document_access_log (
    document_id, accessed_by, access_type, ip_address, user_agent
  ) VALUES (
    p_document_id, auth.uid(), p_access_type, p_ip_address, p_user_agent
  ) RETURNING id INTO v_log_id;

  -- Update viewed timestamps for test results
  IF p_access_type = 'VIEW' THEN
    UPDATE test_results
    SET viewed_by_senior_at = now()
    WHERE document_url = (SELECT storage_path FROM resident_documents WHERE id = p_document_id)
      AND viewed_by_senior_at IS NULL
      AND EXISTS (
        SELECT 1 FROM senior_resident_links srl
        JOIN lab_tests lt ON lt.id = test_results.test_id
        WHERE srl.resident_id = lt.resident_id
          AND srl.senior_user_id = auth.uid()
      );

    UPDATE test_results
    SET viewed_by_family_at = now()
    WHERE document_url = (SELECT storage_path FROM resident_documents WHERE id = p_document_id)
      AND viewed_by_family_at IS NULL
      AND EXISTS (
        SELECT 1 FROM family_resident_links frl
        JOIN lab_tests lt ON lt.id = test_results.test_id
        WHERE frl.resident_id = lt.resident_id
          AND frl.family_user_id = auth.uid()
      );
  END IF;

  RETURN v_log_id;
END;
$$;

-- Get documents for resident
CREATE OR REPLACE FUNCTION get_resident_documents(
  p_resident_id uuid,
  p_category_id uuid DEFAULT NULL,
  p_search_text text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, title text, description text, file_name text,
  file_size integer, file_type text, storage_path text,
  document_date date, category_name text, tags text[],
  is_sensitive boolean, uploaded_by_name text, uploaded_at timestamptz,
  is_shared_with_me boolean, can_download boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rd.id, rd.title, rd.description, rd.file_name, rd.file_size,
    rd.file_type, rd.storage_path, rd.document_date,
    dc.name as category_name, rd.tags, rd.is_sensitive,
    up.full_name as uploaded_by_name, rd.uploaded_at,
    EXISTS (
      SELECT 1 FROM document_shares ds
      WHERE ds.document_id = rd.id AND ds.shared_with_user_id = auth.uid()
    ) as is_shared_with_me,
    COALESCE(
      (SELECT ds.can_download FROM document_shares ds
       WHERE ds.document_id = rd.id AND ds.shared_with_user_id = auth.uid()),
      false
    ) as can_download
  FROM resident_documents rd
  LEFT JOIN document_categories dc ON dc.id = rd.category_id
  LEFT JOIN user_profiles up ON up.id = rd.uploaded_by
  WHERE rd.resident_id = p_resident_id
    AND (p_category_id IS NULL OR rd.category_id = p_category_id)
    AND (p_search_text IS NULL OR 
         rd.title ILIKE '%' || p_search_text || '%' OR
         rd.description ILIKE '%' || p_search_text || '%' OR
         p_search_text = ANY(rd.tags))
  ORDER BY rd.document_date DESC NULLS LAST, rd.uploaded_at DESC;
END;
$$;

-- Get document sharing status
CREATE OR REPLACE FUNCTION get_document_shares(p_document_id uuid)
RETURNS TABLE(
  shared_with_user_id uuid,
  user_name text,
  user_email text,
  can_view boolean,
  can_download boolean,
  shared_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.shared_with_user_id,
    up.full_name as user_name,
    up.email as user_email,
    ds.can_view,
    ds.can_download,
    ds.shared_at,
    ds.expires_at
  FROM document_shares ds
  JOIN user_profiles up ON up.id = ds.shared_with_user_id
  WHERE ds.document_id = p_document_id
    AND (ds.expires_at IS NULL OR ds.expires_at > now())
  ORDER BY ds.shared_at DESC;
END;
$$;