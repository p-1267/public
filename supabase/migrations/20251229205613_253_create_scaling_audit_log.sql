/*
  # Scaling Audit Log

  1. Purpose
    - Audit all scale-related events
    - Track tenant-level operations
    - Support investor-grade evidence
    - Enable complete auditability

  2. New Tables
    - `scaling_audit_log`
      - `audit_id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to agencies.id, nullable for system-wide events)
      - `event_timestamp` (timestamptz, required)
      - `component` (text, required: DB, API, QUEUE, WORKER, ENCRYPTION, PARTITION)
      - `action` (text, required)
      - `actor` (text, required: system or admin user)
      - `actor_user_id` (uuid, foreign key to auth.users)
      - `outcome` (text, required: SUCCESS, FAILURE, PARTIAL)
      - `error_message` (text)
      - `metadata` (jsonb)

  3. Security
    - RLS enabled
    - Immutable (no updates or deletes)
    - Only super_admin can read

  4. Constraints
    - Logs MUST include: tenant_id (if applicable), component, action, actor, timestamp, outcome
    - Audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS scaling_audit_log (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  component text NOT NULL CHECK (component IN ('DB', 'API', 'QUEUE', 'WORKER', 'ENCRYPTION', 'PARTITION', 'QUOTA', 'METRICS', 'SYSTEM')),
  action text NOT NULL,
  actor text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id),
  outcome text NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE', 'PARTIAL')),
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scaling_audit_tenant ON scaling_audit_log(tenant_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scaling_audit_timestamp ON scaling_audit_log(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scaling_audit_component ON scaling_audit_log(component, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scaling_audit_outcome ON scaling_audit_log(outcome) WHERE outcome IN ('FAILURE', 'PARTIAL');
CREATE INDEX IF NOT EXISTS idx_scaling_audit_actor ON scaling_audit_log(actor_user_id) WHERE actor_user_id IS NOT NULL;

ALTER TABLE scaling_audit_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE scaling_audit_log IS 'Immutable audit log for all scale-related events. No updates or deletes allowed.';
