/*
  # Integration Connectors Table (Phase 30)

  ## Purpose
  Stores connection configurations and state for integrations.
  Tracks connection health and rate limiting.

  ## New Tables
  - `integration_connectors`
    - `id` (uuid, primary key)
    - `integration_id` (uuid, FK to integration_registry) - parent integration
    - `connector_name` (text) - connector name
    - `endpoint_url` (text) - API endpoint URL
    - `connection_protocol` (text) - REST_API, SOAP, HL7, FHIR
    - `auth_method` (text) - API_KEY, OAUTH2, CERTIFICATE
    - `rate_limit_per_minute` (integer) - rate limit per minute
    - `rate_limit_per_hour` (integer) - rate limit per hour
    - `circuit_breaker_threshold` (integer) - failure threshold for circuit breaker
    - `circuit_breaker_status` (text) - CLOSED, OPEN, HALF_OPEN
    - `last_success_at` (timestamptz, nullable) - last successful connection
    - `last_failure_at` (timestamptz, nullable) - last failed connection
    - `consecutive_failures` (integer) - consecutive failure count
    - `total_requests` (integer) - total requests made
    - `total_successes` (integer) - total successful requests
    - `total_failures` (integer) - total failed requests
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Circuit Breaker States
  1. CLOSED - Normal operation
  2. OPEN - Circuit breaker tripped, no requests allowed
  3. HALF_OPEN - Testing if service recovered

  ## Security
  - RLS enabled
  - Connection credentials secured via Phase 29

  ## Enforcement Rules
  1. Apply rate limits per integration
  2. Circuit-break on repeated failures
  3. Ingestion failures MUST NOT affect core system operation
*/

CREATE TABLE IF NOT EXISTS integration_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES integration_registry(id) ON DELETE CASCADE,
  connector_name text NOT NULL,
  endpoint_url text NOT NULL,
  connection_protocol text NOT NULL CHECK (connection_protocol IN ('REST_API', 'SOAP', 'HL7', 'FHIR')),
  auth_method text NOT NULL CHECK (auth_method IN ('API_KEY', 'OAUTH2', 'CERTIFICATE')),
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  rate_limit_per_hour integer NOT NULL DEFAULT 1000,
  circuit_breaker_threshold integer NOT NULL DEFAULT 5,
  circuit_breaker_status text NOT NULL DEFAULT 'CLOSED' CHECK (circuit_breaker_status IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  total_requests integer NOT NULL DEFAULT 0,
  total_successes integer NOT NULL DEFAULT 0,
  total_failures integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE integration_connectors ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_integration_connectors_integration_id ON integration_connectors(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_connectors_circuit_breaker_status ON integration_connectors(circuit_breaker_status);
