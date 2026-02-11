/**
 * Anomaly Detection Engine
 *
 * Detects deviations from established baselines:
 * - Missed or rushed care patterns
 * - Vital sign trend alerts
 * - Medication adherence issues
 * - Activity level changes
 * - Caregiver performance degradation
 *
 * Uses statistical thresholds (sigma deviations) and pattern matching.
 */

import { supabase } from '../lib/supabase';

export interface AnomalyDetection {
  anomalyType: string;
  anomalySubtype: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  residentId?: string;
  caregiverId?: string;
  detectedAt: string;
  observationWindowStart: string;
  observationWindowEnd: string;
  baselineValue?: number;
  observedValue?: number;
  deviationMagnitude?: number;
  deviationSigma?: number;
  confidenceScore: number;
  anomalyData: Record<string, any>;
  supportingEvidenceIds?: string[];
}

export class AnomalyDetectionEngine {
  /**
   * Detect vital sign anomalies for a resident
   */
  async detectVitalSignAnomalies(residentId: string, agencyId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
      const vitalTypes = [
        'vital_signs_bp_systolic',
        'vital_signs_bp_diastolic',
        'vital_signs_heart_rate',
        'vital_signs_temperature',
        'vital_signs_oxygen_sat',
      ];

      for (const vitalType of vitalTypes) {
        // Get baseline
        const { data: baseline } = await supabase
          .from('resident_baselines')
          .select('*')
          .eq('resident_id', residentId)
          .eq('baseline_type', vitalType)
          .maybeSingle();

        if (!baseline || baseline.baseline_confidence < 0.5) continue;

        // Get recent observations
        const recentObservations = await this.getRecentObservations(
          residentId,
          vitalType,
          24 // Last 24 hours
        );

        for (const obs of recentObservations) {
          const deviation = obs.value - baseline.window_7d_mean;
          const deviationSigma = Math.abs(deviation / (baseline.window_7d_stddev || 1));

          // Flag if deviation > 2 sigma
          if (deviationSigma > 2) {
            const severity = this.calculateVitalSeverity(vitalType, deviationSigma, obs.value);

            anomalies.push({
              anomalyType: 'vital_sign_deviation',
              anomalySubtype: vitalType,
              severity,
              residentId,
              detectedAt: new Date().toISOString(),
              observationWindowStart: obs.timestamp,
              observationWindowEnd: obs.timestamp,
              baselineValue: baseline.window_7d_mean,
              observedValue: obs.value,
              deviationMagnitude: Math.abs(deviation),
              deviationSigma,
              confidenceScore: baseline.baseline_confidence,
              anomalyData: {
                vitalType,
                baselineMean: baseline.window_7d_mean,
                baselineStddev: baseline.window_7d_stddev,
                trend: baseline.trend_direction,
              },
            });
          }
        }

        // Detect trend anomalies (rapid changes)
        if (baseline.trend_direction && baseline.trend_velocity) {
          if (
            (baseline.trend_direction === 'rising' || baseline.trend_direction === 'falling') &&
            Math.abs(baseline.trend_velocity) > 2 && // Significant velocity
            baseline.trend_confidence > 0.7
          ) {
            anomalies.push({
              anomalyType: 'vital_sign_trend',
              anomalySubtype: vitalType,
              severity: 'medium',
              residentId,
              detectedAt: new Date().toISOString(),
              observationWindowStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              observationWindowEnd: new Date().toISOString(),
              confidenceScore: baseline.trend_confidence,
              anomalyData: {
                vitalType,
                trendDirection: baseline.trend_direction,
                trendVelocity: baseline.trend_velocity,
                baselineMean: baseline.window_7d_mean,
              },
            });
          }
        }
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting vital sign anomalies:', error);
      return anomalies;
    }
  }

