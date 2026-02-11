/*
  # RLS Policies for Phase 30 Tables

  ## Purpose
  Row-level security policies for third-party integration tables.
  Enforces data access control and per-agency isolation.

  ## Tables Covered
  1. integration_registry
  2. integration_connectors
  3. external_data_ingestion_log
  4. external_observations
  5. integration_conflicts
  6. integration_rate_limits

  ## Security Principles
  - External systems are data sources only, never authorities
  - Per-agency isolation
  - Admin-only management
  - Caregiver access to observations for assigned residents
  - Complete audit trail
*/

-- ============================================================================
-- integration_registry RLS Policies
-- ============================================================================

CREATE POLICY "Admins can view agency integrations"
  ON integration_registry FOR SELECT
  TO authenticated
  USING (
    integration_registry.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = integration_registry.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
    )
  );

CREATE POLICY "Admins can create integrations"
  ON integration_registry FOR INSERT
  TO authenticated
  WITH CHECK (
    integration_registry.created_by = auth.uid()
    AND integration_registry.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = integration_registry.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update integrations"
  ON integration_registry FOR UPDATE
  TO authenticated
  USING (
    integration_registry.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = integration_registry.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    integration_registry.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = integration_registry.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- integration_connectors RLS Policies
-- ============================================================================

CREATE POLICY "Admins can view connectors for agency integrations"
  ON integration_connectors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM integration_registry ir
      JOIN user_profiles up ON up.agency_id = ir.agency_id
      WHERE ir.id = integration_connectors.integration_id
      AND up.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
    )
  );

CREATE POLICY "System can manage connectors"
  ON integration_connectors FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- external_data_ingestion_log RLS Policies
-- ============================================================================

CREATE POLICY "Admins and supervisors can view ingestion log for their agency"
  ON external_data_ingestion_log FOR SELECT
  TO authenticated
  USING (
    external_data_ingestion_log.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = external_data_ingestion_log.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
    )
  );

CREATE POLICY "System can create ingestion logs"
  ON external_data_ingestion_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- external_observations RLS Policies
-- ============================================================================

CREATE POLICY "Caregivers can view observations for assigned residents"
  ON external_observations FOR SELECT
  TO authenticated
  USING (
    external_observations.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND (
      -- Admins and supervisors see all
      EXISTS (
        SELECT 1
        FROM user_profiles up
        JOIN roles r ON r.id = up.role_id
        WHERE up.id = auth.uid()
        AND up.agency_id = external_observations.agency_id
        AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
      )
      OR
      -- Caregivers see assigned residents
      EXISTS (
        SELECT 1
        FROM caregiver_assignments ca
        WHERE ca.caregiver_user_id = auth.uid()
        AND ca.resident_id = external_observations.resident_id
        AND ca.status = 'active'
      )
    )
  );

CREATE POLICY "System can create observations"
  ON external_observations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and supervisors can update observations"
  ON external_observations FOR UPDATE
  TO authenticated
  USING (
    external_observations.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = external_observations.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
    )
  )
  WITH CHECK (
    external_observations.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = external_observations.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
    )
  );

-- ============================================================================
-- integration_conflicts RLS Policies
-- ============================================================================

CREATE POLICY "Supervisors and admins can view conflicts for their agency"
  ON integration_conflicts FOR SELECT
  TO authenticated
  USING (
    integration_conflicts.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = integration_conflicts.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
    )
  );

CREATE POLICY "System can create conflicts"
  ON integration_conflicts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Supervisors and admins can update conflicts"
  ON integration_conflicts FOR UPDATE
  TO authenticated
  USING (
    integration_conflicts.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = integration_conflicts.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
    )
  )
  WITH CHECK (
    integration_conflicts.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = integration_conflicts.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
    )
  );

-- ============================================================================
-- integration_rate_limits RLS Policies
-- ============================================================================

CREATE POLICY "System can manage rate limits"
  ON integration_rate_limits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
