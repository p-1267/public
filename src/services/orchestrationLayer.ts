export type IntentValidationResult = {
  allowed: boolean;
  reason: string;
  requiredActions: string[];
  brainConstraints?: string[];
  permissionConstraints?: string[];
  complianceConstraints?: string[];
};

export type IntelligenceSignalType =
  | 'MISSED_DOSE'
  | 'COMPLIANCE_GAP'
  | 'ANALYTICS_INSIGHT'
  | 'DEVICE_ALERT';

export type IntelligenceSignal = {
  id: string;
  type: IntelligenceSignalType;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  reasoning: string;
  actionRequired: string;
  authorizedRoles: string[];
  dismissible: boolean;
  createdAt: string;
};

export type AISuggestionReasoning = {
  suggestion: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string[];
  whyCannotAct: string[];
  actionRequired: string[];
  sources: string[];
};

export type LanguageRoutingPolicy = {
  inputLanguage: string;
  outputLanguage: string;
  translationRequired: boolean;
  policyReason: string;
  preserveOriginal: boolean;
};

export class OrchestrationLayer {
  static validateIntent(
    action: string,
    context: {
      brainState?: any;
      userPermissions?: string[];
      userRole?: string;
      shiftActive?: boolean;
    }
  ): IntentValidationResult {
    const result: IntentValidationResult = {
      allowed: false,
      reason: '',
      requiredActions: [],
      brainConstraints: [],
      permissionConstraints: [],
      complianceConstraints: []
    };

    switch (action) {
      case 'administer_medication':
        if (!context.shiftActive) {
          result.brainConstraints?.push('shift_active = false');
          result.reason = 'You are not clocked into a shift';
          result.requiredActions.push('Clock in to your scheduled shift');
          return result;
        }

        if (!context.userPermissions?.includes('medication.administer')) {
          result.permissionConstraints?.push('medication.administer');
          result.reason = 'You do not have permission to administer medications';
          result.requiredActions.push('Request medication.administer permission from supervisor');
          return result;
        }

        if (context.brainState?.current_state === 'EMERGENCY') {
          result.complianceConstraints?.push('Emergency state requires supervisor approval');
          result.reason = 'Medication administration during emergency requires supervisor review';
          result.requiredActions.push('Request supervisor approval for emergency medication');
          return result;
        }

        result.allowed = true;
        result.reason = 'Action permitted';
        break;

      case 'voice_documentation':
        if (!context.userPermissions?.includes('documentation.create')) {
          result.permissionConstraints?.push('documentation.create');
          result.reason = 'You do not have permission to create documentation';
          result.requiredActions.push('Request documentation.create permission');
          return result;
        }

        result.allowed = true;
        result.reason = 'Voice documentation permitted';
        result.requiredActions.push('Review transcript before submitting');
        break;

      case 'emergency_escalation':
        if (!context.userPermissions?.includes('emergency.escalate')) {
          result.permissionConstraints?.push('emergency.escalate');
          result.reason = 'You do not have permission to escalate emergencies';
          result.requiredActions.push('Contact supervisor immediately');
          return result;
        }

        result.allowed = true;
        result.reason = 'Emergency escalation permitted';
        result.requiredActions.push('Document reason for escalation');
        break;

      default:
        result.reason = 'Unknown action';
        result.requiredActions.push('Contact system administrator');
    }

    return result;
  }

  static generateIntelligenceSignals(context: {
    residents?: any[];
    medications?: any[];
    complianceStatus?: any;
    deviceHealth?: any[];
  }): IntelligenceSignal[] {
    const signals: IntelligenceSignal[] = [];

    if (context.medications) {
      context.medications.forEach(med => {
        if (med.due_now && !med.last_administered) {
          signals.push({
            id: `missed-dose-${med.id}`,
            type: 'MISSED_DOSE',
            priority: 'HIGH',
            title: 'Medication Due',
            description: `${med.medication_name} scheduled for ${med.schedule?.times?.[0] || 'now'}`,
            reasoning: 'Medication schedule indicates dose is due. No administration logged.',
            actionRequired: 'Review medication schedule and administer if appropriate',
            authorizedRoles: ['CAREGIVER', 'SUPERVISOR'],
            dismissible: false,
            createdAt: new Date().toISOString()
          });
        }
      });
    }

    if (context.complianceStatus?.gaps) {
      signals.push({
        id: 'compliance-gap-documentation',
        type: 'COMPLIANCE_GAP',
        priority: 'MEDIUM',
        title: 'Documentation Incomplete',
        description: 'Fall incident requires witness signature',
        reasoning: 'SOP requires witness signature for all fall incidents within 24 hours',
        actionRequired: 'Complete fall documentation with witness signature',
        authorizedRoles: ['CAREGIVER', 'SUPERVISOR', 'AGENCY_ADMIN'],
        dismissible: true,
        createdAt: new Date().toISOString()
      });
    }

    if (context.deviceHealth?.some(d => d.battery_low)) {
      signals.push({
        id: 'device-alert-battery',
        type: 'DEVICE_ALERT',
        priority: 'MEDIUM',
        title: 'Device Battery Low',
        description: 'Blood pressure monitor battery below 20%',
        reasoning: 'Device health check indicates battery replacement needed',
        actionRequired: 'Replace device battery or charge device',
        authorizedRoles: ['CAREGIVER', 'SUPERVISOR'],
        dismissible: true,
        createdAt: new Date().toISOString()
      });
    }

    return signals;
  }

