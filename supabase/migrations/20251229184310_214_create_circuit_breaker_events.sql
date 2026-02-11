/*
  # Circuit Breaker Events Table (Phase 32)

  ## Purpose
  Immutable audit trail of circuit breaker state transitions.
  Tracks all failures, successes, and state changes.

  ## New Tables
  - `circuit_breaker_events`
    - `id` (uuid, primary key)
    - `breaker_id` (uuid, FK to circuit_breaker_state) - Associated breaker
    - `breaker_name` (text) - Breaker name
    - `event_type` (text) - FAILURE, SUCCESS, OPENED, CLOSED, HALF_OPENED
    - `previous_state` (text, nullable) - Previous circuit state
    - `new_state` (text, nullable) - New circuit state
    - `failure_reason` (text, nullable) - Failure reason if applicable
    - `response_time_ms` (integer, nullable) - Response time
    - `timestamp` (timestamptz) - Event timestamp
    - `metadata` (jsonb) - additional data

  ## Event Types
  1. FAILURE - Request failed
  2. SUCCESS - Request succeeded
  3. OPENED - Circuit opened (too many failures)
  4. CLOSED - Circuit closed (health recovered)
  5. HALF_OPENED - Circuit half-opened (testing)

  ## Security
  - RLS enabled
  - System-managed
  - Immutable audit trail

  ## Enforcement Rules
  1. All circuit breaker events MUST be logged
  2. Audit trail is immutable
  3. State transitions MUST be recorded
*/

CREATE TABLE IF NOT EXISTS circuit_breaker_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breaker_id uuid NOT NULL REFERENCES circuit_breaker_state(id) ON DELETE CASCADE,
  breaker_name text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('FAILURE', 'SUCCESS', 'OPENED', 'CLOSED', 'HALF_OPENED')),
  previous_state text CHECK (previous_state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  new_state text CHECK (new_state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failure_reason text,
  response_time_ms integer,
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE circuit_breaker_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_events_breaker_id ON circuit_breaker_events(breaker_id);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_events_breaker_name ON circuit_breaker_events(breaker_name);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_events_event_type ON circuit_breaker_events(event_type);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_events_timestamp ON circuit_breaker_events(timestamp DESC);
