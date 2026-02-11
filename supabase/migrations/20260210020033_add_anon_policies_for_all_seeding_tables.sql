/*
  # Add Anonymous Policies for All Tables Needed by Seeding

  ## Purpose
  Allow seed_senior_family_scenario to work fully by giving anon
  access to all tables that might be written during seeding or by
  triggers that fire during seeding.

  ## Security Notes
  - Only for showcase/demo data
  - Production auth still required for real operations
*/

-- Task Categories
DROP POLICY IF EXISTS "anon_can_write_task_categories_for_seeding" ON task_categories;
CREATE POLICY "anon_can_write_task_categories_for_seeding"
  ON task_categories FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Tasks
DROP POLICY IF EXISTS "anon_can_write_tasks_for_seeding" ON tasks;
CREATE POLICY "anon_can_write_tasks_for_seeding"
  ON tasks FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Observation Events
DROP POLICY IF EXISTS "anon_can_write_observation_events_for_seeding" ON observation_events;
CREATE POLICY "anon_can_write_observation_events_for_seeding"
  ON observation_events FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Medication Administration Log
DROP POLICY IF EXISTS "anon_can_write_med_admin_log_for_seeding" ON medication_administration_log;
CREATE POLICY "anon_can_write_med_admin_log_for_seeding"
  ON medication_administration_log FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Intelligence Signals
DROP POLICY IF EXISTS "anon_can_write_intelligence_signals_for_seeding" ON intelligence_signals;
CREATE POLICY "anon_can_write_intelligence_signals_for_seeding"
  ON intelligence_signals FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Departments
DROP POLICY IF EXISTS "anon_can_write_departments_for_seeding" ON departments;
CREATE POLICY "anon_can_write_departments_for_seeding"
  ON departments FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Department Personnel
DROP POLICY IF EXISTS "anon_can_write_dept_personnel_for_seeding" ON department_personnel;
CREATE POLICY "anon_can_write_dept_personnel_for_seeding"
  ON department_personnel FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Audit Log
DROP POLICY IF EXISTS "anon_can_write_audit_log_for_seeding" ON audit_log;
CREATE POLICY "anon_can_write_audit_log_for_seeding"
  ON audit_log FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
