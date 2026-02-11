/*
  # Add department_id to tasks table
  
  Links tasks to departments for proper attribution and reporting.
  Keeps existing department text column for backwards compatibility.
*/

-- Add department_id column to tasks
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON tasks(department_id);

-- Update existing tasks with department text to set department_id
-- (will be done via data migration separately if needed)
