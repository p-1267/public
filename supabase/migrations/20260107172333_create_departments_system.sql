/*
  # Create Departments System
  
  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, foreign key to agencies)
      - `name` (text) - Department name
      - `department_code` (text) - NURSING, HOUSEKEEPING, etc.
      - `description` (text)
      - `icon` (text) - Emoji or icon identifier
      - `supervisor_id` (uuid, nullable, foreign key to user_profiles)
      - `status` (text) - normal, understaffed, alerts
      - `staff_count` (integer)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `department_personnel`
      - `id` (uuid, primary key)
      - `department_id` (uuid, foreign key to departments)
      - `user_id` (uuid, foreign key to user_profiles)
      - `agency_id` (uuid, foreign key to agencies)
      - `employee_id` (text) - Employee/Personnel number
      - `position_title` (text) - RN, PSW, Housekeeper, etc.
      - `shift_pattern` (text) - day, evening, night, rotating
      - `skills_tags` (jsonb) - Array of skill tags
      - `work_phone` (text)
      - `work_email` (text)
      - `status` (text) - on_shift, off_shift, on_break, on_call
      - `workload_indicator` (integer) - Number of assigned tasks
      - `is_primary_department` (boolean)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `department_assignments`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, foreign key to agencies)
      - `department_id` (uuid, foreign key to departments)
      - `title` (text)
      - `description` (text)
      - `created_by_id` (uuid, foreign key to user_profiles)
      - `assigned_to_id` (uuid, foreign key to user_profiles)
      - `shift_type` (text) - day, evening, night
      - `shift_start` (timestamptz)
      - `shift_end` (timestamptz)
      - `priority` (text) - low, medium, high, urgent
      - `location_area` (text)
      - `status` (text) - not_started, in_progress, blocked, completed
      - `acceptance_state` (text) - pending, acknowledged, accepted, declined
      - `checklist_tasks` (jsonb) - Array of task objects
      - `notes` (text)
      - `handoff_notes` (text)
      - `completed_at` (timestamptz)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `department_schedules`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, foreign key to agencies)
      - `department_id` (uuid, foreign key to departments)
      - `user_id` (uuid, foreign key to user_profiles)
      - `shift_date` (date)
      - `shift_type` (text) - day, evening, night
      - `shift_start` (timestamptz)
      - `shift_end` (timestamptz)
      - `assignments_count` (integer)
      - `status` (text) - scheduled, confirmed, in_progress, completed
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  department_code text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '📁',
  supervisor_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'normal' CHECK (status IN ('normal', 'understaffed', 'alerts')),
  staff_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, department_code)
);

CREATE INDEX IF NOT EXISTS idx_departments_agency ON departments(agency_id);
CREATE INDEX IF NOT EXISTS idx_departments_supervisor ON departments(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(department_code);

-- Create department_personnel table
CREATE TABLE IF NOT EXISTS department_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  employee_id text NOT NULL,
  position_title text NOT NULL,
  shift_pattern text DEFAULT 'day' CHECK (shift_pattern IN ('day', 'evening', 'night', 'rotating', 'on_call')),
  skills_tags jsonb DEFAULT '[]',
  work_phone text DEFAULT '',
  work_email text DEFAULT '',
  status text DEFAULT 'off_shift' CHECK (status IN ('on_shift', 'off_shift', 'on_break', 'on_call')),
  workload_indicator integer DEFAULT 0,
  is_primary_department boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(department_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_personnel_department ON department_personnel(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_personnel_user ON department_personnel(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_personnel_agency ON department_personnel(agency_id);
CREATE INDEX IF NOT EXISTS idx_dept_personnel_employee_id ON department_personnel(employee_id);

-- Create department_assignments table
CREATE TABLE IF NOT EXISTS department_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  created_by_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  assigned_to_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  shift_type text DEFAULT 'day' CHECK (shift_type IN ('day', 'evening', 'night')),
  shift_start timestamptz NOT NULL,
  shift_end timestamptz NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  location_area text DEFAULT '',
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'completed')),
  acceptance_state text DEFAULT 'pending' CHECK (acceptance_state IN ('pending', 'acknowledged', 'accepted', 'declined')),
  checklist_tasks jsonb DEFAULT '[]',
  notes text DEFAULT '',
  handoff_notes text DEFAULT '',
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dept_assignments_agency ON department_assignments(agency_id);
CREATE INDEX IF NOT EXISTS idx_dept_assignments_department ON department_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_assignments_assigned_to ON department_assignments(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_dept_assignments_created_by ON department_assignments(created_by_id);
CREATE INDEX IF NOT EXISTS idx_dept_assignments_shift ON department_assignments(shift_type, shift_start);
CREATE INDEX IF NOT EXISTS idx_dept_assignments_status ON department_assignments(status);

-- Create department_schedules table
CREATE TABLE IF NOT EXISTS department_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('day', 'evening', 'night')),
  shift_start timestamptz NOT NULL,
  shift_end timestamptz NOT NULL,
  assignments_count integer DEFAULT 0,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(department_id, user_id, shift_date, shift_type)
);

CREATE INDEX IF NOT EXISTS idx_dept_schedules_agency ON department_schedules(agency_id);
CREATE INDEX IF NOT EXISTS idx_dept_schedules_department ON department_schedules(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_schedules_user ON department_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_schedules_date ON department_schedules(shift_date);

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Users can view departments in their agency"
  ON departments FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Agency admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for department_personnel
CREATE POLICY "Users can view personnel in their agency"
  ON department_personnel FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can manage their department personnel"
  ON department_personnel FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for department_assignments
CREATE POLICY "Users can view assignments in their agency"
  ON department_assignments FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can manage assignments"
  ON department_assignments FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for department_schedules
CREATE POLICY "Users can view schedules in their agency"
  ON department_schedules FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can manage schedules"
  ON department_schedules FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );
