/**
 * Brain Output Service
 *
 * PURPOSE: Make existing system intelligence visible and understandable
 *
 * STRICT BOUNDARIES:
 * - READ-ONLY: No actions, no execution, no decisions
 * - OBSERVATIONAL: Only reports what was recorded
 * - DETERMINISTIC: No predictions, no ML, no recommendations
 * - TRANSPARENT: Explains data sources and confidence
 * - HUMBLE: States what system CANNOT determine
 *
 * LANGUAGE RULES:
 * ✅ ALLOWED: observed, detected, recorded, compared to, based on
 * ❌ FORBIDDEN: predicts, should, diagnose, recommend, cause, treatment
 */

import { supabase } from '../lib/supabase';

export type BrainOutputType =
  | 'CHANGE_DETECTION'
  | 'BASELINE_DEVIATION'
  | 'ACCUMULATED_DELAYS'
  | 'TIME_BOUND_AWARENESS'
  | 'CATEGORY_ACKNOWLEDGMENT'
  | 'ALL_CLEAR'
  | 'CORRELATED_OBSERVATION';

export type BrainOutputSeverity = 'INFO' | 'ATTENTION' | 'URGENT';

export interface BrainOutput {
  type: BrainOutputType;
  severity: BrainOutputSeverity;
  observation: string;
  whyItMatters: string;
  currentRiskFraming: string;
  confidence: number;
  explicitBoundaries: string;
  dataSource: string[];
  timeWindow: {
    start: string;
    end: string;
  };
}

export interface BrainOutputContext {
  residentId?: string;
  agencyId?: string;
  shiftId?: string;
  windowHours?: number;
}

export class BrainOutputService {
  /**
   * Generate all brain outputs for a given context
   */
  static async generateOutputs(context: BrainOutputContext): Promise<BrainOutput[]> {
    const outputs: BrainOutput[] = [];
    const now = new Date();
    const windowHours = context.windowHours || 4;
    const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

    const timeWindow = {
      start: windowStart.toISOString(),
      end: now.toISOString()
    };

    // TYPE 5: CATEGORY ACKNOWLEDGMENT (Always first - establishes context)
    const categoryOutput = await this.generateCategoryAcknowledgment(
      context.residentId,
      windowStart,
      now,
      timeWindow
    );
    if (categoryOutput) outputs.push(categoryOutput);

    // TYPE 1: CHANGE DETECTION
    const changeOutput = await this.generateChangeDetection(
      context.residentId,
      windowStart,
      now,
      timeWindow
    );
    if (changeOutput) outputs.push(changeOutput);

    // TYPE 2: BASELINE DEVIATION
    if (context.residentId) {
      const baselineOutput = await this.generateBaselineDeviation(
        context.residentId,
        windowStart,
        now,
        timeWindow
      );
      if (baselineOutput) outputs.push(baselineOutput);
    }

    // TYPE 3: ACCUMULATED DELAYS
    const delayOutput = await this.generateAccumulatedDelays(
      context.residentId,
      windowStart,
      now,
      timeWindow
    );
    if (delayOutput) outputs.push(delayOutput);

    // TYPE 4: TIME-BOUND AWARENESS
    const timeOutput = await this.generateTimeBoundAwareness(
      context.residentId,
      now,
      timeWindow
    );
    if (timeOutput) outputs.push(timeOutput);

    // CORRELATION: Combine related signals into unified observations
    if (context.residentId) {
      const correlatedOutputs = await this.generateCorrelatedObservations(
        context.residentId,
        windowStart,
        now,
        timeWindow,
        outputs
      );
      outputs.push(...correlatedOutputs);
    }

    // TYPE 6: ALL CLEAR (Only if no other outputs)
    if (outputs.length === 0 || (outputs.length === 1 && outputs[0].type === 'CATEGORY_ACKNOWLEDGMENT')) {
      const allClearOutput = await this.generateAllClear(
        context.residentId,
        now,
        timeWindow
      );
      if (allClearOutput) outputs.push(allClearOutput);
    }

    return outputs;
  }

  /**
   * TYPE 1: CHANGE DETECTION
   * Detects tasks completed later than scheduled
   */
  private static async generateChangeDetection(
    residentId: string | undefined,
    windowStart: Date,
    now: Date,
    timeWindow: { start: string; end: string }
  ): Promise<BrainOutput | null> {
    const query = supabase
      .from('tasks')
      .select('id, state, scheduled_start, scheduled_end, actual_start, actual_end, category:task_categories(name)')
      .gte('actual_end', windowStart.toISOString())
      .eq('state', 'completed');

    if (residentId) {
      query.eq('resident_id', residentId);
    }

    const { data: tasks } = await query;

    if (!tasks || tasks.length === 0) return null;

    const delayedTasks = tasks.filter(task => {
      if (!task.actual_end || !task.scheduled_end) return false;
      const actualEnd = new Date(task.actual_end);
      const scheduledEnd = new Date(task.scheduled_end);
      return actualEnd > scheduledEnd;
    });

    if (delayedTasks.length === 0) return null;

    const hours = Math.floor((now.getTime() - windowStart.getTime()) / 3600000);

    return {
      type: 'CHANGE_DETECTION',
      severity: delayedTasks.length >= 3 ? 'ATTENTION' : 'INFO',
      observation: `In the last ${hours} hours, ${delayedTasks.length} care ${delayedTasks.length === 1 ? 'activity was' : 'activities were'} completed later than scheduled.`,
      whyItMatters: 'Delayed completions may indicate workflow friction, staffing constraints, or task complexity issues.',
      currentRiskFraming: delayedTasks.length >= 3
        ? 'Multiple delays detected. Review workflow patterns to identify obstacles.'
        : 'Minor delays observed. No immediate action required.',
      confidence: 1.0,
      explicitBoundaries: `Based on recorded task completion times from ${this.formatTime(windowStart)} to ${this.formatTime(now)}. The system cannot determine causes or recommend specific actions.`,
      dataSource: ['tasks', 'task_categories', 'task_state_transitions'],
      timeWindow
    };
  }

  /**
   * TYPE 2: BASELINE DEVIATION EXPLANATION
   * Explains vital signs outside resident baseline
   */
  private static async generateBaselineDeviation(
    residentId: string,
    windowStart: Date,
    now: Date,
    timeWindow: { start: string; end: string }
  ): Promise<BrainOutput | null> {
    const { data: baseline } = await supabase
      .from('resident_baselines')
      .select('vital_baselines')
      .eq('resident_id', residentId)
      .maybeSingle();

    if (!baseline?.vital_baselines) return null;

    const { data: recentVitals } = await supabase
      .from('vital_signs')
      .select('vital_type, value, recorded_at, recorded_by')
      .eq('resident_id', residentId)
      .gte('recorded_at', windowStart.toISOString())
      .order('recorded_at', { ascending: false });

    if (!recentVitals || recentVitals.length === 0) return null;

    const vitalBaselines = baseline.vital_baselines as Record<string, { min: number; max: number }>;
    const deviations: Array<{ type: string; value: number; min: number; max: number }> = [];

    for (const vital of recentVitals) {
      const baselineRange = vitalBaselines[vital.vital_type];
      if (!baselineRange) continue;

      const value = parseFloat(vital.value);
      if (isNaN(value)) continue;

      if (value < baselineRange.min || value > baselineRange.max) {
        deviations.push({
          type: vital.vital_type,
          value,
          min: baselineRange.min,
          max: baselineRange.max
        });
      }
    }

    if (deviations.length === 0) return null;

    const firstDeviation = deviations[0];
    const direction = firstDeviation.value < firstDeviation.min ? 'below' : 'above';

    return {
      type: 'BASELINE_DEVIATION',
      severity: 'ATTENTION',
      observation: `${firstDeviation.type} recorded ${direction} resident's usual range. Recorded value: ${firstDeviation.value}. Usual range: ${firstDeviation.min}-${firstDeviation.max}.`,
      whyItMatters: 'Deviations from baseline may indicate changes in condition requiring assessment.',
      currentRiskFraming: 'Attention recommended. Clinical assessment determines appropriate response.',
      confidence: 0.9,
      explicitBoundaries: `Based on comparison to resident-specific baseline configured in system. The system cannot determine clinical significance or recommend interventions. Only licensed staff can assess and respond.`,
      dataSource: ['vital_signs', 'resident_baselines'],
      timeWindow
    };
  }

