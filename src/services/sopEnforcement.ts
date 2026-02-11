/**
 * SOP Runtime Enforcement Service
 *
 * Purpose: Enforce SOP rules during care execution
 *
 * CRITICAL: SOPs are not documents. They are executable policy rules.
 * - Timer-based enforcement (e.g., "medication must be logged within 30 min")
 * - Automatic incident creation on violation
 * - Supervisor escalation
 * - Immutable audit records
 *
 * Section 18.4: SOP Ingestion → Executable Enforcement
 */

import { supabase } from '../lib/supabase';

export interface SOPRule {
  id: string;
  agency_id: string;
  sop_document_id: string;
  rule_type: 'TIMING' | 'DOSAGE' | 'PROCEDURE' | 'DOCUMENTATION' | 'ESCALATION';
  rule_text: string;
  conditions: Record<string, any>;
  consequences: Record<string, any>;
  enforcement_priority: 'HIGH' | 'MEDIUM' | 'LOW';
  is_active: boolean;
}

export interface SOPViolation {
  sop_rule_id: string;
  agency_id: string;
  resident_id?: string;
  user_id: string;
  user_role: string;
  violation_type: 'TIMING' | 'DOSAGE' | 'PROCEDURE' | 'DOCUMENTATION' | 'ESCALATION';
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  detected_by: 'SYSTEM_AUTOMATIC' | 'SUPERVISOR_MANUAL' | 'AUDIT_REVIEW';
  violation_details: Record<string, any>;
  action_context: Record<string, any>;
  expected_behavior: string;
  actual_behavior: string;
  auto_escalated: boolean;
  supervisor_notified: boolean;
  remediation_required: boolean;
  incident_created: boolean;
}

export interface EnforcementContext {
  actionType: string;
  actionTime: Date;
  userId: string;
  userRole: string;
  agencyId: string;
  residentId?: string;
  actionDetails: Record<string, any>;
}

/**
 * Fetch active SOP rules for an agency
 */
