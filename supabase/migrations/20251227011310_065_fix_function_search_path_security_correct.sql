/*
  # Fix Function Search Path Security

  1. Purpose
    - Set immutable search_path for all functions
    - Prevents search_path hijacking attacks
    - Ensures functions always resolve to correct schema

  2. Security Impact
    - Prevents malicious users from modifying search_path
    - Forces explicit schema qualification
    - Critical for SECURITY DEFINER functions

  3. Functions Modified
    - All RPC functions (agency, user, resident, assignment management)
    - All state transition functions
    - All AI learning input functions
    - Bootstrap and utility functions

  4. Change Applied
    - Sets search_path to 'public, pg_catalog, pg_temp'
    - Ensures consistent schema resolution
*/

-- Agency functions
ALTER FUNCTION get_agency(p_agency_id uuid) 
  SET search_path = 'public, pg_catalog, pg_temp';

ALTER FUNCTION update_agency(p_agency_id uuid, p_metadata jsonb) 
  SET search_path = 'public, pg_catalog, pg_temp';

ALTER FUNCTION create_agency(p_name text, p_metadata jsonb) 
  SET search_path = 'public, pg_catalog, pg_temp';

-- AI learning input functions
ALTER FUNCTION submit_ai_learning_input(p_input_type text, p_input_data jsonb) 
  SET search_path = 'public, pg_catalog, pg_temp';

-- Emergency transition functions
ALTER FUNCTION validate_emergency_transition(p_from_state text, p_to_state text) 
  SET search_path = 'public, pg_catalog, pg_temp';

ALTER FUNCTION request_emergency_transition(p_new_state text, p_expected_version integer) 
  SET search_path = 'public, pg_catalog, pg_temp';

-- State update functions (multiple overloads exist)
ALTER FUNCTION update_offline_online_state(p_new_state text, p_expected_version bigint) 
  SET search_path = 'public, pg_catalog, pg_temp';

ALTER FUNCTION update_offline_online_state(p_new_state text, p_expected_version integer) 
  SET search_path = 'public, pg_catalog, pg_temp';

ALTER FUNCTION update_care_state(p_new_state text, p_expected_version integer) 
  SET search_path = 'public, pg_catalog, pg_temp';

-- Care transition functions
ALTER FUNCTION validate_care_transition(p_from_state text, p_to_state text) 
  SET search_path = 'public, pg_catalog, pg_temp';

ALTER FUNCTION request_care_transition(p_new_state text, p_expected_version bigint, p_action_context jsonb) 
  SET search_path = 'public, pg_catalog, pg_temp';

ALTER FUNCTION log_care_transition(p_actor_id uuid, p_previous_state text, p_new_state text, p_new_version bigint, p_action_context jsonb) 
  SET search_path = 'public, pg_catalog, pg_temp';

-- User management functions
ALTER FUNCTION invite_user(p_email text, p_role_name text, p_agency_id uuid) 
  SET search_path = 'public, pg_catalog, pg_temp';

ALTER FUNCTION assign_user_role(p_user_id uuid, p_role_name text) 
  SET search_path = 'public, pg_catalog, pg_temp';

ALTER FUNCTION deactivate_user(p_user_id uuid) 
  SET search_path = 'public, pg_catalog, pg_temp';

-- Resident management functions
ALTER FUNCTION register_resident(p_full_name text, p_date_of_birth date, p_agency_id uuid) 
  SET search_path = 'public, pg_catalog, pg_temp';

ALTER FUNCTION get_residents(p_agency_id uuid) 
  SET search_path = 'public, pg_catalog, pg_temp';

-- Assignment management functions
ALTER FUNCTION assign_caregiver(p_resident_id uuid, p_caregiver_user_id uuid) 
  SET search_path = 'public, pg_catalog, pg_temp';

ALTER FUNCTION remove_assignment(p_assignment_id uuid) 
  SET search_path = 'public, pg_catalog, pg_temp';

-- Bootstrap function
ALTER FUNCTION bootstrap_super_admin() 
  SET search_path = 'public, pg_catalog, pg_temp';
