/*
  # Fix Function Search Path Security Issue

  1. Purpose
    - Fix mutable search_path in update_onboarding_updated_at function
    - Ensures function uses a fixed, secure search path
    - Prevents potential security issues from search_path manipulation

  2. Security Impact
    - Prevents schema poisoning attacks
    - Ensures function always uses correct schema resolution
    - Follows PostgreSQL security best practices

  3. Implementation
    - Drop and recreate function with SECURITY INVOKER and fixed search path
    - Set search_path to pg_catalog, public for predictable behavior
*/

-- Drop existing function
DROP FUNCTION IF EXISTS public.update_onboarding_updated_at() CASCADE;

-- Recreate with fixed search_path
CREATE OR REPLACE FUNCTION public.update_onboarding_updated_at()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = pg_catalog, public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger if it exists
DROP TRIGGER IF EXISTS update_onboarding_updated_at_trigger ON public.organization_onboarding_state;

CREATE TRIGGER update_onboarding_updated_at_trigger
  BEFORE UPDATE ON public.organization_onboarding_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_updated_at();
