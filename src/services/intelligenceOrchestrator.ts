/**
 * Phase 4: Intelligence Orchestration Layer
 *
 * PURPOSE: Make AgeEmpower a thinking system that explains, anticipates, and guides
 * WITHOUT executing, bypassing, or auto-acting
 *
 * CRITICAL BOUNDARIES:
 * - This layer sits BETWEEN user intent and enforcement/execution
 * - It NEVER bypasses Brain blocking, SOPs, permissions, or RLS
 * - It AUGMENTS Phases 1-3, never replaces them
 * - Every AI action requires explicit human confirmation
 * - All reasoning is transparent and auditable
 *
 * CORE PRINCIPLE: AI explains more than it does
 */

import { OrchestrationLayer } from './orchestrationLayer';
import { checkAllPhase1Requirements } from './brainBlocking';
import { mockAI } from './mockAIEngine';
import { supabase } from '../lib/supabase';

export type IntentType =
  | 'CLINICAL'           // Direct care actions (medication, vitals, care log)
  | 'ADMINISTRATIVE'     // Workforce, scheduling, assignments
  | 'DOCUMENTATION'      // Writing reports, voice notes, incident logs
  | 'EMERGENCY'          // Emergency escalation, alerts
  | 'QUERY'              // Information retrieval, viewing data
  | 'CONFIGURATION';     // Settings, preferences, setup

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface IntentContext {
  userId: string;
  userRole: string;
  agencyId?: string;
  residentId?: string;
  action: string;
  rawInput?: string;
  currentState?: any;
  permissions?: string[];
  shiftActive?: boolean;
}

export interface IntentReasoning {
  inferredIntent: IntentType;
  intentDescription: string;
  riskLevel: RiskLevel;
  riskReasoning: string;
  prerequisitesCheck: {
    complete: boolean;
    missing: string[];
    reasoning: string[];
  };
  brainAllowance: {
    wouldAllow: boolean;
    reason: string;
    blockingRules?: string[];
  };
  aiCapability: {
    whatAICanDo: string[];
    whatAICannotDo: string[];
    whyAICannotAct: string[];
  };
  nextSteps: {
    humanDecision: string;
    systemValidation: string[];
    executionPath: string;
  };
  confidence: number;
}

export interface MedicalTranslationContext {
  originalText: string;
  originalLanguage: string;
  targetLanguage: string;
  medicalContext?: {
    residentConditions?: string[];
    medications?: string[];
    procedures?: string[];
  };
  agencyPolicy?: {
    requiresTranslation: boolean;
    preserveOriginal: boolean;
    reasoningRequired: boolean;
  };
}

export interface IntelligentTranslationResult {
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  targetLanguage: string;
  aiReasoning: {
    medicalTermsPreserved: string[];
    meaningPreserved: boolean;
    confidenceScore: number;
    translationRationale: string;
    potentialAmbiguities: string[];
  };
  requiresHumanConfirmation: boolean;
  confirmationPrompt: string;
  auditTrail: {
    timestamp: string;
    method: 'AI_CONTEXTUAL' | 'LITERAL' | 'HYBRID';
    reviewedBy?: string;
  };
}

export interface IntelligenceSignalDetection {
  signalId: string;
  category: 'PROACTIVE' | 'REACTIVE' | 'PREDICTIVE';
  source: {
    dataPoints: string[];
    rules: string[];
    patterns: string[];
  };
  reasoning: {
    whatDetected: string;
    whyMatters: string;
    confidenceLevel: number;
    supportingEvidence: string[];
  };
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  humanDecisionRequired: {
    decision: string;
    options: string[];
    consequences: Record<string, string>;
  };
  aiCannotAct: {
    reasons: string[];
    boundaries: string[];
  };
  suggestedActions: Array<{
    action: string;
    reasoning: string;
    requiresRole: string[];
    requiresPermission: string[];
  }>;
}

