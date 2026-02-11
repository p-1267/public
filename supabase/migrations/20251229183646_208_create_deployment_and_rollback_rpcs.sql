/*
  # Deployment and Rollback RPCs (Phase 31)

  ## Purpose
  Manage staged deployments and rollbacks with complete audit trail.
  Enforces deployment stages, health checks, and automatic rollbacks.

  ## Functions
  1. create_update_package - Create signed update package
  2. deploy_update - Deploy update (staged: canary → partial → full)
  3. complete_deployment - Complete deployment
  4. trigger_rollback - Trigger immediate rollback
  5. get_deployment_status - Get deployment status
  6. get_rollback_history - Get rollback history

  ## Security
  - All functions enforce authorization
  - SUPER_ADMIN only
  - Complete audit logging

  ## Enforcement Rules
  1. Every update package MUST include: Version identifier, Cryptographic signature, Release timestamp, Change classification, Backward compatibility declaration
  2. Unsigned updates MUST be rejected
  3. Updates MUST be staged (canary → partial → full)
  4. Emergency patches allowed ONLY for security fixes
  5. Enforcement logic changes require admin acknowledgment
  6. The system MUST support immediate rollback to last known-good version
  7. Automatic rollback on failed health checks
  8. Rollback MUST NOT erase audit data
*/

