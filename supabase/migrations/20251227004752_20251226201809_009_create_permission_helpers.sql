/*
  # Permission Helper Functions

  1. Purpose
    - Provide reusable functions for RLS policy permission checks
    - Functions check user role and permissions from mapping tables
    - Used by all RLS policies for consistent permission enforcement

  2. New Functions
    - `get_user_role_id(user_id uuid)` - Returns role_id for a user
    - `user_has_permission(user_id uuid, permission_name text)` - Checks if user has permission
    - `current_user_has_permission(permission_name text)` - Checks if current auth user has permission

  3. Security
    - Functions are SECURITY DEFINER to access tables regardless of RLS
    - Functions are owned by postgres for elevated access
    - Search path is set to prevent injection
*/

-- Get role_id for a user
CREATE OR REPLACE FUNCTION get_user_role_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role_id FROM user_profiles WHERE id = p_user_id AND is_active = true;
$$;

-- Check if a specific user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id uuid, p_permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN role_permissions rp ON rp.role_id = up.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE up.id = p_user_id
      AND up.is_active = true
      AND p.name = p_permission_name
  );
$$;

-- Check if current authenticated user has a specific permission
CREATE OR REPLACE FUNCTION current_user_has_permission(p_permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_has_permission(auth.uid(), p_permission_name);
$$;