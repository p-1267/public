/**
 * Baseline Engine
 *
 * Calculates and maintains rolling window baselines for:
 * - Resident health metrics (vitals, activity, medications, meals)
 * - Caregiver performance metrics (completion times, evidence quality)
 *
 * Uses 7-day and 30-day rolling windows with statistical aggregates.
 * Bootstrap rules handle initial periods with insufficient data.
 */

import { supabase } from '../lib/supabase';

interface StatisticalAggregate {
  mean: number;
  median: number;
  stddev: number;
  min: number;
  max: number;
  sampleCount: number;
}

interface BaselineCalculation {
  window7d: StatisticalAggregate;
  window30d: StatisticalAggregate;
  trendDirection: 'rising' | 'falling' | 'stable' | 'unknown';
  trendVelocity: number;
  trendConfidence: number;
  baselineConfidence: number;
  dataQualityScore: number;
}

export class BaselineEngine {
  /**
   * Calculate resident baseline for a specific metric
   */
  async calculateResidentBaseline(
    residentId: string,
    baselineType: string
  ): Promise<BaselineCalculation | null> {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get observations for this resident and baseline type
      const observations = await this.fetchResidentObservations(
        residentId,
        baselineType,
        thirtyDaysAgo
      );

      if (observations.length === 0) {
        return null; // No data to calculate baseline
      }

      // Split into 7-day and 30-day windows
      const observations7d = observations.filter(
        (obs) => new Date(obs.timestamp) >= sevenDaysAgo
      );
      const observations30d = observations;

      // Calculate statistical aggregates
      const window7d = this.calculateStatistics(observations7d.map((o) => o.value));
      const window30d = this.calculateStatistics(observations30d.map((o) => o.value));

      // Calculate trend
      const { direction, velocity, confidence } = this.calculateTrend(observations);

      // Calculate baseline confidence (more data = higher confidence)
      const baselineConfidence = this.calculateBaselineConfidence(
        window7d.sampleCount,
        window30d.sampleCount
      );

      // Calculate data quality score
      const dataQualityScore = this.calculateDataQuality(observations);

      return {
        window7d,
        window30d,
        trendDirection: direction,
        trendVelocity: velocity,
        trendConfidence: confidence,
        baselineConfidence,
        dataQualityScore,
      };
    } catch (error) {
      console.error('Error calculating resident baseline:', error);
      return null;
    }
  }

  /**
   * Calculate caregiver baseline for a specific metric
   */
  async calculateCaregiverBaseline(
    caregiverId: string,
    baselineType: string
  ): Promise<BaselineCalculation | null> {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get observations for this caregiver and baseline type
      const observations = await this.fetchCaregiverObservations(
        caregiverId,
        baselineType,
        thirtyDaysAgo
      );

      if (observations.length === 0) {
        return null;
      }

      const observations7d = observations.filter(
        (obs) => new Date(obs.timestamp) >= sevenDaysAgo
      );
      const observations30d = observations;

      const window7d = this.calculateStatistics(observations7d.map((o) => o.value));
      const window30d = this.calculateStatistics(observations30d.map((o) => o.value));

      const { direction, velocity, confidence } = this.calculateTrend(observations);
      const baselineConfidence = this.calculateBaselineConfidence(
        window7d.sampleCount,
        window30d.sampleCount
      );
      const dataQualityScore = this.calculateDataQuality(observations);

      return {
        window7d,
        window30d,
        trendDirection: direction,
        trendVelocity: velocity,
        trendConfidence: confidence,
        baselineConfidence,
        dataQualityScore,
      };
    } catch (error) {
      console.error('Error calculating caregiver baseline:', error);
      return null;
    }
  }

  /**
   * Fetch resident observations from observation_events
   */
  private async fetchResidentObservations(
    residentId: string,
    baselineType: string,
    since: Date
  ): Promise<Array<{ timestamp: string; value: number }>> {
    const observations: Array<{ timestamp: string; value: number }> = [];

    try {
      const { data, error } = await supabase
        .from('observation_events')
        .select('event_timestamp, event_data')
        .eq('resident_id', residentId)
        .gte('event_timestamp', since.toISOString())
        .order('event_timestamp', { ascending: true });

      if (error || !data) return observations;

      // Extract values based on baseline type
      for (const event of data) {
        const value = this.extractValueFromEvent(event.event_data, baselineType);
        if (value !== null) {
          observations.push({
            timestamp: event.event_timestamp,
            value,
          });
        }
      }

      return observations;
    } catch (error) {
      console.error('Error fetching resident observations:', error);
      return observations;
    }
  }

  /**
   * Fetch caregiver observations from observation_events
   */
  private async fetchCaregiverObservations(
    caregiverId: string,
    baselineType: string,
    since: Date
  ): Promise<Array<{ timestamp: string; value: number }>> {
    const observations: Array<{ timestamp: string; value: number }> = [];

    try {
      const { data, error } = await supabase
        .from('observation_events')
        .select('event_timestamp, event_data')
        .eq('caregiver_id', caregiverId)
        .gte('event_timestamp', since.toISOString())
        .order('event_timestamp', { ascending: true });

      if (error || !data) return observations;

      for (const event of data) {
        const value = this.extractValueFromEvent(event.event_data, baselineType);
        if (value !== null) {
          observations.push({
            timestamp: event.event_timestamp,
            value,
          });
        }
      }

      return observations;
    } catch (error) {
      console.error('Error fetching caregiver observations:', error);
      return observations;
    }
  }

  /**
   * Extract numeric value from event data based on baseline type
   */
  private extractValueFromEvent(eventData: any, baselineType: string): number | null {
    const mapping: Record<string, string> = {
      vital_signs_bp_systolic: 'bloodPressureSystolic',
      vital_signs_bp_diastolic: 'bloodPressureDiastolic',
      vital_signs_heart_rate: 'heartRate',
      vital_signs_temperature: 'temperature',
      vital_signs_oxygen_sat: 'oxygenSaturation',
      meal_consumption_pct: 'percentageEaten',
      task_completion_time: 'completionSeconds',
      evidence_quality: 'evidenceQuality',
    };

    const fieldName = mapping[baselineType];
    if (!fieldName || !eventData[fieldName]) return null;

    const value = parseFloat(eventData[fieldName]);
    return isNaN(value) ? null : value;
  }

  /**
   * Calculate statistical aggregates for a dataset
   */
  private calculateStatistics(values: number[]): StatisticalAggregate {
    if (values.length === 0) {
      return {
        mean: 0,
        median: 0,
        stddev: 0,
        min: 0,
        max: 0,
        sampleCount: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median =
      values.length % 2 === 0
        ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
        : sorted[Math.floor(values.length / 2)];

    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stddev = Math.sqrt(variance);

    return {
      mean,
      median,
      stddev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      sampleCount: values.length,
    };
  }

  /**
   * Calculate trend direction and velocity using linear regression
   */
  private calculateTrend(
    observations: Array<{ timestamp: string; value: number }>
  ): {
    direction: 'rising' | 'falling' | 'stable' | 'unknown';
    velocity: number;
    confidence: number;
  } {
    if (observations.length < 3) {
      return { direction: 'unknown', velocity: 0, confidence: 0 };
    }

    // Simple linear regression
    const n = observations.length;
    const timestamps = observations.map((obs, i) => i); // Use indices as x-values
    const values = observations.map((obs) => obs.value);

    const sumX = timestamps.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = timestamps.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = timestamps.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = values.reduce(
      (sum, y, i) => sum + Math.pow(y - (slope * i + intercept), 2),
      0
    );
    const rSquared = 1 - ssResidual / ssTotal;

    // Determine direction
    let direction: 'rising' | 'falling' | 'stable' | 'unknown';
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'rising';
    } else {
      direction = 'falling';
    }

    return {
      direction,
      velocity: slope,
      confidence: Math.max(0, Math.min(1, rSquared)),
    };
  }

  /**
   * Calculate baseline confidence based on sample counts
   */
  private calculateBaselineConfidence(sample7d: number, sample30d: number): number {
    // Need at least 3 samples for basic confidence
    if (sample7d < 3) return 0.3;
    if (sample7d < 5) return 0.5;
    if (sample30d < 10) return 0.6;
    if (sample30d < 20) return 0.8;
    return 0.95;
  }

  /**
   * Calculate data quality score
   */
  private calculateDataQuality(observations: Array<{ timestamp: string; value: number }>): number {
    if (observations.length === 0) return 0;

    let quality = 50;

    // More observations = better quality
    if (observations.length >= 30) quality += 30;
    else if (observations.length >= 14) quality += 20;
    else if (observations.length >= 7) quality += 10;

    // Check for gaps in data
    const timestamps = observations.map((obs) => new Date(obs.timestamp).getTime());
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push(timestamps[i] - timestamps[i - 1]);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const maxGap = Math.max(...gaps);

    // Penalize large gaps
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (maxGap > 3 * oneDayMs) quality -= 15;
    else if (maxGap > 2 * oneDayMs) quality -= 10;

    // Penalize irregular intervals
    const gapVariance =
      gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
    if (gapVariance > Math.pow(oneDayMs, 2)) quality -= 10;

    return Math.max(0, Math.min(100, quality));
  }

  /**
   * Update baseline in database
   */
  async updateResidentBaseline(
    agencyId: string,
    residentId: string,
    baselineType: string,
    calculation: BaselineCalculation
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('resident_baselines').upsert(
        {
          agency_id: agencyId,
          resident_id: residentId,
          baseline_type: baselineType,
          window_7d_mean: calculation.window7d.mean,
          window_7d_median: calculation.window7d.median,
          window_7d_stddev: calculation.window7d.stddev,
          window_7d_min: calculation.window7d.min,
          window_7d_max: calculation.window7d.max,
          window_7d_sample_count: calculation.window7d.sampleCount,
          window_30d_mean: calculation.window30d.mean,
          window_30d_median: calculation.window30d.median,
          window_30d_stddev: calculation.window30d.stddev,
          window_30d_min: calculation.window30d.min,
          window_30d_max: calculation.window30d.max,
          window_30d_sample_count: calculation.window30d.sampleCount,
          trend_direction: calculation.trendDirection,
          trend_velocity: calculation.trendVelocity,
          trend_confidence: calculation.trendConfidence,
          baseline_confidence: calculation.baselineConfidence,
          data_quality_score: calculation.dataQualityScore,
          last_observation_at: new Date().toISOString(),
          baseline_computed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'resident_id,baseline_type' }
      );

      return !error;
    } catch (error) {
      console.error('Error updating resident baseline:', error);
      return false;
    }
  }

  /**
   * Update caregiver baseline in database
   */
  async updateCaregiverBaseline(
    agencyId: string,
    caregiverId: string,
    baselineType: string,
    calculation: BaselineCalculation
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('caregiver_baselines').upsert(
        {
          agency_id: agencyId,
          caregiver_id: caregiverId,
          baseline_type: baselineType,
          window_7d_mean: calculation.window7d.mean,
          window_7d_median: calculation.window7d.median,
          window_7d_stddev: calculation.window7d.stddev,
          window_7d_min: calculation.window7d.min,
          window_7d_max: calculation.window7d.max,
          window_7d_sample_count: calculation.window7d.sampleCount,
          window_30d_mean: calculation.window30d.mean,
          window_30d_median: calculation.window30d.median,
          window_30d_stddev: calculation.window30d.stddev,
          window_30d_min: calculation.window30d.min,
          window_30d_max: calculation.window30d.max,
          window_30d_sample_count: calculation.window30d.sampleCount,
          trend_direction: calculation.trendDirection,
          trend_velocity: calculation.trendVelocity,
          trend_confidence: calculation.trendConfidence,
          baseline_confidence: calculation.baselineConfidence,
          data_quality_score: calculation.dataQualityScore,
          last_observation_at: new Date().toISOString(),
          baseline_computed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );

      return !error;
    } catch (error) {
      console.error('Error updating caregiver baseline:', error);
      return false;
    }
  }
}

export const baselineEngine = new BaselineEngine();
