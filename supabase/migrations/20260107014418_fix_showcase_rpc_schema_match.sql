/*
  # Fix Showcase RPC Schema Match

  Updates the showcase seeding RPC functions to match actual table schemas.
  Fixes column name mismatches for tasks table.

  1. Updates
    - seed_showcase_task: Use correct column names (scheduled_start, scheduled_end, etc.)
    
  2. Security
    - Maintains SECURITY DEFINER to bypass RLS
*/

-- Drop and recreate with correct schema
DROP FUNCTION IF EXISTS seed_showcase_task;

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
BEGIN
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
    p_agency_id::uuid, p_resident_id::uuid, p_task_name, p_department, p_priority,
    p_scheduled_start, p_scheduled_end, v_duration_minutes, p_state,
    p_category_id, p_template_id, 
    CASE WHEN p_owner_user_id IS NOT NULL THEN p_owner_user_id::uuid ELSE NULL END,
    p_responsibility_role,
    p_requires_evidence, false, false,
    false, false,
    now(), now()
  )
  RETURNING id INTO v_task_id;

  RETURN jsonb_build_object('success', true, 'task_id', v_task_id);
END;
$$;
