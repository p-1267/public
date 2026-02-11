/*
  # AI Assistance RPCs (Phase 27)

  ## Purpose
  Manage AI assistance configuration and suggestions.
  Strictly enforce Shadow AI boundaries.

  ## Functions
  1. get_ai_assistance_config - Get user/agency AI config
  2. update_ai_assistance_config - Update AI config
  3. get_user_ai_suggestions - Get active AI suggestions
  4. dismiss_ai_suggestion - Dismiss AI suggestion
  5. accept_ai_suggestion - Accept AI suggestion

  ## Security
  - All functions enforce authorization
  - Users manage own config
  - Admins manage agency config

  ## Enforcement Rules
  1. Shadow AI MUST NOT: create tasks, assign work, trigger alerts, escalate emergencies, modify schedules, change permissions, auto-fill records, confirm actions
  2. is_blocking MUST ALWAYS BE FALSE
  3. Disabling AI MUST NOT affect enforcement
*/

-- Function: get_ai_assistance_config
-- Gets AI assistance configuration for user
CREATE OR REPLACE FUNCTION get_ai_assistance_config()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_config record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id
  INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Get user-specific config or agency default
  SELECT *
  INTO v_config
  FROM ai_assistance_config
  WHERE (user_id = v_user_id)
  OR (user_id IS NULL AND agency_id = v_agency_id)
  ORDER BY user_id NULLS LAST
  LIMIT 1;

  IF v_config IS NULL THEN
    -- Return default config
    RETURN json_build_object(
      'success', true,
      'config', json_build_object(
        'is_enabled', true,
        'shadow_ai_enabled', true,
        'voice_guidance_enabled', false,
        'suggestion_types_enabled', ARRAY['REMINDER', 'BEST_PRACTICE', 'POLICY_EXPLANATION'],
        'observation_scope', json_build_object(
          'workflow_patterns', true,
          'repeated_errors', true,
          'delayed_actions', true,
          'incomplete_documentation', true
        ),
        'consent_given_at', NULL,
        'consent_withdrawn_at', NULL
      )
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'config', json_build_object(
      'is_enabled', v_config.is_enabled,
      'shadow_ai_enabled', v_config.shadow_ai_enabled,
      'voice_guidance_enabled', v_config.voice_guidance_enabled,
      'suggestion_types_enabled', v_config.suggestion_types_enabled,
      'observation_scope', v_config.observation_scope,
      'consent_given_at', v_config.consent_given_at,
      'consent_withdrawn_at', v_config.consent_withdrawn_at
    )
  );
END;
$$;

-- Function: update_ai_assistance_config
-- Updates AI assistance configuration
CREATE OR REPLACE FUNCTION update_ai_assistance_config(
  p_is_enabled boolean DEFAULT NULL,
  p_shadow_ai_enabled boolean DEFAULT NULL,
  p_voice_guidance_enabled boolean DEFAULT NULL,
  p_suggestion_types_enabled text[] DEFAULT NULL,
  p_consent_action text DEFAULT NULL
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
  v_consent_timestamp timestamptz;
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

  -- Handle consent
  IF p_consent_action = 'GIVE' THEN
    v_consent_timestamp := now();
  ELSIF p_consent_action = 'WITHDRAW' THEN
    v_consent_timestamp := NULL;
  END IF;

  -- Insert or update config
  INSERT INTO ai_assistance_config (
    agency_id,
    user_id,
    is_enabled,
    shadow_ai_enabled,
    voice_guidance_enabled,
    suggestion_types_enabled,
    consent_given_at,
    consent_withdrawn_at
  ) VALUES (
    v_agency_id,
    v_user_id,
    COALESCE(p_is_enabled, true),
    COALESCE(p_shadow_ai_enabled, true),
    COALESCE(p_voice_guidance_enabled, false),
    COALESCE(p_suggestion_types_enabled, ARRAY['REMINDER', 'BEST_PRACTICE', 'POLICY_EXPLANATION']),
    CASE WHEN p_consent_action = 'GIVE' THEN now() ELSE NULL END,
    CASE WHEN p_consent_action = 'WITHDRAW' THEN now() ELSE NULL END
  )
  ON CONFLICT (agency_id, user_id) DO UPDATE
  SET is_enabled = COALESCE(p_is_enabled, ai_assistance_config.is_enabled),
      shadow_ai_enabled = COALESCE(p_shadow_ai_enabled, ai_assistance_config.shadow_ai_enabled),
      voice_guidance_enabled = COALESCE(p_voice_guidance_enabled, ai_assistance_config.voice_guidance_enabled),
      suggestion_types_enabled = COALESCE(p_suggestion_types_enabled, ai_assistance_config.suggestion_types_enabled),
      consent_given_at = CASE WHEN p_consent_action = 'GIVE' THEN now() ELSE ai_assistance_config.consent_given_at END,
      consent_withdrawn_at = CASE WHEN p_consent_action = 'WITHDRAW' THEN now() ELSE ai_assistance_config.consent_withdrawn_at END,
      updated_at = now();

  -- Log interaction
  INSERT INTO ai_interaction_log (
    agency_id,
    user_id,
    user_role,
    interaction_type,
    action_taken,
    metadata
  ) VALUES (
    v_agency_id,
    v_user_id,
    v_user_role,
    'CONFIG_CHANGED',
    CASE WHEN p_is_enabled = false THEN 'DISABLED' ELSE 'ENABLED' END,
    jsonb_build_object(
      'is_enabled', p_is_enabled,
      'shadow_ai_enabled', p_shadow_ai_enabled,
      'voice_guidance_enabled', p_voice_guidance_enabled,
      'consent_action', p_consent_action
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'AI assistance configuration updated'
  );
END;
$$;

-- Function: get_user_ai_suggestions
-- Gets active AI suggestions for user
CREATE OR REPLACE FUNCTION get_user_ai_suggestions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_suggestions json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', s.id,
      'suggestion_type', s.suggestion_type,
      'context_type', s.context_type,
      'context_id', s.context_id,
      'title', s.title,
      'content', s.content,
      'priority', s.priority,
      'is_blocking', s.is_blocking,
      'created_at', s.created_at,
      'expires_at', s.expires_at
    ) ORDER BY 
      CASE s.priority
        WHEN 'HIGH' THEN 1
        WHEN 'NORMAL' THEN 2
        WHEN 'LOW' THEN 3
      END,
      s.created_at DESC
  )
  INTO v_suggestions
  FROM ai_suggestions s
  WHERE s.user_id = v_user_id
  AND s.is_active = true
  AND s.displayed_at IS NULL
  AND (s.expires_at IS NULL OR s.expires_at > now());

  -- Mark as displayed
  UPDATE ai_suggestions
  SET displayed_at = now()
  WHERE user_id = v_user_id
  AND is_active = true
  AND displayed_at IS NULL
  AND (expires_at IS NULL OR expires_at > now());

  RETURN json_build_object(
    'success', true,
    'suggestions', COALESCE(v_suggestions, '[]'::json),
    'suggestion_count', COALESCE(json_array_length(v_suggestions), 0)
  );