  /**
   * Detect missed or late care patterns
   */
  async detectMissedCareAnomalies(residentId: string, agencyId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check for scheduled tasks that are overdue
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('*, category:task_categories(*)')
        .eq('resident_id', residentId)
        .eq('state', 'scheduled')
        .lt('scheduled_for', now.toISOString());

      if (overdueTasks && overdueTasks.length > 0) {
        for (const task of overdueTasks) {
          const hoursOverdue =
            (now.getTime() - new Date(task.scheduled_for).getTime()) / (1000 * 60 * 60);

          let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
          if (hoursOverdue > 4) severity = 'high';
          else if (hoursOverdue > 2) severity = 'medium';

          // Critical categories get elevated severity
          if (task.category?.category_name === 'medication' && hoursOverdue > 1) {
            severity = 'critical';
          }

          anomalies.push({
            anomalyType: 'missed_care',
            anomalySubtype: task.category?.category_name || 'unknown',
            severity,
            residentId,
            detectedAt: now.toISOString(),
            observationWindowStart: task.scheduled_for,
            observationWindowEnd: now.toISOString(),
            confidenceScore: 1.0, // High confidence - task is definitively overdue
            anomalyData: {
              taskId: task.id,
              taskTitle: task.title,
              scheduledFor: task.scheduled_for,
              hoursOverdue,
              category: task.category?.category_name,
            },
            supportingEvidenceIds: [task.id],
          });
        }
      }

      // Check for rushed task completions (< 10 seconds)
      const { data: rushedTasks } = await supabase
        .from('task_completion_telemetry')
        .select('*, task:tasks(*)')
        .eq('resident_id', residentId)
        .lt('completion_seconds', 10)
        .gte('created_at', yesterday.toISOString());

      if (rushedTasks && rushedTasks.length > 3) {
        // Pattern of rushed care
        anomalies.push({
          anomalyType: 'rushed_care_pattern',
          anomalySubtype: 'systematic',
          severity: 'medium',
          residentId,
          detectedAt: now.toISOString(),
          observationWindowStart: yesterday.toISOString(),
          observationWindowEnd: now.toISOString(),
          confidenceScore: 0.85,
          anomalyData: {
            rushedTaskCount: rushedTasks.length,
            avgCompletionTime: rushedTasks.reduce((sum, t) => sum + t.completion_seconds, 0) / rushedTasks.length,
            tasks: rushedTasks.map((t) => ({
              taskId: t.task_id,
              completionSeconds: t.completion_seconds,
            })),
          },
        });
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting missed care anomalies:', error);
      return anomalies;
    }
  }