export interface ExplainabilityCard {
  title: string;
  category: 'ALLOWED' | 'BLOCKED' | 'RISKY' | 'SUGGESTION' | 'BOUNDARY';
  reasoning: {
    summary: string;
    details: string[];
    sources: string[];
  };
  confidence: number;
  boundaries: {
    whatAIKnows: string[];
    whatAIDoesNotKnow: string[];
    whatAICannotDecide: string[];
  };
  humanControl: {
    requiredDecision: string;
    alternatives: string[];
  };
}

export class IntelligenceOrchestrator {
  /**
   * INTENT REASONING ENGINE
   * Infers and classifies user intent before any action proceeds
   */
  static async reasonAboutIntent(context: IntentContext): Promise<IntentReasoning> {
    const intentType = this.classifyIntent(context.action);
    const riskLevel = this.assessRisk(intentType, context);

    const prerequisites = await this.checkPrerequisites(context);

    const brainCheck = context.agencyId && context.residentId
      ? await checkAllPhase1Requirements(context.userId, context.agencyId, context.residentId)
      : { blocked: false };

    const validation = OrchestrationLayer.validateIntent(context.action, {
      brainState: context.currentState,
      userPermissions: context.permissions,
      userRole: context.userRole,
      shiftActive: context.shiftActive
    });

    return {
      inferredIntent: intentType,
      intentDescription: this.describeIntent(intentType, context.action),
      riskLevel,
      riskReasoning: this.explainRisk(riskLevel, intentType, context),
      prerequisitesCheck: prerequisites,
      brainAllowance: {
        wouldAllow: !brainCheck.blocked && validation.allowed,
        reason: brainCheck.blocked
          ? brainCheck.rule?.riskPrevented || 'Blocked by Brain enforcement'
          : validation.reason,
        blockingRules: brainCheck.rule ? [brainCheck.rule.reason] : validation.brainConstraints
      },
      aiCapability: this.defineAICapability(intentType, context),
      nextSteps: this.determineNextSteps(intentType, validation.allowed, brainCheck.blocked),
      confidence: this.calculateConfidence(context)
    };
  }

  /**
   * MULTILINGUAL INTELLIGENCE ENGINE
   * AI-powered translation with medical context and meaning preservation
   */
  static async translateWithIntelligence(
    translationContext: MedicalTranslationContext
  ): Promise<IntelligentTranslationResult> {
    const { MedicalTranslationEngine } = await import('./medicalTranslationEngine');

    const result = await MedicalTranslationEngine.translateWithMedicalContext({
      text: translationContext.originalText,
      sourceLanguage: translationContext.originalLanguage,
      targetLanguage: translationContext.targetLanguage,
      medicalContext: translationContext.medicalContext
    });

    const medicalTermsPreserved = result.medicalTermsPreserved
      .filter(t => t.preserved)
      .map(t => t.term);

    const potentialAmbiguities = [
      ...result.ambiguities.map(a => a.issue),
      ...result.uncertainTerms.map(u => u.uncertainty)
    ];

    return {
      originalText: result.originalText,
      originalLanguage: result.originalLanguage,
      translatedText: result.translatedText,
      targetLanguage: result.targetLanguage,
      aiReasoning: {
        medicalTermsPreserved,
        meaningPreserved: result.ambiguities.length === 0,
        confidenceScore: result.confidenceScore,
        translationRationale: result.reasoning,
        potentialAmbiguities
      },
      requiresHumanConfirmation: result.requiresReview,
      confirmationPrompt: this.generateConfirmationPrompt(result.translatedText, potentialAmbiguities),
      auditTrail: {
        timestamp: new Date().toISOString(),
        method: result.translationMethod === 'MEDICAL_LLM' ? 'AI_CONTEXTUAL' : 'LITERAL'
      }
    };
  }

