/*
  # RLS Policies for Phase 22 Tables

  ## Purpose
  Row-level security policies for accessibility and notification tables.
  Enforces data access control and privacy.

  ## Tables Covered
  1. senior_accessibility_settings
  2. family_notification_preferences
  3. agency_notification_policy
  4. notification_log
  5. accessibility_preference_audit

  ## Security Principles
  - Users can only access their own settings
  - Agency admins can view policy
  - Notification logs viewable by recipients
  - Audit logs viewable by authorized users
*/

-- ============================================================================
-- senior_accessibility_settings RLS Policies
-- ============================================================================

CREATE POLICY "Seniors can view own accessibility settings"
  ON senior_accessibility_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Seniors can update own accessibility settings"
  ON senior_accessibility_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create accessibility settings"
  ON senior_accessibility_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- family_notification_preferences RLS Policies
-- ============================================================================

CREATE POLICY "Family can view own notification preferences"
  ON family_notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Family can update own notification preferences"
  ON family_notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notification preferences"
  ON family_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- agency_notification_policy RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own agency notification policy"
  ON agency_notification_policy FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.agency_id = agency_notification_policy.agency_id
    )
  );

CREATE POLICY "Admins can update agency notification policy"
  ON agency_notification_policy FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = agency_notification_policy.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = agency_notification_policy.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can create agency notification policy"
  ON agency_notification_policy FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = agency_notification_policy.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- notification_log RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own notifications"
  ON notification_log FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notification_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notification_log FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- ============================================================================
-- accessibility_preference_audit RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own preference audit"
  ON accessibility_preference_audit FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view agency preference audits"
  ON accessibility_preference_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can create preference audit logs"
  ON accessibility_preference_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);
