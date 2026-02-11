/*
  # Circuit Breaker State Table (Phase 32)

  ## Purpose
  Manages circuit breaker state for unstable dependencies.
  Prevents repeated failures and surfaces degraded-mode warnings.

  ## New Tables
  - `circuit_breaker_state`
    - `id` (uuid, primary key)
    - `breaker_name` (text) - Unique breaker name
    - `dependency_type` (text) - EXTERNAL_API, DATABASE, DEVICE, INTEGRATION
    - `dependency_identifier` (text) - Specific dependency identifier
    - `current_state` (text) - CLOSED, OPEN, HALF_OPEN
    - `failure_count` (integer) - Current failure count
    - `failure_threshold` (integer) - Threshold to open circuit
    - `success_threshold` (integer) - Threshold to close circuit (from half-open)
    - `timeout_seconds` (integer) - Timeout before half-open attempt
    - `last_failure_at` (timestamptz, nullable) - Last failure timestamp
    - `last_success_at` (timestamptz, nullable) - Last success timestamp
    - `opened_at` (timestamptz, nullable) - When circuit opened
    - `next_retry_at` (timestamptz, nullable) - Next retry attempt
    - `total_failures` (bigint) - Total lifetime failures
    - `total_successes` (bigint) - Total lifetime successes
    - `is_active` (boolean) - Is breaker active
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Circuit States
  1. CLOSED - Circuit is closed, requests flow normally
  2. OPEN - Circuit is open, requests are blocked
  3. HALF_OPEN - Circuit is testing, limited requests allowed

  ## Dependency Types
  1. EXTERNAL_API - External API dependency
  2. DATABASE - Database dependency
  3. DEVICE - Device dependency
  4. INTEGRATION - Integration dependency

  ## Security
  - RLS enabled
  - System-managed
  - Automatic state transitions

  ## Enforcement Rules
  1. Automatically open circuit after threshold
  2. Prevent repeated failures
  3. Surface degraded-mode warnings
  4. Auto-close after health recovery
*/

CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breaker_name text NOT NULL UNIQUE,
  dependency_type text NOT NULL CHECK (dependency_type IN ('EXTERNAL_API', 'DATABASE', 'DEVICE', 'INTEGRATION')),
  dependency_identifier text NOT NULL,
  current_state text NOT NULL DEFAULT 'CLOSED' CHECK (current_state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failure_count integer NOT NULL DEFAULT 0,
  failure_threshold integer NOT NULL DEFAULT 5,
  success_threshold integer NOT NULL DEFAULT 2,
  timeout_seconds integer NOT NULL DEFAULT 60,
  last_failure_at timestamptz,
  last_success_at timestamptz,
  opened_at timestamptz,
  next_retry_at timestamptz,
  total_failures bigint NOT NULL DEFAULT 0,
  total_successes bigint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE circuit_breaker_state ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state_breaker_name ON circuit_breaker_state(breaker_name);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state_current_state ON circuit_breaker_state(current_state);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state_dependency_type ON circuit_breaker_state(dependency_type);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state_is_active ON circuit_breaker_state(is_active);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state_next_retry_at ON circuit_breaker_state(next_retry_at);
