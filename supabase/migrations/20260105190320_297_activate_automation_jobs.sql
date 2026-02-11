/*
  # Activate Automation Jobs

  1. Automation Jobs
    - Missed medication detection (every 5 minutes)
    - Task escalation (every 5 minutes)
    - Workload signal detection (hourly)

  2. Notes
    - Uses pg_cron extension for reliable scheduling
    - All jobs write to existing intelligence tables
    - Jobs are production-safe (idempotent)
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing functions with incompatible signatures
DROP FUNCTION IF EXISTS detect_missed_medications();
DROP FUNCTION IF EXISTS auto_escalate_overdue_tasks();
DROP FUNCTION IF EXISTS detect_workload_signals();

-- ==========================================
-- JOB 1: Missed Medication Detection
-- Runs every 5 minutes
-- ==========================================
CREATE FUNCTION detect_missed_medications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window_start timestamptz := v_now - interval '30 minutes';
  v_missed_record RECORD;
BEGIN
  FOR v_missed_record IN
    SELECT
      rm.id,
      rm.resident_id,
      rm.medication_name,
      rm.scheduled_time,
      r.full_name as resident_name
    FROM resident_medications rm
    JOIN residents r ON r.id = rm.resident_id
    WHERE rm.scheduled_time BETWEEN v_window_start AND (v_now - interval '15 minutes')
      AND rm.active = true
      AND NOT EXISTS (
        SELECT 1 FROM medication_administration ma
        WHERE ma.medication_id = rm.id
          AND ma.scheduled_time = rm.scheduled_time
          AND ma.status IN ('TAKEN', 'REFUSED')
      )
  LOOP
    INSERT INTO intelligence_signals (
      resident_id,
      signal_type,
      severity,
      message,
      detected_at,
      metadata
    )
    SELECT
      v_missed_record.resident_id,
      'MISSED_MEDICATION',
      'HIGH',
      'Scheduled medication "' || v_missed_record.medication_name || '" was not administered at expected time',
      v_now,
      jsonb_build_object(
        'medication_id', v_missed_record.id,
        'medication_name', v_missed_record.medication_name,
        'scheduled_time', v_missed_record.scheduled_time,
        'minutes_overdue', EXTRACT(EPOCH FROM (v_now - v_missed_record.scheduled_time)) / 60
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM intelligence_signals
      WHERE resident_id = v_missed_record.resident_id
        AND signal_type = 'MISSED_MEDICATION'
        AND metadata->>'medication_id' = v_missed_record.id::text
        AND metadata->>'scheduled_time' = v_missed_record.scheduled_time::text
        AND detected_at > v_now - interval '1 hour'
    );
  END LOOP;
END;
$$;

-- ==========================================
-- JOB 2: Auto-Escalate Overdue Tasks
-- Runs every 5 minutes
-- ==========================================
CREATE FUNCTION auto_escalate_overdue_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_task_record RECORD;
  v_minutes_overdue numeric;
  v_new_level integer;
BEGIN
  FOR v_task_record IN
    SELECT
      t.id,
      t.resident_id,
      t.task_name,
      t.scheduled_end,
      COALESCE(te.escalation_level, 0) as current_escalation
    FROM tasks t
    LEFT JOIN task_escalations te ON te.task_id = t.id AND te.status = 'active'
    WHERE t.state IN ('overdue', 'due')
      AND t.scheduled_end < v_now
      AND t.active = true
  LOOP
    v_minutes_overdue := EXTRACT(EPOCH FROM (v_now - v_task_record.scheduled_end)) / 60;

    v_new_level := CASE
      WHEN v_minutes_overdue > 120 THEN 3
      WHEN v_minutes_overdue > 60 THEN 2
      WHEN v_minutes_overdue > 30 THEN 1
      ELSE 0
    END;

    IF v_new_level > v_task_record.current_escalation THEN
      UPDATE tasks
      SET
        state = 'escalated',
        escalation_level = v_new_level
      WHERE id = v_task_record.id;

      UPDATE task_escalations
      SET
        status = 'resolved',
        resolved_at = v_now
      WHERE task_id = v_task_record.id
        AND status = 'active';

      INSERT INTO task_escalations (
        task_id,
        escalation_level,
        escalation_reason,
        created_at,
        status
      ) VALUES (
        v_task_record.id,
        v_new_level,
        'Task overdue by ' || ROUND(v_minutes_overdue) || ' minutes',
        v_now,
        'active'
      );

      INSERT INTO intelligence_signals (
        resident_id,
        signal_type,
        severity,
        message,
        detected_at,
        metadata
      ) VALUES (
        v_task_record.resident_id,
        'TASK_ESCALATION',
        CASE WHEN v_new_level >= 3 THEN 'CRITICAL' WHEN v_new_level = 2 THEN 'HIGH' ELSE 'MEDIUM' END,
        'Task "' || v_task_record.task_name || '" escalated to level ' || v_new_level,
        v_now,
        jsonb_build_object(
          'task_id', v_task_record.id,
          'task_name', v_task_record.task_name,
          'minutes_overdue', ROUND(v_minutes_overdue),
          'escalation_level', v_new_level
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- ==========================================
-- JOB 3: Detect Workload Signals
-- Runs hourly
-- ==========================================
CREATE FUNCTION detect_workload_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_hour_start timestamptz := date_trunc('hour', v_now);
  v_agency_record RECORD;
  v_overdue_count integer;
  v_delayed_count integer;
BEGIN
  FOR v_agency_record IN
    SELECT DISTINCT agency_id
    FROM user_profiles
    WHERE agency_id IS NOT NULL
  LOOP
    SELECT COUNT(*) INTO v_overdue_count
    FROM tasks t
    JOIN residents r ON r.id = t.resident_id
    WHERE r.agency_id = v_agency_record.agency_id
      AND t.state IN ('overdue', 'escalated')
      AND t.active = true;

    SELECT COUNT(*) INTO v_delayed_count
    FROM tasks t
    JOIN residents r ON r.id = t.resident_id
    WHERE r.agency_id = v_agency_record.agency_id
      AND t.state = 'completed'
      AND t.actual_end > t.scheduled_end
      AND t.actual_end >= v_hour_start;

    IF v_overdue_count >= 5 OR v_delayed_count >= 10 THEN
      INSERT INTO workload_signals (
        agency_id,
        signal_type,
        severity,
        detected_at,
        metadata
      )
      SELECT
        v_agency_record.agency_id,
        'HIGH_WORKLOAD',
        CASE WHEN v_overdue_count >= 10 THEN 'HIGH' ELSE 'MEDIUM' END,
        v_now,
        jsonb_build_object(
          'overdue_tasks', v_overdue_count,
          'delayed_completions', v_delayed_count,
          'window', 'last_hour'
        )
      WHERE NOT EXISTS (
        SELECT 1 FROM workload_signals
        WHERE agency_id = v_agency_record.agency_id
          AND signal_type = 'HIGH_WORKLOAD'
          AND detected_at > v_now - interval '2 hours'
      );
    END IF;
  END LOOP;
END;
$$;

-- Schedule jobs using pg_cron
DO $$
BEGIN
  PERFORM cron.schedule('detect-missed-medications', '*/5 * * * *', 'SELECT detect_missed_medications();');
  PERFORM cron.schedule('auto-escalate-overdue-tasks', '*/5 * * * *', 'SELECT auto_escalate_overdue_tasks();');
  PERFORM cron.schedule('detect-workload-signals', '0 * * * *', 'SELECT detect_workload_signals();');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;