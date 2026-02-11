/*
  # Subscription Plans and Feature Gating (Phase 3)

  1. Purpose
    - Define subscription plans
    - Control feature access by plan
    - Track subscription lifecycle
    - Brain-controlled plan enforcement

  2. New Tables
    - `subscription_plans`
      - Plan definitions with features
    
    - `organization_subscriptions`
      - Active subscriptions per agency
      - Stripe integration
    
    - `feature_gates`
      - Feature access rules by plan

  3. Enforcement
    - Brain checks subscription before feature access
    - Expired/invalid subscriptions block features
    - Trial periods enforced
*/

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL UNIQUE,
  plan_tier text NOT NULL CHECK (plan_tier IN ('TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE')),
  monthly_price numeric(10,2) NOT NULL,
  annual_price numeric(10,2) NOT NULL,
  max_residents integer,
  max_caregivers integer,
  max_supervisors integer,
  features jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id text,
  stripe_customer_id text,
  status text NOT NULL CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED')),
  trial_start_date date,
  trial_end_date date,
  current_period_start date NOT NULL,
  current_period_end date NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  billing_interval text NOT NULL CHECK (billing_interval IN ('MONTHLY', 'ANNUAL')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id)
);

CREATE TABLE IF NOT EXISTS feature_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  feature_name text NOT NULL,
  feature_category text NOT NULL,
  required_plan_tier text NOT NULL CHECK (required_plan_tier IN ('TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE')),
  is_core_feature boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_gates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_agency ON organization_subscriptions(agency_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_period_end ON organization_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_feature_gates_key ON feature_gates(feature_key);

CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Agency users can view their subscription"
  ON organization_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.agency_id = organization_subscriptions.agency_id
    )
  );

CREATE POLICY "Agency admins can manage subscriptions"
  ON organization_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND up.agency_id = organization_subscriptions.agency_id
        AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Anyone can view feature gates"
  ON feature_gates FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO subscription_plans (plan_name, plan_tier, monthly_price, annual_price, max_residents, max_caregivers, max_supervisors, features) VALUES
  ('Trial Plan', 'TRIAL', 0.00, 0.00, 5, 3, 1, '{"medication_management": true, "basic_reporting": true}'),
  ('Basic Plan', 'BASIC', 99.00, 990.00, 25, 10, 3, '{"medication_management": true, "basic_reporting": true, "messaging": true}'),
  ('Professional Plan', 'PROFESSIONAL', 299.00, 2990.00, 100, 50, 10, '{"medication_management": true, "advanced_reporting": true, "messaging": true, "analytics": true, "payroll_exports": true}'),
  ('Enterprise Plan', 'ENTERPRISE', 999.00, 9990.00, NULL, NULL, NULL, '{"medication_management": true, "advanced_reporting": true, "messaging": true, "analytics": true, "payroll_exports": true, "billing_exports": true, "api_access": true, "white_label": true}')
ON CONFLICT (plan_name) DO NOTHING;

INSERT INTO feature_gates (feature_key, feature_name, feature_category, required_plan_tier, is_core_feature, description) VALUES
  ('medication_management', 'Medication Management', 'CORE', 'TRIAL', true, 'Core medication tracking and administration'),
  ('emergency_response', 'Emergency Response', 'CORE', 'TRIAL', true, 'Emergency state management'),
  ('basic_reporting', 'Basic Reporting', 'REPORTING', 'TRIAL', false, 'Basic incident and care reports'),
  ('messaging', 'Secure Messaging', 'COMMUNICATION', 'BASIC', false, 'Secure messaging between staff'),
  ('analytics', 'Enterprise Analytics', 'ANALYTICS', 'PROFESSIONAL', false, 'Advanced analytics and insights'),
  ('payroll_exports', 'Payroll Exports', 'FINANCIAL', 'PROFESSIONAL', false, 'Payroll export generation'),
  ('billing_exports', 'Billing Exports', 'FINANCIAL', 'ENTERPRISE', false, 'Insurance billing exports'),
  ('api_access', 'API Access', 'INTEGRATION', 'ENTERPRISE', false, 'REST API access for integrations')
ON CONFLICT (feature_key) DO NOTHING;
