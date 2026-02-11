import { supabase } from '../lib/supabase';

export interface SimulationResult {
  success: boolean;
  scenario: string;
  events: string[];
  entityIds: Record<string, string>;
  errors?: string[];
}

export class SimulationEngine {
  private async getShowcaseContext() {
    const { data: residents } = await supabase
      .from('residents')
      .select('id, full_name, agency_id')
      .limit(1)
      .maybeSingle();

    if (!residents) {
      throw new Error('No residents found in showcase');
    }

    const { data: caregivers } = await supabase
      .from('user_profiles')
      .select('id, full_name, agency_id')
      .eq('agency_id', residents.agency_id)
      .limit(1)
      .maybeSingle();

    return {
      residentId: residents.id,
      residentName: residents.full_name,
      agencyId: residents.agency_id,
      caregiverId: caregivers?.id || null,
      caregiverName: caregivers?.full_name || 'System'
    };
  }

  async runMedicationScenario(): Promise<SimulationResult> {
    const result: SimulationResult = {
      success: false,
      scenario: 'Medication → Timeline → Family Notification',
      events: [],
      entityIds: {}
    };

    try {
      const context = await this.getShowcaseContext();
      result.entityIds.residentId = context.residentId;
      result.entityIds.agencyId = context.agencyId;

      const { data: medication } = await supabase
        .from('resident_medications')
        .select('id, medication_name')
        .eq('resident_id', context.residentId)
        .limit(1)
        .maybeSingle();

      if (!medication) {
        throw new Error('No medications found for resident');
      }

      result.entityIds.medicationId = medication.id;

      const { data: adminResult, error: adminError } = await supabase
        .from('medication_administration_log')
        .insert({
          resident_id: context.residentId,
          medication_id: medication.id,
          administered_at: new Date().toISOString(),
          administered_by: context.caregiverId,
          status: 'TAKEN',
          language_context: 'en'
        })
        .select()
        .single();

      if (adminError) throw adminError;

      result.events.push('✓ Medication recorded in database');
      result.entityIds.administrationId = adminResult.id;

      const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
          action_type: 'medication.administered',
          actor_id: context.caregiverId,
          target_type: 'resident',
          target_id: context.residentId,
          metadata: {
            medication_name: medication.medication_name,
            administration_id: adminResult.id,
            simulated: true
          }
        });

      if (auditError) throw auditError;

      result.events.push('✓ Senior timeline updated with medication event');

      const { data: familyLinks } = await supabase
        .from('family_resident_links')
        .select('family_member_id')
        .eq('resident_id', context.residentId);

      if (familyLinks && familyLinks.length > 0) {
        const { data: notifResult, error: notifError } = await supabase.rpc('queue_notification', {
          p_agency_id: context.agencyId,
          p_notification_type: 'email',
          p_recipient_id: familyLinks[0].family_member_id,
          p_recipient_contact: 'family@example.com',
          p_subject: 'Medication Administered',
          p_body: `${medication.medication_name} was administered to ${context.residentName}`,
          p_resident_id: context.residentId
        });

        if (!notifError) {
          result.events.push('✓ Family notification queued');
          result.entityIds.notificationId = notifResult?.job_id;
        }
      } else {
        result.events.push('⚠ No family members linked (notification skipped)');
      }

