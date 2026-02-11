/*
  # Add Anonymous Access for Showcase Mode

  ## Purpose
  Allow anonymous users to read showcase data for demo purposes.
  This enables the Senior/Family showcase scenario to work without authentication.

  ## Security Notes
  - Only SELECT (read) operations allowed for anon
  - All mutations still require authentication
  - Drops existing policies if they exist, then recreates
*/

-- Appointments
DROP POLICY IF EXISTS "anon_can_read_appointments_showcase" ON appointments;
CREATE POLICY "anon_can_read_appointments_showcase"
  ON appointments FOR SELECT TO anon USING (true);

-- Resident Medications
DROP POLICY IF EXISTS "anon_can_read_medications_showcase" ON resident_medications;
CREATE POLICY "anon_can_read_medications_showcase"
  ON resident_medications FOR SELECT TO anon USING (true);

-- Device Registry
DROP POLICY IF EXISTS "anon_can_read_devices_showcase" ON device_registry;
CREATE POLICY "anon_can_read_devices_showcase"
  ON device_registry FOR SELECT TO anon USING (true);

-- Residents
DROP POLICY IF EXISTS "anon_can_read_residents_showcase" ON residents;
CREATE POLICY "anon_can_read_residents_showcase"
  ON residents FOR SELECT TO anon USING (true);

-- Agencies
DROP POLICY IF EXISTS "anon_can_read_agencies_showcase" ON agencies;
CREATE POLICY "anon_can_read_agencies_showcase"
  ON agencies FOR SELECT TO anon USING (true);

-- User Profiles
DROP POLICY IF EXISTS "anon_can_read_user_profiles_showcase" ON user_profiles;
CREATE POLICY "anon_can_read_user_profiles_showcase"
  ON user_profiles FOR SELECT TO anon USING (true);

-- Senior Resident Links
DROP POLICY IF EXISTS "anon_can_read_senior_links_showcase" ON senior_resident_links;
CREATE POLICY "anon_can_read_senior_links_showcase"
  ON senior_resident_links FOR SELECT TO anon USING (true);

-- Family Resident Links
DROP POLICY IF EXISTS "anon_can_read_family_links_showcase" ON family_resident_links;
CREATE POLICY "anon_can_read_family_links_showcase"
  ON family_resident_links FOR SELECT TO anon USING (true);

-- Resident Access Tokens
DROP POLICY IF EXISTS "anon_can_read_access_tokens_showcase" ON resident_access_tokens;
CREATE POLICY "anon_can_read_access_tokens_showcase"
  ON resident_access_tokens FOR SELECT TO anon USING (true);

-- Health Metrics (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'health_metrics') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_can_read_health_metrics_showcase" ON health_metrics';
    EXECUTE 'CREATE POLICY "anon_can_read_health_metrics_showcase" ON health_metrics FOR SELECT TO anon USING (true)';
  END IF;
END $$;

-- Vital Signs (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vital_signs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_can_read_vital_signs_showcase" ON vital_signs';
    EXECUTE 'CREATE POLICY "anon_can_read_vital_signs_showcase" ON vital_signs FOR SELECT TO anon USING (true)';
  END IF;
END $$;

-- Provider Messages (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provider_messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_can_read_provider_messages_showcase" ON provider_messages';
    EXECUTE 'CREATE POLICY "anon_can_read_provider_messages_showcase" ON provider_messages FOR SELECT TO anon USING (true)';
  END IF;
END $$;

-- Wearable Devices (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wearable_devices') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_can_read_wearable_devices_showcase" ON wearable_devices';
    EXECUTE 'CREATE POLICY "anon_can_read_wearable_devices_showcase" ON wearable_devices FOR SELECT TO anon USING (true)';
  END IF;
END $$;

-- Message Templates (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_templates') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_can_read_message_templates_showcase" ON message_templates';
    EXECUTE 'CREATE POLICY "anon_can_read_message_templates_showcase" ON message_templates FOR SELECT TO anon USING (true)';
  END IF;
END $$;