  /**
   * TYPE 3: ACCUMULATED DELAYS
   * Counts delayed/overdue tasks
   */
  private static async generateAccumulatedDelays(
    residentId: string | undefined,
    windowStart: Date,
    now: Date,
    timeWindow: { start: string; end: string }
  ): Promise<BrainOutput | null> {
    const query = supabase
      .from('tasks')
      .select('id, state, scheduled_end')
      .in('state', ['overdue', 'escalated'])
      .lte('scheduled_end', now.toISOString());

    if (residentId) {
      query.eq('resident_id', residentId);
    }

    const { data: overdueTasks } = await query;

    if (!overdueTasks || overdueTasks.length === 0) return null;

    return {
      type: 'ACCUMULATED_DELAYS',
      severity: overdueTasks.length >= 3 ? 'URGENT' : 'ATTENTION',
      observation: `${overdueTasks.length} care ${overdueTasks.length === 1 ? 'activity is' : 'activities are'} currently overdue or escalated.`,
      whyItMatters: 'Overdue tasks indicate care may not be delivered as scheduled.',
      currentRiskFraming: overdueTasks.length >= 3
        ? 'Multiple overdue activities detected. Immediate review recommended.'
        : 'Overdue activity detected. Review and complete as soon as possible.',
      confidence: 1.0,
      explicitBoundaries: `Based on scheduled completion times compared to current time (${this.formatTime(now)}). The system cannot determine reasons for delays or prioritize actions.`,
      dataSource: ['tasks', 'task_escalations'],
      timeWindow
    };
  }

  /**
   * TYPE 4: TIME-BOUND AWARENESS
   * Non-predictive countdown to overdue
   */
  private static async generateTimeBoundAwareness(
    residentId: string | undefined,
    now: Date,
    timeWindow: { start: string; end: string }
  ): Promise<BrainOutput | null> {
    const query = supabase
      .from('tasks')
      .select('id, category:task_categories(name), scheduled_end')
      .eq('state', 'due')
      .gt('scheduled_end', now.toISOString())
      .lte('scheduled_end', new Date(now.getTime() + 30 * 60000).toISOString())
      .order('scheduled_end', { ascending: true })
      .limit(1);

    if (residentId) {
      query.eq('resident_id', residentId);
    }

    const { data: upcomingTasks } = await query;

    if (!upcomingTasks || upcomingTasks.length === 0) return null;

    const task = upcomingTasks[0];
    const scheduledEnd = new Date(task.scheduled_end);
    const minutesUntilOverdue = Math.floor((scheduledEnd.getTime() - now.getTime()) / 60000);

    return {
      type: 'TIME_BOUND_AWARENESS',
      severity: minutesUntilOverdue <= 10 ? 'ATTENTION' : 'INFO',
      observation: `If no one acts, one ${task.category?.name || 'care'} activity will become overdue in ${minutesUntilOverdue} minutes.`,
      whyItMatters: 'Time-bound awareness allows proactive completion before deadline.',
      currentRiskFraming: minutesUntilOverdue <= 10
        ? 'Action recommended soon to avoid overdue status.'
        : 'Upcoming deadline. Plan accordingly.',
      confidence: 1.0,
      explicitBoundaries: `Based on scheduled deadline (${this.formatTime(scheduledEnd)}) compared to current time (${this.formatTime(now)}). This is a time-based observation, not a prediction of whether the task will be completed.`,
      dataSource: ['tasks', 'task_categories'],
      timeWindow
    };
  }

