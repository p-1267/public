/*
  # Roles and Role Permissions Audit Triggers

  1. Purpose
    - Log all changes to role definitions
    - Log all changes to role-permission mappings
    - Critical for security audit trail

  2. Trigger Details
    - Fires AFTER INSERT, UPDATE, DELETE on roles
    - Fires AFTER INSERT, UPDATE, DELETE on role_permissions
    - Captures permission grants and revocations

  3. Security
    - Only SUPER_ADMIN can modify roles/permissions
    - All changes are logged for accountability
*/

-- Roles audit trigger
CREATE OR REPLACE FUNCTION trigger_audit_role_change()
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
    v_action := 'ROLE_CREATED';
    v_entity_id := NEW.id;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_metadata := jsonb_build_object('role_name', NEW.name);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'ROLE_UPDATED';
    v_entity_id := NEW.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_metadata := jsonb_build_object(
      'old_name', OLD.name,
      'new_name', NEW.name
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'ROLE_DELETED';
    v_entity_id := OLD.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_metadata := jsonb_build_object('deleted_role_name', OLD.name);
  END IF;
  
  PERFORM log_audit_entry(
    v_action,
    'roles',
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

CREATE TRIGGER audit_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_audit_role_change();

-- Role Permissions audit trigger
CREATE OR REPLACE FUNCTION trigger_audit_role_permission_change()
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
  v_role_name text;
  v_permission_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'PERMISSION_GRANTED';
    v_entity_id := NEW.id;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    
    SELECT r.name INTO v_role_name FROM roles r WHERE r.id = NEW.role_id;
    SELECT p.name INTO v_permission_name FROM permissions p WHERE p.id = NEW.permission_id;
    
    v_metadata := jsonb_build_object(
      'role_name', v_role_name,
      'permission_name', v_permission_name
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'PERMISSION_REVOKED';
    v_entity_id := OLD.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    
    SELECT r.name INTO v_role_name FROM roles r WHERE r.id = OLD.role_id;
    SELECT p.name INTO v_permission_name FROM permissions p WHERE p.id = OLD.permission_id;
    
    v_metadata := jsonb_build_object(
      'role_name', v_role_name,
      'permission_name', v_permission_name
    );
  END IF;
  
  PERFORM log_audit_entry(
    v_action,
    'role_permissions',
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

CREATE TRIGGER audit_role_permission_changes
  AFTER INSERT OR DELETE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_audit_role_permission_change();