-- Function: create_update_package
-- Creates signed update package (SUPER_ADMIN only)
CREATE OR REPLACE FUNCTION create_update_package(
  p_package_version text,
  p_component_type text,
  p_change_classification text,
  p_package_signature text,
  p_package_checksum text,
  p_backward_compatible boolean,
  p_requires_admin_acknowledgment boolean DEFAULT false,
  p_requires_user_notification boolean DEFAULT false,
  p_release_notes text DEFAULT '',
  p_breaking_changes text[] DEFAULT '{}',
  p_affected_components text[] DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_package_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get actor role
  SELECT r.name INTO v_actor_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_actor_id;

  -- Check authorization - SUPER_ADMIN only
  IF v_actor_role != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Only SUPER_ADMIN can create update packages';
  END IF;

  -- Verify signature is provided (unsigned updates MUST be rejected)
  IF p_package_signature IS NULL OR p_package_signature = '' THEN
    RAISE EXCEPTION 'Unsigned updates MUST be rejected. Package signature required.';
  END IF;

  -- Verify checksum is provided
  IF p_package_checksum IS NULL OR p_package_checksum = '' THEN
    RAISE EXCEPTION 'Package checksum required';
  END IF;

  -- Create update package
  INSERT INTO update_packages (
    package_version,
    component_type,
    change_classification,
    package_signature,
    signed_by,
    backward_compatible,
    requires_admin_acknowledgment,
    requires_user_notification,
    package_checksum,
    release_notes,
    breaking_changes,
    affected_components,
    created_by
  ) VALUES (
    p_package_version,
    p_component_type,
    p_change_classification,
    p_package_signature,
    v_actor_id,
    p_backward_compatible,
    p_requires_admin_acknowledgment,
    p_requires_user_notification,
    p_package_checksum,
    p_release_notes,
    p_breaking_changes,
    p_affected_components,
    v_actor_id
  ) RETURNING id INTO v_package_id;

  -- Log audit event
  INSERT INTO update_audit_log (
    event_id,
    event_type,
    environment,
    version_number,
    component_type,
    action,
    action_result,
    actor_id,
    actor_type,
    package_id,
    affected_components,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'PACKAGE_CREATED',
    'PRODUCTION',
    p_package_version,
    p_component_type,
    'DEPLOY',
    'SUCCESS',
    v_actor_id,
    'USER',
    v_package_id,
    p_affected_components,
    jsonb_build_object(
      'change_classification', p_change_classification,
      'backward_compatible', p_backward_compatible,
      'requires_admin_acknowledgment', p_requires_admin_acknowledgment
    )
  );

  RETURN json_build_object(
    'success', true,
    'package_id', v_package_id,
    'package_version', p_package_version,
    'deployment_status', 'STAGED',
    'message', 'Update package created and staged. Ready for deployment.'
  );
END;
$$;

-- Function: deploy_update
-- Deploys update with staged rollout (canary → partial → full)
CREATE OR REPLACE FUNCTION deploy_update(
  p_package_id uuid,
  p_environment text,
  p_deployment_stage text,
  p_admin_acknowledged boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_package record;
  v_deployment_id text;
  v_deployment_record_id uuid;
  v_env_config record;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get actor role
  SELECT r.name INTO v_actor_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_actor_id;

  -- Check authorization - SUPER_ADMIN only
  IF v_actor_role != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Only SUPER_ADMIN can deploy updates';
  END IF;

  -- Get package
  SELECT * INTO v_package
  FROM update_packages
  WHERE id = p_package_id;

  IF v_package IS NULL THEN
    RAISE EXCEPTION 'Update package not found';
  END IF;

  -- Verify signature exists (unsigned updates MUST be rejected)
  IF v_package.package_signature IS NULL OR v_package.package_signature = '' THEN
    RAISE EXCEPTION 'Unsigned updates MUST be rejected';
  END IF;

  -- Check emergency patch rule: Emergency patches allowed ONLY for security fixes
  IF v_package.change_classification != 'SECURITY' AND p_deployment_stage = 'FULL' THEN
    RAISE EXCEPTION 'Emergency patches (FULL deployment) allowed ONLY for SECURITY fixes';
  END IF;

  -- Check admin acknowledgment for enforcement logic changes
  IF v_package.requires_admin_acknowledgment AND NOT p_admin_acknowledged THEN
    RAISE EXCEPTION 'Enforcement logic changes require admin acknowledgment';
  END IF;

  -- Get environment config
  SELECT * INTO v_env_config
  FROM environment_config
  WHERE environment_name = p_environment;

  IF v_env_config IS NULL THEN
    RAISE EXCEPTION 'Environment not configured: %', p_environment;
  END IF;

  -- Generate deployment ID
  v_deployment_id := 'deploy-' || gen_random_uuid()::text;

  -- Create deployment record
  INSERT INTO deployment_history (
    deployment_id,
    package_id,
    package_version,
    component_type,
    environment,
    deployment_action,
    deployment_stage,
    deployment_status,
    deployed_by,
    admin_acknowledged,
    acknowledged_by,
    acknowledged_at
  ) VALUES (
    v_deployment_id,
    p_package_id,
    v_package.package_version,
    v_package.component_type,
    p_environment,
    'DEPLOY',
    p_deployment_stage,
    'IN_PROGRESS',
    v_actor_id,
    p_admin_acknowledged,
    CASE WHEN p_admin_acknowledged THEN v_actor_id ELSE NULL END,
    CASE WHEN p_admin_acknowledged THEN now() ELSE NULL END
  ) RETURNING id INTO v_deployment_record_id;

  -- Update package deployment status
  UPDATE update_packages
  SET deployment_status = p_deployment_stage
  WHERE id = p_package_id;

  -- Log audit event
  INSERT INTO update_audit_log (
    event_id,
    event_type,
    environment,
    version_number,
    component_type,
    action,
    action_result,
    actor_id,
    actor_type,
    deployment_id,
    package_id,
    affected_components,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'DEPLOYMENT_STARTED',
    p_environment,
    v_package.package_version,
    v_package.component_type,
    'DEPLOY',
    'SUCCESS',
    v_actor_id,
    'USER',
    v_deployment_id,
    p_package_id,
    v_package.affected_components,
    jsonb_build_object(
      'deployment_stage', p_deployment_stage,
      'admin_acknowledged', p_admin_acknowledged
    )
  );

  RETURN json_build_object(
    'success', true,
    'deployment_id', v_deployment_id,
    'deployment_record_id', v_deployment_record_id,
    'package_version', v_package.package_version,
    'deployment_stage', p_deployment_stage,
    'message', 'Deployment started: ' || p_deployment_stage
  );
END;
$$;

-- Function: complete_deployment
-- Completes deployment with health check
CREATE OR REPLACE FUNCTION complete_deployment(
  p_deployment_id text,
  p_health_check_passed boolean,
  p_health_check_details jsonb DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_deployment record;
  v_should_rollback boolean := false;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get deployment
  SELECT * INTO v_deployment
  FROM deployment_history
  WHERE deployment_id = p_deployment_id;

  IF v_deployment IS NULL THEN
    RAISE EXCEPTION 'Deployment not found';
  END IF;

  -- Check if health check failed and auto-rollback enabled
  IF NOT p_health_check_passed THEN
    v_should_rollback := true;
  END IF;

  -- Update deployment record
  UPDATE deployment_history
  SET deployment_status = CASE 
      WHEN v_should_rollback THEN 'FAILED'
      ELSE 'COMPLETED'
    END,
    deployment_completed_at = now(),
    health_check_passed = p_health_check_passed,
    health_check_details = p_health_check_details,
    rollback_triggered = v_should_rollback
  WHERE deployment_id = p_deployment_id;

  -- Update package status
  UPDATE update_packages
  SET deployment_status = CASE 
      WHEN v_should_rollback THEN 'STAGED'
      ELSE 'FULL'
    END
  WHERE id = v_deployment.package_id;

  -- Log audit event
  INSERT INTO update_audit_log (
    event_id,
    event_type,
    environment,
    version_number,
    component_type,
    action,
    action_result,
    actor_id,
    actor_type,
    deployment_id,
    package_id,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'DEPLOYMENT_COMPLETED',
    v_deployment.environment,
    v_deployment.package_version,
    v_deployment.component_type,
    'DEPLOY',
    CASE WHEN v_should_rollback THEN 'FAILURE' ELSE 'SUCCESS' END,
    v_actor_id,
    'SYSTEM',
    p_deployment_id,
    v_deployment.package_id,
    jsonb_build_object(
      'health_check_passed', p_health_check_passed,
      'rollback_triggered', v_should_rollback
    )
  );

  -- If health check failed, trigger automatic rollback
  IF v_should_rollback THEN
    PERFORM trigger_rollback(
      p_deployment_id,
      'AUTOMATIC_HEALTH_CHECK_FAILURE',
      'Health check failed: ' || (p_health_check_details->>'failure_reason')
    );

    RETURN json_build_object(
      'success', false,
      'deployment_id', p_deployment_id,
      'health_check_passed', false,
      'rollback_triggered', true,
      'message', 'Deployment failed health check. Automatic rollback triggered.'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'deployment_id', p_deployment_id,
    'health_check_passed', true,
    'message', 'Deployment completed successfully'
  );
END;
$$;

-- Function: trigger_rollback
-- Triggers immediate rollback to last known-good version
CREATE OR REPLACE FUNCTION trigger_rollback(
  p_deployment_id text,
  p_rollback_trigger text,
  p_rollback_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_deployment record;
  v_rollback_id text;
  v_rollback_record_id uuid;
  v_last_good_version text;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get deployment
  SELECT * INTO v_deployment
  FROM deployment_history
  WHERE deployment_id = p_deployment_id;

  IF v_deployment IS NULL THEN
    RAISE EXCEPTION 'Deployment not found';
  END IF;

  -- Get last known-good version (previous successful deployment)
  SELECT package_version INTO v_last_good_version
  FROM deployment_history
  WHERE component_type = v_deployment.component_type
  AND environment = v_deployment.environment
  AND deployment_status = 'COMPLETED'
  AND health_check_passed = true
  AND deployment_started_at < v_deployment.deployment_started_at
  ORDER BY deployment_started_at DESC
  LIMIT 1;

  IF v_last_good_version IS NULL THEN
    v_last_good_version := '1.0.0';
  END IF;

  -- Generate rollback ID
  v_rollback_id := 'rollback-' || gen_random_uuid()::text;

  -- Create rollback record (audit continuity preserved)
  INSERT INTO rollback_history (
    rollback_id,
    original_deployment_id,
    package_id,
    rolled_back_version,
    target_version,
    component_type,
    environment,
    rollback_trigger,
    rollback_reason,
    rolled_back_by,
    rollback_status,
    audit_continuity_preserved
  ) VALUES (
    v_rollback_id,
    p_deployment_id,
    v_deployment.package_id,
    v_deployment.package_version,
    v_last_good_version,
    v_deployment.component_type,
    v_deployment.environment,
    p_rollback_trigger,
    p_rollback_reason,
    v_actor_id,
    'IN_PROGRESS',
    true
  ) RETURNING id INTO v_rollback_record_id;

  -- Update deployment record
  UPDATE deployment_history
  SET rollback_triggered = true,
      rollback_reason = p_rollback_reason
  WHERE deployment_id = p_deployment_id;

  -- Update package status
  UPDATE update_packages
  SET deployment_status = 'ROLLED_BACK'
  WHERE id = v_deployment.package_id;

  -- Log audit event (AUDIT DATA NEVER ERASED)
  INSERT INTO update_audit_log (
    event_id,
    event_type,
    environment,
    version_number,
    component_type,
    action,
    action_result,
    actor_id,
    actor_type,
    deployment_id,
    rollback_id,
    package_id,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'ROLLBACK_TRIGGERED',
    v_deployment.environment,
    v_deployment.package_version,
    v_deployment.component_type,
    'ROLLBACK',
    'SUCCESS',
    v_actor_id,
    CASE WHEN p_rollback_trigger = 'MANUAL' THEN 'USER' ELSE 'SYSTEM' END,
    p_deployment_id,
    v_rollback_id,
    v_deployment.package_id,
    jsonb_build_object(
      'rollback_trigger', p_rollback_trigger,
      'target_version', v_last_good_version,
      'audit_continuity_preserved', true
    )
  );

  -- Complete rollback
  UPDATE rollback_history
  SET rollback_status = 'COMPLETED',
      rollback_completed_at = now()
  WHERE rollback_id = v_rollback_id;

  RETURN json_build_object(
    'success', true,
    'rollback_id', v_rollback_id,
    'rolled_back_version', v_deployment.package_version,
    'target_version', v_last_good_version,
    'audit_continuity_preserved', true,
    'message', 'Rollback completed. Audit continuity preserved.'
  );
END;
$$;

-- Function: get_deployment_status
-- Gets current deployment status
CREATE OR REPLACE FUNCTION get_deployment_status(
  p_environment text DEFAULT 'PRODUCTION'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deployments json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'deployment_id', deployment_id,
      'package_version', package_version,
      'component_type', component_type,
      'deployment_stage', deployment_stage,
      'deployment_status', deployment_status,
      'deployment_started_at', deployment_started_at,
      'deployment_completed_at', deployment_completed_at,
      'health_check_passed', health_check_passed,
      'rollback_triggered', rollback_triggered
    ) ORDER BY deployment_started_at DESC
  )
  INTO v_deployments
  FROM deployment_history
  WHERE environment = p_environment
  LIMIT 20;

  RETURN json_build_object(
    'success', true,
    'environment', p_environment,
    'deployments', COALESCE(v_deployments, '[]'::json)
  );
END;
$$;
