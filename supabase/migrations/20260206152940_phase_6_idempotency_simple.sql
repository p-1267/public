/*
  # Phase 6.6: Production Data Integrity Gate - Idempotency

  ## Purpose
  Add idempotency key columns to enable duplicate detection and prevention.
  Prevents duplicate records from retry logic, race conditions, network issues.
  
  ## Tables Modified
  1. tasks - Prevent duplicate task completions
  2. vital_signs - Prevent duplicate vital recordings
  3. supervisor_reviews - Prevent duplicate reviews
  
  ## Implementation
  - Add idempotency_key text column (nullable)
  - Add unique partial index (WHERE idempotency_key IS NOT NULL)
  - Client generates UUID as idempotency key before first attempt
  - Retry uses same key → database constraint prevents duplicate
*/

-- ============================================================================
-- Add Idempotency Key Columns
-- ============================================================================

-- Tasks (scoped to agency + key)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_idempotency_key
ON tasks(agency_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Vital signs (scoped to resident + key)
ALTER TABLE vital_signs
ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vital_signs_idempotency_key
ON vital_signs(resident_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Supervisor reviews (scoped to task + key)
ALTER TABLE supervisor_reviews
ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_supervisor_reviews_idempotency_key
ON supervisor_reviews(task_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON COLUMN tasks.idempotency_key IS 
'Client-generated UUID for idempotency. Prevents duplicate task operations from retries. Unique per agency+key.';

COMMENT ON COLUMN vital_signs.idempotency_key IS 
'Client-generated UUID for idempotency. Prevents duplicate vital recordings from retries. Unique per resident+key.';

COMMENT ON COLUMN supervisor_reviews.idempotency_key IS 
'Client-generated UUID for idempotency. Prevents duplicate reviews from retries. Unique per task+key.';

-- ============================================================================
-- Usage Example
-- ============================================================================

/*
  Client Pattern:
  
  const idempotencyKey = crypto.randomUUID();
  
  try {
    const result = await completeTask(taskId, {
      evidence: data,
      idempotency_key: idempotencyKey
    });
  } catch (error) {
    if (error.code === '23505') {
      // Unique violation = already processed with this key
      console.log('Operation already completed, safe to ignore');
    } else {
      // Retry with SAME idempotency key
      const result = await completeTask(taskId, {
        evidence: data,
        idempotency_key: idempotencyKey  // Same key!
      });
    }
  }
*/
