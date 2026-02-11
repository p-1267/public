/*
  # RLS Policies for Phase 28 Tables

  ## Purpose
  Row-level security policies for consent and transparency tables.
  Enforces data access control and consent verification.

  ## Tables Covered
  1. consent_domains
  2. consent_registry
  3. consent_history
  4. legal_representatives
  5. data_processing_log
  6. third_party_integrations
  7. transparency_access_log

  ## Security Principles
  - Consent is explicit, versioned, and revocable
  - No data processing occurs without valid consent
  - Revocation has immediate effect
  - Transparency is a legal requirement
  - All consent events MUST be auditable
*/

-- ============================================================================
-- consent_domains RLS Policies
-- ============================================================================

CREATE POLICY "All authenticated users can view consent domains"
  ON consent_domains FOR SELECT
  TO authenticated
  USING (consent_domains.is_active = true);

CREATE POLICY "Admins can manage consent domains"
  ON consent_domains FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN')
    )
  );

-- ============================================================================
-- consent_registry RLS Policies
-- ============================================================================

CREATE POLICY "Users can view consent for their residents"
  ON consent_registry FOR SELECT
  TO authenticated
  USING (
    consent_registry.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND (
      -- Admins and supervisors can view all
      EXISTS (
        SELECT 1
        FROM user_profiles up
        JOIN roles r ON r.id = up.role_id
        WHERE up.id = auth.uid()
        AND up.agency_id = consent_registry.agency_id
        AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
      )
      OR
      -- Family can view their linked residents
      (consent_registry.resident_id IN (
        SELECT frl.resident_id
        FROM family_resident_links frl
        WHERE frl.family_user_id = auth.uid()
      ))
      OR
      -- Seniors can view their own
      (consent_registry.resident_id IN (
        SELECT srl.resident_id
        FROM senior_resident_links srl
        WHERE srl.senior_user_id = auth.uid()
      ))
      OR
      -- Users can view their own user consent
      (consent_registry.user_id = auth.uid())
    )
  );

CREATE POLICY "Authorized users can create consent"
  ON consent_registry FOR INSERT
  TO authenticated
  WITH CHECK (
    consent_registry.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND consent_registry.granted_by = auth.uid()
  );

CREATE POLICY "Authorized users can update consent"
  ON consent_registry FOR UPDATE
  TO authenticated
  USING (
    consent_registry.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    consent_registry.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- consent_history RLS Policies
-- ============================================================================

CREATE POLICY "Users can view consent history for their residents"
  ON consent_history FOR SELECT
  TO authenticated
  USING (
    consent_history.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND (
      -- Admins and supervisors can view all
      EXISTS (
        SELECT 1
        FROM user_profiles up
        JOIN roles r ON r.id = up.role_id
        WHERE up.id = auth.uid()
        AND up.agency_id = consent_history.agency_id
        AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
      )
      OR
      -- Family can view their linked residents
      (consent_history.resident_id IN (
        SELECT frl.resident_id
        FROM family_resident_links frl
        WHERE frl.family_user_id = auth.uid()
      ))
      OR
      -- Seniors can view their own
      (consent_history.resident_id IN (
        SELECT srl.resident_id
        FROM senior_resident_links srl
        WHERE srl.senior_user_id = auth.uid()
      ))
      OR
      -- Users can view their own user consent history
      (consent_history.user_id = auth.uid())
    )
  );

CREATE POLICY "System can create consent history"
  ON consent_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- legal_representatives RLS Policies
-- ============================================================================

CREATE POLICY "Users can view legal representatives for their residents"
  ON legal_representatives FOR SELECT
  TO authenticated
  USING (
    legal_representatives.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1
        FROM user_profiles up
        JOIN roles r ON r.id = up.role_id
        WHERE up.id = auth.uid()
        AND up.agency_id = legal_representatives.agency_id
        AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
      )
      OR
      (legal_representatives.resident_id IN (
        SELECT frl.resident_id
        FROM family_resident_links frl
        WHERE frl.family_user_id = auth.uid()
      ))
      OR
      (legal_representatives.representative_user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can create legal representatives"
  ON legal_representatives FOR INSERT
  TO authenticated
  WITH CHECK (
    legal_representatives.verified_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = legal_representatives.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update legal representatives"
  ON legal_representatives FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = legal_representatives.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = legal_representatives.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- data_processing_log RLS Policies
-- ============================================================================

CREATE POLICY "Users can view data processing for their residents"
  ON data_processing_log FOR SELECT
  TO authenticated
  USING (
    data_processing_log.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1
        FROM user_profiles up
        JOIN roles r ON r.id = up.role_id
        WHERE up.id = auth.uid()
        AND up.agency_id = data_processing_log.agency_id
        AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
      )
      OR
      (data_processing_log.resident_id IN (
        SELECT frl.resident_id
        FROM family_resident_links frl
        WHERE frl.family_user_id = auth.uid()
      ))
      OR
      (data_processing_log.resident_id IN (
        SELECT srl.resident_id
        FROM senior_resident_links srl
        WHERE srl.senior_user_id = auth.uid()
      ))
      OR
      (data_processing_log.user_id = auth.uid())
    )
  );

CREATE POLICY "System can create data processing logs"
  ON data_processing_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- third_party_integrations RLS Policies
-- ============================================================================

CREATE POLICY "Users can view third-party integrations for their agency"
  ON third_party_integrations FOR SELECT
  TO authenticated
  USING (
    third_party_integrations.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage third-party integrations"
  ON third_party_integrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = third_party_integrations.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = third_party_integrations.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- transparency_access_log RLS Policies
-- ============================================================================

CREATE POLICY "Users can view their own transparency access log"
  ON transparency_access_log FOR SELECT
  TO authenticated
  USING (transparency_access_log.user_id = auth.uid());

CREATE POLICY "Admins can view agency transparency access log"
  ON transparency_access_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = transparency_access_log.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can create transparency access logs"
  ON transparency_access_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
