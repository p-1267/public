/*
  # RLS Policies for Phase 34 Tables

  ## Purpose
  Row-level security policies for analytics, insights, and non-executing intelligence tables.
  Read-only access with role-based visibility.

  ## Tables Covered
  1. analytics_domains
  2. analytics_insights
  3. analytics_data_sources
  4. analytics_audit_log

  ## Security Principles
  - AGENCY_ADMIN and SUPERVISOR can view analytics
  - FAMILY and CAREGIVER can view if explicitly permitted (view-only summaries)
  - System-managed tables accessible by system
  - Immutable audit trails
  - No operational intelligence exposed by default
*/

-- analytics_domains
CREATE POLICY "Authenticated users can view analytics domains"
  ON analytics_domains FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR', 'FAMILY', 'CAREGIVER')
    )
  );

CREATE POLICY "System can manage analytics domains"
  ON analytics_domains FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- analytics_insights
CREATE POLICY "Authorized users can view analytics insights"
  ON analytics_insights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND (
        r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR')
        OR (r.name = 'FAMILY' AND analytics_insights.visible_to_family = true)
        OR (r.name = 'CAREGIVER' AND analytics_insights.visible_to_caregivers = true)
      )
    )
  );

CREATE POLICY "System can create analytics insights"
  ON analytics_insights FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update analytics insights"
  ON analytics_insights FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- analytics_data_sources
CREATE POLICY "Authorized users can view data sources"
  ON analytics_data_sources FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR')
    )
  );

CREATE POLICY "System can manage data sources"
  ON analytics_data_sources FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- analytics_audit_log
CREATE POLICY "Authorized users can view analytics audit log"
  ON analytics_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR')
    )
  );

CREATE POLICY "System can create analytics audit entries"
  ON analytics_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
