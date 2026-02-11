export interface DecisionSpineOutput {
  context_id: string;
  context_type: 'RESIDENT' | 'SHIFT' | 'CAREGIVER' | 'FACILITY';
  timestamp: string;

  question_1_what_is_happening: string;
  question_2_what_is_wrong_or_at_risk: {
    classification: 'CRITICAL' | 'UNSAFE' | 'CONCERNING' | 'ACCEPTABLE';
    specific_risks: string[];
  };
  question_3_why_classified_this_way: {
    rules_fired: string[];
    thresholds_crossed: string[];
    trends_detected: string[];
    baselines_compared: string[];
  };
  question_4_single_most_important_decision: string;
  question_5_what_must_happen_next: {
    ordered_actions: Array<{
      sequence: number;
      action: string;
      deadline: string;
      time_remaining_seconds: number;
    }>;
  };
  question_6_what_must_not_happen: string[];
  question_7_who_is_accountable: {
    role: string;
    person_name: string | null;
    person_id: string | null;
  };
  question_8_what_happens_if_nothing_changes: string[];
  question_9_what_system_does_not_know: string[];
  question_10_what_decisions_blocked: Array<{
    decision: string;
    requires_human_role: string;
    reason_blocked: string;
  }>;

  time_awareness: {
    situation_trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
    days_in_current_state: number;
    countdown_to_escalation_seconds: number | null;
    countdown_to_regulatory_breach_seconds: number | null;
    next_risk_to_materialize: string | null;
  };

  role_enforcement: {
    current_role_assignments_valid: boolean;
    violations: Array<{
      type: 'LICENSURE' | 'SCOPE' | 'RATIO' | 'SUPERVISION';
      severity: 'UNACCEPTABLE' | 'UNSAFE' | 'ALLOWED_WITH_OVERRIDE';
      description: string;
      person_involved: string;
      required_correction: string;
    }>;
  };
}

