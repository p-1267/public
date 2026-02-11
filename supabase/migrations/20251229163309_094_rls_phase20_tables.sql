/*
  # RLS Policies for Phase 20 Tables

  ## Purpose
  Row-level security policies for resident baseline tables.
  Enforces data access control and privacy.

  ## Tables Covered
  1. resident_baselines
  2. resident_emergency_contacts
  3. resident_physicians
  4. resident_medications
  5. resident_care_plan_anchors
  6. resident_consent_config
  7. resident_baseline_audit

  ## Security Principles
  - Users can only view residents they have membership for
  - Admins/supervisors can view agency residents
  - Modifications require explicit permissions
  - Sealed baselines are read-only
*/

-- ============================================================================
-- resident_baselines RLS Policies
-- ============================================================================

CREATE POLICY "Users can view baselines for assigned residents"
  ON resident_baselines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships um
      WHERE um.user_id = auth.uid()
      AND um.resident_id = resident_baselines.resident_id
      AND um.is_active = true
    ) OR
    EXISTS (
      SELECT 1
      FROM residents r
      JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE r.id = resident_baselines.resident_id
      AND up.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('resident.view', 'agency.manage')
      )
    )
  );

CREATE POLICY "Authorized users can create baselines"
  ON resident_baselines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.create', 'resident.update', 'agency.manage')
    )
  );

CREATE POLICY "Authorized users can update unsealed baselines"
  ON resident_baselines FOR UPDATE
  TO authenticated
  USING (
    is_sealed = false AND
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  )
  WITH CHECK (
    is_sealed = false AND
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  );

-- ============================================================================
-- resident_emergency_contacts RLS Policies
-- ============================================================================

CREATE POLICY "Users can view emergency contacts for assigned residents"
  ON resident_emergency_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships um
      WHERE um.user_id = auth.uid()
      AND um.resident_id = resident_emergency_contacts.resident_id
      AND um.is_active = true
    ) OR
    EXISTS (
      SELECT 1
      FROM residents r
      JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE r.id = resident_emergency_contacts.resident_id
      AND up.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('resident.view', 'agency.manage')
      )
    )
  );

CREATE POLICY "Authorized users can add emergency contacts"
  ON resident_emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.create', 'resident.update', 'agency.manage')
    )
  );

CREATE POLICY "Authorized users can update emergency contacts"
  ON resident_emergency_contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  );

-- ============================================================================
-- resident_physicians RLS Policies
-- ============================================================================

CREATE POLICY "Users can view physicians for assigned residents"
  ON resident_physicians FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships um
      WHERE um.user_id = auth.uid()
      AND um.resident_id = resident_physicians.resident_id
      AND um.is_active = true
    ) OR
    EXISTS (
      SELECT 1
      FROM residents r
      JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE r.id = resident_physicians.resident_id
      AND up.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('resident.view', 'agency.manage')
      )
    )
  );

CREATE POLICY "Authorized users can add physicians"
  ON resident_physicians FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.create', 'resident.update', 'agency.manage')
    )
  );

CREATE POLICY "Authorized users can update physicians"
  ON resident_physicians FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  );

-- ============================================================================
-- resident_medications RLS Policies
-- ============================================================================

CREATE POLICY "Users can view medications for assigned residents"
  ON resident_medications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships um
      WHERE um.user_id = auth.uid()
      AND um.resident_id = resident_medications.resident_id
      AND um.is_active = true
    ) OR
    EXISTS (
      SELECT 1
      FROM residents r
      JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE r.id = resident_medications.resident_id
      AND up.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('resident.view', 'agency.manage')
      )
    )
  );

CREATE POLICY "Authorized users can add medications"
  ON resident_medications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.create', 'resident.update', 'agency.manage')
    )
  );

CREATE POLICY "Authorized users can update medications"
  ON resident_medications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  );

-- ============================================================================
-- resident_care_plan_anchors RLS Policies
-- ============================================================================

CREATE POLICY "Users can view care plans for assigned residents"
  ON resident_care_plan_anchors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships um
      WHERE um.user_id = auth.uid()
      AND um.resident_id = resident_care_plan_anchors.resident_id
      AND um.is_active = true
    ) OR
    EXISTS (
      SELECT 1
      FROM residents r
      JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE r.id = resident_care_plan_anchors.resident_id
      AND up.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('resident.view', 'agency.manage')
      )
    )
  );

CREATE POLICY "Authorized users can create care plans"
  ON resident_care_plan_anchors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.create', 'resident.update', 'agency.manage')
    )
  );

CREATE POLICY "Authorized users can update care plans"
  ON resident_care_plan_anchors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  );

-- ============================================================================
-- resident_consent_config RLS Policies
-- ============================================================================

CREATE POLICY "Users can view consent config for assigned residents"
  ON resident_consent_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships um
      WHERE um.user_id = auth.uid()
      AND um.resident_id = resident_consent_config.resident_id
      AND um.is_active = true
    ) OR
    EXISTS (
      SELECT 1
      FROM residents r
      JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE r.id = resident_consent_config.resident_id
      AND up.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('resident.view', 'agency.manage')
      )
    )
  );

CREATE POLICY "Authorized users can create consent config"
  ON resident_consent_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.create', 'resident.update', 'agency.manage')
    )
  );

CREATE POLICY "Authorized users can update consent config"
  ON resident_consent_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('resident.update', 'agency.manage')
    )
  );

-- ============================================================================
-- resident_baseline_audit RLS Policies
-- ============================================================================

CREATE POLICY "Users can view audit logs for assigned residents"
  ON resident_baseline_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships um
      WHERE um.user_id = auth.uid()
      AND um.resident_id = resident_baseline_audit.resident_id
      AND um.is_active = true
    ) OR
    EXISTS (
      SELECT 1
      FROM residents r
      JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE r.id = resident_baseline_audit.resident_id
      AND up.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('audit.view', 'agency.manage')
      )
    )
  );

CREATE POLICY "System can create audit logs"
  ON resident_baseline_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);
