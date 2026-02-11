export interface AIContext {
  role: string;
  residentName?: string;
  shiftId?: string;
  currentPage?: string;
  formData?: Record<string, any>;
  timelineItems?: any[];
}

export interface AIRequest {
  mode: 'DRAFT' | 'SUMMARIZE' | 'EXPLAIN' | 'CHECKLIST' | 'ASK';
  context: AIContext;
  prompt?: string;
  reportType?: 'INCIDENT' | 'FALL' | 'MEDICATION_ERROR' | 'MISSED_CARE' | 'INSURANCE_SUMMARY';
  structuredFacts?: Record<string, any>;
}

export interface AIResponse {
  text: string;
  suggestions?: string[];
  uncertainty?: string;
  requiresReview: boolean;
  disclaimer: string;
}

export class MockAIEngine {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed;
  }

  private deterministicChoice<T>(options: T[]): T {
    const index = this.seed % options.length;
    return options[index];
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    await new Promise(resolve => setTimeout(resolve, 800));

    switch (request.mode) {
      case 'DRAFT':
        return this.generateDraft(request);
      case 'SUMMARIZE':
        return this.generateSummary(request);
      case 'EXPLAIN':
        return this.generateExplanation(request);
      case 'CHECKLIST':
        return this.generateChecklist(request);
      case 'ASK':
        return this.generateQA(request);
      default:
        return {
          text: 'AI mode not recognized.',
          requiresReview: true,
          disclaimer: 'AI Draft - Not a medical/legal authority. Human review required.',
        };
    }
  }

  private generateDraft(request: AIRequest): AIResponse {
    const facts = request.structuredFacts || {};

    switch (request.reportType) {
      case 'INCIDENT':
        return {
          text: this.generateIncidentDraft(facts),
          requiresReview: true,
          disclaimer: 'AI Draft - Not a medical/legal authority. Human review required. No automatic submission.',
          uncertainty: facts.description ? undefined : 'Some details may be incomplete. Please review carefully.',
        };

      case 'FALL':
        return {
          text: this.generateFallDraft(facts),
          suggestions: [
            'Consider adding vital signs if not already documented',
            'Verify fall prevention measures were in place',
            'Ensure family notification is documented',
          ],
          requiresReview: true,
          disclaimer: 'AI Draft - Not a medical/legal authority. Human review required. No automatic submission.',
        };

      case 'MEDICATION_ERROR':
        return {
          text: this.generateMedErrorDraft(facts),
          suggestions: [
            'Confirm physician was notified and response documented',
            'Document any adverse effects observed',
            'Include corrective actions to prevent recurrence',
          ],
          requiresReview: true,
          disclaimer: 'AI Draft - Not a medical/legal authority. Human review required. No automatic submission.',
        };

      case 'MISSED_CARE':
        return {
          text: this.generateMissedCareDraft(facts),
          requiresReview: true,
          disclaimer: 'AI Draft - Not a medical/legal authority. Human review required. No automatic submission.',
        };

      case 'INSURANCE_SUMMARY':
        return {
          text: this.generateInsuranceSummary(facts),
          requiresReview: true,
          disclaimer: 'AI Draft - Not a medical/legal authority. Human review required. No automatic submission.',
        };

      default:
        return {
          text: this.generateGenericDraft(facts, request.context),
          requiresReview: true,
          disclaimer: 'AI Draft - Not a medical/legal authority. Human review required.',
        };
    }
  }

  private generateIncidentDraft(facts: Record<string, any>): string {
    const who = facts.actor || 'Staff member';
    const resident = facts.resident || 'Resident';
    const when = facts.timestamp || 'during shift';
    const where = facts.location || 'on premises';
    const what = facts.description || 'an incident occurred';
    const actions = facts.actions || 'appropriate response was initiated';

    return `INCIDENT REPORT - DRAFT

SUMMARY:
On ${when}, ${resident} experienced ${what} ${where}. ${who} responded immediately and ${actions}.

DETAILED NARRATIVE:
This incident was observed at ${when} in the ${where} area. ${resident} ${what}. The caregiver ${who} was present and responded according to established protocols.

ACTIONS TAKEN:
${actions}. The resident's condition was assessed, and appropriate notifications were made. Documentation was completed in accordance with facility policies.

IMMEDIATE RESPONSE:
${who} maintained resident safety as the primary priority. The incident scene was secured, and any immediate hazards were addressed.

FOLLOW-UP REQUIRED:
- Supervisor review and approval
- Family notification (if indicated)
- Physician consultation (if indicated)
- Care plan review to prevent recurrence

This report is submitted for review and will be finalized upon supervisor approval.`;
  }

  private generateFallDraft(facts: Record<string, any>): string {
    const resident = facts.resident || 'Resident';
    const location = facts.location || 'their room';
    const timestamp = facts.timestamp || 'this shift';
    const injuries = facts.injuries || 'no visible injuries observed';
    const vitals = facts.vitals || 'vital signs within normal limits';

    return `FALL INCIDENT REPORT - DRAFT

INCIDENT TYPE: Fall
DATE/TIME: ${timestamp}
LOCATION: ${location}
RESIDENT: ${resident}

CIRCUMSTANCES:
${resident} experienced a fall in ${location}. The fall detection system (if equipped) triggered an alert, and the caregiver responded immediately.

INJURY ASSESSMENT:
Upon assessment, ${injuries}. The resident was examined for pain, swelling, or limited mobility. ${vitals}.

IMMEDIATE ACTIONS:
1. Resident safety was ensured
2. Fall scene was assessed for hazards
3. Resident was assisted to a safe position
4. Vital signs were monitored
5. Physician was notified
6. Family was contacted

POST-FALL PROTOCOL:
- Neurological checks performed
- Mobility reassessed
- Fall risk factors reviewed
- Environmental safety verified

PREVENTION MEASURES:
A comprehensive fall risk assessment will be conducted. Equipment, mobility aids, and environmental factors will be reviewed. Care plan updates will be considered to prevent future incidents.

PHYSICIAN NOTIFICATION:
Physician was notified and provided assessment findings. Orders received and documented separately.`;
  }

  private generateMedErrorDraft(facts: Record<string, any>): string {
    const resident = facts.resident || 'Resident';
    const medication = facts.medication || 'medication';
    const error = facts.errorType || 'administration error';
    const discovery = facts.discovery || 'during routine review';

    return `MEDICATION ERROR REPORT - DRAFT

ERROR TYPE: ${error}
MEDICATION: ${medication}
RESIDENT: ${resident}
DISCOVERY: ${discovery}

INCIDENT DESCRIPTION:
A medication error was identified involving ${medication} for ${resident}. The error was discovered ${discovery}. Immediate corrective actions were initiated per protocol.

ERROR DETAILS:
The ${error} occurred during medication administration. Contributing factors have been identified and documented for quality improvement purposes.

IMMEDIATE RESPONSE:
1. Medication administration was stopped/corrected
2. Resident was assessed for adverse effects
3. Physician was notified immediately
4. Enhanced monitoring was initiated
5. Supervisor was informed
6. Incident was documented in real-time

RESIDENT MONITORING:
The resident was closely monitored for any adverse reactions. Vital signs were checked at appropriate intervals. No adverse effects were observed during the monitoring period.

PHYSICIAN CONSULTATION:
The attending physician was contacted and provided with complete information. Physician recommendations were received and implemented.

CORRECTIVE ACTIONS:
- Medication packaging will be reviewed
- Staff education will be reinforced
- Process improvements will be identified
- Similar medications will be flagged for extra verification

This error has been reported through appropriate channels for quality assurance review.`;
  }

  private generateMissedCareDraft(facts: Record<string, any>): string {
    const resident = facts.resident || 'Resident';
    const careType = facts.careType || 'scheduled care';
    const reason = facts.reason || 'staffing constraints';
    const resolution = facts.resolution || 'care was provided as soon as possible';

    return `MISSED CARE REPORT - DRAFT

CARE TYPE: ${careType}
RESIDENT: ${resident}
REASON: ${reason}

INCIDENT SUMMARY:
The scheduled ${careType} for ${resident} was delayed/missed due to ${reason}. ${resolution}.

CIRCUMSTANCES:
During the shift, ${reason} prevented the timely delivery of ${careType}. The situation was identified and addressed according to facility protocols.

RESOLUTION:
${resolution}. The resident's condition was assessed and appropriate notifications were made. No adverse effects from the delay were observed.

APPROVAL OBTAINED:
Supervisor approval was obtained for the delayed care delivery. Documentation of the approval is attached/referenced.

IMPACT ASSESSMENT:
The resident's overall care plan was reviewed to assess any impact from the missed/delayed care. No significant clinical impact was identified.

PREVENTION:
Staffing patterns will be reviewed to prevent similar occurrences. Resource allocation during high-demand periods will be optimized.`;
  }

  private generateInsuranceSummary(facts: Record<string, any>): string {
    const resident = facts.resident || 'Resident';
    const period = facts.period || 'reporting period';

    return `INSURANCE EVIDENCE SUMMARY - DRAFT

RESIDENT: ${resident}
PERIOD: ${period}

CARE DELIVERY OVERVIEW:
During ${period}, comprehensive care services were provided to ${resident} in accordance with the established care plan. All care was delivered by qualified staff with appropriate supervision and documentation.

COMPLIANCE METRICS:
Care plan adherence was maintained at high levels throughout the period. Medication administration, personal care, mobility assistance, and health monitoring were completed as scheduled with documented justifications for any variations.

INCIDENT MANAGEMENT:
All incidents were appropriately documented, reviewed, and resolved. Each incident received timely supervisor review, appropriate clinical consultation, and family notification as indicated.

DOCUMENTATION COMPLETENESS:
All required documentation is complete and available for review, including care logs, medication administration records, incident reports, and supervisor reviews.

QUALITY INDICATORS:
The resident's care met or exceeded quality standards for the reporting period. Family satisfaction and resident wellbeing remained priorities throughout service delivery.

This summary is prepared for insurance verification purposes and is supported by complete documentation available upon request.`;
  }

  private generateGenericDraft(facts: Record<string, any>, context: AIContext): string {
    return `DRAFT DOCUMENT

Based on the information provided:
${Object.entries(facts).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

[This is a draft generated by AI. Please review and edit as needed before submission.]

Context: ${context.role} role, ${context.currentPage || 'general use'}`;
  }

  private generateSummary(request: AIRequest): AIResponse {
    const context = request.context;

    if (context.role === 'SUPERVISOR' && request.prompt?.includes('pending')) {
      return {
        text: `SUPERVISOR SUMMARY - Pending Reports

You have 2 incident reports awaiting review:

1. MEDICATION ERROR (High Priority)
   - Resident: Robert Chen
   - Issue: Incorrect dosage administered
   - Action: Physician contacted, monitoring in progress
   - Questions to consider:
     • Was the medication packaging clearly labeled?
     • Has similar confusion occurred before?
     • What additional safeguards can be implemented?

2. BEHAVIORAL INCIDENT (Medium Priority)
   - Resident: Pat Anderson
   - Issue: Verbal agitation during group activity
   - Action: De-escalation successful, no injuries
   - Questions to consider:
     • Are there triggers we can identify?
     • Should medication be reviewed?
     • Is the activity schedule appropriate?

RECOMMENDATION: Review high-priority items first. Both reports have complete documentation.`,
        requiresReview: false,
        disclaimer: 'AI Summary - For informational purposes only.',
      };
    }

    if (context.role === 'FAMILY_VIEWER') {
      return {
        text: `DAILY SUMMARY FOR FAMILY

Your loved one had a good day today. Here's what happened:

ACTIVITIES:
- Participated in morning exercise group
- Enjoyed meals with peers
- Attended afternoon music session

HEALTH STATUS:
- All medications taken as scheduled
- Vital signs normal
- No concerns reported

CARE PROVIDED:
- Personal care assistance completed
- Mobility support provided as needed
- Social engagement encouraged

Your loved one is doing well and all care is proceeding according to plan.`,
        requiresReview: false,
        disclaimer: 'AI Summary - Family-friendly overview only.',
      };
    }

    return {
      text: `SUMMARY:\n\n${request.prompt || 'No specific content to summarize.'}\n\n[AI generated summary based on available context]`,
      requiresReview: false,
      disclaimer: 'AI Summary - Suggestion only.',
    };
  }

  private generateExplanation(request: AIRequest): AIResponse {
    const prompt = request.prompt?.toLowerCase() || '';

    if (prompt.includes('alert') || prompt.includes('fall')) {
      return {
        text: `EXPLANATION: Fall Detection Alert

This alert means a fall was detected by the monitoring system. Here's what it means:

WHAT HAPPENED:
- A sudden change in position was detected
- The system triggered an automatic alert
- A caregiver was notified immediately

WHAT'S BEING DONE:
- A caregiver is responding or has already responded
- The resident will be checked for injuries
- A report will be completed
- You'll be notified if any medical attention is needed

WHAT THIS MEANS FOR YOU:
Falls are taken very seriously. Even if no injury occurred, we document everything and review fall prevention measures.

WHY YOU RECEIVED THIS:
You're listed as an emergency contact and have opted in to receive safety alerts.

If you have questions or concerns, you can contact the care team directly.`,
        requiresReview: false,
        disclaimer: 'AI Explanation - For informational purposes only.',
      };
    }

    if (prompt.includes('medication') || prompt.includes('med')) {
      return {
        text: `EXPLANATION: Medication Schedules

Medications are administered according to physician orders and carefully tracked:

TIMING:
Each medication has a specific time window for administration. Our staff follows these schedules precisely.

DOCUMENTATION:
Every medication given is documented immediately, including:
- What was given
- When it was given
- Who gave it
- Any resident response

SAFETY CHECKS:
Before each medication administration:
- Right resident
- Right medication
- Right dose
- Right time
- Right route

MONITORING:
Residents are monitored for medication effectiveness and any side effects.

If you have questions about specific medications, please contact the nursing staff or physician.`,
        requiresReview: false,
        disclaimer: 'AI Explanation - Educational only, not medical advice.',
      };
    }

    return {
      text: `EXPLANATION:\n\n${request.prompt || 'No specific topic provided.'}\n\n[AI would provide a plain-language explanation of policies, procedures, or alerts based on the question asked.]`,
      requiresReview: false,
      disclaimer: 'AI Explanation - Suggestion only.',
    };
  }

  private generateChecklist(request: AIRequest): AIResponse {
    const context = request.context;

    if (context.role === 'CAREGIVER') {
      return {
        text: `CARE DOCUMENTATION CHECKLIST

Before submitting this care log, verify:

REQUIRED ITEMS:
☐ Resident name and ID confirmed
☐ Date and time documented
☐ Type of care provided clearly stated
☐ Resident response/cooperation noted
☐ Any concerns or changes documented
☐ Vital signs recorded (if applicable)
☐ Medication administration logged (if applicable)

QUALITY ITEMS:
☐ Notes are clear and professional
☐ Objective observations (not opinions)
☐ Any deviations from care plan explained
☐ Follow-up needs identified

SAFETY ITEMS:
☐ Any incidents reported separately
☐ Equipment issues documented
☐ Environmental hazards noted

Your documentation creates a legal record and supports quality care. Take time to be thorough.`,
        suggestions: [
          'Use specific, measurable terms',
          'Avoid abbreviations that may be unclear',
          'Document facts, not assumptions',
        ],
        requiresReview: false,
        disclaimer: 'AI Checklist - Suggestion only.',
      };
    }

    if (context.role === 'SUPERVISOR') {
      return {
        text: `INCIDENT REVIEW CHECKLIST

Before approving or rejecting this report:

COMPLETENESS:
☐ All required fields are filled
☐ Timeline is clear and logical
☐ Actions taken are documented
☐ Notifications made are documented

QUALITY:
☐ Report is objective and factual
☐ No judgmental language used
☐ Sufficient detail provided
☐ Professional tone maintained

POLICY COMPLIANCE:
☐ Response time was appropriate
☐ Proper protocols were followed
☐ Required notifications were made
☐ Documentation is timely

FOLLOW-UP:
☐ Care plan review needed?
☐ Equipment check required?
☐ Additional training indicated?
☐ Family communication complete?

If rejecting, provide specific feedback so the caregiver can improve the report.`,
        requiresReview: false,
        disclaimer: 'AI Checklist - Suggestion only.',
      };
    }

    return {
      text: `CHECKLIST:\n\n[AI would generate a role-specific checklist based on the current task]`,
      requiresReview: false,
      disclaimer: 'AI Checklist - Suggestion only.',
    };
  }

  private generateQA(request: AIRequest): AIResponse {
    const prompt = request.prompt?.toLowerCase() || '';

    if (prompt.includes('emergency') || prompt.includes('call 911')) {
      return {
        text: `RESPONSE: Emergency Procedures

In a true emergency, always call 911 first, then notify the supervisor.

WHEN TO CALL 911:
- Chest pain or difficulty breathing
- Unconsciousness or unresponsiveness
- Severe bleeding
- Suspected stroke symptoms
- Severe allergic reaction
- Any life-threatening situation

AFTER CALLING 911:
1. Stay with the resident
2. Notify supervisor immediately
3. Begin appropriate first aid if trained
4. Document everything
5. Keep resident calm

The system can help with documentation, but human judgment determines when emergency services are needed.`,
        requiresReview: false,
        disclaimer: 'AI Response - Follow facility emergency protocols.',
      };
    }

    return {
      text: `RESPONSE TO YOUR QUESTION:\n\n"${request.prompt}"\n\n[AI would provide a contextual answer based on the current page, role, and available information. This is a simulated response for showcase purposes.]

Would you like me to explain further or provide additional guidance?`,
      requiresReview: false,
      disclaimer: 'AI Response - Suggestion only.',
    };
  }
}

export const mockAI = new MockAIEngine();