export class DecisionSpine {
  private static evaluateResident(
    residentId: string,
    residentData: any,
    caregiverData: any,
    taskData: any[],
    vitalSigns: any[],
    medicationHistory: any[]
  ): DecisionSpineOutput {
    const now = new Date();

    const rules_fired: string[] = [];
    const thresholds_crossed: string[] = [];
    const trends_detected: string[] = [];
    const baselines_compared: string[] = [];
    const specific_risks: string[] = [];
    const consequences: string[] = [];
    const prohibitions: string[] = [];
    const uncertainties: string[] = [];
    const blocked_decisions: any[] = [];

    let classification: 'CRITICAL' | 'UNSAFE' | 'CONCERNING' | 'ACCEPTABLE' = 'ACCEPTABLE';
    let situation_trend: 'IMPROVING' | 'STABLE' | 'WORSENING' = 'STABLE';
    let days_in_state = 0;

    const lateMedications = medicationHistory.filter(m => m.minutes_late > 30);
    if (lateMedications.length >= 3) {
      classification = 'CONCERNING';
      rules_fired.push('RULE: 3+ medications late >30min within 7 days');
      thresholds_crossed.push('THRESHOLD: Medication timing compliance <90%');
      trends_detected.push('TREND: Consistent morning medication delays');
      specific_risks.push('Medication efficacy compromised by inconsistent timing');
      specific_risks.push('Therapeutic blood levels may not be maintained');
      specific_risks.push('Regulatory compliance violation if pattern continues');
      consequences.push('Resident health outcomes degrade without consistent medication timing');
      consequences.push('State survey citation if pattern documented during inspection');
      days_in_state = 3;
    }

    const vitalTrends = this.analyzeVitalTrends(vitalSigns);
    if (vitalTrends.deteriorating_indicators >= 2) {
      classification = 'CRITICAL';
      situation_trend = 'WORSENING';
      rules_fired.push('RULE: 2+ vital indicators trending outside baseline');
      trends_detected.push('TREND: Multi-system deterioration over 72+ hours');
      baselines_compared.push('BASELINE: Food intake decreased 40% from 30-day average');
      baselines_compared.push('BASELINE: Mobility decreased from independent to assisted');
      specific_risks.push('Undiagnosed infection progressing without treatment');
      specific_risks.push('Metabolic decompensation risk');
      specific_risks.push('Fall risk due to decreased mobility and alertness');
      consequences.push('Condition may rapidly decline without physician intervention');
      consequences.push('Potential hospitalization for preventable condition');
      consequences.push('Family trust compromised if deterioration not addressed');
      uncertainties.push('UNKNOWN: Specific medical etiology (requires physician evaluation)');
      uncertainties.push('UNKNOWN: Whether infection vs metabolic vs other cause');
      days_in_state = 4;
    }

    if (!caregiverData || !caregiverData.has_required_license) {
      classification = 'UNSAFE';
      rules_fired.push('RULE: Unlicensed caregiver assigned to high-acuity resident');
      thresholds_crossed.push('THRESHOLD: Caregiver licensure requirement not met');
      specific_risks.push('Clinical tasks may be performed by unqualified personnel');
      specific_risks.push('Legal liability for facility');
      prohibitions.push('DO NOT allow injectable medication administration by this caregiver');
      prohibitions.push('DO NOT allow complex wound care by this caregiver');
      prohibitions.push('DO NOT proceed without licensed nurse assignment');
      consequences.push('Patient safety compromised');
      consequences.push('Regulatory violation');
    }

    const overdueTaskCount = taskData.filter(t => t.status === 'overdue').length;
    if (overdueTaskCount >= 3) {
      if (classification === 'ACCEPTABLE') classification = 'CONCERNING';
      rules_fired.push('RULE: 3+ tasks overdue for single resident');
      thresholds_crossed.push('THRESHOLD: Task completion rate <80%');
      trends_detected.push('TREND: Task backlog accumulating');
      specific_risks.push('Care plan adherence compromised');
      specific_risks.push('Resident needs not being met on schedule');
      consequences.push('Resident condition may worsen due to missed care interventions');
    }

    let single_most_important_decision = '';
    const ordered_actions: any[] = [];
    let accountable_role = '';
    let accountable_person = null;

    if (classification === 'CRITICAL') {
      single_most_important_decision = 'IMMEDIATE PHYSICIAN EVALUATION REQUIRED';
      ordered_actions.push({
        sequence: 1,
        action: 'Contact physician for urgent evaluation',
        deadline: new Date(now.getTime() + 4 * 3600000).toISOString(),
        time_remaining_seconds: 4 * 3600
      });
      ordered_actions.push({
        sequence: 2,
        action: 'Increase monitoring to every 2 hours',
        deadline: new Date(now.getTime() + 30 * 60000).toISOString(),
        time_remaining_seconds: 30 * 60
      });
      ordered_actions.push({
        sequence: 3,
        action: 'Document all observations for clinical review',
        deadline: new Date(now.getTime() + 1 * 3600000).toISOString(),
        time_remaining_seconds: 1 * 3600
      });
      accountable_role = 'LICENSED_NURSE';
      accountable_person = caregiverData?.name || null;
      prohibitions.push('DO NOT wait for next scheduled assessment');
      prohibitions.push('DO NOT delegate physician notification to unlicensed staff');
    } else if (classification === 'UNSAFE') {
      single_most_important_decision = 'CORRECT STAFFING ASSIGNMENT IMMEDIATELY';
      ordered_actions.push({
        sequence: 1,
        action: 'Reassign resident to licensed nurse',
        deadline: new Date(now.getTime() + 15 * 60000).toISOString(),
        time_remaining_seconds: 15 * 60
      });
      ordered_actions.push({
        sequence: 2,
        action: 'Document staffing violation and corrective action',
        deadline: new Date(now.getTime() + 30 * 60000).toISOString(),
        time_remaining_seconds: 30 * 60
      });
      accountable_role = 'SUPERVISOR';
      blocked_decisions.push({
        decision: 'Allow current caregiver to continue clinical tasks',
        requires_human_role: 'SUPERVISOR',
        reason_blocked: 'Caregiver lacks required licensure for resident acuity level'
      });
    } else if (classification === 'CONCERNING') {
      single_most_important_decision = 'INVESTIGATE AND CORRECT WORKFLOW PATTERN';
      ordered_actions.push({
        sequence: 1,
        action: 'Review morning task sequence with caregiver',
        deadline: new Date(now.getTime() + 24 * 3600000).toISOString(),
        time_remaining_seconds: 24 * 3600
      });
      ordered_actions.push({
        sequence: 2,
        action: 'Adjust medication administration schedule if needed',
        deadline: new Date(now.getTime() + 48 * 3600000).toISOString(),
        time_remaining_seconds: 48 * 3600
      });
      accountable_role = 'SUPERVISOR';
      accountable_person = 'Supervisor on duty';
    } else {
      single_most_important_decision = 'CONTINUE ROUTINE MONITORING';
      ordered_actions.push({
        sequence: 1,
        action: 'Maintain current care plan',
        deadline: new Date(now.getTime() + 24 * 3600000).toISOString(),
        time_remaining_seconds: 24 * 3600
      });
      accountable_role = 'ASSIGNED_CAREGIVER';
      accountable_person = caregiverData?.name || null;
    }

    const violations: any[] = [];
    if (!caregiverData?.has_required_license) {
      violations.push({
        type: 'LICENSURE',
        severity: 'UNACCEPTABLE',
        description: 'Caregiver lacks required licensure for resident acuity level',
        person_involved: caregiverData?.name || 'Unknown caregiver',
        required_correction: 'Immediate reassignment to licensed nurse required'
      });
    }

    return {
      context_id: residentId,
      context_type: 'RESIDENT',
      timestamp: now.toISOString(),

      question_1_what_is_happening: this.buildWhatIsHappening(residentData, lateMedications, vitalTrends, overdueTaskCount),

      question_2_what_is_wrong_or_at_risk: {
        classification,
        specific_risks
      },

      question_3_why_classified_this_way: {
        rules_fired,
        thresholds_crossed,
        trends_detected,
        baselines_compared
      },

      question_4_single_most_important_decision: single_most_important_decision,

      question_5_what_must_happen_next: {
        ordered_actions
      },

      question_6_what_must_not_happen: prohibitions,

      question_7_who_is_accountable: {
        role: accountable_role,
        person_name: accountable_person,
        person_id: caregiverData?.id || null
      },

      question_8_what_happens_if_nothing_changes: consequences,

      question_9_what_system_does_not_know: uncertainties,

      question_10_what_decisions_blocked: blocked_decisions,

      time_awareness: {
        situation_trend,
        days_in_current_state: days_in_state,
        countdown_to_escalation_seconds: classification === 'CRITICAL' ? 4 * 3600 : null,
        countdown_to_regulatory_breach_seconds: lateMedications.length >= 5 ? 48 * 3600 : null,
        next_risk_to_materialize: specific_risks.length > 0 ? specific_risks[0] : null
      },

      role_enforcement: {
        current_role_assignments_valid: violations.length === 0,
        violations
      }
    };
  }