export async function getActiveSOPRules(agencyId: string, ruleType?: string): Promise<SOPRule[]> {
  let query = supabase
    .from('sop_extracted_rules')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true);

  if (ruleType) {
    query = query.eq('rule_type', ruleType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching SOP rules:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if an action violates any SOP rules
 */
export async function checkSOPCompliance(
  context: EnforcementContext
): Promise<{ compliant: boolean; violations: SOPViolation[] }> {
  const violations: SOPViolation[] = [];

  // Fetch relevant SOP rules
  const rules = await getActiveSOPRules(context.agencyId);

  if (rules.length === 0) {
    // No rules to enforce - compliant by default
    return { compliant: true, violations: [] };
  }

  // Evaluate each rule
  for (const rule of rules) {
    const violation = evaluateRule(rule, context);
    if (violation) {
      violations.push(violation);
    }
  }

  return {
    compliant: violations.length === 0,
    violations
  };
}

/**
 * Evaluate a single SOP rule against the action context
 */
function evaluateRule(rule: SOPRule, context: EnforcementContext): SOPViolation | null {
  // Extract rule conditions
  const conditions = rule.conditions || {};
  const consequences = rule.consequences || {};

  // TIMING rules: Check if action happened within required timeframe
  if (rule.rule_type === 'TIMING') {
    const maxDelayMinutes = conditions.max_delay_minutes || 30;
    const referenceTime = context.actionDetails.reference_time
      ? new Date(context.actionDetails.reference_time)
      : context.actionTime;

    const delayMinutes = (context.actionTime.getTime() - referenceTime.getTime()) / 1000 / 60;

    if (delayMinutes > maxDelayMinutes) {
      return {
        sop_rule_id: rule.id,
        agency_id: context.agencyId,
        resident_id: context.residentId,
        user_id: context.userId,
        user_role: context.userRole,
        violation_type: 'TIMING',
        severity: determineSeverity(delayMinutes, maxDelayMinutes),
        detected_by: 'SYSTEM_AUTOMATIC',
        violation_details: {
          max_delay_minutes: maxDelayMinutes,
          actual_delay_minutes: delayMinutes,
          reference_time: referenceTime.toISOString()
        },
        action_context: context.actionDetails,
        expected_behavior: `Action should be completed within ${maxDelayMinutes} minutes`,
        actual_behavior: `Action completed after ${Math.round(delayMinutes)} minutes`,
        auto_escalated: consequences.auto_escalate === true,
        supervisor_notified: consequences.notify_supervisor === true,
        remediation_required: consequences.require_explanation === true,
        incident_created: consequences.create_incident === true
      };
    }
  }

  // PROCEDURE rules: Check if required steps were followed
  if (rule.rule_type === 'PROCEDURE') {
    const requiredSteps = conditions.required_steps || [];
    const completedSteps = context.actionDetails.completed_steps || [];

    const missingSteps = requiredSteps.filter((step: string) => !completedSteps.includes(step));

    if (missingSteps.length > 0) {
      return {
        sop_rule_id: rule.id,
        agency_id: context.agencyId,
        resident_id: context.residentId,
        user_id: context.userId,
        user_role: context.userRole,
        violation_type: 'PROCEDURE',
        severity: 'HIGH',
        detected_by: 'SYSTEM_AUTOMATIC',
        violation_details: {
          required_steps: requiredSteps,
          completed_steps: completedSteps,
          missing_steps: missingSteps
        },
        action_context: context.actionDetails,
        expected_behavior: `All required steps must be completed: ${requiredSteps.join(', ')}`,
        actual_behavior: `Missing steps: ${missingSteps.join(', ')}`,
        auto_escalated: consequences.auto_escalate === true,
        supervisor_notified: true,
        remediation_required: true,
        incident_created: consequences.create_incident === true
      };
    }
  }

  // DOCUMENTATION rules: Check if required documentation exists
  if (rule.rule_type === 'DOCUMENTATION') {
    const requiredFields = conditions.required_fields || [];
    const providedFields = Object.keys(context.actionDetails.documentation || {});

    const missingFields = requiredFields.filter((field: string) => !providedFields.includes(field));

    if (missingFields.length > 0) {
      return {
        sop_rule_id: rule.id,
        agency_id: context.agencyId,
        resident_id: context.residentId,
        user_id: context.userId,
        user_role: context.userRole,
        violation_type: 'DOCUMENTATION',
        severity: 'MODERATE',
        detected_by: 'SYSTEM_AUTOMATIC',
        violation_details: {
          required_fields: requiredFields,
          provided_fields: providedFields,
          missing_fields: missingFields
        },
        action_context: context.actionDetails,
        expected_behavior: `Documentation must include: ${requiredFields.join(', ')}`,
        actual_behavior: `Missing documentation: ${missingFields.join(', ')}`,
        auto_escalated: false,
        supervisor_notified: consequences.notify_supervisor === true,
        remediation_required: true,
        incident_created: false
      };
    }
  }

  // No violation detected
  return null;
}

/**
 * Determine violation severity based on delay
 */
function determineSeverity(actualMinutes: number, maxMinutes: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  const ratio = actualMinutes / maxMinutes;

  if (ratio < 1.5) return 'LOW';
  if (ratio < 2.0) return 'MODERATE';
  if (ratio < 3.0) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Record SOP violation in database
 */
export async function recordSOPViolation(violation: SOPViolation): Promise<void> {
  const { error } = await supabase
    .from('sop_violations')
    .insert(violation);

  if (error) {
    console.error('Error recording SOP violation:', error);
    throw error;
  }

  // If auto-escalation is required, trigger it
  if (violation.auto_escalated) {
    await triggerEscalation(violation);
  }

  // If incident creation is required, create it
  if (violation.incident_created) {
    await createIncident(violation);
  }
}

/**
 * Log enforcement event
 */
export async function logEnforcementEvent(
  ruleId: string,
  agencyId: string,
  userId: string,
  userRole: string,
  enforcementType: 'BLOCK' | 'WARN' | 'LOG' | 'ESCALATE',
  enforcementResult: 'BLOCKED' | 'WARNING_SHOWN' | 'LOGGED_ONLY' | 'ESCALATED' | 'OVERRIDDEN',
  actionContext: Record<string, any>,
  message: string,
  residentId?: string,
  violationId?: string
): Promise<void> {
  const { error } = await supabase
    .from('sop_enforcement_log')
    .insert({
      agency_id: agencyId,
      sop_rule_id: ruleId,
      resident_id: residentId,
      user_id: userId,
      user_role: userRole,
      enforcement_type: enforcementType,
      enforcement_result: enforcementResult,
      action_attempted: actionContext.action_type || 'UNKNOWN',
      action_context: actionContext,
      rule_condition_met: message,
      enforcement_message: message,
      violation_created_id: violationId
    });

  if (error) {
    console.error('Error logging enforcement event:', error);
  }
}

/**
 * Trigger escalation chain (placeholder - would integrate with escalation system)
 */
async function triggerEscalation(violation: SOPViolation): Promise<void> {
  console.log('Triggering escalation for violation:', violation.sop_rule_id);
  // TODO: Integrate with escalation_config table and notification system
}

/**
 * Create incident record (placeholder - would integrate with incident system)
 */
async function createIncident(violation: SOPViolation): Promise<void> {
  console.log('Creating incident for violation:', violation.sop_rule_id);
  // TODO: Create incident record in incidents table
}

/**
 * Enforce SOP rules for a care action
 * Returns true if compliant, throws error if non-compliant
 */
export async function enforceSOPRules(context: EnforcementContext): Promise<boolean> {
  const { compliant, violations } = await checkSOPCompliance(context);

  if (!compliant) {
    // Record all violations
    for (const violation of violations) {
      await recordSOPViolation(violation);

      // Log enforcement event
      await logEnforcementEvent(
        violation.sop_rule_id,
        violation.agency_id,
        violation.user_id,
        violation.user_role,
        'BLOCK',
        'BLOCKED',
        violation.action_context,
        violation.expected_behavior,
        violation.resident_id
      );
    }

    // Return the first violation for error messaging
    const firstViolation = violations[0];
    throw new Error(
      `SOP Violation: ${firstViolation.expected_behavior}\n\nActual: ${firstViolation.actual_behavior}\n\nSeverity: ${firstViolation.severity}`
    );
  }

  return true;
}
