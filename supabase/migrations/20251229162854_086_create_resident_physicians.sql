/*
  # Resident Physicians Table (Phase 20)

  ## Purpose
  Stores primary physician and specialist information for residents.
  Required for emergency escalation and medical coordination.

  ## New Tables
  - `resident_physicians`
    - `id` (uuid, primary key)
    - `resident_id` (uuid, FK to residents)
    - `physician_name` (text) - doctor's full name
    - `specialty` (text) - medical specialty (PRIMARY_CARE, CARDIOLOGY, NEUROLOGY, etc.)
    - `clinic_name` (text) - clinic or hospital name
    - `phone` (text) - clinic phone number
    - `fax` (text, nullable) - fax number for records
    - `email` (text, nullable) - email address
    - `address` (text, nullable) - clinic address
    - `is_primary` (boolean) - whether this is primary physician
    - `notes` (text, nullable) - additional context
    - `entered_by` (uuid, FK to user_profiles)
    - `language_context` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Offline-cacheable for emergency access
  - Protected health information

  ## Enforcement Rules
  1. At least one primary physician required before baseline sealing
  2. Only one physician can be marked as primary
  3. Phone number is mandatory
*/

CREATE TABLE IF NOT EXISTS resident_physicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  physician_name text NOT NULL,
  specialty text NOT NULL,
  clinic_name text NOT NULL,
  phone text NOT NULL,
  fax text,
  email text,
  address text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  entered_by uuid NOT NULL REFERENCES user_profiles(id),
  language_context text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE resident_physicians ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_resident_physicians_resident_id ON resident_physicians(resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_physicians_is_primary ON resident_physicians(resident_id, is_primary);
