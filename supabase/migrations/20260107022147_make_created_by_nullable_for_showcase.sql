/*
  # Make created_by Nullable for Showcase Mode
  
  Allows showcase data seeding without requiring real authenticated users.
  The foreign key constraints to auth.users prevent seeding since those users
  don't exist in showcase mode.
*/

-- Make created_by nullable in tasks table
ALTER TABLE tasks ALTER COLUMN created_by DROP NOT NULL;

-- Make created_by nullable in task_templates table  
ALTER TABLE task_templates ALTER COLUMN created_by DROP NOT NULL;
