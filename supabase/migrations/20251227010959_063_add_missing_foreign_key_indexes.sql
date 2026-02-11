/*
  # Add Missing Foreign Key Indexes

  1. Purpose
    - Add indexes to foreign key columns that were missing them
    - Improves query performance for JOIN operations
    - Prevents table scans on foreign key lookups

  2. New Indexes
    - `idx_caregiver_assignments_removed_by` on caregiver_assignments(removed_by)
    - `idx_family_resident_links_created_by` on family_resident_links(created_by)
    - `idx_senior_resident_links_created_by` on senior_resident_links(created_by)

  3. Impact
    - Improves performance of queries filtering by these foreign keys
    - Essential for optimal query execution plans
*/

CREATE INDEX IF NOT EXISTS idx_caregiver_assignments_removed_by 
  ON caregiver_assignments(removed_by);

CREATE INDEX IF NOT EXISTS idx_family_resident_links_created_by 
  ON family_resident_links(created_by);

CREATE INDEX IF NOT EXISTS idx_senior_resident_links_created_by 
  ON senior_resident_links(created_by);