  /**
   * TYPE 5: CATEGORY ACKNOWLEDGMENT
   * CRITICAL: Explicitly acknowledges what types of care were recorded
   */
  private static async generateCategoryAcknowledgment(
    residentId: string | undefined,
    windowStart: Date,
    now: Date,
    timeWindow: { start: string; end: string }
  ): Promise<BrainOutput | null> {
    const query = supabase
      .from('tasks')
      .select('id, category:task_categories(name, display_name)')
      .eq('state', 'completed')
      .gte('actual_end', windowStart.toISOString());

    if (residentId) {
      query.eq('resident_id', residentId);
    }

    const { data: tasks } = await query;

    if (!tasks || tasks.length === 0) return null;

    const categories = new Set<string>();
    tasks.forEach(task => {
      if (task.category?.display_name) {
        categories.add(task.category.display_name);
      } else if (task.category?.name) {
        categories.add(task.category.name);
      }
    });

    if (categories.size === 0) return null;

    const categoryList = Array.from(categories).sort();
    const categoryText = categoryList.length === 1
      ? categoryList[0]
      : categoryList.slice(0, -1).join(', ') + ', and ' + categoryList[categoryList.length - 1];

    const hours = Math.floor((now.getTime() - windowStart.getTime()) / 3600000);

    return {
      type: 'CATEGORY_ACKNOWLEDGMENT',
      severity: 'INFO',
      observation: `${categoryText} activities were recorded during the last ${hours} hours.`,
      whyItMatters: 'This confirms the system observed multiple types of care delivery.',
      currentRiskFraming: `${tasks.length} ${tasks.length === 1 ? 'activity' : 'activities'} completed across ${categories.size} ${categories.size === 1 ? 'category' : 'categories'}.`,
      confidence: 1.0,
      explicitBoundaries: `Based on task completion records from ${this.formatTime(windowStart)} to ${this.formatTime(now)}. The system records what was logged by caregivers but cannot verify quality or clinical appropriateness.`,
      dataSource: ['tasks', 'task_categories'],
      timeWindow
    };
  }

  /**
   * TYPE 6: ALL CLEAR
   * MANDATORY: Silence is not acceptable
   */
  private static async generateAllClear(
    residentId: string | undefined,
    now: Date,
    timeWindow: { start: string; end: string }
  ): Promise<BrainOutput | null> {
    // Check for next scheduled action
    const query = supabase
      .from('tasks')
      .select('id, category:task_categories(display_name), scheduled_start')
      .in('state', ['scheduled', 'due'])
      .gt('scheduled_start', now.toISOString())
      .order('scheduled_start', { ascending: true })
      .limit(1);

    if (residentId) {
      query.eq('resident_id', residentId);
    }

    const { data: nextTasks } = await query;

    const nextTask = nextTasks?.[0];
    const nextActionText = nextTask
      ? `Next scheduled action: ${nextTask.category?.display_name || 'care activity'} at ${this.formatTime(new Date(nextTask.scheduled_start))}.`
      : 'No upcoming scheduled actions in the next 24 hours.';

    return {
      type: 'ALL_CLEAR',
      severity: 'INFO',
      observation: 'All scheduled care is complete. No active concerns detected.',
      whyItMatters: 'This confirms the system is monitoring and found no immediate issues.',
      currentRiskFraming: `No overdue tasks. No active escalations. No high-priority signals. ${nextActionText}`,
      confidence: 1.0,
      explicitBoundaries: `Based on current system state as of ${this.formatTime(now)}. The system cannot predict future issues or verify care quality. This status may change as new data is recorded.`,
      dataSource: ['tasks', 'task_escalations', 'intelligence_signals'],
      timeWindow
    };
  }

