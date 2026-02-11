/*
  # Meal Plans and Allergy Rules

  1. New Tables
    - `meal_plans`
      - `id` (uuid, primary key)
      - `resident_id` (uuid, references residents)
      - `plan_name` (text)
      - `diet_type` (text) - regular, diabetic, low_sodium, puree, etc
      - `meals_per_day` (integer)
      - `target_calories_min` (integer)
      - `target_calories_max` (integer)
      - `meal_times` (jsonb) - [{meal: 'breakfast', time: '08:00', required: true}]
      - `texture_restrictions` (text[])
      - `fluid_restrictions` (jsonb) - {max_ml_per_day, requires_thickener}
      - `special_instructions` (text)
      - `is_active` (boolean)
      - `effective_date` (date)
      - `reviewed_date` (date)
      - `reviewed_by` (uuid)
      - `created_at` (timestamptz)
      - `created_by` (uuid)

    - `allergy_rules`
      - `id` (uuid, primary key)
      - `resident_id` (uuid, references residents)
      - `allergen_type` (text) - food, medication, environmental, material
      - `allergen_name` (text)
      - `severity` (text) - mild, moderate, severe, anaphylaxis
      - `reaction_type` (text[])
      - `cross_reactions` (text[]) - related allergens
      - `avoidance_instructions` (text)
      - `emergency_protocol` (text)
      - `cannot_bypass` (boolean) - TRUE = hard constraint
      - `confirmed_by_physician` (boolean)
      - `physician_name` (text)
      - `last_reaction_date` (date)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `created_by` (uuid)
      - `updated_at` (timestamptz)

    - `meal_logs`
      - `id` (uuid, primary key)
      - `resident_id` (uuid)
      - `task_id` (uuid, references tasks)
      - `meal_type` (text) - breakfast, lunch, dinner, snack
      - `meal_time` (timestamptz)
      - `items_offered` (jsonb)
      - `items_consumed` (jsonb)
      - `intake_percent` (integer)
      - `fluid_intake_ml` (integer)
      - `calories_estimated` (integer)
      - `assistance_level` (text) - independent, minimal, moderate, full
      - `appetite` (text) - poor, fair, good, excellent
      - `refusal_reason` (text)
      - `notes` (text)
      - `logged_by` (uuid)
      - `logged_at` (timestamptz)

  2. Security
    - Enable RLS
    - Hard constraint: allergy rules cannot be bypassed
*/

CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  diet_type text NOT NULL,
  meals_per_day integer NOT NULL DEFAULT 3 CHECK (meals_per_day > 0),
  target_calories_min integer,
  target_calories_max integer,
  meal_times jsonb NOT NULL DEFAULT '[]'::jsonb,
  texture_restrictions text[] DEFAULT ARRAY[]::text[],
  fluid_restrictions jsonb DEFAULT '{}'::jsonb,
  special_instructions text,
  is_active boolean NOT NULL DEFAULT true,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  reviewed_date date,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS allergy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  allergen_type text NOT NULL CHECK (allergen_type IN ('food', 'medication', 'environmental', 'material')),
  allergen_name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'anaphylaxis')),
  reaction_type text[] DEFAULT ARRAY[]::text[],
  cross_reactions text[] DEFAULT ARRAY[]::text[],
  avoidance_instructions text,
  emergency_protocol text,
  cannot_bypass boolean NOT NULL DEFAULT true,
  confirmed_by_physician boolean NOT NULL DEFAULT false,
  physician_name text,
  last_reaction_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id),
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'hydration')),
  meal_time timestamptz NOT NULL,
  items_offered jsonb DEFAULT '[]'::jsonb,
  items_consumed jsonb DEFAULT '[]'::jsonb,
  intake_percent integer CHECK (intake_percent BETWEEN 0 AND 100),
  fluid_intake_ml integer CHECK (fluid_intake_ml >= 0),
  calories_estimated integer CHECK (calories_estimated >= 0),
  assistance_level text CHECK (assistance_level IN ('independent', 'minimal', 'moderate', 'full')),
  appetite text CHECK (appetite IN ('poor', 'fair', 'good', 'excellent')),
  refusal_reason text,
  notes text,
  logged_by uuid NOT NULL REFERENCES auth.users(id),
  logged_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plans_active_resident 
  ON meal_plans(resident_id) WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_allergy_rules_active_unique 
  ON allergy_rules(resident_id, allergen_name, allergen_type) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_meal_plans_resident ON meal_plans(resident_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_active ON meal_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_allergy_rules_resident ON allergy_rules(resident_id);
CREATE INDEX IF NOT EXISTS idx_allergy_rules_active ON allergy_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_allergy_rules_severity ON allergy_rules(severity) WHERE severity IN ('severe', 'anaphylaxis');
CREATE INDEX IF NOT EXISTS idx_meal_logs_resident ON meal_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_task ON meal_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_time ON meal_logs(meal_time);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meal plans for residents in their agency"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      WHERE r.agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Supervisors can manage meal plans"
  ON meal_plans FOR ALL
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN user_profiles up ON r.agency_id = up.agency_id
      INNER JOIN roles ro ON up.role_id = ro.id
      WHERE up.id = auth.uid() 
      AND ro.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  )
  WITH CHECK (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN user_profiles up ON r.agency_id = up.agency_id
      INNER JOIN roles ro ON up.role_id = ro.id
      WHERE up.id = auth.uid() 
      AND ro.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  );

CREATE POLICY "Users can view allergy rules for residents in their agency"
  ON allergy_rules FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      WHERE r.agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Only supervisors can manage allergy rules"
  ON allergy_rules FOR ALL
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN user_profiles up ON r.agency_id = up.agency_id
      INNER JOIN roles ro ON up.role_id = ro.id
      WHERE up.id = auth.uid() 
      AND ro.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  )
  WITH CHECK (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN user_profiles up ON r.agency_id = up.agency_id
      INNER JOIN roles ro ON up.role_id = ro.id
      WHERE up.id = auth.uid() 
      AND ro.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  );

CREATE POLICY "Users can view meal logs for residents in their agency"
  ON meal_logs FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      WHERE r.agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Caregivers can create meal logs"
  ON meal_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    resident_id IN (
      SELECT r.id FROM residents r
      WHERE r.agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Supervisors can manage meal logs"
  ON meal_logs FOR ALL
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN user_profiles up ON r.agency_id = up.agency_id
      INNER JOIN roles ro ON up.role_id = ro.id
      WHERE up.id = auth.uid() 
      AND ro.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  );
