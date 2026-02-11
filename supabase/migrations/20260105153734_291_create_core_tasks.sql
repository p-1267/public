/*
  # Core Tasks Table

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, references agencies)
      - `resident_id` (uuid, references residents)
      - `category_id` (uuid, references task_categories)
      - `template_id` (uuid, references task_templates) - NULL for ad-hoc tasks
      - `task_name` (text)
      - `description` (text)
      - `priority` (text) - low, medium, high, critical
      - `risk_level` (text) - A, B, C
      - `state` (text) - scheduled, due, in_progress, completed, skipped, failed, overdue, escalated
      - `scheduled_start` (timestamptz)
      - `scheduled_end` (timestamptz)
      - `actual_start` (timestamptz)
      - `actual_end` (timestamptz)
      - `duration_minutes` (integer)
      - `owner_user_id` (uuid) - assigned caregiver
      - `responsibility_role` (text) - CAREGIVER, SUPERVISOR, NURSE, etc.
      - `created_by` (uuid)
      - `completed_by` (uuid)
      - `outcome` (text) - success, partial, failed, skipped, cancelled
      - `outcome_reason` (text)
      - `requires_evidence` (boolean)
      - `evidence_submitted` (boolean)
      - `is_recurring` (boolean)
      - `recurrence_parent_id` (uuid) - for recurring tasks
      - `escalation_level` (integer)
      - `escalated_at` (timestamptz)
      - `escalated_to` (uuid)
      - `is_emergency` (boolean)
      - `is_blocked` (boolean)
      - `blocking_reason` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `task_schedules`
      - `id` (uuid, primary key)
      - `agency_id` (uuid)
      - `resident_id` (uuid)
      - `template_id` (uuid)
      - `schedule_name` (text)
      - `recurrence_pattern` (text) - daily, weekly, monthly, custom
      - `recurrence_config` (jsonb) - {days_of_week, time_of_day, interval, etc}
      - `time_window_start` (time)
      - `time_window_end` (time)
      - `advance_creation_minutes` (integer) - create task X minutes before due
      - `auto_assign_role` (text)
      - `is_active` (boolean)
      - `starts_on` (date)
      - `ends_on` (date)
      - `created_at` (timestamptz)
      - `created_by` (uuid)

  2. Security
    - Enable RLS
    - Policies for task access
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES task_categories(id) ON DELETE RESTRICT,
  template_id uuid REFERENCES task_templates(id),
  task_name text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  risk_level text NOT NULL DEFAULT 'B' CHECK (risk_level IN ('A', 'B', 'C')),
  state text NOT NULL DEFAULT 'scheduled' CHECK (state IN (
    'scheduled', 'due', 'in_progress', 'completed', 'skipped', 'failed', 'overdue', 'escalated'
  )),
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  actual_start timestamptz,
  actual_end timestamptz,
  duration_minutes integer,
  owner_user_id uuid REFERENCES auth.users(id),
  responsibility_role text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  completed_by uuid REFERENCES auth.users(id),
  outcome text CHECK (outcome IN ('success', 'partial', 'failed', 'skipped', 'cancelled')),
  outcome_reason text,
  requires_evidence boolean NOT NULL DEFAULT false,
  evidence_submitted boolean NOT NULL DEFAULT false,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_parent_id uuid REFERENCES tasks(id),
  escalation_level integer NOT NULL DEFAULT 0,
  escalated_at timestamptz,
  escalated_to uuid REFERENCES auth.users(id),
  is_emergency boolean NOT NULL DEFAULT false,
  is_blocked boolean NOT NULL DEFAULT false,
  blocking_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  schedule_name text NOT NULL,
  recurrence_pattern text NOT NULL CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'custom')),
  recurrence_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  time_window_start time,
  time_window_end time,
  advance_creation_minutes integer NOT NULL DEFAULT 60,
  auto_assign_role text,
  is_active boolean NOT NULL DEFAULT true,
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_agency ON tasks(agency_id);
CREATE INDEX IF NOT EXISTS idx_tasks_resident ON tasks(resident_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_start ON tasks(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_tasks_escalated ON tasks(escalation_level) WHERE escalation_level > 0;
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(state) WHERE state IN ('overdue', 'escalated');
CREATE INDEX IF NOT EXISTS idx_task_schedules_agency ON task_schedules(agency_id);
CREATE INDEX IF NOT EXISTS idx_task_schedules_resident ON task_schedules(resident_id);
CREATE INDEX IF NOT EXISTS idx_task_schedules_active ON task_schedules(is_active) WHERE is_active = true;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their agency"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Caregivers can update assigned tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    owner_user_id = auth.uid() OR
    agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  )
  WITH CHECK (
    owner_user_id = auth.uid() OR
    agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  );

CREATE POLICY "Supervisors can create and manage tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'CAREGIVER')
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'CAREGIVER')
    )
  );

CREATE POLICY "Users can view schedules in their agency"
  ON task_schedules FOR SELECT
  TO authenticated
  USING (
    agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Supervisors can manage schedules"
  ON task_schedules FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  );
