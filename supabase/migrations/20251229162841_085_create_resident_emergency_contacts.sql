/*
  # Resident Emergency Contacts Table (Phase 20)

  ## Purpose
  Stores emergency contact information for residents.
  MANDATORY for Phase 20 completion - minimum 2 contacts required.
  Data must be cached offline for emergency access.

  ## New Tables
  - `resident_emergency_contacts`
    - `id` (uuid, primary key)
    - `resident_id` (uuid, FK to residents)
    - `contact_name` (text) - full name of emergency contact
    - `relationship` (text) - relationship to resident
    - `phone_primary` (text) - primary phone number
    - `phone_secondary` (text, nullable) - secondary phone number
    - `email` (text, nullable) - email address
    - `is_primary` (boolean) - whether this is the primary emergency contact
    - `contact_order` (integer) - order of contact priority (1, 2, 3, ...)
    - `notes` (text, nullable) - additional context
    - `entered_by` (uuid, FK to user_profiles)
    - `language_context` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Offline-cacheable for emergency access
  - Only authorized users can view/modify

  ## Enforcement Rules
  1. Minimum 2 emergency contacts required before baseline sealing
  2. At least one contact must be marked as primary
  3. Phone number is mandatory
  4. Contact order determines escalation sequence
*/

CREATE TABLE IF NOT EXISTS resident_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  relationship text NOT NULL,
  phone_primary text NOT NULL,
  phone_secondary text,
  email text,
  is_primary boolean NOT NULL DEFAULT false,
  contact_order integer NOT NULL CHECK (contact_order > 0),
  notes text,
  entered_by uuid NOT NULL REFERENCES user_profiles(id),
  language_context text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(resident_id, contact_order)
);

ALTER TABLE resident_emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_resident_emergency_contacts_resident_id ON resident_emergency_contacts(resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_emergency_contacts_contact_order ON resident_emergency_contacts(resident_id, contact_order);
CREATE INDEX IF NOT EXISTS idx_resident_emergency_contacts_is_primary ON resident_emergency_contacts(resident_id, is_primary);
