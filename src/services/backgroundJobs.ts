/**
 * Background Jobs Service
 *
 * Server-side jobs that run on schedule
 * Detects issues, generates signals, writes to DB
 * NO auto-execution - humans must act
 */

import { supabase } from '../lib/supabase';

export interface MissedMedicationSignal {
  residentId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  missedByMinutes: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  reasoning: string;
  requiredAction: string;
}

export interface ComplianceReminderSignal {
  residentId: string;
  reminderType: 'BP_RECHECK' | 'WOUND_ASSESSMENT' | 'FALL_FOLLOWUP' | 'VITALS_OVERDUE';
  dueAt: string;
  overdueSince?: string;
  reasoning: string;
  requiredAction: string;
}

export interface IntelligenceSignalRecord {
  signalId: string;
  category: 'PROACTIVE' | 'REACTIVE' | 'PREDICTIVE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  residentId?: string;
  agencyId?: string;
  title: string;
  description: string;
  reasoning: string;
  detectedAt: string;
  requiresHumanAction: boolean;
  suggestedActions: string[];
  dataSource: string[];
}

export class BackgroundJobsService {
  /**
   * Detect missed medications
   * Runs every 15 minutes
   */
  static async detectMissedMedications(): Promise<MissedMedicationSignal[]> {
    const now = new Date();
    const signals: MissedMedicationSignal[] = [];

    const { data: medications, error } = await supabase
      .from('resident_medications')
      .select(`
        id,
        resident_id,
        medication_name,
        schedule,
        residents!inner(id, agency_id)
      `)
      .eq('status', 'ACTIVE');

    if (error || !medications) {
      console.error('Failed to fetch medications:', error);
      return signals;
    }

    for (const med of medications) {
      const schedule = med.schedule as any;
      if (!schedule?.times || !Array.isArray(schedule.times)) continue;

      for (const scheduledTime of schedule.times) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const scheduledDate = new Date(now);
        scheduledDate.setHours(hours, minutes, 0, 0);

        if (scheduledDate > now) continue;

        const missedByMinutes = Math.floor((now.getTime() - scheduledDate.getTime()) / 60000);

        if (missedByMinutes < 30) continue;

        const { data: administered } = await supabase
          .from('medication_administration')
          .select('id')
          .eq('medication_id', med.id)
          .eq('resident_id', med.resident_id)
          .gte('administered_at', scheduledDate.toISOString())
          .maybeSingle();

        if (administered) continue;

        const severity = missedByMinutes > 120 ? 'CRITICAL' : missedByMinutes > 60 ? 'HIGH' : 'MEDIUM';

        signals.push({
          residentId: med.resident_id,
          medicationId: med.id,
          medicationName: med.medication_name,
          scheduledTime: scheduledTime,
          missedByMinutes,
          severity,
          reasoning: `${med.medication_name} scheduled for ${scheduledTime}, now ${missedByMinutes} minutes overdue. No administration record found.`,
          requiredAction: `Assess resident, determine if late administration is appropriate, document reason for delay, or contact physician if medication window has passed.`
        });
      }
    }