  /**
   * PROACTIVE INTELLIGENCE SIGNALS
   * Detects issues before they become problems
   */
  static async detectIntelligenceSignals(context: {
    residentId?: string;
    agencyId?: string;
    timeWindow?: { start: Date; end: Date };
  }): Promise<IntelligenceSignalDetection[]> {
    const signals: IntelligenceSignalDetection[] = [];

    const { data: dbSignals } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('dismissed', false)
      .order('detected_at', { ascending: false })
      .limit(50);

    if (dbSignals) {
      for (const dbSignal of dbSignals) {
        if (context.residentId && dbSignal.resident_id !== context.residentId) continue;
        if (context.agencyId && dbSignal.agency_id !== context.agencyId) continue;

        signals.push({
          signalId: dbSignal.signal_id,
          category: dbSignal.category as 'PROACTIVE' | 'REACTIVE' | 'PREDICTIVE',
          source: {
            dataPoints: dbSignal.data_source || [],
            rules: ['SOP Enforcement', 'Care Plan Requirements'],
            patterns: ['Historical Analysis']
          },
          reasoning: {
            whatDetected: dbSignal.title,
            whyMatters: dbSignal.reasoning,
            confidenceLevel: 0.85,
            supportingEvidence: [dbSignal.description]
          },
          severity: dbSignal.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
          humanDecisionRequired: {
            decision: 'Review signal and take appropriate action',
            options: dbSignal.suggested_actions || [],
            consequences: {}
          },
          aiCannotAct: {
            reasons: [
              'Clinical judgment required',
              'Resident-specific assessment needed',
              'Legal accountability requires human decision'
            ],
            boundaries: [
              'AI cannot perform clinical assessments',
              'AI cannot execute care actions',
              'AI cannot override human judgment'
            ]
          },
          suggestedActions: (dbSignal.suggested_actions || []).map(action => ({
            action,
            reasoning: dbSignal.reasoning,
            requiresRole: ['CAREGIVER', 'SUPERVISOR'],
            requiresPermission: ['care.execute']
          }))
        });
      }
    }

    if (context.residentId) {
      const baselineSignals = await this.detectBaselineDeviations(context.residentId);
      signals.push(...baselineSignals);
    }

    return signals;
  }

  /**
   * EXPLAINABILITY ENGINE
   * Makes all AI reasoning visible and understandable
   */
  static generateExplainabilityCard(
    topic: 'WHY_BLOCKED' | 'WHY_ALLOWED' | 'WHY_RISKY' | 'WHY_SUGGEST' | 'WHY_CANNOT_ACT',
    context: any
  ): ExplainabilityCard {
    switch (topic) {
      case 'WHY_BLOCKED':
        return this.explainBlocking(context);
      case 'WHY_ALLOWED':
        return this.explainAllowance(context);
      case 'WHY_RISKY':
        return this.explainRiskiness(context);
      case 'WHY_SUGGEST':
        return this.explainSuggestion(context);
      case 'WHY_CANNOT_ACT':
        return this.explainAIBoundaries(context);
    }
  }

  private static classifyIntent(action: string): IntentType {
    if (action.includes('medication') || action.includes('vital') || action.includes('care_log')) {
      return 'CLINICAL';
    }
    if (action.includes('schedule') || action.includes('assign') || action.includes('shift')) {
      return 'ADMINISTRATIVE';
    }
    if (action.includes('document') || action.includes('voice') || action.includes('report')) {
      return 'DOCUMENTATION';
    }
    if (action.includes('emergency') || action.includes('alert')) {
      return 'EMERGENCY';
    }
    if (action.includes('view') || action.includes('query') || action.includes('search')) {
      return 'QUERY';
    }
    return 'CONFIGURATION';
  }

  private static assessRisk(intentType: IntentType, context: IntentContext): RiskLevel {
    if (intentType === 'EMERGENCY') return 'CRITICAL';
    if (intentType === 'CLINICAL') return context.shiftActive ? 'HIGH' : 'CRITICAL';
    if (intentType === 'DOCUMENTATION') return 'MEDIUM';
    if (intentType === 'ADMINISTRATIVE') return 'MEDIUM';
    if (intentType === 'QUERY') return 'LOW';
    return 'LOW';
  }

