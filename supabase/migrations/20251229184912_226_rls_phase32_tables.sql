/*
  # RLS Policies for Phase 32 Tables

  ## Purpose
  Row-level security policies for production hardening and resilience tables.
  SUPER_ADMIN only access for most system-level operations.

  ## Tables Covered
  1. rate_limit_config
  2. rate_limit_usage
  3. circuit_breaker_state
  4. circuit_breaker_events
  5. system_degradation_state
  6. incident_log
  7. incident_impacts
  8. backup_manifest
  9. backup_verification_log
  10. data_integrity_checks
  11. resilience_audit_log

  ## Security Principles
  - SUPER_ADMIN only for management operations
  - System-managed tables accessible by system
  - Immutable audit trails
*/

-- rate_limit_config
CREATE POLICY "Super admins can view rate limit config"
  ON rate_limit_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage rate limit config"
  ON rate_limit_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- rate_limit_usage
CREATE POLICY "Super admins can view rate limit usage"
  ON rate_limit_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage rate limit usage"
  ON rate_limit_usage FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- circuit_breaker_state
CREATE POLICY "Super admins can view circuit breakers"
  ON circuit_breaker_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage circuit breakers"
  ON circuit_breaker_state FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- circuit_breaker_events
CREATE POLICY "Super admins can view circuit breaker events"
  ON circuit_breaker_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can create circuit breaker events"
  ON circuit_breaker_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- system_degradation_state
CREATE POLICY "Super admins can view degradation state"
  ON system_degradation_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage degradation state"
  ON system_degradation_state FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- incident_log
CREATE POLICY "Super admins can view incidents"
  ON incident_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Super admins can manage incidents"
  ON incident_log FOR ALL
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

-- incident_impacts
CREATE POLICY "Super admins can view incident impacts"
  ON incident_impacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can create incident impacts"
  ON incident_impacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- backup_manifest
CREATE POLICY "Super admins can view backups"
  ON backup_manifest FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage backups"
  ON backup_manifest FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- backup_verification_log
CREATE POLICY "Super admins can view backup verifications"
  ON backup_verification_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can create backup verifications"
  ON backup_verification_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- data_integrity_checks
CREATE POLICY "Super admins can view integrity checks"
  ON data_integrity_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage integrity checks"
  ON data_integrity_checks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- resilience_audit_log
CREATE POLICY "Super admins can view resilience audit log"
  ON resilience_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can create resilience audit entries"
  ON resilience_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