  /**
   * Detect medication adherence issues
   */
  async detectMedicationAnomalies(residentId: string, agencyId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get medication administrations for last 7 days
      const { data: meds } = await supabase
        .from('medication_administration')
        .select('*')
        .eq('resident_id', residentId)
        .gte('administered_at', last7Days.toISOString());

      if (!meds || meds.length === 0) return anomalies;

      // Calculate refusal rate
      const refusals = meds.filter((m) => m.status === 'refused');
      const refusalRate = refusals.length / meds.length;

      if (refusalRate > 0.2) {
        // More than 20% refusal rate
        anomalies.push({
          anomalyType: 'medication_adherence',
          anomalySubtype: 'high_refusal_rate',
          severity: refusalRate > 0.4 ? 'high' : 'medium',
          residentId,
          detectedAt: now.toISOString(),
          observationWindowStart: last7Days.toISOString(),
          observationWindowEnd: now.toISOString(),
          observedValue: refusalRate * 100,
          confidenceScore: 0.9,
          anomalyData: {
            totalMedications: meds.length,
            refusals: refusals.length,
            refusalRate: refusalRate * 100,
            refusalReasons: refusals.map((r) => r.notes).filter(Boolean),
          },
        });
      }

      // Check for missed medication windows (not administered and past scheduled time)
      const { data: scheduledMeds } = await supabase
        .from('resident_medications')
        .select('*')
        .eq('resident_id', residentId)
        .eq('status', 'active');

      // This would require more complex scheduling logic in production
      // For now, we check for patterns in the administration data

      return anomalies;
    } catch (error) {
      console.error('Error detecting medication anomalies:', error);
      return anomalies;
    }
  }

  /**
   * Detect caregiver performance degradation
   */
  async detectCaregiverAnomalies(caregiverId: string, agencyId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
      // Get caregiver baseline for completion time
      const { data: baseline } = await supabase
        .from('caregiver_baselines')
        .select('*')
        .eq('caregiver_id', caregiverId)
        .eq('baseline_type', 'task_completion_time')
        .maybeSingle();

      if (!baseline || baseline.baseline_confidence < 0.5) return anomalies;

      // Get recent task completions
      const recentObservations = await this.getCaregiverRecentObservations(
        caregiverId,
        'task_completion_time',
        24
      );

      // Check for performance degradation (consistently slower than baseline)
      const slowTasks = recentObservations.filter(
        (obs) => obs.value > baseline.window_7d_mean + baseline.window_7d_stddev
      );

      if (slowTasks.length >= 3 && slowTasks.length / recentObservations.length > 0.5) {
        anomalies.push({
          anomalyType: 'caregiver_performance',
          anomalySubtype: 'completion_time_degradation',
          severity: 'medium',
          caregiverId,
          detectedAt: new Date().toISOString(),
          observationWindowStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          observationWindowEnd: new Date().toISOString(),
          baselineValue: baseline.window_7d_mean,
          observedValue: slowTasks.reduce((sum, t) => sum + t.value, 0) / slowTasks.length,
          confidenceScore: 0.75,
          anomalyData: {
            baselineMean: baseline.window_7d_mean,
            slowTaskCount: slowTasks.length,
            totalTasks: recentObservations.length,
            avgSlowdown: ((slowTasks.reduce((sum, t) => sum + t.value, 0) / slowTasks.length) - baseline.window_7d_mean) / baseline.window_7d_mean,
          },
        });
      }

      // Check workload stress (too many tasks in short period)
      const { data: todaysTelemetry } = await supabase
        .from('task_completion_telemetry')
        .select('*')
        .eq('caregiver_id', caregiverId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (todaysTelemetry && todaysTelemetry.length > 50) {
        // More than 50 tasks in 24 hours suggests overload
        anomalies.push({
          anomalyType: 'caregiver_workload',
          anomalySubtype: 'high_task_volume',
          severity: todaysTelemetry.length > 70 ? 'high' : 'medium',
          caregiverId,
          detectedAt: new Date().toISOString(),
          observationWindowStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          observationWindowEnd: new Date().toISOString(),
          observedValue: todaysTelemetry.length,
          confidenceScore: 0.85,
          anomalyData: {
            taskCount: todaysTelemetry.length,
            exceptionCount: todaysTelemetry.filter((t) => t.was_exception).length,
          },
        });
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting caregiver anomalies:', error);
      return anomalies;
    }
  }

  /**
   * Store anomaly in database
   */
  async storeAnomaly(agencyId: string, anomaly: AnomalyDetection): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('anomaly_detections')
        .insert({
          agency_id: agencyId,
          anomaly_type: anomaly.anomalyType,
          anomaly_subtype: anomaly.anomalySubtype,
          severity: anomaly.severity,
          resident_id: anomaly.residentId,
          caregiver_id: anomaly.caregiverId,
          detected_at: anomaly.detectedAt,
          observation_window_start: anomaly.observationWindowStart,
          observation_window_end: anomaly.observationWindowEnd,
          baseline_value: anomaly.baselineValue,
          observed_value: anomaly.observedValue,
          deviation_magnitude: anomaly.deviationMagnitude,
          deviation_sigma: anomaly.deviationSigma,
          confidence_score: anomaly.confidenceScore,
          anomaly_data: anomaly.anomalyData,
          supporting_evidence_ids: anomaly.supportingEvidenceIds || [],
          status: 'detected',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error storing anomaly:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error storing anomaly:', error);
      return null;
    }
  }

  /**
   * Helper: Get recent observations for a resident
   */
  private async getRecentObservations(
    residentId: string,
    baselineType: string,
    hours: number
  ): Promise<Array<{ timestamp: string; value: number }>> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { data } = await supabase
      .from('observation_events')
      .select('event_timestamp, event_data')
      .eq('resident_id', residentId)
      .gte('event_timestamp', since.toISOString())
      .order('event_timestamp', { ascending: false });

    if (!data) return [];

    const observations: Array<{ timestamp: string; value: number }> = [];
    for (const event of data) {
      const value = this.extractValue(event.event_data, baselineType);
      if (value !== null) {
        observations.push({ timestamp: event.event_timestamp, value });
      }
    }

    return observations;
  }

  /**
   * Helper: Get recent observations for a caregiver
   */
  private async getCaregiverRecentObservations(
    caregiverId: string,
    baselineType: string,
    hours: number
  ): Promise<Array<{ timestamp: string; value: number }>> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { data } = await supabase
      .from('observation_events')
      .select('event_timestamp, event_data')
      .eq('caregiver_id', caregiverId)
      .gte('event_timestamp', since.toISOString())
      .order('event_timestamp', { ascending: false });

    if (!data) return [];

    const observations: Array<{ timestamp: string; value: number }> = [];
    for (const event of data) {
      const value = this.extractValue(event.event_data, baselineType);
      if (value !== null) {
        observations.push({ timestamp: event.event_timestamp, value });
      }
    }

    return observations;
  }

  /**
   * Extract value from event data
   */
  private extractValue(eventData: any, baselineType: string): number | null {
    const mapping: Record<string, string> = {
      vital_signs_bp_systolic: 'bloodPressureSystolic',
      vital_signs_bp_diastolic: 'bloodPressureDiastolic',
      vital_signs_heart_rate: 'heartRate',
      vital_signs_temperature: 'temperature',
      vital_signs_oxygen_sat: 'oxygenSaturation',
      task_completion_time: 'completionSeconds',
    };

    const fieldName = mapping[baselineType];
    if (!fieldName || !eventData[fieldName]) return null;

    const value = parseFloat(eventData[fieldName]);
    return isNaN(value) ? null : value;
  }

  /**
   * Calculate severity for vital sign deviations
   */
  private calculateVitalSeverity(
    vitalType: string,
    deviationSigma: number,
    value: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical thresholds for immediate concern
    if (vitalType === 'vital_signs_bp_systolic' && (value > 180 || value < 90)) return 'critical';
    if (vitalType === 'vital_signs_oxygen_sat' && value < 90) return 'critical';
    if (vitalType === 'vital_signs_temperature' && (value > 102 || value < 95)) return 'critical';

    // Sigma-based severity
    if (deviationSigma > 4) return 'critical';
    if (deviationSigma > 3) return 'high';
    if (deviationSigma > 2.5) return 'medium';
    return 'low';
  }

  /**
   * Run full anomaly detection for an agency
   */
  async detectAllAnomalies(agencyId: string): Promise<{
    residentAnomalies: number;
    caregiverAnomalies: number;
  }> {
    let residentAnomalies = 0;
    let caregiverAnomalies = 0;

    try {
      // Get all active residents
      const { data: residents } = await supabase
        .from('residents')
        .select('id')
        .eq('agency_id', agencyId);

      if (residents) {
        for (const resident of residents) {
          const vitalAnomalies = await this.detectVitalSignAnomalies(resident.id, agencyId);
          const careAnomalies = await this.detectMissedCareAnomalies(resident.id, agencyId);
          const medAnomalies = await this.detectMedicationAnomalies(resident.id, agencyId);

          for (const anomaly of [...vitalAnomalies, ...careAnomalies, ...medAnomalies]) {
            const stored = await this.storeAnomaly(agencyId, anomaly);
            if (stored) residentAnomalies++;
          }
        }
      }

      // Get all caregivers
      const { data: caregivers } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('agency_id', agencyId);

      if (caregivers) {
        for (const caregiver of caregivers) {
          const anomalies = await this.detectCaregiverAnomalies(caregiver.id, agencyId);

          for (const anomaly of anomalies) {
            const stored = await this.storeAnomaly(agencyId, anomaly);
            if (stored) caregiverAnomalies++;
          }
        }
      }

      return { residentAnomalies, caregiverAnomalies };
    } catch (error) {
      console.error('Error detecting all anomalies:', error);
      return { residentAnomalies, caregiverAnomalies };
    }
  }
}

export const anomalyDetectionEngine = new AnomalyDetectionEngine();