  private static async checkPrerequisites(context: IntentContext): Promise<{
    complete: boolean;
    missing: string[];
    reasoning: string[];
  }> {
    const missing: string[] = [];
    const reasoning: string[] = [];

    if (context.action.includes('medication') || context.action.includes('care')) {
      if (!context.shiftActive) {
        missing.push('Active shift');
        reasoning.push('You must be clocked into a shift to perform care actions');
      }
      if (!context.residentId) {
        missing.push('Resident selection');
        reasoning.push('A resident must be selected for care actions');
      }
    }

    if (context.action.includes('emergency')) {
      if (!context.permissions?.includes('emergency.escalate')) {
        missing.push('Emergency escalation permission');
        reasoning.push('Emergency escalation requires specific permission');
      }
    }

    return {
      complete: missing.length === 0,
      missing,
      reasoning
    };
  }

  private static describeIntent(intentType: IntentType, action: string): string {
    const descriptions: Record<IntentType, string> = {
      CLINICAL: `You intend to perform clinical care: ${action}. This directly affects resident health and safety.`,
      ADMINISTRATIVE: `You intend to manage workforce or resources: ${action}. This affects care delivery capacity.`,
      DOCUMENTATION: `You intend to create documentation: ${action}. This creates legal and compliance records.`,
      EMERGENCY: `You intend to respond to an emergency: ${action}. This is time-critical and high-stakes.`,
      QUERY: `You intend to retrieve information: ${action}. This is a read-only operation.`,
      CONFIGURATION: `You intend to modify system settings: ${action}. This affects system behavior.`
    };
    return descriptions[intentType];
  }

  private static explainRisk(riskLevel: RiskLevel, intentType: IntentType, context: IntentContext): string {
    if (riskLevel === 'CRITICAL') {
      return `CRITICAL RISK: ${intentType} actions require all safety systems active. Missing prerequisites create immediate liability.`;
    }
    if (riskLevel === 'HIGH') {
      return `HIGH RISK: ${intentType} actions affect resident safety. Brain enforcement and SOP compliance are mandatory.`;
    }
    if (riskLevel === 'MEDIUM') {
      return `MODERATE RISK: ${intentType} actions create legal records. Documentation standards apply.`;
    }
    return `LOW RISK: ${intentType} actions are informational. Standard permissions apply.`;
  }

