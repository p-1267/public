/*
  # Clean Up Old Showcase Data and Reseed with Fixed ID
  
  Removes showcase data created with random agency ID and recreates with fixed showcase ID.
  
  1. Deletes all data for the old random agency ID (96fbdc02-963a-4d0c-a138-3c2af98ca604)
  2. Runs seed function to create data with fixed ID (a0000000-0000-0000-0000-000000000010)
  
  This ensures ShowcaseContext mockAgencyId matches the actual agency ID in the database.
*/

DO $$
DECLARE
  v_old_agency_id uuid := '96fbdc02-963a-4d0c-a138-3c2af98ca604'::uuid;
BEGIN
  -- Delete showcase data with wrong agency ID (in correct FK order)
  DELETE FROM health_metric_trends WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_old_agency_id);
  DELETE FROM health_metrics WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_old_agency_id);
  DELETE FROM device_pairing_audit WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_old_agency_id);
  DELETE FROM device_registry WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_old_agency_id);
  DELETE FROM lab_tests WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_old_agency_id);
  DELETE FROM appointments WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_old_agency_id);
  DELETE FROM resident_medications WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_old_agency_id);
  DELETE FROM resident_emergency_contacts WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_old_agency_id);
  DELETE FROM task_evidence WHERE task_id IN (SELECT id FROM tasks WHERE agency_id = v_old_agency_id);
  DELETE FROM supervisor_reviews WHERE task_id IN (SELECT id FROM tasks WHERE agency_id = v_old_agency_id);
  DELETE FROM tasks WHERE agency_id = v_old_agency_id;
  DELETE FROM caregiver_assignments WHERE agency_id = v_old_agency_id;
  DELETE FROM department_personnel WHERE agency_id = v_old_agency_id;
  DELETE FROM departments WHERE agency_id = v_old_agency_id;
  DELETE FROM user_profiles WHERE agency_id = v_old_agency_id;
  DELETE FROM residents WHERE agency_id = v_old_agency_id;
  DELETE FROM task_categories WHERE agency_id = v_old_agency_id;
  DELETE FROM agencies WHERE id = v_old_agency_id;
  
  RAISE NOTICE 'Deleted old showcase data with agency ID: %', v_old_agency_id;
END $$;

-- Now run the seed function to create data with correct fixed ID
SELECT seed_senior_family_scenario();