END;
$$;

-- Function: dismiss_ai_suggestion
-- Dismisses an AI suggestion
CREATE OR REPLACE FUNCTION dismiss_ai_suggestion(
  p_suggestion_id uuid
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
  v_suggestion record;
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

  -- Get suggestion
  SELECT * INTO v_suggestion
  FROM ai_suggestions
  WHERE id = p_suggestion_id
  AND user_id = v_user_id;

  IF v_suggestion IS NULL THEN
    RAISE EXCEPTION 'Suggestion not found';
  END IF;

  -- Mark as dismissed
  UPDATE ai_suggestions
  SET dismissed_at = now(),
      is_active = false
  WHERE id = p_suggestion_id;

  -- Log interaction
  INSERT INTO ai_interaction_log (
    agency_id,
    user_id,
    user_role,
    interaction_type,
    suggestion_id,
    suggestion_type,
    context_type,
    context_id,
    action_taken,
    metadata
  ) VALUES (
    v_agency_id,
    v_user_id,
    v_user_role,
    'SUGGESTION_DISMISSED',
    p_suggestion_id,
    v_suggestion.suggestion_type,
    v_suggestion.context_type,
    v_suggestion.context_id,
    'DISMISSED',
    jsonb_build_object(
      'title', v_suggestion.title
    )
  );

  RETURN json_build_object(
    'success', true,
    'suggestion_id', p_suggestion_id,
    'message', 'Suggestion dismissed'
  );
END;
$$;

-- Function: accept_ai_suggestion
-- Accepts an AI suggestion
CREATE OR REPLACE FUNCTION accept_ai_suggestion(
  p_suggestion_id uuid
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
  v_suggestion record;
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

  -- Get suggestion
  SELECT * INTO v_suggestion
  FROM ai_suggestions
  WHERE id = p_suggestion_id
  AND user_id = v_user_id;

  IF v_suggestion IS NULL THEN
    RAISE EXCEPTION 'Suggestion not found';
  END IF;

  -- Mark as accepted
  UPDATE ai_suggestions
  SET accepted_at = now(),
      is_active = false
  WHERE id = p_suggestion_id;

  -- Log interaction
  INSERT INTO ai_interaction_log (
    agency_id,
    user_id,
    user_role,
    interaction_type,
    suggestion_id,
    suggestion_type,
    context_type,
    context_id,
    action_taken,
    metadata
  ) VALUES (
    v_agency_id,
    v_user_id,
    v_user_role,
    'SUGGESTION_ACCEPTED',
    p_suggestion_id,
    v_suggestion.suggestion_type,
    v_suggestion.context_type,
    v_suggestion.context_id,
    'ACCEPTED',
    jsonb_build_object(
      'title', v_suggestion.title
    )
  );

  RETURN json_build_object(
    'success', true,
    'suggestion_id', p_suggestion_id,
    'message', 'Suggestion accepted - user must still perform the action'
  );
END;
$$;