  /**
   * Generate shift handoff summary
   */
  static async generateShiftHandoffSummary(
    agencyId: string,
    previousShiftEnd: Date,
    currentTime: Date
  ): Promise<BrainOutput[]> {
    const outputs: BrainOutput[] = [];
    const timeWindow = {
      start: previousShiftEnd.toISOString(),
      end: currentTime.toISOString()
    };

    // What changed since last shift: task completions
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('id, resident:residents(full_name), category:task_categories(display_name)')
      .eq('state', 'completed')
      .gte('actual_end', previousShiftEnd.toISOString())
      .lte('actual_end', currentTime.toISOString());

    if (completedTasks && completedTasks.length > 0) {
      const residentNames = new Set(completedTasks.map(t => t.resident?.full_name).filter(Boolean));

      outputs.push({
        type: 'CHANGE_DETECTION',
        severity: 'INFO',
        observation: `Since last shift ended, ${completedTasks.length} care ${completedTasks.length === 1 ? 'activity was' : 'activities were'} completed for ${residentNames.size} ${residentNames.size === 1 ? 'resident' : 'residents'}.`,
        whyItMatters: 'This summarizes care activity since handoff.',
        currentRiskFraming: 'Informational only. Review individual resident contexts for details.',
        confidence: 1.0,
        explicitBoundaries: `Based on task completion records from ${this.formatTime(previousShiftEnd)} to ${this.formatTime(currentTime)}. Does not include care provided outside the task system.`,
        dataSource: ['tasks', 'residents', 'task_categories'],
        timeWindow
      });
    }

    // What needs attention now
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id, resident:residents(full_name)')
      .in('state', ['overdue', 'escalated'])
      .lte('scheduled_end', currentTime.toISOString());

    if (overdueTasks && overdueTasks.length > 0) {
      const residentNames = new Set(overdueTasks.map(t => t.resident?.full_name).filter(Boolean));

      outputs.push({
        type: 'ACCUMULATED_DELAYS',
        severity: 'URGENT',
        observation: `${overdueTasks.length} overdue ${overdueTasks.length === 1 ? 'activity' : 'activities'} across ${residentNames.size} ${residentNames.size === 1 ? 'resident' : 'residents'} require immediate attention.`,
        whyItMatters: 'Overdue tasks from previous shift need resolution.',
        currentRiskFraming: 'Immediate review recommended. Prioritize by resident need.',
        confidence: 1.0,
        explicitBoundaries: `Based on scheduled deadlines compared to current time (${this.formatTime(currentTime)}). The system cannot determine priority or assign tasks.`,
        dataSource: ['tasks', 'residents'],
        timeWindow
      });
    }

    // All clear if nothing else
    if (outputs.length === 0) {
      outputs.push({
        type: 'ALL_CLEAR',
        severity: 'INFO',
        observation: 'No urgent carryover from previous shift.',
        whyItMatters: 'Clean transition to current shift.',
        currentRiskFraming: 'All scheduled care from previous shift completed. Current shift can proceed normally.',
        confidence: 1.0,
        explicitBoundaries: `Based on system state as of ${this.formatTime(currentTime)}. New tasks may become due during current shift.`,
        dataSource: ['tasks'],
        timeWindow
      });
    }

    return outputs;
  }

