/*
  # Fix Priority Case in Task RPCs

  Updates task-related RPCs to convert priority to lowercase to match
  the CHECK constraint which requires: 'low', 'medium', 'high', 'critical'
*/

-- Update task category RPC to lowercase priority
DROP FUNCTION IF EXISTS seed_showcase_task_category(text,text,text,text,text,boolean,boolean);

CREATE OR REPLACE FUNCTION seed_showcase_task_category(
  p_agency_id text,
  p_name text,
  p_category_type text,
  p_description text DEFAULT '',
  p_default_priority text DEFAULT 'medium',
  p_requires_evidence boolean DEFAULT false,
  p_allows_skip boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
  v_agency_uuid uuid;
BEGIN
  v_agency_uuid := md5(p_agency_id)::uuid;

  INSERT INTO task_categories (
    agency_id, name, category_type, description, 
    default_priority, requires_evidence, allows_skip, 
    is_active, created_at, updated_at
  )
  VALUES (
    v_agency_uuid, p_name, p_category_type, p_description,
    lower(p_default_priority), p_requires_evidence, p_allows_skip,
    true, now(), now()
  )
  ON CONFLICT (agency_id, name) DO UPDATE
  SET 
    category_type = EXCLUDED.category_type,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO v_category_id;

  RETURN jsonb_build_object('success', true, 'category_id', v_category_id);
END;
$$;

-- Update task template RPC to lowercase priority
DROP FUNCTION IF EXISTS seed_showcase_task_template(text,uuid,text,text,text,text,integer);

CREATE OR REPLACE FUNCTION seed_showcase_task_template(
  p_agency_id text,
  p_category_id uuid,
  p_name text,
  p_description text DEFAULT '',
  p_department text DEFAULT 'NURSING',
  p_default_priority text DEFAULT 'medium',
  p_estimated_duration_minutes integer DEFAULT 15
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
  v_agency_uuid uuid;
BEGIN
  v_agency_uuid := md5(p_agency_id)::uuid;

  INSERT INTO task_templates (
    agency_id, category_id, template_name, description,
    default_duration_minutes, default_priority, is_active,
    created_at
  )
  VALUES (
    v_agency_uuid, p_category_id, p_name, p_description,
    p_estimated_duration_minutes, lower(p_default_priority), true,
    now()
  )
  ON CONFLICT (agency_id, template_name) DO UPDATE
  SET 
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO v_template_id;

  RETURN jsonb_build_object('success', true, 'template_id', v_template_id);
END;
$$;

-- Update task RPC to lowercase priority
DROP FUNCTION IF EXISTS seed_showcase_task(text,text,text,text,text,timestamptz,timestamptz,text,uuid,uuid,text,text,boolean);

CREATE OR REPLACE FUNCTION seed_showcase_task(
  p_agency_id text,
  p_resident_id text,
  p_task_name text,
  p_department text,
  p_priority text,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_state text DEFAULT 'pending',
  p_category_id uuid DEFAULT NULL,
  p_template_id uuid DEFAULT NULL,
  p_owner_user_id text DEFAULT NULL,
  p_responsibility_role text DEFAULT 'CAREGIVER',
  p_requires_evidence boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id uuid;
  v_duration_minutes integer;
  v_agency_uuid uuid;
  v_resident_uuid uuid;
  v_owner_uuid uuid;
BEGIN
  v_agency_uuid := md5(p_agency_id)::uuid;
  v_resident_uuid := md5(p_resident_id)::uuid;
  IF p_owner_user_id IS NOT NULL THEN
    v_owner_uuid := md5(p_owner_user_id)::uuid;
  END IF;

  v_duration_minutes := EXTRACT(EPOCH FROM (p_scheduled_end - p_scheduled_start)) / 60;

  INSERT INTO tasks (
    agency_id, resident_id, task_name, department, priority,
    scheduled_start, scheduled_end, duration_minutes, state, 
    category_id, template_id, owner_user_id, responsibility_role,
    requires_evidence, evidence_submitted, supervisor_acknowledged,
    is_emergency, is_blocked,
    created_at, updated_at
  )
  VALUES (
    v_agency_uuid, v_resident_uuid, p_task_name, p_department, lower(p_priority),
    p_scheduled_start, p_scheduled_end, v_duration_minutes, p_state,
    p_category_id, p_template_id, v_owner_uuid, p_responsibility_role,
    p_requires_evidence, false, false,
    false, false,
    now(), now()
  )
  RETURNING id INTO v_task_id;

  RETURN jsonb_build_object('success', true, 'task_id', v_task_id);
END;
$$;
