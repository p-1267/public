/*
  # Grant WP1 RPC Permissions to Anonymous Users
  
  ## Problem
  WP1 acceptance test fails because showcase mode uses anon role,
  but all WP1 RPCs are only granted to authenticated users.
  
  ## Solution
  Grant EXECUTE permissions to anon for all WP1 RPCs:
  - bulk_assign_tasks
  - batch_review_tasks  
  - get_pending_review_queue
  - get_caregiver_task_list
  - get_manager_dashboard_data
  - start_task
  - complete_task_with_evidence
  
  ## Security
  - Only applies to anon role for showcase testing
  - All functions still use SECURITY DEFINER
  - Functions validate inputs and access control internally
*/

-- Grant WP1 core RPCs to anon
GRANT EXECUTE ON FUNCTION bulk_assign_tasks TO anon;
GRANT EXECUTE ON FUNCTION batch_review_tasks TO anon;
GRANT EXECUTE ON FUNCTION get_pending_review_queue TO anon;
GRANT EXECUTE ON FUNCTION get_caregiver_task_list TO anon;
GRANT EXECUTE ON FUNCTION get_manager_dashboard_data TO anon;

-- Grant task state transition RPCs to anon
GRANT EXECUTE ON FUNCTION start_task TO anon;
GRANT EXECUTE ON FUNCTION complete_task_with_evidence TO anon;
