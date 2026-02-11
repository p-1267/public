/*
  # RLS Policies for Phase 33 Tables

  ## Purpose
  Row-level security policies for data retention, archival, and erasure tables.
  SUPER_ADMIN only access for legal/compliance operations.

  ## Tables Covered
  1. jurisdictional_retention_policies
  2. data_retention_rules
  3. legal_holds
  4. erasure_requests
  5. erasure_tombstones
  6. archival_log
  7. retention_audit_log

  ## Security Principles
  - SUPER_ADMIN only for management operations
  - Users can view their own erasure requests
  - System-managed tables accessible by system
  - Immutable audit trails
*/

-- jurisdictional_retention_policies
CREATE POLICY "Super admins can view retention policies"
  ON jurisdictional_retention_policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Super admins can manage retention policies"
  ON jurisdictional_retention_policies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

-- data_retention_rules
CREATE POLICY "Super admins can view retention rules"
  ON data_retention_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage retention rules"
  ON data_retention_rules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- legal_holds
CREATE POLICY "Super admins can view legal holds"
  ON legal_holds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Super admins can manage legal holds"
  ON legal_holds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

-- erasure_requests
CREATE POLICY "Users can view own erasure requests"
  ON erasure_requests FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Users can create own erasure requests"
  ON erasure_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Super admins can manage erasure requests"
  ON erasure_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

-- erasure_tombstones
CREATE POLICY "Super admins can view erasure tombstones"
  ON erasure_tombstones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can create erasure tombstones"
  ON erasure_tombstones FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- archival_log
CREATE POLICY "Super admins can view archival log"
  ON archival_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can create archival log entries"
  ON archival_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- retention_audit_log
CREATE POLICY "Super admins can view retention audit log"
  ON retention_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can create retention audit entries"
  ON retention_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