  static explainAISuggestion(
    suggestion: string,
    context: {
      residentBaseline?: any;
      sopRules?: any[];
      brainState?: any;
      permissions?: string[];
    }
  ): AISuggestionReasoning {
    return {
      suggestion,
      confidence: 'HIGH',
      reasoning: [
        'Based on resident baseline: BP normally 120/80, current reading 160/95',
        'SOP requires documentation of elevated BP within 30 minutes',
        'Historical pattern shows BP elevation correlates with missed medication'
      ],
      whyCannotAct: [
        'Brain blocks automated actions during elevated vital readings',
        'Documentation requires human clinical judgment',
        'Physician notification may be required per protocol'
      ],
      actionRequired: [
        'Document elevated BP reading',
        'Review medication administration log',
        'Contact physician if reading remains elevated after 15 minutes',
        'Continue monitoring per protocol'
      ],
      sources: [
        'Resident baseline configuration',
        'SOP: Vital Sign Monitoring Protocol',
        'Medication schedule: Lisinopril 10mg daily'
      ]
    };
  }

  static determineLanguageRouting(
    inputLanguage: string,
    context: {
      agencyCountry?: string;
      agencyLanguagePolicy?: string;
      regulatoryRequirements?: string[];
      userPreference?: string;
    }
  ): LanguageRoutingPolicy {
    const outputLanguage = context.agencyLanguagePolicy || 'en';
    const translationRequired = inputLanguage !== outputLanguage;

    return {
      inputLanguage,
      outputLanguage,
      translationRequired,
      policyReason: translationRequired
        ? `Agency policy requires ${outputLanguage} documentation. Original ${inputLanguage} text will be preserved.`
        : 'No translation required',
      preserveOriginal: true
    };
  }

  static explainBlockedAction(
    action: string,
    constraints: {
      brainConstraints?: string[];
      permissionConstraints?: string[];
      complianceConstraints?: string[];
    }
  ): {
    title: string;
    explanation: string;
    requirements: string[];
    alternatives: string[];
  } {
    if (constraints.brainConstraints?.length) {
      return {
        title: 'Action Blocked by Brain Enforcement',
        explanation: 'The Brain state machine has determined this action cannot proceed due to system constraints.',
        requirements: constraints.brainConstraints.map(c => `Requirement: ${c}`),
        alternatives: [
          'Check your current shift status',
          'Verify resident state is appropriate for this action',
          'Contact supervisor if you believe this is an error'
        ]
      };
    }

    if (constraints.permissionConstraints?.length) {
      return {
        title: 'Permission Required',
        explanation: 'Your current role does not have permission to perform this action.',
        requirements: constraints.permissionConstraints.map(p => `Missing permission: ${p}`),
        alternatives: [
          'Request permission from your supervisor',
          'Contact agency administrator to review role permissions',
          'Use alternative workflow if available'
        ]
      };
    }

    if (constraints.complianceConstraints?.length) {
      return {
        title: 'Compliance Rule Applies',
        explanation: 'This action is subject to compliance rules that must be satisfied first.',
        requirements: constraints.complianceConstraints,
        alternatives: [
          'Complete required documentation',
          'Obtain supervisor approval',
          'Follow alternative protocol as defined in SOP'
        ]
      };
    }

    return {
      title: 'Action Cannot Proceed',
      explanation: 'This action is currently unavailable.',
      requirements: ['Unknown constraint'],
      alternatives: ['Contact system administrator']
    };
  }
}
