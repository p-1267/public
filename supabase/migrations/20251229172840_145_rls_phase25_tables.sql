/*
  # RLS Policies for Phase 25 Tables

  ## Purpose
  Row-level security policies for financial tables.
  Enforces data access control and agency isolation.

  ## Tables Covered
  1. caregiver_rates
  2. resident_billing_config
  3. payroll_exports
  4. billing_exports
  5. financial_adjustments
  6. financial_audit

  ## Security Principles
  - Financial data is agency-isolated
  - No cross-tenant access
  - Export access restricted to authorized roles only
  - Finance admin and agency admin only
*/

-- ============================================================================
-- caregiver_rates RLS Policies
-- ============================================================================

CREATE POLICY "Finance admins can view caregiver rates"
  ON caregiver_rates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = caregiver_rates.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Finance admins can create caregiver rates"
  ON caregiver_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = caregiver_rates.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Finance admins can update caregiver rates"
  ON caregiver_rates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = caregiver_rates.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = caregiver_rates.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- resident_billing_config RLS Policies
-- ============================================================================

CREATE POLICY "Finance admins can view billing config"
  ON resident_billing_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = resident_billing_config.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Finance admins can create billing config"
  ON resident_billing_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = resident_billing_config.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Finance admins can update billing config"
  ON resident_billing_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = resident_billing_config.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = resident_billing_config.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- payroll_exports RLS Policies
-- ============================================================================

CREATE POLICY "Finance admins can view payroll exports"
  ON payroll_exports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = payroll_exports.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Finance admins can create payroll exports"
  ON payroll_exports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = payroll_exports.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Finance admins can seal payroll exports"
  ON payroll_exports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = payroll_exports.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = payroll_exports.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- billing_exports RLS Policies
-- ============================================================================

CREATE POLICY "Finance admins can view billing exports"
  ON billing_exports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = billing_exports.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Finance admins can create billing exports"
  ON billing_exports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = billing_exports.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Finance admins can seal billing exports"
  ON billing_exports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = billing_exports.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = billing_exports.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- financial_adjustments RLS Policies
-- ============================================================================

CREATE POLICY "Finance admins can view adjustments"
  ON financial_adjustments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = financial_adjustments.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Finance admins can create adjustments"
  ON financial_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = financial_adjustments.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Finance admins can approve adjustments"
  ON financial_adjustments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = financial_adjustments.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = financial_adjustments.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- financial_audit RLS Policies
-- ============================================================================

CREATE POLICY "Finance admins can view financial audit"
  ON financial_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = financial_audit.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can create financial audit logs"
  ON financial_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);
