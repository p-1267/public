/*
  # RLS Policies for Phase 26 Tables

  ## Purpose
  Row-level security policies for messaging tables.
  Enforces data access control and participant scoping.

  ## Tables Covered
  1. message_threads
  2. thread_participants
  3. messages
  4. message_receipts
  5. message_attachments
  6. announcements
  7. announcement_acknowledgments
  8. message_audit

  ## Security Principles
  - Communication is accountable, context-aware, and defensible
  - Participants must have active membership
  - Family users have restricted access
  - Complete audit trail
*/

-- ============================================================================
-- message_threads RLS Policies
-- ============================================================================

CREATE POLICY "Users can view threads they participate in"
  ON message_threads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM thread_participants tp
      WHERE tp.thread_id = message_threads.id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
    )
  );

CREATE POLICY "Users can create threads"
  ON message_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.agency_id = message_threads.agency_id
    )
  );

CREATE POLICY "Thread creator can update thread"
  ON message_threads FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- thread_participants RLS Policies
-- ============================================================================

CREATE POLICY "Users can view participants in their threads"
  ON thread_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM thread_participants tp
      WHERE tp.thread_id = thread_participants.thread_id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
    )
  );

CREATE POLICY "Thread participants can add other participants"
  ON thread_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM thread_participants tp
      WHERE tp.thread_id = thread_participants.thread_id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
    )
  );

CREATE POLICY "Thread participants can remove participants"
  ON thread_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM thread_participants tp
      WHERE tp.thread_id = thread_participants.thread_id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM thread_participants tp
      WHERE tp.thread_id = thread_participants.thread_id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
    )
  );

-- ============================================================================
-- messages RLS Policies
-- ============================================================================

CREATE POLICY "Participants can view messages in their threads"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM thread_participants tp
      WHERE tp.thread_id = messages.thread_id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
      AND tp.can_read = true
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM thread_participants tp
      WHERE tp.thread_id = messages.thread_id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
      AND tp.can_send = true
    )
  );

CREATE POLICY "Admins can redact messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- message_receipts RLS Policies
-- ============================================================================

CREATE POLICY "Users can view their own receipts"
  ON message_receipts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Senders can view receipts for their messages"
  ON message_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = message_receipts.message_id
      AND m.sender_id = auth.uid()
    )
  );

CREATE POLICY "System can create receipts"
  ON message_receipts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own receipts"
  ON message_receipts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- message_attachments RLS Policies
-- ============================================================================

CREATE POLICY "Participants can view attachments in their threads"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      JOIN thread_participants tp ON tp.thread_id = m.thread_id
      WHERE m.id = message_attachments.message_id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
    )
  );

CREATE POLICY "Users can upload attachments"
  ON message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "System can update attachment scan status"
  ON message_attachments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- announcements RLS Policies
-- ============================================================================

CREATE POLICY "Users can view announcements targeted to their role"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = announcements.agency_id
      AND (r.name = ANY(announcements.target_roles) OR array_length(announcements.target_roles, 1) = 0)
    )
  );

CREATE POLICY "Agency admins can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = announcements.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Agency admins can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = announcements.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = announcements.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- announcement_acknowledgments RLS Policies
-- ============================================================================

CREATE POLICY "Users can view their own acknowledgments"
  ON announcement_acknowledgments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all acknowledgments"
  ON announcement_acknowledgments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN announcements a ON a.id = announcement_acknowledgments.announcement_id
      WHERE up.id = auth.uid()
      AND up.agency_id = a.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Users can acknowledge for themselves"
  ON announcement_acknowledgments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- message_audit RLS Policies
-- ============================================================================

CREATE POLICY "Admins can view message audit"
  ON message_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = message_audit.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can create message audit logs"
  ON message_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);
