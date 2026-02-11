/*
  # Subscription Enforcement RPCs (Phase 3)

  1. Purpose
    - Check feature access based on subscription
    - Enforce subscription limits
    - Brain-controlled gating

  2. Functions
    - check_feature_access: Check if feature is allowed
    - check_subscription_valid: Validate subscription
    - get_agency_subscription_status: Get subscription details
*/

CREATE OR REPLACE FUNCTION check_feature_access(
  p_feature_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_subscription record;
  v_feature record;
  v_plan record;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Not authenticated'
    );
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  IF v_agency_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'No agency association'
    );
  END IF;

  SELECT * INTO v_feature
  FROM feature_gates
  WHERE feature_key = p_feature_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'Feature not gated'
    );
  END IF;

  SELECT os.*, sp.*
  INTO v_subscription
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON sp.id = os.plan_id
  WHERE os.agency_id = v_agency_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'No active subscription',
      'feature_key', p_feature_key
    );
  END IF;

  IF v_subscription.status NOT IN ('TRIAL', 'ACTIVE') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', format('Subscription status: %s', v_subscription.status),
      'feature_key', p_feature_key,
      'subscription_status', v_subscription.status
    );
  END IF;

  IF v_subscription.current_period_end < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Subscription expired',
      'feature_key', p_feature_key,
      'expired_date', v_subscription.current_period_end
    );
  END IF;

  IF v_feature.is_core_feature THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'Core feature always allowed'
    );
  END IF;

  CASE v_feature.required_plan_tier
    WHEN 'TRIAL' THEN
      v_result := jsonb_build_object('allowed', true, 'reason', 'Feature available in trial');
    WHEN 'BASIC' THEN
      IF v_subscription.plan_tier IN ('BASIC', 'PROFESSIONAL', 'ENTERPRISE') THEN
        v_result := jsonb_build_object('allowed', true, 'reason', 'Feature allowed by plan');
      ELSE
        v_result := jsonb_build_object('allowed', false, 'reason', 'Upgrade to Basic plan required', 'required_tier', 'BASIC');
      END IF;
    WHEN 'PROFESSIONAL' THEN
      IF v_subscription.plan_tier IN ('PROFESSIONAL', 'ENTERPRISE') THEN
        v_result := jsonb_build_object('allowed', true, 'reason', 'Feature allowed by plan');
      ELSE
        v_result := jsonb_build_object('allowed', false, 'reason', 'Upgrade to Professional plan required', 'required_tier', 'PROFESSIONAL');
      END IF;
    WHEN 'ENTERPRISE' THEN
      IF v_subscription.plan_tier = 'ENTERPRISE' THEN
        v_result := jsonb_build_object('allowed', true, 'reason', 'Feature allowed by plan');
      ELSE
        v_result := jsonb_build_object('allowed', false, 'reason', 'Upgrade to Enterprise plan required', 'required_tier', 'ENTERPRISE');
      END IF;
    ELSE
      v_result := jsonb_build_object('allowed', false, 'reason', 'Unknown plan tier');
  END CASE;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_agency_subscription_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_subscription record;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency association';
  END IF;

  SELECT 
    os.id,
    os.status,
    os.current_period_start,
    os.current_period_end,
    os.trial_end_date,
    os.cancel_at_period_end,
    sp.plan_name,
    sp.plan_tier,
    sp.monthly_price,
    sp.features
  INTO v_subscription
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON sp.id = os.plan_id
  WHERE os.agency_id = v_agency_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_subscription', false,
      'message', 'No active subscription'
    );
  END IF;

  v_result := jsonb_build_object(
    'has_subscription', true,
    'subscription_id', v_subscription.id,
    'status', v_subscription.status,
    'plan_name', v_subscription.plan_name,
    'plan_tier', v_subscription.plan_tier,
    'current_period_start', v_subscription.current_period_start,
    'current_period_end', v_subscription.current_period_end,
    'trial_end_date', v_subscription.trial_end_date,
    'cancel_at_period_end', v_subscription.cancel_at_period_end,
    'is_expired', v_subscription.current_period_end < CURRENT_DATE,
    'days_until_renewal', v_subscription.current_period_end - CURRENT_DATE,
    'features', v_subscription.features
  );

  RETURN v_result;
END;
$$;