  /**
   * Generate supervisor aggregated summary
   */
  static async generateSupervisorSummary(
    agencyId: string,
    windowHours: number = 24
  ): Promise<BrainOutput[]> {
    const outputs: BrainOutput[] = [];
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
    const timeWindow = {
      start: windowStart.toISOString(),
      end: now.toISOString()
    };

    // Agency-wide task completion summary
    const { data: taskStats } = await supabase
      .from('tasks')
      .select('state')
      .gte('actual_end', windowStart.toISOString());

    if (taskStats && taskStats.length > 0) {
      const completed = taskStats.filter(t => t.state === 'completed').length;
      const total = taskStats.length;

      outputs.push({
        type: 'CATEGORY_ACKNOWLEDGMENT',
        severity: 'INFO',
        observation: `In the last ${windowHours} hours, ${completed} of ${total} care activities were completed across all residents.`,
        whyItMatters: 'This provides agency-wide operational visibility.',
        currentRiskFraming: `${Math.round(completed / total * 100)}% completion rate observed.`,
        confidence: 1.0,
        explicitBoundaries: `Based on task records from ${this.formatTime(windowStart)} to ${this.formatTime(now)}. Does not include quality assessment or resident outcomes.`,
        dataSource: ['tasks'],
        timeWindow
      });
    }

    // Current attention needs
    const { data: needsAttention } = await supabase
      .from('tasks')
      .select('id, state, resident:residents(full_name)')
      .in('state', ['overdue', 'escalated']);

    if (needsAttention && needsAttention.length > 0) {
      const residentNames = new Set(needsAttention.map(t => t.resident?.full_name).filter(Boolean));

      outputs.push({
        type: 'ACCUMULATED_DELAYS',
        severity: 'ATTENTION',
        observation: `${needsAttention.length} overdue or escalated ${needsAttention.length === 1 ? 'activity' : 'activities'} across ${residentNames.size} ${residentNames.size === 1 ? 'resident' : 'residents'}.`,
        whyItMatters: 'Supervisor review may be needed to resolve delays.',
        currentRiskFraming: 'Review resident contexts to identify obstacles.',
        confidence: 1.0,
        explicitBoundaries: `Based on current system state as of ${this.formatTime(now)}. The system cannot determine root causes or assign responsibility.`,
        dataSource: ['tasks', 'residents'],
        timeWindow
      });
    }

    return outputs;
  }