  private static defineAICapability(intentType: IntentType, context: IntentContext): {
    whatAICanDo: string[];
    whatAICannotDo: string[];
    whyAICannotAct: string[];
  } {
    const capabilities = {
      CLINICAL: {
        can: [
          'Suggest documentation structure based on past patterns',
          'Detect missed medications or care tasks',
          'Explain SOP requirements for this action',
          'Provide draft text for incident reports'
        ],
        cannot: [
          'Execute medication administration',
          'Submit documentation on your behalf',
          'Override Brain blocking or SOPs',
          'Make clinical decisions'
        ],
        why: [
          'Clinical judgment requires human expertise and legal accountability',
          'Medication administration must be witnessed and confirmed by licensed staff',
          'Documentation must reflect what actually happened, not AI interpretation',
          'Legal liability requires human decision-making in the loop'
        ]
      },
      DOCUMENTATION: {
        can: [
          'Draft report text based on structured facts you provide',
          'Suggest completeness checklist items',
          'Translate voice notes to text in multiple languages',
          'Explain documentation standards'
        ],
        cannot: [
          'Submit documentation without your review and confirmation',
          'Paraphrase or rewrite your observations without visibility',
          'Auto-complete missing details',
          'Approve or sign reports'
        ],
        why: [
          'Documentation is a legal record and must reflect your direct observations',
          'You are legally accountable for the accuracy of submitted documentation',
          'AI cannot witness events or verify facts',
          'Regulatory standards require human attestation'
        ]
      },
      EMERGENCY: {
        can: [
          'Explain emergency protocols and requirements',
          'Suggest immediate actions based on SOP',
          'Provide contact information for escalation',
          'Generate alert templates'
        ],
        cannot: [
          'Trigger emergency alerts automatically',
          'Contact emergency services',
          'Override your judgment about emergency severity',
          'Execute emergency response'
        ],
        why: [
          'Emergency response requires real-time human assessment',
          'Life-safety decisions cannot be delegated to AI',
          'Liability for emergency response rests with humans, not systems',
          'Regulators require human control of critical safety systems'
        ]
      },
      QUERY: {
        can: [
          'Retrieve and summarize information',
          'Explain data patterns and trends',
          'Answer policy and procedure questions',
          'Provide training content'
        ],
        cannot: [
          'Interpret clinical data without context',
          'Make recommendations without disclaimers',
          'Guarantee accuracy of summarized information'
        ],
        why: [
          'AI summaries may omit context or nuance',
          'Clinical interpretation requires licensed expertise',
          'You must verify information before acting on it'
        ]
      },
      ADMINISTRATIVE: {
        can: [
          'Suggest optimal shift assignments',
          'Detect scheduling conflicts',
          'Explain labor rules and constraints',
          'Provide workload analytics'
        ],
        cannot: [
          'Create or modify shifts without approval',
          'Override labor rules or supervisor decisions',
          'Auto-assign caregivers to residents'
        ],
        why: [
          'Workforce management has legal and compliance implications',
          'Labor rules require human oversight',
          'Supervisor judgment considers factors AI cannot assess'
        ]
      },
      CONFIGURATION: {
        can: [
          'Explain configuration options',
          'Suggest settings based on common patterns',
          'Warn about potential impacts of changes'
        ],
        cannot: [
          'Change system settings without explicit permission',
          'Override security or compliance settings',
          'Disable enforcement or audit features'
        ],
        why: [
          'System configuration affects all users and compliance posture',
          'Security settings protect resident data and privacy',
          'Configuration errors can create legal liability'
        ]
      }
    };

    return capabilities[intentType] || capabilities.QUERY;
  }

  private static determineNextSteps(intentType: IntentType, allowed: boolean, brainBlocked: boolean): {
    humanDecision: string;
    systemValidation: string[];
    executionPath: string;
  } {
    if (brainBlocked) {
      return {
        humanDecision: 'Resolve blocking requirements before attempting this action',
        systemValidation: ['Brain blocking check', 'Prerequisite completion'],
        executionPath: 'BLOCKED - Must remediate before execution'
      };
    }

    if (!allowed) {
      return {
        humanDecision: 'Request necessary permissions or resolve constraints',
        systemValidation: ['Permission check', 'Role validation'],
        executionPath: 'BLOCKED - Insufficient permissions'
      };
    }

    return {
      humanDecision: 'Review AI suggestions, then confirm to proceed',
      systemValidation: ['Brain allows', 'Permissions verified', 'Prerequisites met'],
      executionPath: 'User confirms → Brain validates → Audit logs → Execution'
    };
  }

