/*
  # Fix Security Definer View

  1. Purpose
    - Change user_effective_permissions view from SECURITY DEFINER to SECURITY INVOKER
    - SECURITY DEFINER can create privilege escalation risks
    - SECURITY INVOKER ensures view executes with caller's privileges

  2. Security Impact
    - Eliminates potential privilege escalation vulnerability
    - View now respects RLS policies properly
    - Follows PostgreSQL security best practices

  3. Implementation
    - Drop and recreate view with SECURITY INVOKER
    - Maintain same query logic
    - RLS policies will properly restrict access
*/

-- Drop existing view
DROP VIEW IF EXISTS public.user_effective_permissions CASCADE;

-- Recreate with SECURITY INVOKER (default, but explicitly stated for clarity)
CREATE OR REPLACE VIEW public.user_effective_permissions
WITH (security_invoker = true)
AS
SELECT
  up.id as user_id,
  up.role_id,
  r.name as role_name,
  array_agg(DISTINCT p.name) as permissions
FROM public.user_profiles up
JOIN public.roles r ON up.role_id = r.id
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id
WHERE up.is_active = true
GROUP BY up.id, up.role_id, r.name;

-- Grant appropriate access
GRANT SELECT ON public.user_effective_permissions TO authenticated;