    return signals;
  }

  /**
   * Generate compliance reminders
   * Runs every 30 minutes
   */
  static async generateComplianceReminders(): Promise<ComplianceReminderSignal[]> {
    const signals: ComplianceReminderSignal[] = [];

    await this.checkBPRechecks(signals);
    await this.checkVitalsOverdue(signals);
    await this.checkFallFollowups(signals);

    return signals;
  }

  private static async checkBPRechecks(signals: ComplianceReminderSignal[]): Promise<void> {
    const { data: elevatedBPLogs } = await supabase
      .from('vital_signs')
      .select('resident_id, recorded_at, systolic, diastolic')
      .eq('vital_type', 'BLOOD_PRESSURE')
      .gte('systolic', 140)
      .order('recorded_at', { ascending: false });

    if (!elevatedBPLogs) return;

    const now = new Date();
    for (const log of elevatedBPLogs) {
      const recordedAt = new Date(log.recorded_at);
      const minutesSince = Math.floor((now.getTime() - recordedAt.getTime()) / 60000);

      if (minutesSince >= 15 && minutesSince <= 60) {
        const { data: recheck } = await supabase
          .from('vital_signs')
          .select('id')
          .eq('resident_id', log.resident_id)
          .eq('vital_type', 'BLOOD_PRESSURE')
          .gt('recorded_at', log.recorded_at)
          .maybeSingle();

        if (!recheck) {
          signals.push({
            residentId: log.resident_id,
            reminderType: 'BP_RECHECK',
            dueAt: new Date(recordedAt.getTime() + 15 * 60000).toISOString(),
            overdueSince: minutesSince > 15 ? now.toISOString() : undefined,
            reasoning: `Elevated BP (${log.systolic}/${log.diastolic}) recorded at ${log.recorded_at}. Protocol requires 15-minute recheck.`,
            requiredAction: 'Recheck blood pressure and document. Contact physician if reading remains elevated.'
          });
        }
      }
    }
  }

  private static async checkVitalsOverdue(signals: ComplianceReminderSignal[]): Promise<void> {
    const { data: residents } = await supabase
      .from('residents')
      .select('id, vital_monitoring_frequency')
      .eq('status', 'ACTIVE');

    if (!residents) return;

    const now = new Date();
    for (const resident of residents) {
      const frequency = resident.vital_monitoring_frequency || 'DAILY';
      const hoursThreshold = frequency === 'Q4H' ? 4 : frequency === 'Q8H' ? 8 : 24;

      const { data: lastVital } = await supabase
        .from('vital_signs')
        .select('recorded_at')
        .eq('resident_id', resident.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastVital) continue;

      const lastRecorded = new Date(lastVital.recorded_at);
      const hoursSince = Math.floor((now.getTime() - lastRecorded.getTime()) / 3600000);

      if (hoursSince > hoursThreshold) {
        signals.push({
          residentId: resident.id,
          reminderType: 'VITALS_OVERDUE',
          dueAt: new Date(lastRecorded.getTime() + hoursThreshold * 3600000).toISOString(),
          overdueSince: now.toISOString(),
          reasoning: `Vital signs monitoring frequency is ${frequency}. Last vitals recorded ${hoursSince} hours ago.`,
          requiredAction: 'Record vital signs per care plan requirements.'
        });
      }
    }
  }

  private static async checkFallFollowups(signals: ComplianceReminderSignal[]): Promise<void> {
    const { data: fallIncidents } = await supabase
      .from('incident_reports')
      .select('resident_id, created_at')
      .eq('incident_type', 'FALL')
      .eq('followup_completed', false)
      .gte('created_at', new Date(Date.now() - 48 * 3600000).toISOString());

    if (!fallIncidents) return;

    const now = new Date();
    for (const incident of fallIncidents) {
      const incidentDate = new Date(incident.created_at);
      const hoursSince = Math.floor((now.getTime() - incidentDate.getTime()) / 3600000);

      if (hoursSince >= 24) {
        signals.push({
          residentId: incident.resident_id,
          reminderType: 'FALL_FOLLOWUP',
          dueAt: new Date(incidentDate.getTime() + 24 * 3600000).toISOString(),
          overdueSince: hoursSince > 24 ? now.toISOString() : undefined,
          reasoning: `Fall incident reported ${hoursSince} hours ago. Protocol requires 24-hour follow-up assessment.`,
          requiredAction: 'Complete fall follow-up assessment including mobility evaluation and care plan review.'
        });
      }
    }
  }

  /**
   * Write signals to database for UI display
   */
  static async writeIntelligenceSignals(
    signals: Array<MissedMedicationSignal | ComplianceReminderSignal>
  ): Promise<void> {
    const records: IntelligenceSignalRecord[] = signals.map(signal => {
      if ('medicationId' in signal) {
        return {
          signalId: `missed-med-${signal.residentId}-${signal.medicationId}-${Date.now()}`,
          category: 'PROACTIVE' as const,
          severity: signal.severity,
          residentId: signal.residentId,
          agencyId: undefined,
          title: `Missed Medication: ${signal.medicationName}`,
          description: `Scheduled for ${signal.scheduledTime}, now ${signal.missedByMinutes} minutes overdue`,
          reasoning: signal.reasoning,
          detectedAt: new Date().toISOString(),
          requiresHumanAction: true,
          suggestedActions: [signal.requiredAction],
          dataSource: ['medication_schedule', 'administration_log']
        };
      } else {
        return {
          signalId: `compliance-${signal.reminderType}-${signal.residentId}-${Date.now()}`,
          category: 'REACTIVE' as const,
          severity: signal.overdueSince ? 'HIGH' : 'MEDIUM',
          residentId: signal.residentId,
          agencyId: undefined,
          title: `Compliance Reminder: ${signal.reminderType.replace(/_/g, ' ')}`,
          description: signal.overdueSince ? `Overdue since ${signal.overdueSince}` : `Due at ${signal.dueAt}`,
          reasoning: signal.reasoning,
          detectedAt: new Date().toISOString(),
          requiresHumanAction: true,
          suggestedActions: [signal.requiredAction],
          dataSource: ['care_plan', 'incident_log', 'vital_signs']
        };
      }
    });

    for (const record of records) {
      const { error } = await supabase
        .from('intelligence_signals')
        .insert({
          signal_id: record.signalId,
          category: record.category,
          severity: record.severity,
          resident_id: record.residentId,
          agency_id: record.agencyId,
          title: record.title,
          description: record.description,
          reasoning: record.reasoning,
          detected_at: record.detectedAt,
          requires_human_action: record.requiresHumanAction,
          suggested_actions: record.suggestedActions,
          data_source: record.dataSource,
          dismissed: false
        });

      if (error) {
        console.error('Failed to write intelligence signal:', error);
      }
    }
  }

  /**
   * Main job runner - call this from cron/scheduler
   */
  static async runScheduledJobs(): Promise<{
    missedMedications: number;
    complianceReminders: number;
    totalSignals: number;
  }> {
    console.log('Running scheduled background jobs...');

    const missedMeds = await this.detectMissedMedications();
    const complianceReminders = await this.generateComplianceReminders();

    const allSignals = [...missedMeds, ...complianceReminders];

    if (allSignals.length > 0) {
      await this.writeIntelligenceSignals(allSignals);
    }

    console.log(`Background jobs complete: ${missedMeds.length} missed meds, ${complianceReminders.length} compliance reminders`);

    return {
      missedMedications: missedMeds.length,
      complianceReminders: complianceReminders.length,
      totalSignals: allSignals.length
    };
  }
}
