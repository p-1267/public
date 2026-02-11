/*
  # Fix User Profile Audit Trigger

  ## Problem
  The trigger_audit_user_profile_change() function references OLD.email
  but the user_profiles table doesn't have an email column.

  ## Solution
  Update the trigger to remove the email reference and just use the user ID.
*/

CREATE OR REPLACE FUNCTION trigger_audit_user_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_entity_id uuid;
  v_old_data jsonb;
  v_new_data jsonb;
  v_metadata jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'USER_CREATED';
    v_entity_id := NEW.id;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_metadata := jsonb_build_object(
      'role_id', NEW.role_id,
      'is_active', NEW.is_active
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_entity_id := NEW.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    
    IF OLD.role_id IS DISTINCT FROM NEW.role_id THEN
      v_action := 'USER_ROLE_CHANGED';
      v_metadata := jsonb_build_object(
        'old_role_id', OLD.role_id,
        'new_role_id', NEW.role_id
      );
    ELSIF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      IF NEW.is_active THEN
        v_action := 'USER_ACTIVATED';
      ELSE
        v_action := 'USER_DEACTIVATED';
      END IF;
      v_metadata := jsonb_build_object(
        'previous_status', OLD.is_active,
        'new_status', NEW.is_active
      );
    ELSE
      v_action := 'USER_PROFILE_UPDATED';
      v_metadata := jsonb_build_object(
        'display_name_changed', OLD.display_name IS DISTINCT FROM NEW.display_name
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'USER_DELETED';
    v_entity_id := OLD.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_metadata := jsonb_build_object(
      'deleted_user_id', OLD.id,
      'role_id', OLD.role_id
    );
  END IF;
  
  PERFORM log_audit_entry(
    v_action,
    'user_profiles',
    v_entity_id,
    v_old_data,
    v_new_data,
    v_metadata
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;
