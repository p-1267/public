/**
 * Observation Aggregator Service
 *
 * Converts events from various tables into unified observation stream
 * for Brain Intelligence Layer processing.
 *
 * Sources:
 * - Task completions
 * - Medication administrations
 * - Vital sign measurements
 * - Incidents
 * - Evidence submissions
 * - Caregiver timing patterns
 */

import { supabase } from '../lib/supabase';

export interface ObservationEvent {
  agencyId: string;
  eventType: 'task_completion' | 'medication_admin' | 'vital_sign' | 'incident' | 'evidence_submission' | 'caregiver_timing' | 'system_event';
  eventSubtype: string;
  residentId?: string;
  caregiverId?: string;
  eventTimestamp: string;
  eventData: Record<string, any>;
  observationQuality: number;
  sourceTable?: string;
  sourceId?: string;
}

export class ObservationAggregator {
  /**
   * Aggregate task completion into observation stream
   */
  async aggregateTaskCompletion(taskId: string): Promise<string | null> {
    try {
      // Fetch task details with telemetry
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          resident:residents(id, first_name, last_name),
          assigned_to:user_profiles(id, full_name),
          category:task_categories(*)
        `)
        .eq('id', taskId)
        .single();

      if (taskError || !task) {
        console.error('Task not found:', taskError);
        return null;
      }

      // Fetch telemetry if exists
      const { data: telemetry } = await supabase
        .from('task_completion_telemetry')
        .select('*')
        .eq('task_id', taskId)
        .maybeSingle();

      // Calculate observation quality based on completion method and evidence
      let observationQuality = 70; // Base quality

      if (telemetry) {
        // Higher quality for voice documentation
        if (telemetry.completion_method === 'voice') observationQuality += 20;
        // Lower quality for rushed completion
        if (telemetry.completion_seconds < 10) observationQuality -= 20;
        // Higher quality for evidence submission
        if (telemetry.evidence_submitted) observationQuality += 10;
      }

      observationQuality = Math.max(0, Math.min(100, observationQuality));

      // Create observation event
      const observation: ObservationEvent = {
        agencyId: task.agency_id,
        eventType: 'task_completion',
        eventSubtype: task.category?.category_name || 'unknown',
        residentId: task.resident_id,
        caregiverId: task.completed_by || task.assigned_to,
        eventTimestamp: task.completed_at || task.updated_at,
        eventData: {
          taskId: task.id,
          taskTitle: task.title,
          outcome: task.outcome,
          state: task.state,
          scheduledTime: task.scheduled_for,
          completedTime: task.completed_at,
          completionMethod: telemetry?.completion_method,
          tapCount: telemetry?.tap_count,
          characterCount: telemetry?.character_count,
          completionSeconds: telemetry?.completion_seconds,
          wasException: telemetry?.was_exception,
          evidenceSubmitted: telemetry?.evidence_submitted,
        },
        observationQuality,
        sourceTable: 'tasks',
        sourceId: task.id,
      };

      return await this.insertObservation(observation);
    } catch (error) {
      console.error('Error aggregating task completion:', error);
      return null;
    }
  }

  /**
   * Aggregate medication administration into observation stream
   */
  async aggregateMedicationAdmin(adminId: string): Promise<string | null> {
    try {
      const { data: admin, error } = await supabase
        .from('medication_administration')
        .select(`
          *,
          medication:resident_medications(*),
          resident:residents(id, first_name, last_name),
          administered_by:user_profiles(id, full_name)
        `)
        .eq('id', adminId)
        .single();

      if (error || !admin) return null;

      // Quality based on documentation completeness
      let observationQuality = 80;
      if (admin.notes && admin.notes.length > 20) observationQuality += 10;
      if (admin.status === 'refused' || admin.status === 'held') observationQuality += 10; // Exception documented

      const observation: ObservationEvent = {
        agencyId: admin.agency_id,
        eventType: 'medication_admin',
        eventSubtype: admin.status,
        residentId: admin.resident_id,
        caregiverId: admin.administered_by,
        eventTimestamp: admin.administered_at || admin.created_at,
        eventData: {
          medicationId: admin.medication_id,
          medicationName: admin.medication?.medication_name,
          dosage: admin.medication?.dosage,
          route: admin.medication?.route,
          status: admin.status,
          scheduledTime: admin.scheduled_time,
          administeredTime: admin.administered_at,
          notes: admin.notes,
        },
        observationQuality,
        sourceTable: 'medication_administration',
        sourceId: admin.id,
      };

      return await this.insertObservation(observation);
    } catch (error) {
      console.error('Error aggregating medication admin:', error);
      return null;
    }
  }

  /**
   * Aggregate vital sign measurement into observation stream
   */
  async aggregateVitalSign(vitalId: string): Promise<string | null> {
    try {
      const { data: vital, error } = await supabase
        .from('vital_signs')
        .select(`
          *,
          resident:residents(id, first_name, last_name),
          recorded_by:user_profiles(id, full_name)
        `)
        .eq('id', vitalId)
        .single();

      if (error || !vital) return null;

      // Quality based on completeness of measurements
      let observationQuality = 60;
      if (vital.blood_pressure_systolic) observationQuality += 8;
      if (vital.blood_pressure_diastolic) observationQuality += 8;
      if (vital.heart_rate) observationQuality += 8;
      if (vital.temperature) observationQuality += 8;
      if (vital.oxygen_saturation) observationQuality += 8;

      const observation: ObservationEvent = {
        agencyId: vital.agency_id,
        eventType: 'vital_sign',
        eventSubtype: 'measurement',
        residentId: vital.resident_id,
        caregiverId: vital.recorded_by,
        eventTimestamp: vital.measured_at || vital.created_at,
        eventData: {
          bloodPressureSystolic: vital.blood_pressure_systolic,
          bloodPressureDiastolic: vital.blood_pressure_diastolic,
          heartRate: vital.heart_rate,
          temperature: vital.temperature,
          oxygenSaturation: vital.oxygen_saturation,
          respiratoryRate: vital.respiratory_rate,
          notes: vital.notes,
        },
        observationQuality,
        sourceTable: 'vital_signs',
        sourceId: vital.id,
      };

      return await this.insertObservation(observation);
    } catch (error) {
      console.error('Error aggregating vital sign:', error);
      return null;
    }
  }

  /**
   * Aggregate caregiver timing pattern (from shift data)
   */
  async aggregateCaregiverTiming(caregiverId: string, shiftDate: string): Promise<string | null> {
    try {
      // Get all tasks completed by caregiver on this date
      const startOfDay = new Date(shiftDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(shiftDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: telemetry, error } = await supabase
        .from('task_completion_telemetry')
        .select('*')
        .eq('caregiver_id', caregiverId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      if (error || !telemetry || telemetry.length === 0) return null;

      // Calculate timing metrics
      const completionTimes = telemetry.map(t => t.completion_seconds).filter(Boolean);
      const avgCompletionTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
      const tasksCompleted = telemetry.length;
      const exceptionsCount = telemetry.filter(t => t.was_exception).length;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('agency_id')
        .eq('id', caregiverId)
        .single();

      if (!profile) return null;

      const observation: ObservationEvent = {
        agencyId: profile.agency_id,
        eventType: 'caregiver_timing',
        eventSubtype: 'shift_summary',
        caregiverId,
        eventTimestamp: endOfDay.toISOString(),
        eventData: {
          shiftDate,
          tasksCompleted,
          avgCompletionTime,
          exceptionsCount,
          exceptionRate: exceptionsCount / tasksCompleted,
        },
        observationQuality: 85,
        sourceTable: 'task_completion_telemetry',
      };

      return await this.insertObservation(observation);
    } catch (error) {
      console.error('Error aggregating caregiver timing:', error);
      return null;
    }
  }

  /**
   * Insert observation event into database
   */
  private async insertObservation(observation: ObservationEvent): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('observation_events')
        .insert({
          agency_id: observation.agencyId,
          event_type: observation.eventType,
          event_subtype: observation.eventSubtype,
          resident_id: observation.residentId,
          caregiver_id: observation.caregiverId,
          event_timestamp: observation.eventTimestamp,
          event_data: observation.eventData,
          observation_quality: observation.observationQuality,
          source_table: observation.sourceTable,
          source_id: observation.sourceId,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error inserting observation:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error inserting observation:', error);
      return null;
    }
  }

  /**
   * Batch aggregate observations for time range
   */
  async batchAggregateForAgency(agencyId: string, since: Date): Promise<{
    tasksAggregated: number;
    medicationsAggregated: number;
    vitalsAggregated: number;
  }> {
    let tasksAggregated = 0;
    let medicationsAggregated = 0;
    let vitalsAggregated = 0;

    try {
      // Aggregate completed tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('state', 'completed')
        .gte('completed_at', since.toISOString());

      if (tasks) {
        for (const task of tasks) {
          const result = await this.aggregateTaskCompletion(task.id);
          if (result) tasksAggregated++;
        }
      }

      // Aggregate medications
      const { data: meds } = await supabase
        .from('medication_administration')
        .select('id')
        .eq('agency_id', agencyId)
        .gte('administered_at', since.toISOString());

      if (meds) {
        for (const med of meds) {
          const result = await this.aggregateMedicationAdmin(med.id);
          if (result) medicationsAggregated++;
        }
      }

      // Aggregate vitals
      const { data: vitals } = await supabase
        .from('vital_signs')
        .select('id')
        .eq('agency_id', agencyId)
        .gte('measured_at', since.toISOString());

      if (vitals) {
        for (const vital of vitals) {
          const result = await this.aggregateVitalSign(vital.id);
          if (result) vitalsAggregated++;
        }
      }

      return { tasksAggregated, medicationsAggregated, vitalsAggregated };
    } catch (error) {
      console.error('Error in batch aggregation:', error);
      return { tasksAggregated, medicationsAggregated, vitalsAggregated };
    }
  }
}

export const observationAggregator = new ObservationAggregator();
