/*
  # WP6 Offline-First Verification Infrastructure

  1. New Tables
    - `offline_queue_log` - Track offline operations with checksums
    - `audit_replay_verification` - Verify audit event replay integrity
    - `sync_verification_log` - Track sync operations and outcomes
    - `conflict_test_scenarios` - Test conflict detection and resolution

  2. Security
    - Enable RLS on all tables
    - Require authenticated access
*/

-- Offline queue tracking with checksums
CREATE TABLE IF NOT EXISTS offline_queue_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  operation_id text NOT NULL,
  operation_type text NOT NULL,
  payload jsonb NOT NULL,
  checksum text NOT NULL,
  created_at timestamptz DEFAULT now(),
  synced_at timestamptz,
  sync_status text DEFAULT 'pending',
  retry_count int DEFAULT 0,
  last_error text,
  CONSTRAINT valid_sync_status CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed'))
);

-- Audit replay verification
CREATE TABLE IF NOT EXISTS audit_replay_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  offline_batch_id uuid NOT NULL,
  expected_events jsonb NOT NULL,
  actual_events jsonb NOT NULL,
  ordering_preserved boolean NOT NULL,
  no_duplicates boolean NOT NULL,
  no_loss boolean NOT NULL,
  timestamps_intact boolean NOT NULL,
  user_ids_preserved boolean NOT NULL,
  verification_passed boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Sync verification log
CREATE TABLE IF NOT EXISTS sync_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  sync_session_id uuid NOT NULL,
  operations_queued int NOT NULL,
  operations_synced int NOT NULL,
  operations_failed int NOT NULL,
  conflicts_detected int NOT NULL,
  conflicts_resolved int NOT NULL,
  data_loss_detected boolean NOT NULL,
  replay_deterministic boolean NOT NULL,
  checksums_valid boolean NOT NULL,
  verification_passed boolean NOT NULL,
  failure_details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Conflict test scenarios
CREATE TABLE IF NOT EXISTS conflict_test_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  scenario_type text NOT NULL,
  local_version jsonb NOT NULL,
  server_version jsonb NOT NULL,
  expected_conflict boolean NOT NULL,
  conflict_detected boolean,
  resolution_strategy text,
  resolution_correct boolean,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_scenario_type CHECK (scenario_type IN ('concurrent_edit', 'stale_update', 'version_mismatch', 'timestamp_collision'))
);

-- Enable RLS
ALTER TABLE offline_queue_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_replay_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_verification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_test_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own agency offline queue"
  ON offline_queue_log FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert to own agency offline queue"
  ON offline_queue_log FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own agency offline queue"
  ON offline_queue_log FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view own agency audit replay verification"
  ON audit_replay_verification FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert audit replay verification"
  ON audit_replay_verification FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own agency sync verification"
  ON sync_verification_log FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert sync verification"
  ON sync_verification_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can manage conflict test scenarios"
  ON conflict_test_scenarios FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_offline_queue_log_agency ON offline_queue_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_log_status ON offline_queue_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_offline_queue_log_created ON offline_queue_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_replay_verification_agency ON audit_replay_verification(agency_id);
CREATE INDEX IF NOT EXISTS idx_sync_verification_log_agency ON sync_verification_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_conflict_test_scenarios_agency ON conflict_test_scenarios(agency_id);