  private static calculateConfidence(context: IntentContext): number {
    let confidence = 0.5;

    if (context.action) confidence += 0.2;
    if (context.userRole) confidence += 0.1;
    if (context.permissions && context.permissions.length > 0) confidence += 0.1;
    if (context.currentState) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private static extractMedicalTerms(text: string, medicalContext?: any): string[] {
    const terms: string[] = [];

    const commonMedicalTerms = [
      'mg', 'ml', 'dosage', 'blood pressure', 'heart rate', 'temperature',
      'medication', 'prescription', 'vital signs', 'fall', 'incident',
      'ambulatory', 'immobile', 'confusion', 'alert', 'oriented'
    ];

    commonMedicalTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        terms.push(term);
      }
    });

    if (medicalContext?.medications) {
      medicalContext.medications.forEach((med: string) => {
        if (text.includes(med)) terms.push(med);
      });
    }

    return Array.from(new Set(terms));
  }

  private static async performContextualTranslation(
    text: string,
    sourceLang: string,
    targetLang: string,
    medicalTerms: string[]
  ): Promise<string> {
    const mockTranslations: Record<string, Record<string, string>> = {
      'es-en': {
        'El paciente tomó la medicina': 'The patient took the medication',
        'Presión arterial alta': 'High blood pressure',
        'Temperatura normal': 'Normal temperature'
      },
      'fr-en': {
        'Le patient a pris le médicament': 'The patient took the medication',
        'Tension artérielle élevée': 'High blood pressure'
      },
      'de-en': {
        'Der Patient nahm das Medikament': 'The patient took the medication',
        'Hoher Blutdruck': 'High blood pressure'
      }
    };

    const key = `${sourceLang}-${targetLang}`;
    const translation = mockTranslations[key]?.[text] || text;

    return translation;
  }

  private static detectAmbiguities(original: string, translated: string, medicalTerms: string[]): string[] {
    const ambiguities: string[] = [];

    if (original.length > translated.length * 2) {
      ambiguities.push('Significant length difference may indicate lost nuance');
    }

    if (medicalTerms.length > 0 && !medicalTerms.some(term => translated.toLowerCase().includes(term))) {
      ambiguities.push('Medical terms may have been translated literally instead of preserved');
    }

    return ambiguities;
  }

  private static calculateTranslationConfidence(ambiguities: string[]): number {
    return Math.max(0.5, 1.0 - (ambiguities.length * 0.2));
  }

  private static explainTranslationChoices(original: string, translated: string, medicalTerms: string[]): string {
    if (medicalTerms.length > 0) {
      return `Medical context detected (${medicalTerms.join(', ')}). Translation preserves clinical meaning while adapting phrasing for target language. Medical terminology maintained for precision.`;
    }
    return `Standard translation applied. Text translated for meaning, not literal word-for-word. Review for accuracy.`;
  }

  private static generateConfirmationPrompt(translated: string, ambiguities: string[]): string {
    if (ambiguities.length > 0) {
      return `⚠️ REVIEW REQUIRED: Translation complete, but potential ambiguities detected:\n\n${ambiguities.map(a => `• ${a}`).join('\n')}\n\nPlease verify the translation accurately reflects your intended meaning before submitting.`;
    }
    return `Translation complete. Please confirm this accurately reflects what you said before submitting.`;
  }

  private static async detectBaselineDeviations(residentId: string): Promise<IntelligenceSignalDetection[]> {
    const signals: IntelligenceSignalDetection[] = [];

    const { data: baseline } = await supabase
      .from('resident_baselines')
      .select('vital_baselines, known_conditions')
      .eq('resident_id', residentId)
      .maybeSingle();

    if (!baseline) return signals;

    const { data: recentVitals } = await supabase
      .from('vital_signs')
      .select('vital_type, value, recorded_at')
      .eq('resident_id', residentId)
      .gte('recorded_at', new Date(Date.now() - 24 * 3600000).toISOString())
      .order('recorded_at', { ascending: false });

    if (!recentVitals) return signals;

    const vitalBaselines = (baseline.vital_baselines as any) || {};

    for (const vital of recentVitals) {
      const baselineRange = vitalBaselines[vital.vital_type];
      if (!baselineRange) continue;

      const value = parseFloat(vital.value);
      if (isNaN(value)) continue;

      if (value < baselineRange.min || value > baselineRange.max) {
        signals.push({
          signalId: `baseline-deviation-${residentId}-${vital.vital_type}-${Date.now()}`,
          category: 'PROACTIVE',
          source: {
            dataPoints: [`${vital.vital_type}: ${value}`, `Baseline: ${baselineRange.min}-${baselineRange.max}`],
            rules: ['Resident Baseline Configuration'],
            patterns: ['Vital Sign Monitoring']
          },
          reasoning: {
            whatDetected: `${vital.vital_type} outside baseline range`,
            whyMatters: `Deviation from resident's normal baseline may indicate change in condition`,
            confidenceLevel: 0.9,
            supportingEvidence: [
              `Current ${vital.vital_type}: ${value}`,
              `Normal baseline: ${baselineRange.min}-${baselineRange.max}`,
              `Recorded: ${vital.recorded_at}`
            ]
          },
          severity: 'HIGH',
          humanDecisionRequired: {
            decision: 'Assess resident and determine if clinical intervention needed',
            options: [
              'Recheck vital signs',
              'Contact physician',
              'Document in care log',
              'Continue monitoring'
            ],
            consequences: {
              'Recheck vital signs': 'Verify reading accuracy',
              'Contact physician': 'Obtain medical guidance',
              'Document in care log': 'Create record for review',
              'Continue monitoring': 'Track for trends'
            }
          },
          aiCannotAct: {
            reasons: [
              'Clinical assessment requires human expertise',
              'Resident-specific factors must be considered',
              'Physician consultation may be required'
            ],
            boundaries: [
              'AI cannot perform physical assessment',
              'AI cannot contact physician',
              'AI cannot make clinical decisions'
            ]
          },
          suggestedActions: [
            {
              action: 'Recheck vital signs and document',
              reasoning: 'Verify reading accuracy before escalation',
              requiresRole: ['CAREGIVER'],
              requiresPermission: ['vitals.record']
            },
            {
              action: 'Review medication administration log',
              reasoning: 'Ensure medications taken as scheduled',
              requiresRole: ['CAREGIVER'],
              requiresPermission: ['medication.view']
            }
          ]
        });
      }
    }

    return signals;
  }

  private static async detectSOPFriction(residentId: string): Promise<IntelligenceSignalDetection[]> {
    return [];
  }

  private static async detectDocumentationGaps(residentId: string): Promise<IntelligenceSignalDetection[]> {
    return [];
  }

  private static async detectWorkloadAnomalies(agencyId: string): Promise<IntelligenceSignalDetection[]> {
    return [];
  }

  private static explainBlocking(context: any): ExplainabilityCard {
    return {
      title: 'Why This Action Is Blocked',
      category: 'BLOCKED',
      reasoning: {
        summary: context.rule?.riskPrevented || 'Action blocked by system enforcement',
        details: [
          `Blocking Rule: ${context.rule?.reason || 'UNKNOWN'}`,
          `Master Spec: ${context.rule?.masterSpecSection || 'N/A'}`,
          `Remediation: ${context.rule?.remediationPath || 'Contact administrator'}`
        ],
        sources: ['Brain Blocking Service', 'Phase 1 Legal Requirements']
      },
      confidence: 1.0,
      boundaries: {
        whatAIKnows: ['System requirements', 'Current state', 'Blocking rules'],
        whatAIDoesNotKnow: ['Your specific situation context', 'Urgency factors'],
        whatAICannotDecide: ['Whether to override (no overrides allowed)', 'Alternative workflows']
      },
      humanControl: {
        requiredDecision: 'Complete required prerequisites to unblock',
        alternatives: ['Contact supervisor for guidance', 'Review system requirements']
      }
    };
  }

  private static explainAllowance(context: any): ExplainabilityCard {
    return {
      title: 'Why This Action Is Allowed',
      category: 'ALLOWED',
      reasoning: {
        summary: 'All system checks passed. Action is permitted.',
        details: [
          'Brain enforcement: Passed',
          'Permissions: Verified',
          'Prerequisites: Complete',
          'SOP compliance: No conflicts detected'
        ],
        sources: ['Brain State Machine', 'Permission System', 'Prerequisite Checker']
      },
      confidence: 0.95,
      boundaries: {
        whatAIKnows: ['System state', 'Your permissions', 'Current requirements'],
        whatAIDoesNotKnow: ['Clinical appropriateness', 'Resident-specific factors'],
        whatAICannotDecide: ['Whether you should proceed', 'Clinical judgment calls']
      },
      humanControl: {
        requiredDecision: 'You must still decide if this is clinically appropriate',
        alternatives: ['Consult SOP before proceeding', 'Ask supervisor if uncertain']
      }
    };
  }

  private static explainRiskiness(context: any): ExplainabilityCard {
    return {
      title: 'Why This Action Has Elevated Risk',
      category: 'RISKY',
      reasoning: {
        summary: context.riskReasoning || 'Action is allowed but carries elevated risk',
        details: [
          `Risk Level: ${context.riskLevel}`,
          'Action will proceed but extra caution is advised',
          'Documentation standards are elevated',
          'Supervisor notification may be triggered'
        ],
        sources: ['Risk Assessment Engine', 'SOP Rules', 'Compliance Requirements']
      },
      confidence: 0.8,
      boundaries: {
        whatAIKnows: ['System risk factors', 'Policy requirements', 'Historical patterns'],
        whatAIDoesNotKnow: ['Resident-specific risk factors', 'Environmental conditions'],
        whatAICannotDecide: ['Whether risk is acceptable', 'Whether to proceed']
      },
      humanControl: {
        requiredDecision: 'Assess situational risk and decide if proceeding is appropriate',
        alternatives: ['Consult supervisor before proceeding', 'Review resident care plan']
      }
    };
  }

  private static explainSuggestion(context: any): ExplainabilityCard {
    return {
      title: 'Why AI Suggests This',
      category: 'SUGGESTION',
      reasoning: {
        summary: context.suggestion || 'AI has detected a pattern suggesting this action',
        details: context.reasoning || [
          'Based on historical patterns',
          'Aligned with SOP requirements',
          'Consistent with care plan'
        ],
        sources: context.sources || ['Pattern Detection', 'SOP Analysis', 'Care Plan']
      },
      confidence: context.confidence || 0.7,
      boundaries: {
        whatAIKnows: ['Data patterns', 'SOP requirements', 'System state'],
        whatAIDoesNotKnow: ['Your clinical assessment', 'Resident preferences', 'Contextual factors'],
        whatAICannotDecide: ['Whether suggestion is appropriate', 'Whether to follow suggestion']
      },
      humanControl: {
        requiredDecision: 'Evaluate suggestion and decide whether to act',
        alternatives: ['Dismiss if not applicable', 'Modify suggestion as needed']
      }
    };
  }

  private static explainAIBoundaries(context: any): ExplainabilityCard {
    return {
      title: 'What AI Cannot Do Here',
      category: 'BOUNDARY',
      reasoning: {
        summary: 'AI has reached its boundary. Human decision required.',
        details: context.whyCannotAct || [
          'This decision requires human judgment',
          'Legal liability requires human accountability',
          'Clinical expertise required',
          'Regulatory standards mandate human control'
        ],
        sources: ['AI Capability Limits', 'Legal Requirements', 'Ethical Guidelines']
      },
      confidence: 1.0,
      boundaries: {
        whatAIKnows: ['System capabilities', 'Regulatory boundaries', 'Technical limits'],
        whatAIDoesNotKnow: ['How to make this decision', 'What outcome you want'],
        whatAICannotDecide: ['Clinical judgments', 'Legal accountability decisions', 'Ethical dilemmas']
      },
      humanControl: {
        requiredDecision: context.humanDecision || 'You must make this decision',
        alternatives: context.alternatives || ['Consult supervisor', 'Review policy', 'Contact support']
      }
    };
  }
}
