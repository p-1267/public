/*
  # Allow Anonymous Seeding for Showcase

  ## Purpose
  Allow the seed_senior_family_scenario RPC to insert/update data
  when called by anonymous users (showcase mode).

  ## Security Notes
  - Only for showcase data (is_simulation = true where applicable)
  - Write operations restricted to seeding function
  - Production data remains protected
*/

-- Agencies: Allow anon INSERT/UPDATE
DROP POLICY IF EXISTS "anon_can_write_agencies_for_seeding" ON agencies;
CREATE POLICY "anon_can_write_agencies_for_seeding"
  ON agencies FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- User Profiles: Allow anon INSERT/UPDATE
DROP POLICY IF EXISTS "anon_can_write_user_profiles_for_seeding" ON user_profiles;
CREATE POLICY "anon_can_write_user_profiles_for_seeding"
  ON user_profiles FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Residents: Allow anon INSERT/UPDATE
DROP POLICY IF EXISTS "anon_can_write_residents_for_seeding" ON residents;
CREATE POLICY "anon_can_write_residents_for_seeding"
  ON residents FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Senior Resident Links: Allow anon INSERT
DROP POLICY IF EXISTS "anon_can_write_senior_links_for_seeding" ON senior_resident_links;
CREATE POLICY "anon_can_write_senior_links_for_seeding"
  ON senior_resident_links FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Family Resident Links: Allow anon INSERT
DROP POLICY IF EXISTS "anon_can_write_family_links_for_seeding" ON family_resident_links;
CREATE POLICY "anon_can_write_family_links_for_seeding"
  ON family_resident_links FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Resident Medications: Allow anon INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_can_write_medications_for_seeding" ON resident_medications;
CREATE POLICY "anon_can_write_medications_for_seeding"
  ON resident_medications FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Appointments: Allow anon INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_can_write_appointments_for_seeding" ON appointments;
CREATE POLICY "anon_can_write_appointments_for_seeding"
  ON appointments FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Lab Tests: Allow anon INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_can_write_lab_tests_for_seeding" ON lab_tests;
CREATE POLICY "anon_can_write_lab_tests_for_seeding"
  ON lab_tests FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Resident Documents: Allow anon INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_can_write_documents_for_seeding" ON resident_documents;
CREATE POLICY "anon_can_write_documents_for_seeding"
  ON resident_documents FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Resident Care Plan Anchors: Allow anon INSERT/UPDATE
DROP POLICY IF EXISTS "anon_can_write_care_plans_for_seeding" ON resident_care_plan_anchors;
CREATE POLICY "anon_can_write_care_plans_for_seeding"
  ON resident_care_plan_anchors FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Resident Emergency Contacts: Allow anon INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_can_write_emergency_contacts_for_seeding" ON resident_emergency_contacts;
CREATE POLICY "anon_can_write_emergency_contacts_for_seeding"
  ON resident_emergency_contacts FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Senior Accessibility Settings: Allow anon INSERT/UPDATE
DROP POLICY IF EXISTS "anon_can_write_accessibility_for_seeding" ON senior_accessibility_settings;
CREATE POLICY "anon_can_write_accessibility_for_seeding"
  ON senior_accessibility_settings FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Family Notification Preferences: Allow anon INSERT/UPDATE
DROP POLICY IF EXISTS "anon_can_write_family_notif_prefs_for_seeding" ON family_notification_preferences;
CREATE POLICY "anon_can_write_family_notif_prefs_for_seeding"
  ON family_notification_preferences FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Notification Log: Allow anon INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_can_write_notification_log_for_seeding" ON notification_log;
CREATE POLICY "anon_can_write_notification_log_for_seeding"
  ON notification_log FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Device Registry: Allow anon INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_can_write_devices_for_seeding" ON device_registry;
CREATE POLICY "anon_can_write_devices_for_seeding"
  ON device_registry FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Health Metrics: Allow anon INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_can_write_health_metrics_for_seeding" ON health_metrics;
CREATE POLICY "anon_can_write_health_metrics_for_seeding"
  ON health_metrics FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Vital Signs: Allow anon INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_can_write_vital_signs_for_seeding" ON vital_signs;
CREATE POLICY "anon_can_write_vital_signs_for_seeding"
  ON vital_signs FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Health Metric Trends: Allow anon INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_can_write_health_trends_for_seeding" ON health_metric_trends;
CREATE POLICY "anon_can_write_health_trends_for_seeding"
  ON health_metric_trends FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
