/*
  # RLS Policies for Phase 36 Tables

  1. Purpose
    - Enforce tenant isolation at database level
    - Restrict access to metrics and audit logs
    - Only super_admin can access sensitive config
    - No cross-tenant data leakage possible

  2. Tables
    - tenant_metrics
    - system_metrics
    - tenant_quotas
    - tenant_quota_usage
    - tenant_encryption_boundaries
    - tenant_partitioning_config
    - scaling_audit_log

  3. Security
    - Tenant isolation enforced
    - Super admin full access
    - System observability without tenant data access
*/

-- tenant_metrics policies
CREATE POLICY "Super admin full access to tenant metrics"
  ON tenant_metrics
  FOR ALL
  TO authenticated
  USING (current_user_has_permission('super_admin'));

CREATE POLICY "Users can view own tenant metrics"
  ON tenant_metrics
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT agency_id FROM user_profiles
      WHERE id = auth.uid()
    )
    AND current_user_has_permission('view_system_health')
  );

-- system_metrics policies
CREATE POLICY "Super admin full access to system metrics"
  ON system_metrics
  FOR ALL
  TO authenticated
  USING (current_user_has_permission('super_admin'));

CREATE POLICY "System health viewers can read system metrics"
  ON system_metrics
  FOR SELECT
  TO authenticated
  USING (current_user_has_permission('view_system_health'));

-- tenant_quotas policies
CREATE POLICY "Super admin full access to tenant quotas"
  ON tenant_quotas
  FOR ALL
  TO authenticated
  USING (current_user_has_permission('super_admin'));

CREATE POLICY "Users can view own tenant quotas"
  ON tenant_quotas
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT agency_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- tenant_quota_usage policies
CREATE POLICY "Super admin full access to quota usage"
  ON tenant_quota_usage
  FOR ALL
  TO authenticated
  USING (current_user_has_permission('super_admin'));

CREATE POLICY "Users can view own tenant quota usage"
  ON tenant_quota_usage
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT agency_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- tenant_encryption_boundaries policies (super admin only)
CREATE POLICY "Super admin full access to encryption boundaries"
  ON tenant_encryption_boundaries
  FOR ALL
  TO authenticated
  USING (current_user_has_permission('super_admin'));

-- tenant_partitioning_config policies (super admin only)
CREATE POLICY "Super admin full access to partitioning config"
  ON tenant_partitioning_config
  FOR ALL
  TO authenticated
  USING (current_user_has_permission('super_admin'));

-- scaling_audit_log policies (read-only, super admin)
CREATE POLICY "Super admin can read scaling audit log"
  ON scaling_audit_log
  FOR SELECT
  TO authenticated
  USING (current_user_has_permission('super_admin'));

CREATE POLICY "System can insert scaling audit log"
  ON scaling_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Prevent updates and deletes on audit log (immutable)
CREATE POLICY "No updates to scaling audit log"
  ON scaling_audit_log
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "No deletes from scaling audit log"
  ON scaling_audit_log
  FOR DELETE
  TO authenticated
  USING (false);