      result.success = true;
    } catch (error) {
      result.errors = [error instanceof Error ? error.message : 'Unknown error'];
    }

    return result;
  }

  async runAbnormalVitalsScenario(): Promise<SimulationResult> {
    const result: SimulationResult = {
      success: false,
      scenario: 'Abnormal Vitals → Risk Detection → Caregiver Alert',
      events: [],
      entityIds: {}
    };

    try {
      const context = await this.getShowcaseContext();
      result.entityIds.residentId = context.residentId;
      result.entityIds.agencyId = context.agencyId;

      const abnormalHeartRate = 135;
      const abnormalBP = '180/110';

      const { data: vitalResult, error: vitalError } = await supabase
        .from('vital_signs')
        .insert({
          resident_id: context.residentId,
          vital_type: 'blood_pressure',
          value: abnormalBP,
          systolic: 180,
          diastolic: 110,
          recorded_at: new Date().toISOString(),
          recorded_by: context.caregiverId,
          notes: `Simulated abnormal vitals - HR: ${abnormalHeartRate}, BP: ${abnormalBP}`
        })
        .select()
        .single();

      if (vitalError) throw vitalError;

      result.events.push(`✓ Abnormal vitals recorded (HR: ${abnormalHeartRate}, BP: ${abnormalBP})`);
      result.entityIds.vitalSignId = vitalResult.id;

      const signalId = `risk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data: signalResult, error: signalError } = await supabase
        .from('intelligence_signals')
        .insert({
          signal_id: signalId,
          category: 'REACTIVE',
          severity: 'HIGH',
          resident_id: context.residentId,
          agency_id: context.agencyId,
          title: 'Abnormal Vital Signs Detected',
          description: `Critical vital signs detected for ${context.residentName}. Heart rate ${abnormalHeartRate} bpm (normal: 60-100), Blood pressure ${abnormalBP} mmHg (normal: <120/80).`,
          reasoning: 'Vital signs exceed clinical thresholds. Heart rate is 35% above normal range. Blood pressure indicates Stage 2 hypertension. Immediate assessment recommended.',
          requires_human_action: true,
          suggested_actions: [
            'Reassess vitals in 5 minutes',
            'Check for pain or distress',
            'Review recent medications',
            'Contact physician if persistent'
          ],
          data_source: ['vital_signs_simple', 'resident_baselines']
        })
        .select()
        .single();

      if (signalError) throw signalError;

      result.events.push('✓ Risk detection signal generated');
      result.entityIds.signalId = signalResult.id;

      const { data: assignments } = await supabase
        .from('caregiver_assignments')
        .select('caregiver_id')
        .eq('resident_id', context.residentId)
        .eq('status', 'ACTIVE')
        .limit(1);

      if (assignments && assignments.length > 0) {
        const { error: notifError } = await supabase.rpc('queue_notification', {
          p_agency_id: context.agencyId,
          p_notification_type: 'sms',
          p_recipient_id: assignments[0].caregiver_id,
          p_recipient_contact: '+1234567890',
          p_subject: 'Alert: Abnormal Vitals',
          p_body: `ALERT: ${context.residentName} has abnormal vital signs. HR: ${abnormalHeartRate}, BP: ${abnormalBP}. Please assess immediately.`,
          p_resident_id: context.residentId
        });

        if (!notifError) {
          result.events.push('✓ Caregiver alert sent');
        }
      } else {
        result.events.push('⚠ No active caregiver assignment (alert skipped)');
      }

      result.success = true;
    } catch (error) {
      result.errors = [error instanceof Error ? error.message : 'Unknown error'];
    }

    return result;
  }

  async runTaskDifficultyScenario(): Promise<SimulationResult> {
    const result: SimulationResult = {
      success: false,
      scenario: 'Task Difficulty → AI Feedback Update',
      events: [],
      entityIds: {}
    };

    try {
      const context = await this.getShowcaseContext();
      result.entityIds.residentId = context.residentId;
      result.entityIds.agencyId = context.agencyId;

      const { data: task } = await supabase
        .from('tasks')
        .select('id, title, category')
        .eq('resident_id', context.residentId)
        .eq('status', 'PENDING')
        .limit(1)
        .maybeSingle();

      if (!task) {
        throw new Error('No pending tasks found for resident');
      }

      result.entityIds.taskId = task.id;

      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          status: 'BLOCKED',
          notes: 'Marked as difficult - requires supervisor review'
        })
        .eq('id', task.id);

      if (taskError) throw taskError;

      result.events.push('✓ Task marked as difficult/blocked');

      const { data: feedbackResult, error: feedbackError } = await supabase
        .from('ai_learning_inputs')
        .insert({
          input_type: 'task_difficulty_feedback',
          category: 'TASK_EXECUTION',
          source: 'caregiver',
          resident_id: context.residentId,
          metadata: {
            task_id: task.id,
            task_category: task.category,
            difficulty_reason: 'Resident uncooperative',
            suggested_adjustment: 'Try during morning routine when more alert',
            simulated: true
          },
          requires_acknowledgment: true
        })
        .select()
        .single();

      if (feedbackError) throw feedbackError;

      result.events.push('✓ AI learning input recorded');
      result.entityIds.learningInputId = feedbackResult.id;

      const { error: signalError } = await supabase
        .from('intelligence_signals')
        .insert({
          signal_id: `task-difficulty-${Date.now()}`,
          category: 'PROACTIVE',
          severity: 'MEDIUM',
          resident_id: context.residentId,
          agency_id: context.agencyId,
          title: 'Task Execution Pattern Change',
          description: `${task.title} has been marked as difficult. This may indicate a change in resident cooperation or capability.`,
          reasoning: 'Caregiver reported difficulty completing routine task. Historical data shows this task is typically completed without issue. Change in pattern may indicate decline in cognition, mood, or physical ability.',
          requires_human_action: true,
          suggested_actions: [
            'Review recent mood and behavior patterns',
            'Adjust task timing to optimal periods',
            'Consider breaking task into smaller steps',
            'Consult with care coordinator'
          ],
          data_source: ['tasks', 'ai_learning_inputs', 'caregiver_feedback']
        });

      if (signalError) throw signalError;

      result.events.push('✓ Intelligence signal created for supervisor review');

      result.success = true;
    } catch (error) {
      result.errors = [error instanceof Error ? error.message : 'Unknown error'];
    }

    return result;
  }

  async runIncidentScenario(): Promise<SimulationResult> {
    const result: SimulationResult = {
      success: false,
      scenario: 'Incident → Supervisor Visibility',
      events: [],
      entityIds: {}
    };

    try {
      const context = await this.getShowcaseContext();
      result.entityIds.residentId = context.residentId;
      result.entityIds.agencyId = context.agencyId;

      const incidentDescription = 'Minor slip while walking to bathroom. No injuries sustained. Resident was wearing non-slip footwear.';

      const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
          action_type: 'incident.reported',
          actor_id: context.caregiverId,
          target_type: 'resident',
          target_id: context.residentId,
          metadata: {
            incident_type: 'slip',
            severity: 'minor',
            description: incidentDescription,
            location: 'hallway_bathroom',
            witness_count: 1,
            injuries: 'none',
            immediate_actions: ['Assisted resident to standing', 'Checked for injuries', 'Escorted to bathroom'],
            simulated: true
          }
        });

      if (auditError) throw auditError;

      result.events.push('✓ Incident logged in audit trail');

      const { data: signalResult, error: signalError } = await supabase
        .from('intelligence_signals')
        .insert({
          signal_id: `incident-${Date.now()}`,
          category: 'REACTIVE',
          severity: 'MEDIUM',
          resident_id: context.residentId,
          agency_id: context.agencyId,
          title: 'Slip Incident Reported',
          description: `${context.residentName} experienced a slip incident in hallway near bathroom. No injuries reported.`,
          reasoning: 'Slip incidents require documentation and review even when no injury occurs. This may indicate environmental hazards, footwear issues, or changes in gait stability.',
          requires_human_action: true,
          suggested_actions: [
            'Supervisor review required within 24 hours',
            'Assess hallway for environmental hazards',
            'Review incident with care team',
            'Consider mobility assessment',
            'Document in care plan'
          ],
          data_source: ['audit_log', 'incident_reports']
        })
        .select()
        .single();

      if (signalError) throw signalError;

      result.events.push('✓ Supervisor alert signal created');
      result.entityIds.signalId = signalResult.id;

      const { data: supervisors } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('agency_id', context.agencyId)
        .eq('role', 'supervisor')
        .limit(1);

      if (supervisors && supervisors.length > 0) {
        const { error: notifError } = await supabase.rpc('queue_notification', {
          p_agency_id: context.agencyId,
          p_notification_type: 'email',
          p_recipient_id: supervisors[0].id,
          p_recipient_contact: 'supervisor@example.com',
          p_subject: 'Incident Report - Review Required',
          p_body: `An incident has been reported for ${context.residentName}. Type: Slip. Severity: Minor. Review required within 24 hours.`,
          p_resident_id: context.residentId
        });

        if (!notifError) {
          result.events.push('✓ Supervisor notified via email');
        }
      } else {
        result.events.push('⚠ No supervisor found (notification skipped)');
      }

      result.success = true;
    } catch (error) {
      result.errors = [error instanceof Error ? error.message : 'Unknown error'];
    }

    return result;
  }

  async runAllScenarios(): Promise<SimulationResult[]> {
    return Promise.all([
      this.runMedicationScenario(),
      this.runAbnormalVitalsScenario(),
      this.runTaskDifficultyScenario(),
      this.runIncidentScenario()
    ]);
  }
}

export const simulationEngine = new SimulationEngine();
