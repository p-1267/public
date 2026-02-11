/*
  # Make All User Foreign Keys Nullable for Showcase Mode
  
  Showcase mode needs to work without real authenticated users.
  This makes all foreign keys to auth.users nullable so showcase
  data can be seeded and displayed properly.
*/

-- Tasks table user references
ALTER TABLE tasks ALTER COLUMN owner_user_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN completed_by DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN escalated_to DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN supervisor_acknowledged_by DROP NOT NULL;

-- Vital signs user reference
ALTER TABLE vital_signs ALTER COLUMN recorded_by DROP NOT NULL;
