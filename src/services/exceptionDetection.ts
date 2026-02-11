import { supabase } from '../lib/supabase';

export interface ExceptionCheck {
  metric: string;
  value: number;
  severity: 'critical' | 'warning' | 'normal';
  requiresEvidence: boolean;
}

export interface ExceptionResult {
  isException: boolean;
  exceptions: ExceptionCheck[];
  residentId: string;
}

export async function checkTaskException(
  taskId: string,
  metricValues: Record<string, number>
): Promise<ExceptionResult> {
  const { data, error } = await supabase.rpc('check_task_exception_status', {
    p_task_id: taskId,
    p_metric_values: metricValues,
  });

  if (error) {
    throw new Error(`Exception check failed: ${error.message}`);
  }

  return {
    isException: data.is_exception,
    exceptions: data.exceptions,
    residentId: data.resident_id,
  };
}

export function shouldUseQuickTap(exceptions: ExceptionCheck[]): boolean {
  // If any exceptions exist, must use full form
  return exceptions.length === 0;
}

export function getExceptionMessage(exceptions: ExceptionCheck[]): string {
  if (exceptions.length === 0) return '';

  const critical = exceptions.filter((e) => e.severity === 'critical');
  const warnings = exceptions.filter((e) => e.severity === 'warning');

  let message = '';
  if (critical.length > 0) {
    message += `${critical.length} critical deviation(s) detected. `;
  }
  if (warnings.length > 0) {
    message += `${warnings.length} warning(s) detected. `;
  }

  message += 'Full documentation and evidence required.';
  return message;
}

// Common baseline checks for task types
export interface BaselineCheck {
  metric: string;
  expectedValue: string | number;
  actualValue: string | number;
  isWithinNormal: boolean;
}

export function checkVitalSignsBaseline(
  vitals: Record<string, number>,
  baselines: Record<string, { min: number; max: number }>
): BaselineCheck[] {
  const checks: BaselineCheck[] = [];

  for (const [metric, value] of Object.entries(vitals)) {
    const baseline = baselines[metric];
    if (baseline) {
      checks.push({
        metric,
        expectedValue: `${baseline.min}-${baseline.max}`,
        actualValue: value,
        isWithinNormal: value >= baseline.min && value <= baseline.max,
      });
    }
  }

  return checks;
}

export function checkMedicationDeviation(
  scheduledTime: Date,
  actualTime: Date,
  toleranceMinutes: number = 30
): { isDeviation: boolean; minutesLate: number } {
  const diff = Math.abs(actualTime.getTime() - scheduledTime.getTime());
  const minutesLate = Math.floor(diff / 1000 / 60);

  return {
    isDeviation: minutesLate > toleranceMinutes,
    minutesLate,
  };
}

export function getQuickTapValuesForTaskType(
  taskType: string
): Array<{ label: string; value: string; icon?: string }> {
  const quickValues: Record<string, Array<{ label: string; value: string; icon?: string }>> = {
    meal: [
      { label: 'Ate 100%', value: '100', icon: '✓' },
      { label: 'Ate 75%', value: '75', icon: '▶' },
      { label: 'Ate 50%', value: '50', icon: '▼' },
      { label: 'Refused', value: '0', icon: '✗' },
    ],
    hydration: [
      { label: 'Full glass', value: '8oz', icon: '💧' },
      { label: 'Half glass', value: '4oz', icon: '💧' },
      { label: 'Sip', value: '1oz', icon: '💧' },
      { label: 'Refused', value: '0oz', icon: '✗' },
    ],
    medication: [
      { label: 'Taken', value: 'taken', icon: '✓' },
      { label: 'Refused', value: 'refused', icon: '✗' },
      { label: 'Held', value: 'held', icon: '⏸' },
    ],
    adl: [
      { label: 'Independent', value: 'independent', icon: '✓' },
      { label: 'Assisted', value: 'assisted', icon: '🤝' },
      { label: 'Total', value: 'total', icon: '👤' },
      { label: 'Refused', value: 'refused', icon: '✗' },
    ],
    vitals: [
      { label: 'Normal', value: 'normal', icon: '✓' },
      { label: 'See notes', value: 'abnormal', icon: '⚠️' },
    ],
    repositioning: [
      { label: 'Left side', value: 'left', icon: '←' },
      { label: 'Right side', value: 'right', icon: '→' },
      { label: 'Back', value: 'back', icon: '↑' },
      { label: 'Chair', value: 'chair', icon: '💺' },
    ],
  };

  return quickValues[taskType] || [];
}
