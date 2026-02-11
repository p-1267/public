/*
  # RLS Policies for Phase 27 Tables

  ## Purpose
  Row-level security policies for training and AI assistance tables.
  Enforces data access control and AI boundary restrictions.

  ## Tables Covered
  1. training_modules
  2. training_progress
  3. ai_assistance_config
  4. ai_suggestions
  5. ai_interaction_log

  ## Security Principles
  - The Brain enforces. AI advises. Humans act.
  - AI is non-authoritative, non-executing, and non-blocking
  - Training and guidance MUST NOT alter enforcement logic
  - Visual distinction between Brain requirements and AI suggestions is MANDATORY
*/

-- ============================================================================
-- training_modules RLS Policies
-- ============================================================================

CREATE POLICY "Users can view modules for their role"
  ON training_modules FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      EXISTS (
        SELECT 1
        FROM user_profiles up
        JOIN roles r ON r.id = up.role_id
        WHERE up.id = auth.uid()
        AND (training_modules.agency_id = up.agency_id OR training_modules.agency_id IS NULL)
        AND (r.name = ANY(training_modules.target_roles) OR array_length(training_modules.target_roles, 1) = 0)
      )
    )
  );

CREATE POLICY "Admins can create training modules"
  ON training_modules FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = training_modules.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update training modules"
  ON training_modules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = training_modules.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = training_modules.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- training_progress RLS Policies
-- ============================================================================

CREATE POLICY "Users can view their own training progress"
  ON training_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Supervisors can view team training progress"
  ON training_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN user_profiles target_up ON target_up.id = training_progress.user_id
      WHERE up.id = auth.uid()
      AND up.agency_id = target_up.agency_id
      AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Users can manage their own progress"
  ON training_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
  ON training_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- ai_assistance_config RLS Policies
-- ============================================================================

CREATE POLICY "Users can view their own AI config"
  ON ai_assistance_config FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can manage their own AI config"
  ON ai_assistance_config FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own AI config"
  ON ai_assistance_config FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage agency AI config"
  ON ai_assistance_config FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = ai_assistance_config.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update agency AI config"
  ON ai_assistance_config FOR UPDATE
  TO authenticated
  USING (
    user_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = ai_assistance_config.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    user_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = ai_assistance_config.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- ai_suggestions RLS Policies
-- ============================================================================

CREATE POLICY "Users can view their own AI suggestions"
  ON ai_suggestions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create AI suggestions"
  ON ai_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own suggestions"
  ON ai_suggestions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- ai_interaction_log RLS Policies
-- ============================================================================

CREATE POLICY "Users can view their own AI interaction log"
  ON ai_interaction_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view agency AI interaction log"
  ON ai_interaction_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = ai_interaction_log.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can create AI interaction logs"
  ON ai_interaction_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