  /**
   * CORRELATION: Rule-based correlation of related signals
   * NO ML, NO PREDICTIONS - only deterministic pattern matching
   */
  private static async generateCorrelatedObservations(
    residentId: string,
    windowStart: Date,
    now: Date,
    timeWindow: { start: string; end: string },
    existingOutputs: BrainOutput[]
  ): Promise<BrainOutput[]> {
    const correlations: BrainOutput[] = [];

    // RULE A: Missed Medication + Baseline Deviation
    const { data: missedMedSignals } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('resident_id', residentId)
      .eq('signal_type', 'MISSED_MEDICATION')
      .gte('detected_at', windowStart.toISOString())
      .limit(1);

    const { data: recentVitals } = await supabase
      .from('vital_signs')
      .select('vital_type, value, recorded_at')
      .eq('resident_id', residentId)
      .gte('recorded_at', windowStart.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(5);

    const { data: baseline } = await supabase
      .from('resident_baselines')
      .select('vital_baselines')
      .eq('resident_id', residentId)
      .maybeSingle();

    if (missedMedSignals && missedMedSignals.length > 0 && recentVitals && recentVitals.length > 0 && baseline?.vital_baselines) {
      const vitalBaselines = baseline.vital_baselines as Record<string, { min: number; max: number }>;
      let hasDeviation = false;
      const deviatingVitals: string[] = [];

      for (const vital of recentVitals) {
        const baselineRange = vitalBaselines[vital.vital_type];
        if (!baselineRange) continue;

        const value = parseFloat(vital.value);
        if (isNaN(value)) continue;

        if (value < baselineRange.min || value > baselineRange.max) {
          hasDeviation = true;
          deviatingVitals.push(vital.vital_type);
        }
      }

      if (hasDeviation) {
        const medName = missedMedSignals[0].metadata?.medication_name || 'medication';
        correlations.push({
          type: 'CORRELATED_OBSERVATION',
          severity: 'URGENT',
          observation: `Two observations detected: scheduled ${medName} was not administered, and ${deviatingVitals.join(', ')} recorded outside usual range.`,
          whyItMatters: 'Multiple observations occurring together require clinical assessment.',
          currentRiskFraming: 'Attention required. These are separate observations that happened in the same time window. The system cannot determine if they are related.',
          confidence: 0.85,
          explicitBoundaries: `Based on medication administration records and vital signs from ${this.formatTime(windowStart)} to ${this.formatTime(now)}. The system cannot determine causation or clinical significance. Only licensed staff can assess whether these observations are related.`,
          dataSource: ['intelligence_signals', 'vital_signs', 'resident_baselines', 'medication_administration'],
          timeWindow
        });
      }
    }

    // RULE B: Cross-Category Delay Accumulation
    const { data: delayedTasks } = await supabase
      .from('tasks')
      .select('id, task_name, category:task_categories(name, display_name), actual_end, scheduled_end')
      .eq('resident_id', residentId)
      .eq('state', 'completed')
      .gte('actual_end', windowStart.toISOString());

    if (delayedTasks && delayedTasks.length >= 3) {
      const categories = new Set<string>();
      let delayCount = 0;

      delayedTasks.forEach(task => {
        if (task.actual_end && task.scheduled_end) {
          const actualEnd = new Date(task.actual_end);
          const scheduledEnd = new Date(task.scheduled_end);
          if (actualEnd > scheduledEnd) {
            delayCount++;
            if (task.category?.display_name) {
              categories.add(task.category.display_name);
            }
          }
        }
      });

      if (delayCount >= 3 && categories.size >= 2) {
        const categoryList = Array.from(categories);
        const categoryText = categoryList.length === 2
          ? `${categoryList[0]} and ${categoryList[1]}`
          : categoryList.slice(0, -1).join(', ') + ', and ' + categoryList[categoryList.length - 1];

        correlations.push({
          type: 'CORRELATED_OBSERVATION',
          severity: 'ATTENTION',
          observation: `${delayCount} tasks completed later than scheduled across multiple categories: ${categoryText}.`,
          whyItMatters: 'Delays across different care categories may indicate systemic workflow issues.',
          currentRiskFraming: 'Pattern observed across categories. Review workflow to identify common obstacles.',
          confidence: 0.9,
          explicitBoundaries: `Based on task completion records from ${this.formatTime(windowStart)} to ${this.formatTime(now)}. The system cannot determine root causes. Delays may result from resident needs, staffing, or other factors requiring human judgment.`,
          dataSource: ['tasks', 'task_categories', 'task_state_transitions'],
          timeWindow
        });
      }
    }

    // RULE C: Repeated Delays of Same Category (Pattern Awareness)
    const { data: categoryDelays } = await supabase
      .from('tasks')
      .select('id, task_name, category:task_categories(name, display_name), actual_end, scheduled_end')
      .eq('resident_id', residentId)
      .eq('state', 'completed')
      .gte('actual_end', new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString());

    if (categoryDelays && categoryDelays.length > 0) {
      const categoryDelayCount: Record<string, number> = {};

      categoryDelays.forEach(task => {
        if (task.actual_end && task.scheduled_end && task.category?.display_name) {
          const actualEnd = new Date(task.actual_end);
          const scheduledEnd = new Date(task.scheduled_end);
          if (actualEnd > scheduledEnd) {
            const category = task.category.display_name;
            categoryDelayCount[category] = (categoryDelayCount[category] || 0) + 1;
          }
        }
      });

      for (const [category, count] of Object.entries(categoryDelayCount)) {
        if (count >= 3) {
          correlations.push({
            type: 'CORRELATED_OBSERVATION',
            severity: 'INFO',
            observation: `${count} ${category} tasks were completed later than scheduled in the last 8 hours.`,
            whyItMatters: 'Repeated delays in a specific category may indicate category-specific challenges.',
            currentRiskFraming: 'Pattern awareness only. This is an observation of timing, not quality of care or outcomes.',
            confidence: 1.0,
            explicitBoundaries: `Based on task completion records from the last 8 hours. The system cannot determine why ${category} tasks were delayed or whether delays affected care quality. Context-specific factors require human review.`,
            dataSource: ['tasks', 'task_categories'],
            timeWindow
          });
        }
      }
    }

    return correlations;
  }

  private static formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}
