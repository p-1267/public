/*
  # Lab Result Notification Trigger
  
  1. Purpose
    - Automatically notify family members when new lab results are available
    - Send critical alerts for abnormal or critical results
    - Create notification log entries for test_results table inserts
    
  2. Implementation
    - Trigger function on test_results INSERT
    - Identifies family members linked to the resident
    - Creates notification_log entries with appropriate priority
    - Includes lab result metadata for display
    
  3. Priority Rules
    - CRITICAL: is_critical = true OR abnormal_flag IN ('HH', 'LL')
    - HIGH: abnormal_flag IN ('H', 'L', 'A')
    - MEDIUM: result_status = 'FINAL'
    - LOW: result_status = 'PRELIMINARY'
*/

-- Create function to notify family of lab results
CREATE OR REPLACE FUNCTION notify_family_of_lab_results()
RETURNS TRIGGER AS $$
DECLARE
  v_lab_test RECORD;
  v_resident_id uuid;
  v_priority text;
  v_title text;
  v_message text;
BEGIN
  -- Get lab test details
  SELECT 
    lt.resident_id,
    lt.test_name,
    lt.test_type
  INTO v_lab_test
  FROM lab_tests lt
  WHERE lt.id = NEW.lab_test_id;

  v_resident_id := v_lab_test.resident_id;

  -- Determine priority based on result characteristics
  IF NEW.is_critical OR NEW.abnormal_flag IN ('HH', 'LL') THEN
    v_priority := 'CRITICAL';
    v_title := '🚨 CRITICAL Lab Result Available';
    v_message := 'A critical lab result requires immediate attention for ' || v_lab_test.test_name || '.';
  ELSIF NEW.abnormal_flag IN ('H', 'L', 'A') THEN
    v_priority := 'HIGH';
    v_title := '⚠️ Abnormal Lab Result Available';
    v_message := 'An abnormal result has been reported for ' || v_lab_test.test_name || '. Please review.';
  ELSIF NEW.result_status = 'FINAL' THEN
    v_priority := 'MEDIUM';
    v_title := 'Lab Result Available';
    v_message := 'Final results are available for ' || v_lab_test.test_name || '.';
  ELSE
    v_priority := 'LOW';
    v_title := 'Preliminary Lab Result Available';
    v_message := 'Preliminary results are available for ' || v_lab_test.test_name || '.';
  END IF;

  -- Create notification for family members
  INSERT INTO notification_log (
    resident_id,
    notification_type,
    title,
    message,
    priority,
    metadata,
    created_at
  )
  SELECT
    v_resident_id,
    'LAB_RESULT',
    v_title,
    v_message,
    v_priority,
    jsonb_build_object(
      'test_result_id', NEW.id,
      'lab_test_id', NEW.lab_test_id,
      'test_name', v_lab_test.test_name,
      'test_type', v_lab_test.test_type,
      'result_status', NEW.result_status,
      'result_date', NEW.result_date,
      'is_critical', NEW.is_critical,
      'abnormal_flag', NEW.abnormal_flag
    ),
    NEW.created_at
  WHERE EXISTS (
    -- Only create notification if resident has family members
    SELECT 1 FROM family_resident_links
    WHERE resident_id = v_resident_id
    LIMIT 1
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_family_lab_results ON test_results;
CREATE TRIGGER trigger_notify_family_lab_results
  AFTER INSERT ON test_results
  FOR EACH ROW
  EXECUTE FUNCTION notify_family_of_lab_results();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION notify_family_of_lab_results() TO authenticated;
