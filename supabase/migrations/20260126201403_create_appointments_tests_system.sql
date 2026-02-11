/*
  # Appointments & Tests Management System

  1. New Tables
    - `providers` - healthcare providers, clinics, pharmacies
    - `appointments` - doctor visits, procedures
    - `lab_tests` - lab orders and imaging tests
    - `appointment_prep_instructions` - preparation requirements
    - `appointment_reminders` - reminder schedule
    - `test_results` - lab and imaging results

  2. Security
    - Enable RLS on all tables
    - Seniors can view their own appointments/tests
    - Family can view linked resident appointments/tests
    - Family admin can manage when authorized
    - Caregivers can view assigned resident appointments/tests
*/

-- Providers table
CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('DOCTOR', 'CLINIC', 'PHARMACY', 'LAB', 'IMAGING', 'SPECIALIST', 'HOSPITAL', 'OTHER')),
  name text NOT NULL,
  specialty text,
  phone text,
  fax text,
  email text,
  address jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id)
);

CREATE INDEX idx_providers_agency ON providers(agency_id);
CREATE INDEX idx_providers_type ON providers(provider_type);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id),
  appointment_type text NOT NULL CHECK (appointment_type IN ('DOCTOR_VISIT', 'FOLLOW_UP', 'PROCEDURE', 'CONSULTATION', 'THERAPY', 'SCREENING', 'OTHER')),
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,
  status text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'RUNNING_LATE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED')),
  location text,
  provider_name text,
  cancellation_reason text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  rescheduled_to uuid REFERENCES appointments(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id)
);

CREATE INDEX idx_appointments_resident ON appointments(resident_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Lab tests table
CREATE TABLE IF NOT EXISTS lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id),
  test_type text NOT NULL CHECK (test_type IN ('BLOOD_WORK', 'URINALYSIS', 'IMAGING_XRAY', 'IMAGING_CT', 'IMAGING_MRI', 'IMAGING_ULTRASOUND', 'ECG', 'COLONOSCOPY', 'BIOPSY', 'OTHER')),
  test_name text NOT NULL,
  description text,
  ordered_by text,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  scheduled_at timestamptz,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'ORDERED' CHECK (status IN ('ORDERED', 'SCHEDULED', 'COMPLETED', 'RESULTS_PENDING', 'RESULTS_READY', 'CANCELLED')),
  location text,
  lab_name text,
  fasting_required boolean DEFAULT false,
  special_prep text,
  cancellation_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id)
);

CREATE INDEX idx_lab_tests_resident ON lab_tests(resident_id);
CREATE INDEX idx_lab_tests_status ON lab_tests(status);
CREATE INDEX idx_lab_tests_scheduled ON lab_tests(scheduled_at);

-- Appointment preparation instructions
CREATE TABLE IF NOT EXISTS appointment_prep_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  test_id uuid REFERENCES lab_tests(id) ON DELETE CASCADE,
  instruction_type text NOT NULL CHECK (instruction_type IN ('FASTING', 'MEDICATION', 'DOCUMENTATION', 'CLOTHING', 'TRANSPORTATION', 'OTHER')),
  instruction text NOT NULL,
  priority integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((appointment_id IS NOT NULL AND test_id IS NULL) OR (appointment_id IS NULL AND test_id IS NOT NULL))
);

CREATE INDEX idx_prep_instructions_appointment ON appointment_prep_instructions(appointment_id);
CREATE INDEX idx_prep_instructions_test ON appointment_prep_instructions(test_id);

-- Appointment reminders
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  test_id uuid REFERENCES lab_tests(id) ON DELETE CASCADE,
  remind_at timestamptz NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('ONE_WEEK', 'THREE_DAYS', 'ONE_DAY', 'TWO_HOURS', 'CUSTOM')),
  message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((appointment_id IS NOT NULL AND test_id IS NULL) OR (appointment_id IS NULL AND test_id IS NOT NULL))
);

CREATE INDEX idx_reminders_appointment ON appointment_reminders(appointment_id);
CREATE INDEX idx_reminders_test ON appointment_reminders(test_id);
CREATE INDEX idx_reminders_send ON appointment_reminders(remind_at) WHERE sent_at IS NULL;

-- Test results
CREATE TABLE IF NOT EXISTS test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
  result_date timestamptz NOT NULL,
  result_summary text,
  result_data jsonb,
  abnormal_flags text[],
  provider_notes text,
  document_url text,
  viewed_by_senior_at timestamptz,
  viewed_by_family_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id)
);

CREATE INDEX idx_test_results_test ON test_results(test_id);

-- Enable RLS
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_prep_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for providers
CREATE POLICY "Agency staff can manage providers"
  ON providers FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.agency_id = providers.agency_id
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR'))
  ));

CREATE POLICY "Staff can view agency providers"
  ON providers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.agency_id = providers.agency_id
  ));

