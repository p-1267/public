/*
  # Training Management RPCs (Phase 27)

  ## Purpose
  Manage training modules and track user progress.

  ## Functions
  1. get_user_training_modules - Get training modules for user
  2. start_training_module - Start a training module
  3. complete_training_module - Complete a training module
  4. dismiss_training_module - Dismiss a training module
  5. get_user_training_progress - Get user training progress

  ## Security
  - All functions enforce authorization
  - Role-based module access
  - Progress tracking

  ## Enforcement Rules
  1. Tutorials MUST be: non-blocking, dismissible, repeatable
  2. First-time user walkthroughs
  3. Contextual, task-based tutorials
  4. Role-specific guidance
*/

-- Function: get_user_training_modules
-- Gets training modules for current user based on role and context
CREATE OR REPLACE FUNCTION get_user_training_modules(
  p_context_type text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_agency_id uuid;
  v_modules json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name, up.agency_id
  INTO v_user_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  SELECT json_agg(
    json_build_object(
      'id', tm.id,
      'module_type', tm.module_type,
      'title', tm.title,
      'description', tm.description,
      'content', tm.content,
      'context_type', tm.context_type,
      'is_mandatory', tm.is_mandatory,
      'is_repeatable', tm.is_repeatable,
      'is_dismissible', tm.is_dismissible,
      'display_order', tm.display_order,
      'progress', (
        SELECT json_build_object(
          'started_at', tp.started_at,
          'completed_at', tp.completed_at,
          'dismissed_at', tp.dismissed_at,
          'is_completed', tp.is_completed,
          'progress_data', tp.progress_data
        )
        FROM training_progress tp
        WHERE tp.module_id = tm.id
        AND tp.user_id = v_user_id
      )
    ) ORDER BY tm.display_order, tm.created_at
  )
  INTO v_modules
  FROM training_modules tm
  WHERE tm.is_active = true
  AND (tm.agency_id = v_agency_id OR tm.agency_id IS NULL)
  AND (v_user_role = ANY(tm.target_roles) OR array_length(tm.target_roles, 1) = 0)
  AND (p_context_type IS NULL OR tm.context_type = p_context_type);

  RETURN json_build_object(
    'success', true,
    'modules', COALESCE(v_modules, '[]'::json),
    'module_count', COALESCE(json_array_length(v_modules), 0)
  );
END;
$$;

-- Function: start_training_module
-- Starts a training module for user
CREATE OR REPLACE FUNCTION start_training_module(
  p_module_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_agency_id uuid;
  v_module record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name, up.agency_id
  INTO v_user_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Get module
  SELECT * INTO v_module
  FROM training_modules
  WHERE id = p_module_id
  AND is_active = true;

  IF v_module IS NULL THEN
    RAISE EXCEPTION 'Training module not found';
  END IF;

  -- Check role access
  IF NOT (v_user_role = ANY(v_module.target_roles) OR array_length(v_module.target_roles, 1) = 0) THEN
    RAISE EXCEPTION 'Module not available for your role';
  END IF;

  -- Create or update progress
  INSERT INTO training_progress (
    user_id,
    module_id,
    started_at,
    is_completed
  ) VALUES (
    v_user_id,
    p_module_id,
    now(),
    false
  )
  ON CONFLICT (user_id, module_id) DO UPDATE
  SET started_at = now(),
      completed_at = NULL,
      dismissed_at = NULL,
      is_completed = false,
      updated_at = now();

  -- Log interaction
  INSERT INTO ai_interaction_log (
    agency_id,
    user_id,
    user_role,
    interaction_type,
    context_type,
    context_id,
    action_taken,
    metadata
  ) VALUES (
    v_agency_id,
    v_user_id,
    v_user_role,
    'TRAINING_STARTED',
    'TRAINING_MODULE',
    p_module_id,
    'STARTED',
    jsonb_build_object(
      'module_title', v_module.title,
      'module_type', v_module.module_type
    )
  );

  RETURN json_build_object(
    'success', true,
    'module_id', p_module_id,
    'message', 'Training module started'
  );
END;
$$;

-- Function: complete_training_module
-- Completes a training module for user
CREATE OR REPLACE FUNCTION complete_training_module(
  p_module_id uuid,
  p_progress_data jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_agency_id uuid;
  v_module record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name, up.agency_id
  INTO v_user_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Get module
  SELECT * INTO v_module
  FROM training_modules
  WHERE id = p_module_id;

  IF v_module IS NULL THEN
    RAISE EXCEPTION 'Training module not found';
  END IF;

  -- Update progress
  UPDATE training_progress
  SET completed_at = now(),
      is_completed = true,
      progress_data = COALESCE(p_progress_data, progress_data),
      updated_at = now()
  WHERE user_id = v_user_id
  AND module_id = p_module_id;

  -- Log interaction
  INSERT INTO ai_interaction_log (
    agency_id,
    user_id,
    user_role,
    interaction_type,
    context_type,
    context_id,
    action_taken,
    metadata
  ) VALUES (
    v_agency_id,
    v_user_id,
    v_user_role,
    'TRAINING_COMPLETED',
    'TRAINING_MODULE',
    p_module_id,
    'COMPLETED',
    jsonb_build_object(
      'module_title', v_module.title,
      'module_type', v_module.module_type
    )
  );

  RETURN json_build_object(
    'success', true,
    'module_id', p_module_id,
    'completed_at', now(),
    'message', 'Training module completed'
  );
END;
$$;

-- Function: dismiss_training_module
-- Dismisses a training module for user
CREATE OR REPLACE FUNCTION dismiss_training_module(
  p_module_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_agency_id uuid;
  v_module record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name, up.agency_id
  INTO v_user_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Get module
  SELECT * INTO v_module
  FROM training_modules
  WHERE id = p_module_id;

  IF v_module IS NULL THEN
    RAISE EXCEPTION 'Training module not found';
  END IF;

  -- Check if dismissible
  IF NOT v_module.is_dismissible THEN
    RAISE EXCEPTION 'This training module cannot be dismissed';
  END IF;

  -- Update progress
  UPDATE training_progress
  SET dismissed_at = now(),
      updated_at = now()
  WHERE user_id = v_user_id
  AND module_id = p_module_id;

  RETURN json_build_object(
    'success', true,
    'module_id', p_module_id,
    'message', 'Training module dismissed'
  );
END;
$$;

-- Function: get_user_training_progress
-- Gets training progress summary for user
CREATE OR REPLACE FUNCTION get_user_training_progress()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_total_modules integer;
  v_completed_modules integer;
  v_mandatory_total integer;
  v_mandatory_completed integer;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Count total modules
  SELECT COUNT(*)
  INTO v_total_modules
  FROM training_modules tm
  JOIN user_profiles up ON (tm.agency_id = up.agency_id OR tm.agency_id IS NULL)
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id
  AND tm.is_active = true
  AND (r.name = ANY(tm.target_roles) OR array_length(tm.target_roles, 1) = 0);

  -- Count completed
  SELECT COUNT(*)
  INTO v_completed_modules
  FROM training_progress
  WHERE user_id = v_user_id
  AND is_completed = true;

  -- Count mandatory modules
  SELECT COUNT(*)
  INTO v_mandatory_total
  FROM training_modules tm
  JOIN user_profiles up ON (tm.agency_id = up.agency_id OR tm.agency_id IS NULL)
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id
  AND tm.is_active = true
  AND tm.is_mandatory = true
  AND (r.name = ANY(tm.target_roles) OR array_length(tm.target_roles, 1) = 0);

  -- Count mandatory completed
  SELECT COUNT(*)
  INTO v_mandatory_completed
  FROM training_progress tp
  JOIN training_modules tm ON tm.id = tp.module_id
  WHERE tp.user_id = v_user_id
  AND tp.is_completed = true
  AND tm.is_mandatory = true;

  RETURN json_build_object(
    'success', true,
    'total_modules', v_total_modules,
    'completed_modules', v_completed_modules,
    'completion_percentage', CASE WHEN v_total_modules > 0 THEN (v_completed_modules::float / v_total_modules::float * 100) ELSE 0 END,
    'mandatory_total', v_mandatory_total,
    'mandatory_completed', v_mandatory_completed,
    'mandatory_completion_percentage', CASE WHEN v_mandatory_total > 0 THEN (v_mandatory_completed::float / v_mandatory_total::float * 100) ELSE 0 END
  );
END;
$$;
