/*
  # Fix Supervisor Reviews Schema Mismatch

  ## Purpose
  Fix schema mismatch between supervisor_reviews table and care_log_submission RPC
  
  ## Changes
  1. Make task_id nullable (not all reviews are task-based)
  2. Add missing columns for concern reviews
  3. Add idempotency_key for duplicate prevention
  4. Add is_simulation for showcase mode
  
  ## Review Types Supported
  - Task reviews (existing)
  - Concern reviews (from care logs)
  - Incident reviews
  - Escalation reviews
*/

-- Drop the UNIQUE constraint on task_id (reviews can be non-task-based)
ALTER TABLE supervisor_reviews 
DROP CONSTRAINT IF EXISTS supervisor_reviews_task_id_key;

-- Make task_id nullable
ALTER TABLE supervisor_reviews 
ALTER COLUMN task_id DROP NOT NULL;

-- Add missing columns
ALTER TABLE supervisor_reviews 
ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS review_type text CHECK (review_type IN ('task', 'concern', 'incident', 'escalation')),
ADD COLUMN IF NOT EXISTS review_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('pending', 'in_review', 'resolved', 'escalated')),
ADD COLUMN IF NOT EXISTS severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS idempotency_key uuid,
ADD COLUMN IF NOT EXISTS is_simulation boolean DEFAULT false;

-- Create unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_supervisor_reviews_idempotency 
ON supervisor_reviews(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_supervisor_reviews_agency ON supervisor_reviews(agency_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_reviews_resident ON supervisor_reviews(resident_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_reviews_type ON supervisor_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_supervisor_reviews_reviewed_by ON supervisor_reviews(reviewed_by);

-- Update RLS policies to support anon for showcase mode
DROP POLICY IF EXISTS "View reviews" ON supervisor_reviews;
DROP POLICY IF EXISTS "Manage reviews" ON supervisor_reviews;

CREATE POLICY "View agency reviews"
  ON supervisor_reviews FOR SELECT
  TO authenticated, anon
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_simulation = true
  );

CREATE POLICY "Create reviews"
  ON supervisor_reviews FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_simulation = true
  );

CREATE POLICY "Update reviews"
  ON supervisor_reviews FOR UPDATE
  TO authenticated, anon
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_simulation = true
  );

COMMENT ON TABLE supervisor_reviews IS
'Unified review table for tasks, concerns, incidents, and escalations. Supports both production and showcase mode.';
