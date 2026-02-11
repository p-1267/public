/*
  # Fix Showcase Data Seeding

  Creates SECURITY DEFINER RPC functions to allow showcase data insertion
  without authentication. This enables the showcase mode to work properly
  by bypassing RLS policies for demo data.

  1. New Functions
    - seed_showcase_agency: Inserts demo agency
    - seed_showcase_residents: Inserts demo residents
    - seed_showcase_task_category: Inserts task category
    - seed_showcase_task_template: Inserts task template
    - seed_showcase_task: Inserts task
    
  2. Security
    - All functions use SECURITY DEFINER to bypass RLS
    - Functions are idempotent (upsert behavior)
*/

-- Function to seed showcase agency
CREATE OR REPLACE FUNCTION seed_showcase_agency(
  p_id text,
  p_name text,
  p_operating_mode text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO agencies (id, name, status, operating_mode, metadata, created_at, updated_at)
  VALUES (p_id, p_name, 'active', p_operating_mode, p_metadata, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    operating_mode = EXCLUDED.operating_mode,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'agency_id', p_id);
END;
$$;

-- Function to seed showcase residents
CREATE OR REPLACE FUNCTION seed_showcase_resident(
  p_id text,
  p_agency_id text,
  p_full_name text,
  p_room_number text,
  p_date_of_birth date,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO residents (
    id, agency_id, full_name, room_number, date_of_birth, 
    status, admission_date, metadata, created_at, updated_at
  )
  VALUES (
    p_id, p_agency_id, p_full_name, p_room_number, p_date_of_birth,
    'active', now(), p_metadata, now(), now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    room_number = EXCLUDED.room_number,
    date_of_birth = EXCLUDED.date_of_birth,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'resident_id', p_id);
END;
$$;

-- Function to seed showcase task category
CREATE OR REPLACE FUNCTION seed_showcase_task_category(
  p_agency_id text,
  p_name text,
  p_category_type text,
  p_description text DEFAULT '',
  p_default_priority text DEFAULT 'MEDIUM',
  p_requires_evidence boolean DEFAULT false,
  p_allows_skip boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
BEGIN
  INSERT INTO task_categories (
    agency_id, name, category_type, description, 
    default_priority, requires_evidence, allows_skip, 
    is_active, created_at, updated_at
  )
  VALUES (
    p_agency_id, p_name, p_category_type, p_description,
    p_default_priority, p_requires_evidence, p_allows_skip,
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

-- Function to seed showcase task template
CREATE OR REPLACE FUNCTION seed_showcase_task_template(
  p_agency_id text,
  p_category_id uuid,
  p_name text,
  p_description text DEFAULT '',
  p_department text DEFAULT 'NURSING',
  p_default_priority text DEFAULT 'MEDIUM',
  p_estimated_duration_minutes integer DEFAULT 15
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
BEGIN
  INSERT INTO task_templates (
    agency_id, category_id, name, description, department,
    default_priority, estimated_duration_minutes, is_active,
    created_at, updated_at
  )
  VALUES (
    p_agency_id, p_category_id, p_name, p_description, p_department,
    p_default_priority, p_estimated_duration_minutes, true,
    now(), now()
  )
  ON CONFLICT (agency_id, name) DO UPDATE
  SET 
    description = EXCLUDED.description,
    department = EXCLUDED.department,
    updated_at = now()
  RETURNING id INTO v_template_id;

  RETURN jsonb_build_object('success', true, 'template_id', v_template_id);
END;
$$;

-- Function to seed showcase task
CREATE OR REPLACE FUNCTION seed_showcase_task(
  p_agency_id text,
  p_resident_id text,
  p_task_name text,
  p_department text,
  p_priority text,
  p_planned_start timestamptz,
  p_planned_end timestamptz,
  p_state text DEFAULT 'pending',
  p_category_id uuid DEFAULT NULL,
  p_template_id uuid DEFAULT NULL,
  p_assigned_to text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id uuid;
BEGIN
  INSERT INTO tasks (
    agency_id, resident_id, task_name, department, priority,
    planned_start, planned_end, state, category_id, template_id,
    assigned_to, supervisor_acknowledged,
    created_at, updated_at
  )
  VALUES (
    p_agency_id, p_resident_id, p_task_name, p_department, p_priority,
    p_planned_start, p_planned_end, p_state, p_category_id, p_template_id,
    p_assigned_to, false,
    now(), now()
  )
  RETURNING id INTO v_task_id;

  RETURN jsonb_build_object('success', true, 'task_id', v_task_id);
END;
$$;