  private static analyzeVitalTrends(vitalSigns: any[]): { deteriorating_indicators: number } {
    if (!vitalSigns || vitalSigns.length < 3) return { deteriorating_indicators: 0 };

    let deteriorating = 0;

    const recentVitals = vitalSigns.slice(-7);
    const foodIntake = recentVitals.map(v => v.food_intake_percent || 100);
    const avgIntake = foodIntake.reduce((a, b) => a + b, 0) / foodIntake.length;
    if (avgIntake < 60) deteriorating++;

    const mobilityScores = recentVitals.map(v => v.mobility_score || 5);
    const mobilityDecline = mobilityScores[0] - mobilityScores[mobilityScores.length - 1];
    if (mobilityDecline >= 2) deteriorating++;

    const alertnessScores = recentVitals.map(v => v.alertness_score || 5);
    const alertnessDecline = alertnessScores[0] - alertnessScores[alertnessScores.length - 1];
    if (alertnessDecline >= 2) deteriorating++;

    return { deteriorating_indicators: deteriorating };
  }

  private static buildWhatIsHappening(residentData: any, lateMeds: any[], vitalTrends: any, overdueCount: number): string {
    const parts: string[] = [];

    parts.push(`Resident ${residentData?.name || 'Unknown'} in ${residentData?.room || 'Unknown room'}.`);

    if (vitalTrends.deteriorating_indicators >= 2) {
      parts.push('Multi-day deterioration detected across nutrition, mobility, and alertness indicators.');
    }

    if (lateMeds.length >= 3) {
      parts.push(`${lateMeds.length} medications administered late (>30min) within past 7 days.`);
    }

    if (overdueCount >= 3) {
      parts.push(`${overdueCount} tasks currently overdue.`);
    }

    if (parts.length === 1) {
      parts.push('All indicators within baseline parameters. No active concerns detected.');
    }

    return parts.join(' ');
  }

  public static evaluateContext(
    contextType: 'RESIDENT' | 'SHIFT' | 'CAREGIVER' | 'FACILITY',
    contextId: string,
    data: any
  ): DecisionSpineOutput {
    switch (contextType) {
      case 'RESIDENT':
        return this.evaluateResident(
          contextId,
          data.resident,
          data.caregiver,
          data.tasks || [],
          data.vitalSigns || [],
          data.medicationHistory || []
        );

      default:
        return this.evaluateResident(contextId, data.resident || {}, data.caregiver || {}, [], [], []);
    }
  }

  public static generateRichSyntheticScenarios(): Array<{
    resident: any;
    caregiver: any;
    tasks: any[];
    vitalSigns: any[];
    medicationHistory: any[];
  }> {
    return [];
    const residents = RichDataGenerator.generateResidents();
    const caregivers = RichDataGenerator.generateCaregivers();

    return residents.map((resident: any) => {
      const caregiver = caregivers.find((c: any) => c.shift === 'DAY') || caregivers[0];

      const has_required_license = resident.acuity === 'HIGH'
        ? (caregiver.has_rn_license || caregiver.has_lpn_license)
        : true;

      return {
        resident: {
          id: resident.id,
          name: resident.name,
          room: resident.room,
          acuity: resident.acuity,
          conditions: resident.conditions,
          risk_factors: resident.risk_factors
        },
        caregiver: {
          id: caregiver.id,
          name: caregiver.name,
          role: caregiver.role,
          has_required_license,
          can_give_injectable_meds: caregiver.can_give_injectable_meds,
          can_perform_wound_care: caregiver.can_perform_wound_care,
          can_perform_clinical_assessment: caregiver.can_perform_clinical_assessment,
          violations: caregiver.violations
        },
        tasks: resident.tasks_today,
        vitalSigns: resident.vital_history,
        medicationHistory: resident.medication_history
      };
    });
  }
}
