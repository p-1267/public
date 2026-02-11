/**
 * Brain Blocking Error Types
 *
 * Purpose: Define error types for Brain enforcement blocking
 *
 * CRITICAL: These errors indicate legal/safety violations that MUST NOT be bypassed
 */

export interface BlockingRule {
  reason: string;
  masterSpecSection: string;
  riskPrevented: string;
  remediationPath: string;
  blockingDetails?: Record<string, any>;
}

export class BrainBlockError extends Error {
  public readonly rule: BlockingRule;
  public readonly blocked: true = true;
  public readonly mode: 'production' | 'showcase';

  constructor(params: {
    rule: BlockingRule;
    mode: 'production' | 'showcase';
  }) {
    super(`Brain Block: ${params.rule.reason}`);
    this.name = 'BrainBlockError';
    this.rule = params.rule;
    this.mode = params.mode;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BrainBlockError);
    }
  }

  public getDisplayMessage(): string {
    const modeLabel = this.mode === 'showcase'
      ? '🎭 SHOWCASE MODE — NON-OPERATIONAL\n\n'
      : '';

    return `${modeLabel}🚫 ACTION BLOCKED

Rule: ${this.rule.reason}
Master Spec: ${this.rule.masterSpecSection}

Why this is blocked:
${this.rule.riskPrevented}

Required Action:
${this.rule.remediationPath}${this.rule.blockingDetails ? '\n\nDetails:\n' + JSON.stringify(this.rule.blockingDetails, null, 2) : ''}`;
  }
}

export interface BrainCheckContext {
  userId: string;
  agencyId: string;
  residentId?: string;
  actionType: string;
  mode: 'production' | 'showcase';
}