-- RLS Policies for appointments
CREATE POLICY "Seniors can view own appointments"
  ON appointments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM senior_resident_links srl
    WHERE srl.resident_id = appointments.resident_id
      AND srl.senior_user_id = auth.uid() AND srl.status = 'active'
  ));

CREATE POLICY "Family can view linked resident appointments"
  ON appointments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM family_resident_links frl
    WHERE frl.resident_id = appointments.resident_id
      AND frl.family_user_id = auth.uid() AND frl.status = 'active'
  ));

CREATE POLICY "Caregivers can view assigned resident appointments"
  ON appointments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN caregiver_assignments ca ON ca.caregiver_user_id = up.id
    WHERE up.id = auth.uid() AND ca.resident_id = appointments.resident_id
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('CAREGIVER', 'SUPERVISOR'))
  ));

CREATE POLICY "Family admin can manage appointments when authorized"
  ON appointments FOR ALL TO authenticated
  USING (check_family_admin_control(auth.uid(), appointments.resident_id))
  WITH CHECK (check_family_admin_control(auth.uid(), appointments.resident_id));

CREATE POLICY "Agency staff can manage appointments"
  ON appointments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN residents r ON r.agency_id = up.agency_id
    WHERE up.id = auth.uid() AND r.id = appointments.resident_id
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN residents r ON r.agency_id = up.agency_id
    WHERE up.id = auth.uid() AND r.id = appointments.resident_id
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR'))
  ));

-- Similar RLS policies for lab_tests
CREATE POLICY "Seniors can view own tests"
  ON lab_tests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM senior_resident_links srl
    WHERE srl.resident_id = lab_tests.resident_id
      AND srl.senior_user_id = auth.uid() AND srl.status = 'active'
  ));

CREATE POLICY "Family can view linked resident tests"
  ON lab_tests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM family_resident_links frl
    WHERE frl.resident_id = lab_tests.resident_id
      AND frl.family_user_id = auth.uid() AND frl.status = 'active'
  ));

CREATE POLICY "Caregivers can view assigned resident tests"
  ON lab_tests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN caregiver_assignments ca ON ca.caregiver_user_id = up.id
    WHERE up.id = auth.uid() AND ca.resident_id = lab_tests.resident_id
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('CAREGIVER', 'SUPERVISOR'))
  ));

CREATE POLICY "Family admin can manage tests when authorized"
  ON lab_tests FOR ALL TO authenticated
  USING (check_family_admin_control(auth.uid(), lab_tests.resident_id))
  WITH CHECK (check_family_admin_control(auth.uid(), lab_tests.resident_id));

CREATE POLICY "Agency staff can manage tests"
  ON lab_tests FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN residents r ON r.agency_id = up.agency_id
    WHERE up.id = auth.uid() AND r.id = lab_tests.resident_id
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN residents r ON r.agency_id = up.agency_id
    WHERE up.id = auth.uid() AND r.id = lab_tests.resident_id
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR'))
  ));

-- RLS for related tables (inherit from parent)
CREATE POLICY "View prep instructions with appointment access"
  ON appointment_prep_instructions FOR SELECT TO authenticated
  USING (
    (appointment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM appointments a WHERE a.id = appointment_prep_instructions.appointment_id
    )) OR
    (test_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM lab_tests lt WHERE lt.id = appointment_prep_instructions.test_id
    ))
  );

CREATE POLICY "Manage prep instructions with appointment access"
  ON appointment_prep_instructions FOR ALL TO authenticated
  USING (
    (appointment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM appointments a WHERE a.id = appointment_prep_instructions.appointment_id
    )) OR
    (test_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM lab_tests lt WHERE lt.id = appointment_prep_instructions.test_id
    ))
  )
  WITH CHECK (
    (appointment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM appointments a WHERE a.id = appointment_prep_instructions.appointment_id
    )) OR
    (test_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM lab_tests lt WHERE lt.id = appointment_prep_instructions.test_id
    ))
  );

CREATE POLICY "View reminders with appointment access"
  ON appointment_reminders FOR SELECT TO authenticated
  USING (
    (appointment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM appointments a WHERE a.id = appointment_reminders.appointment_id
    )) OR
    (test_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM lab_tests lt WHERE lt.id = appointment_reminders.test_id
    ))
  );

CREATE POLICY "View test results with test access"
  ON test_results FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM lab_tests lt WHERE lt.id = test_results.test_id
  ));

CREATE POLICY "Manage test results as staff"
  ON test_results FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM lab_tests lt
    JOIN residents r ON r.id = lt.resident_id
    JOIN user_profiles up ON up.agency_id = r.agency_id
    WHERE lt.id = test_results.test_id AND up.id = auth.uid()
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM lab_tests lt
    JOIN residents r ON r.id = lt.resident_id
    JOIN user_profiles up ON up.agency_id = r.agency_id
    WHERE lt.id = test_results.test_id AND up.id = auth.uid()
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR'))
  ));