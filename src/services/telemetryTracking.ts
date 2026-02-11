import { supabase } from '../lib/supabase';

export interface TaskTelemetry {
  taskId: string;
  completionMethod: 'quick_tap' | 'all_clear' | 'voice' | 'manual_form' | 'exception_form';
  tapCount: number;
  characterCount: number;
  completionSeconds: number;
  wasException: boolean;
  exceptionReason?: string;
  voiceUsed: boolean;
  evidenceCount: number;
}

export class TelemetryTracker {
  private startTime: number = 0;
  private tapCount: number = 0;
  private characterCount: number = 0;
  private taskId: string | null = null;

  startTracking(taskId: string): void {
    this.taskId = taskId;
    this.startTime = Date.now();
    this.tapCount = 0;
    this.characterCount = 0;
  }

  recordTap(): void {
    this.tapCount++;
  }

  recordTyping(text: string): void {
    this.characterCount += text.length;
  }

  getElapsedSeconds(): number {
    if (this.startTime === 0) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  getTapCount(): number {
    return this.tapCount;
  }

  getCharacterCount(): number {
    return this.characterCount;
  }

  async recordCompletion(
    completionMethod: TaskTelemetry['completionMethod'],
    wasException: boolean = false,
    options: {
      exceptionReason?: string;
      voiceUsed?: boolean;
      evidenceCount?: number;
    } = {}
  ): Promise<void> {
    if (!this.taskId) {
      console.warn('No task ID set for telemetry');
      return;
    }

    const telemetry: TaskTelemetry = {
      taskId: this.taskId,
      completionMethod,
      tapCount: this.tapCount,
      characterCount: this.characterCount,
      completionSeconds: this.getElapsedSeconds(),
      wasException,
      exceptionReason: options.exceptionReason,
      voiceUsed: options.voiceUsed || false,
      evidenceCount: options.evidenceCount || 0,
    };

    await this.submitTelemetry(telemetry);

    // Reset tracking
    this.reset();
  }

  reset(): void {
    this.taskId = null;
    this.startTime = 0;
    this.tapCount = 0;
    this.characterCount = 0;
  }

  private async submitTelemetry(telemetry: TaskTelemetry): Promise<void> {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('agency_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
      .single();

    if (!userProfile) {
      console.error('Could not get user profile for telemetry');
      return;
    }

    const { error } = await supabase.from('task_completion_telemetry').insert({
      task_id: telemetry.taskId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      agency_id: userProfile.agency_id,
      completion_method: telemetry.completionMethod,
      tap_count: telemetry.tapCount,
      character_count: telemetry.characterCount,
      completion_seconds: telemetry.completionSeconds,
      was_exception: telemetry.wasException,
      exception_reason: telemetry.exceptionReason,
      voice_used: telemetry.voiceUsed,
      evidence_count: telemetry.evidenceCount,
    });

    if (error) {
      console.error('Failed to submit telemetry:', error);
    }
  }
}

// Telemetry aggregation for WP2 acceptance test
export interface WP2Metrics {
  date: string;
  routineTasks: {
    total: number;
    avgTaps: number;
    avgTypingChars: number;
    avgSeconds: number;
    oneTapPercentage: number;
    zeroTypingPercentage: number;
    under30sPercentage: number;
  };
  exceptionTasks: {
    total: number;
    avgTaps: number;
    avgSeconds: number;
    avgEvidence: number;
  };
  voiceTasks: {
    total: number;
    totalExtractions: number;
    avgConfidence: number;
    autoApprovedPercentage: number;
  };
}

export async function getWP2Metrics(agencyId: string, date?: Date): Promise<WP2Metrics> {
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('get_wp2_metrics', {
    p_agency_id: agencyId,
    p_date: dateStr,
  });

  if (error) {
    throw new Error(`Failed to get WP2 metrics: ${error.message}`);
  }

  return data;
}

// Check if WP2 acceptance criteria are met
export interface WP2AcceptanceResult {
  passed: boolean;
  criteria: {
    oneTapOrLess: { required: number; actual: number; passed: boolean };
    zeroTyping: { required: number; actual: number; passed: boolean };
    under30Seconds: { required: number; actual: number; passed: boolean };
    voiceExtractions: { required: number; actual: number; passed: boolean };
  };
  metrics: WP2Metrics;
}

export async function checkWP2Acceptance(
  agencyId: string,
  date?: Date
): Promise<WP2AcceptanceResult> {
  const metrics = await getWP2Metrics(agencyId, date);

  const criteria = {
    oneTapOrLess: {
      required: 90, // 90% of routine tasks should be ≤1 tap
      actual: metrics.routineTasks.oneTapPercentage,
      passed: metrics.routineTasks.oneTapPercentage >= 90,
    },
    zeroTyping: {
      required: 90, // 90% of routine tasks should have 0 typing
      actual: metrics.routineTasks.zeroTypingPercentage,
      passed: metrics.routineTasks.zeroTypingPercentage >= 90,
    },
    under30Seconds: {
      required: 90, // 90% of routine tasks should complete in ≤30s
      actual: metrics.routineTasks.under30sPercentage,
      passed: metrics.routineTasks.under30sPercentage >= 90,
    },
    voiceExtractions: {
      required: 3, // Must demonstrate at least 3 extraction types
      actual: metrics.voiceTasks.totalExtractions,
      passed: metrics.voiceTasks.totalExtractions >= 3,
    },
  };

  const passed =
    criteria.oneTapOrLess.passed &&
    criteria.zeroTyping.passed &&
    criteria.under30Seconds.passed &&
    criteria.voiceExtractions.passed;

  return {
    passed,
    criteria,
    metrics,
  };
}
