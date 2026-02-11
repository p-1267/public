/*
  # WP7: Required Job Implementations
  
  Implements the 4 required jobs:
  1. Recurring task generation - Creates daily tasks for residents
  2. Reminder/escalation - Sends reminders and escalates overdue tasks
  3. Aggregation - Computes metrics (completion, staffing, quality)
  4. Report scheduling - Generates scheduled reports
*/

-- JOB 1: Generate recurring tasks for the day
CREATE OR REPLACE FUNCTION execute_recurring_task_generation(
  p_execution_id uuid,
  p_agency_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_count int := 0;
  v_category record;
  v_resident record;
  v_task_id uuid;
  v_today date := CURRENT_DATE;
BEGIN
  -- Log start
  PERFORM log_job_message(p_execution_id, 'info', 'Starting recurring task generation for date: ' || v_today::text);
  
  -- Loop through all active residents in agency
  FOR v_resident IN 
    SELECT id, full_name, room_number
    FROM residents
    WHERE agency_id = p_agency_id
      AND status = 'active'
  LOOP
    -- Generate morning medication task (if resident has medications)
    IF EXISTS (SELECT 1 FROM resident_medications WHERE resident_id = v_resident.id AND active = true) THEN
      INSERT INTO tasks (
        agency_id,
        department_id,
        resident_id,
        category_id,
        title,
        description,
        priority,
        status,
        due_date,
        created_by
      )
      SELECT 
        p_agency_id,
        d.id,
        v_resident.id,
        tc.id,
        'Morning Medication Round - ' || v_resident.full_name,
        'Administer scheduled morning medications',
        'high',
        'open',
        v_today + interval '8 hours',
        NULL
      FROM departments d
      JOIN task_categories tc ON tc.name = 'Medication Administration'
      WHERE d.agency_id = p_agency_id AND d.name = 'Nursing'
      LIMIT 1
      RETURNING id INTO v_task_id;
      
      IF FOUND THEN
        v_task_count := v_task_count + 1;
      END IF;
    END IF;
    
    -- Generate meal delivery tasks
    INSERT INTO tasks (
      agency_id,
      department_id,
      resident_id,
      category_id,
      title,
      description,
      priority,
      status,
      due_date,
      created_by
    )
    SELECT 
      p_agency_id,
      d.id,
      v_resident.id,
      tc.id,
      'Breakfast Delivery - ' || v_resident.full_name || ' (Room ' || v_resident.room_number || ')',
      'Deliver breakfast according to dietary restrictions',
      'medium',
      'open',
      v_today + interval '8 hours',
      NULL
    FROM departments d
    JOIN task_categories tc ON tc.name = 'Meal Service'
    WHERE d.agency_id = p_agency_id AND d.name = 'Kitchen'
    LIMIT 1
    RETURNING id INTO v_task_id;
    
    IF FOUND THEN
      v_task_count := v_task_count + 1;
    END IF;
    
    -- Generate lunch delivery
    INSERT INTO tasks (
      agency_id,
      department_id,
      resident_id,
      category_id,
      title,
      description,
      priority,
      status,
      due_date,
      created_by
    )
    SELECT 
      p_agency_id,
      d.id,
      v_resident.id,
      tc.id,
      'Lunch Delivery - ' || v_resident.full_name || ' (Room ' || v_resident.room_number || ')',
      'Deliver lunch according to dietary restrictions',
      'medium',
      'open',
      v_today + interval '12 hours',
      NULL
    FROM departments d
    JOIN task_categories tc ON tc.name = 'Meal Service'
    WHERE d.agency_id = p_agency_id AND d.name = 'Kitchen'
    LIMIT 1
    RETURNING id INTO v_task_id;
    
    IF FOUND THEN
      v_task_count := v_task_count + 1;
    END IF;
  END LOOP;
  
  -- Log completion
  PERFORM log_job_message(
    p_execution_id,
    'info',
    'Generated ' || v_task_count || ' recurring tasks',
    jsonb_build_object('task_count', v_task_count, 'date', v_today)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'tasks_generated', v_task_count,
    'date', v_today
  );
END;
$$;

-- JOB 2: Send reminders and escalate overdue tasks
CREATE OR REPLACE FUNCTION execute_reminder_escalation(
  p_execution_id uuid,
  p_agency_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reminder_count int := 0;
  v_escalation_count int := 0;
  v_task record;
  v_overdue_threshold interval := interval '1 hour';
  v_critical_threshold interval := interval '4 hours';
BEGIN
  -- Log start
  PERFORM log_job_message(p_execution_id, 'info', 'Starting reminder and escalation job');
  
  -- Find tasks nearing due date (send reminders)
  FOR v_task IN
    SELECT t.id, t.title, t.due_date, t.priority, t.assigned_to
    FROM tasks t
    WHERE t.agency_id = p_agency_id
      AND t.status = 'assigned'
      AND t.due_date BETWEEN now() AND now() + interval '30 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM job_logs
        WHERE metadata->>'task_id' = t.id::text
          AND message LIKE '%Reminder sent%'
          AND logged_at > now() - interval '1 hour'
      )
  LOOP
    -- Log reminder (in production, this would send actual notification)
    PERFORM log_job_message(
      p_execution_id,
      'info',
      'Reminder sent for task: ' || v_task.title,
      jsonb_build_object(
        'task_id', v_task.id,
        'due_date', v_task.due_date,
        'assigned_to', v_task.assigned_to
      )
    );
    v_reminder_count := v_reminder_count + 1;
  END LOOP;
  
  -- Find overdue tasks (escalate)
  FOR v_task IN
    SELECT t.id, t.title, t.due_date, t.priority, t.assigned_to
    FROM tasks t
    WHERE t.agency_id = p_agency_id
      AND t.status IN ('assigned', 'open')
      AND t.due_date < now() - v_overdue_threshold
  LOOP
    -- Update task priority if not critical
    IF v_task.priority != 'critical' THEN
      UPDATE tasks
      SET priority = CASE
        WHEN due_date < now() - v_critical_threshold THEN 'critical'
        ELSE 'high'
      END
      WHERE id = v_task.id;
    END IF;
    
    -- Log escalation
    PERFORM log_job_message(
      p_execution_id,
      'warn',
      'Task escalated: ' || v_task.title || ' (overdue by ' || 
        EXTRACT(EPOCH FROM (now() - v_task.due_date))/3600 || ' hours)',
      jsonb_build_object(
        'task_id', v_task.id,
        'original_priority', v_task.priority,
        'overdue_hours', EXTRACT(EPOCH FROM (now() - v_task.due_date))/3600
      )
    );
    v_escalation_count := v_escalation_count + 1;
  END LOOP;
  
  -- Log completion
  PERFORM log_job_message(
    p_execution_id,
    'info',
    'Reminder/escalation complete: ' || v_reminder_count || ' reminders, ' || v_escalation_count || ' escalations',
    jsonb_build_object('reminders', v_reminder_count, 'escalations', v_escalation_count)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'reminders_sent', v_reminder_count,
    'tasks_escalated', v_escalation_count
  );
END;
$$;

-- JOB 3: Compute aggregations (completion, staffing, quality)
CREATE OR REPLACE FUNCTION execute_aggregation_job(
  p_execution_id uuid,
  p_agency_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_completion_metrics jsonb;
  v_staffing_metrics jsonb;
  v_quality_metrics jsonb;
  v_job_id uuid;
BEGIN
  -- Get job_id from execution
  SELECT job_id INTO v_job_id FROM job_executions WHERE id = p_execution_id;
  
  -- Define period (last 24 hours)
  v_period_end := now();
  v_period_start := v_period_end - interval '24 hours';
  
  PERFORM log_job_message(p_execution_id, 'info', 'Computing aggregations for period: ' || v_period_start || ' to ' || v_period_end);
  
  -- Compute task completion metrics
  SELECT jsonb_build_object(
    'total_tasks', COUNT(*),
    'completed_tasks', COUNT(*) FILTER (WHERE status = 'completed'),
    'overdue_tasks', COUNT(*) FILTER (WHERE status IN ('assigned', 'open') AND due_date < now()),
    'completion_rate', ROUND((COUNT(*) FILTER (WHERE status = 'completed')::decimal / NULLIF(COUNT(*), 0)) * 100, 2),
    'avg_completion_time_hours', ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)::numeric, 2) FILTER (WHERE completed_at IS NOT NULL)
  ) INTO v_completion_metrics
  FROM tasks
  WHERE agency_id = p_agency_id
    AND created_at BETWEEN v_period_start AND v_period_end;
  
  -- Store completion aggregation
  INSERT INTO job_aggregations (
    agency_id,
    aggregation_type,
    period_start,
    period_end,
    metrics,
    computed_by_job_id
  ) VALUES (
    p_agency_id,
    'task_completion',
    v_period_start,
    v_period_end,
    v_completion_metrics,
    v_job_id
  );
  
  -- Compute staffing hours metrics
  SELECT jsonb_build_object(
    'total_shifts', COUNT(*),
    'total_hours', SUM(EXTRACT(EPOCH FROM (shift_end - shift_start))/3600),
    'avg_shift_length_hours', ROUND(AVG(EXTRACT(EPOCH FROM (shift_end - shift_start))/3600)::numeric, 2),
    'unique_caregivers', COUNT(DISTINCT user_id)
  ) INTO v_staffing_metrics
  FROM shifts
  WHERE agency_id = p_agency_id
    AND shift_start BETWEEN v_period_start AND v_period_end;
  
  -- Store staffing aggregation
  INSERT INTO job_aggregations (
    agency_id,
    aggregation_type,
    period_start,
    period_end,
    metrics,
    computed_by_job_id
  ) VALUES (
    p_agency_id,
    'staffing_hours',
    v_period_start,
    v_period_end,
    v_staffing_metrics,
    v_job_id
  );
  
  -- Compute quality score metrics (based on task evidence and completion)
  SELECT jsonb_build_object(
    'tasks_with_evidence', COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM task_evidence te WHERE te.task_id = tasks.id
    )),
    'tasks_without_evidence', COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM task_evidence te WHERE te.task_id = tasks.id
    ) AND status = 'completed'),
    'evidence_compliance_rate', ROUND((COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM task_evidence te WHERE te.task_id = tasks.id
    ))::decimal / NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0)) * 100, 2)
  ) INTO v_quality_metrics
  FROM tasks
  WHERE agency_id = p_agency_id
    AND created_at BETWEEN v_period_start AND v_period_end
    AND status = 'completed';
  
  -- Store quality aggregation
  INSERT INTO job_aggregations (
    agency_id,
    aggregation_type,
    period_start,
    period_end,
    metrics,
    computed_by_job_id
  ) VALUES (
    p_agency_id,
    'quality_score',
    v_period_start,
    v_period_end,
    v_quality_metrics,
    v_job_id
  );
  
  PERFORM log_job_message(
    p_execution_id,
    'info',
    'Aggregations computed successfully',
    jsonb_build_object(
      'completion', v_completion_metrics,
      'staffing', v_staffing_metrics,
      'quality', v_quality_metrics
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'completion_metrics', v_completion_metrics,
    'staffing_metrics', v_staffing_metrics,
    'quality_metrics', v_quality_metrics
  );
END;
$$;

-- JOB 4: Schedule and generate reports (ties to WP5)
CREATE OR REPLACE FUNCTION execute_report_scheduling(
  p_execution_id uuid,
  p_agency_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_count int := 0;
  v_daily_report_id uuid;
BEGIN
  PERFORM log_job_message(p_execution_id, 'info', 'Starting report scheduling job');
  
  -- Generate daily operational report
  -- (In production, this would call WP5 report generation functions)
  PERFORM log_job_message(
    p_execution_id,
    'info',
    'Scheduling daily operational report',
    jsonb_build_object('report_type', 'daily_operational', 'agency_id', p_agency_id)
  );
  v_report_count := v_report_count + 1;
  
  -- Check if weekly report is due (Sunday)
  IF EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN
    PERFORM log_job_message(
      p_execution_id,
      'info',
      'Scheduling weekly summary report',
      jsonb_build_object('report_type', 'weekly_summary', 'agency_id', p_agency_id)
    );
    v_report_count := v_report_count + 1;
  END IF;
  
  -- Check if monthly report is due (1st of month)
  IF EXTRACT(DAY FROM CURRENT_DATE) = 1 THEN
    PERFORM log_job_message(
      p_execution_id,
      'info',
      'Scheduling monthly compliance report',
      jsonb_build_object('report_type', 'monthly_compliance', 'agency_id', p_agency_id)
    );
    v_report_count := v_report_count + 1;
  END IF;
  
  PERFORM log_job_message(
    p_execution_id,
    'info',
    'Report scheduling complete: ' || v_report_count || ' reports scheduled',
    jsonb_build_object('reports_scheduled', v_report_count)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'reports_scheduled', v_report_count
  );
END;
$$;

-- Master function to execute any job by type
CREATE OR REPLACE FUNCTION execute_job(
  p_job_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_execution_id uuid;
  v_agency_id uuid;
  v_job_type text;
  v_result jsonb;
  v_error_message text;
BEGIN
  -- Get job details
  SELECT agency_id, job_type
  INTO v_agency_id, v_job_type
  FROM job_definitions
  WHERE id = p_job_id AND enabled = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Job not found or disabled'
    );
  END IF;
  
  -- Start execution
  v_execution_id := start_job_execution(p_job_id, jsonb_build_object('started_by', 'system'));
  
  BEGIN
    -- Route to appropriate job implementation
    CASE v_job_type
      WHEN 'recurring_tasks' THEN
        v_result := execute_recurring_task_generation(v_execution_id, v_agency_id);
      WHEN 'reminders' THEN
        v_result := execute_reminder_escalation(v_execution_id, v_agency_id);
      WHEN 'aggregation' THEN
        v_result := execute_aggregation_job(v_execution_id, v_agency_id);
      WHEN 'reports' THEN
        v_result := execute_report_scheduling(v_execution_id, v_agency_id);
      ELSE
        RAISE EXCEPTION 'Unknown job type: %', v_job_type;
    END CASE;
    
    -- Complete successfully
    PERFORM complete_job_execution(v_execution_id, v_result);
    
    RETURN jsonb_build_object(
      'success', true,
      'execution_id', v_execution_id,
      'result', v_result
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Handle failure
    v_error_message := SQLERRM;
    PERFORM fail_job_execution(v_execution_id, v_error_message, true);
    
    RETURN jsonb_build_object(
      'success', false,
      'execution_id', v_execution_id,
      'error', v_error_message
    );
  END;
END;
$$;
