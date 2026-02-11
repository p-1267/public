/*
  # Announcement RPCs (Phase 26)

  ## Purpose
  Create and manage agency-wide announcements.

  ## Functions
  1. create_announcement - Create agency announcement
  2. acknowledge_announcement - Acknowledge announcement
  3. get_user_announcements - Get announcements for user
  4. get_announcement_status - Get acknowledgment status for announcement

  ## Security
  - Agency admins only can create
  - Role-based targeting
  - Acknowledgment tracking

  ## Enforcement Rules
  1. Agency Admins MAY create announcements
  2. Target audience defined (role-based)
  3. Mandatory acknowledgment option
  4. Expiration date supported
  5. Acknowledgment status MUST be tracked
*/

-- Function: create_announcement
-- Creates an agency-wide announcement
CREATE OR REPLACE FUNCTION create_announcement(
  p_title text,
  p_content text,
  p_target_roles text[],
  p_requires_acknowledgment boolean DEFAULT false,
  p_priority text DEFAULT 'NORMAL',
  p_expires_at timestamptz DEFAULT NULL
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
  v_announcement_id uuid;
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

  -- Only agency admins can create announcements
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Only agency admins can create announcements';
  END IF;

  -- Validate priority
  IF p_priority NOT IN ('LOW', 'NORMAL', 'HIGH', 'URGENT') THEN
    RAISE EXCEPTION 'Invalid priority: must be LOW, NORMAL, HIGH, or URGENT';
  END IF;

  -- Create announcement
  INSERT INTO announcements (
    agency_id,
    created_by,
    title,
    content,
    target_roles,
    requires_acknowledgment,
    priority,
    expires_at,
    is_active
  ) VALUES (
    v_agency_id,
    v_user_id,
    p_title,
    p_content,
    p_target_roles,
    p_requires_acknowledgment,
    p_priority,
    p_expires_at,
    true
  )
  RETURNING id INTO v_announcement_id;

  -- Audit announcement creation
  INSERT INTO message_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    announcement_id,
    metadata
  ) VALUES (
    v_agency_id,
    v_user_id,
    v_user_role,
    'ANNOUNCEMENT_CREATE',
    v_announcement_id,
    jsonb_build_object(
      'title', p_title,
      'target_roles', p_target_roles,
      'requires_acknowledgment', p_requires_acknowledgment,
      'priority', p_priority
    )
  );

  RETURN json_build_object(
    'success', true,
    'announcement_id', v_announcement_id,
    'message', 'Announcement created successfully'
  );
END;
$$;

-- Function: acknowledge_announcement
-- Acknowledges an announcement
CREATE OR REPLACE FUNCTION acknowledge_announcement(
  p_announcement_id uuid,
  p_device_fingerprint text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_announcement record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name
  INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Get announcement
  SELECT * INTO v_announcement
  FROM announcements
  WHERE id = p_announcement_id;

  IF v_announcement IS NULL THEN
    RAISE EXCEPTION 'Announcement not found';
  END IF;

  -- Check if user's role is targeted
  IF NOT (v_user_role = ANY(v_announcement.target_roles) OR array_length(v_announcement.target_roles, 1) = 0) THEN
    RAISE EXCEPTION 'Announcement not targeted to your role';
  END IF;

  -- Create acknowledgment
  INSERT INTO announcement_acknowledgments (
    announcement_id,
    user_id,
    acknowledged_at,
    device_fingerprint
  ) VALUES (
    p_announcement_id,
    v_user_id,
    now(),
    p_device_fingerprint
  )
  ON CONFLICT (announcement_id, user_id) DO NOTHING;

  -- Audit acknowledgment
  INSERT INTO message_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    announcement_id,
    device_fingerprint
  ) VALUES (
    v_announcement.agency_id,
    v_user_id,
    v_user_role,
    'ACK',
    p_announcement_id,
    p_device_fingerprint
  );

  RETURN json_build_object(
    'success', true,
    'announcement_id', p_announcement_id,
    'acknowledged_at', now(),
    'message', 'Announcement acknowledged'
  );
END;
$$;

-- Function: get_user_announcements
-- Gets announcements for current user
CREATE OR REPLACE FUNCTION get_user_announcements(
  p_include_expired boolean DEFAULT false
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
  v_announcements json;
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
      'id', a.id,
      'title', a.title,
      'content', a.content,
      'priority', a.priority,
      'requires_acknowledgment', a.requires_acknowledgment,
      'created_by', up.full_name,
      'created_at', a.created_at,
      'expires_at', a.expires_at,
      'is_acknowledged', EXISTS (
        SELECT 1
        FROM announcement_acknowledgments aa
        WHERE aa.announcement_id = a.id
        AND aa.user_id = v_user_id
      )
    ) ORDER BY 
      CASE a.priority
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'NORMAL' THEN 3
        WHEN 'LOW' THEN 4
      END,
      a.created_at DESC
  )
  INTO v_announcements
  FROM announcements a
  JOIN user_profiles up ON up.id = a.created_by
  WHERE a.agency_id = v_agency_id
  AND a.is_active = true
  AND (v_user_role = ANY(a.target_roles) OR array_length(a.target_roles, 1) = 0)
  AND (p_include_expired OR a.expires_at IS NULL OR a.expires_at > now());

  RETURN json_build_object(
    'success', true,
    'announcements', COALESCE(v_announcements, '[]'::json),
    'announcement_count', COALESCE(json_array_length(v_announcements), 0)
  );
END;
$$;

-- Function: get_announcement_status
-- Gets acknowledgment status for an announcement
CREATE OR REPLACE FUNCTION get_announcement_status(
  p_announcement_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_announcement record;
  v_target_users_count integer;
  v_acknowledged_count integer;
  v_acknowledgments json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name
  INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Only admins can view status
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions to view announcement status';
  END IF;

  -- Get announcement
  SELECT * INTO v_announcement
  FROM announcements
  WHERE id = p_announcement_id;

  IF v_announcement IS NULL THEN
    RAISE EXCEPTION 'Announcement not found';
  END IF;

  -- Count target users
  SELECT COUNT(*)
  INTO v_target_users_count
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.agency_id = v_announcement.agency_id
  AND (r.name = ANY(v_announcement.target_roles) OR array_length(v_announcement.target_roles, 1) = 0);

  -- Count acknowledged
  SELECT COUNT(*)
  INTO v_acknowledged_count
  FROM announcement_acknowledgments
  WHERE announcement_id = p_announcement_id;

  -- Get acknowledgments
  SELECT json_agg(
    json_build_object(
      'user_id', aa.user_id,
      'user_name', up.full_name,
      'user_role', r.name,
      'acknowledged_at', aa.acknowledged_at
    ) ORDER BY aa.acknowledged_at DESC
  )
  INTO v_acknowledgments
  FROM announcement_acknowledgments aa
  JOIN user_profiles up ON up.id = aa.user_id
  JOIN roles r ON r.id = up.role_id
  WHERE aa.announcement_id = p_announcement_id;

  RETURN json_build_object(
    'success', true,
    'announcement_id', p_announcement_id,
    'target_users_count', v_target_users_count,
    'acknowledged_count', v_acknowledged_count,
    'acknowledgment_percentage', CASE WHEN v_target_users_count > 0 THEN (v_acknowledged_count::float / v_target_users_count::float * 100) ELSE 0 END,
    'acknowledgments', COALESCE(v_acknowledgments, '[]'::json)
  );
END;
$$;
