/*
  # Optimize RLS Auth Function Calls (Sample)

  1. Purpose
    - Replace direct auth.uid() calls with (select auth.uid()) in RLS policies
    - Prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Performance Impact
    - Auth function evaluated once per query instead of once per row
    - Can reduce query time by 10x-100x for large datasets
    - Recommended by Supabase for production workloads

  3. Implementation Strategy
    - This migration demonstrates the pattern for critical tables
    - Additional tables should follow the same pattern
    - Pattern: Replace `auth.uid() = column` with `(select auth.uid()) = column`

  4. Tables Optimized (Sample)
    - user_identity_state
    - device_trust
    - senior_accessibility_settings
    - family_notification_preferences
*/

-- user_identity_state: Users can view own identity state
DROP POLICY IF EXISTS "Users can view own identity state" ON public.user_identity_state;
CREATE POLICY "Users can view own identity state"
  ON public.user_identity_state
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- device_trust: Users can register own devices
DROP POLICY IF EXISTS "Users can register own devices" ON public.device_trust;
CREATE POLICY "Users can register own devices"
  ON public.device_trust
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- device_trust: Users can update own devices
DROP POLICY IF EXISTS "Users can update own devices" ON public.device_trust;
CREATE POLICY "Users can update own devices"
  ON public.device_trust
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- device_trust: Users can view own devices
DROP POLICY IF EXISTS "Users can view own devices" ON public.device_trust;
CREATE POLICY "Users can view own devices"
  ON public.device_trust
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- senior_accessibility_settings: Seniors can update own accessibility settings
DROP POLICY IF EXISTS "Seniors can update own accessibility settings" ON public.senior_accessibility_settings;
CREATE POLICY "Seniors can update own accessibility settings"
  ON public.senior_accessibility_settings
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- senior_accessibility_settings: Seniors can view own accessibility settings
DROP POLICY IF EXISTS "Seniors can view own accessibility settings" ON public.senior_accessibility_settings;
CREATE POLICY "Seniors can view own accessibility settings"
  ON public.senior_accessibility_settings
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- senior_accessibility_settings: System can create accessibility settings
DROP POLICY IF EXISTS "System can create accessibility settings" ON public.senior_accessibility_settings;
CREATE POLICY "System can create accessibility settings"
  ON public.senior_accessibility_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id OR (select auth.uid()) IN (
    SELECT id FROM public.user_profiles WHERE role_id IN (
      SELECT id FROM public.roles WHERE name IN ('AGENCY_ADMIN', 'SUPERVISOR')
    )
  ));

-- family_notification_preferences: Family can update own notification preferences
DROP POLICY IF EXISTS "Family can update own notification preferences" ON public.family_notification_preferences;
CREATE POLICY "Family can update own notification preferences"
  ON public.family_notification_preferences
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- family_notification_preferences: Family can view own notification preferences
DROP POLICY IF EXISTS "Family can view own notification preferences" ON public.family_notification_preferences;
CREATE POLICY "Family can view own notification preferences"
  ON public.family_notification_preferences
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- family_notification_preferences: System can create notification preferences
DROP POLICY IF EXISTS "System can create notification preferences" ON public.family_notification_preferences;
CREATE POLICY "System can create notification preferences"
  ON public.family_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id OR (select auth.uid()) IN (
    SELECT id FROM public.user_profiles WHERE role_id IN (
      SELECT id FROM public.roles WHERE name IN ('AGENCY_ADMIN', 'SUPERVISOR')
    )
  ));
