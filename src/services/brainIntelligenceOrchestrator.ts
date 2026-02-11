/**
 * Brain Intelligence Orchestrator
 *
 * Combines risk scoring, prioritization, and explainability into cohesive intelligence layer.
 *
 * Risk Scoring: Converts anomalies into risk predictions
 * Prioritization: Ranks issues by urgency × severity × confidence
 * Explainability: Generates "why flagged" narratives with evidence links
 */

import { supabase } from '../lib/supabase';

interface RiskScore {
  riskCategory: 'resident_health' | 'caregiver_performance';
  riskType: string;
  residentId?: string;
  caregiverId?: string;
  currentScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  contributingFactors: Array<{ factor: string; weight: number; description: string }>;
  anomalyIds: string[];
  trendDirection?: 'improving' | 'worsening' | 'stable' | 'unknown';
  suggestedInterventions: Array<{ action: string; priority: number; rationale: string }>;
}

interface PrioritizedIssue {
  issueType: string;
  issueCategory: 'resident_health' | 'caregiver_performance' | 'operational' | 'compliance';
  residentId?: string;
  caregiverId?: string;
  title: string;
  description: string;
  priorityScore: number;
  urgencyScore: number;
  severityScore: number;
  confidenceScore: number;
  riskScoreId?: string;
  anomalyIds: string[];
  suggestedActions: Array<{ action: string; priority: number }>;
}

interface ExplainabilityNarrative {
  subjectType: 'anomaly' | 'risk_score' | 'prioritized_issue';
  subjectId: string;
  narrativeType: 'detection_explanation' | 'risk_justification' | 'priority_reasoning';
  narrativeText: string;
  narrativeSummary: string;
  reasoningChain: Array<{ step: number; reasoning: string; confidence: number }>;
  evidenceLinks: Array<{ type: string; id: string; description: string }>;
  baselineReferences: Array<{ baselineType: string; value: number; deviation: number }>;
  confidenceExplanation: string;
}

export class BrainIntelligenceOrchestrator {
  /**
   * Calculate risk score from anomalies
   */
  async calculateRiskScore(
    agencyId: string,
    anomalies: Array<{ id: string; anomaly_type: string; severity: string; resident_id?: string; caregiver_id?: string; anomaly_data: any }>
  ): Promise<RiskScore | null> {
    if (anomalies.length === 0) return null;

    try {
      const isResidentRisk = anomalies[0].resident_id != null;
      const targetId = isResidentRisk ? anomalies[0].resident_id! : anomalies[0].caregiver_id!;

      // Group anomalies by type
      const anomalyGroups = this.groupAnomaliesByType(anomalies);
      const dominantType = Object.keys(anomalyGroups).reduce((a, b) =>
        anomalyGroups[a].length > anomalyGroups[b].length ? a : b
      );

      // Calculate base risk score (0-100)
      let riskScore = 0;
      const contributingFactors: Array<{ factor: string; weight: number; description: string }> = [];

      for (const [type, typeAnomalies] of Object.entries(anomalyGroups)) {
        const typeWeight = this.getAnomalyTypeWeight(type);
        const severityWeight = this.calculateSeverityWeight(typeAnomalies);
        const contribution = typeWeight * severityWeight * typeAnomalies.length;

        riskScore += contribution;
        contributingFactors.push({
          factor: type,
          weight: contribution,
          description: `${typeAnomalies.length} ${type} anomalies detected`,
        });
      }

      riskScore = Math.min(100, riskScore);

      // Determine risk level
      const riskLevel = this.classifyRiskLevel(riskScore);

      // Calculate confidence (more anomalies = higher confidence)
      const confidenceScore = Math.min(0.95, 0.5 + anomalies.length * 0.05);

      // Generate suggested interventions
      const suggestedInterventions = this.generateInterventions(dominantType, riskScore, isResidentRisk);

      // Determine trend direction (requires historical comparison)
      const trendDirection = await this.calculateRiskTrend(targetId, isResidentRisk, dominantType);

      const risk: RiskScore = {
        riskCategory: isResidentRisk ? 'resident_health' : 'caregiver_performance',
        riskType: dominantType,
        residentId: isResidentRisk ? targetId : undefined,
        caregiverId: !isResidentRisk ? targetId : undefined,
        currentScore: Math.round(riskScore),
        riskLevel,
        confidenceScore,
        contributingFactors,
        anomalyIds: anomalies.map((a) => a.id),
        trendDirection,
        suggestedInterventions,
      };

      // Store in database
      const { data, error } = await supabase
        .from('risk_scores')
        .insert({
          agency_id: agencyId,
          risk_category: risk.riskCategory,
          risk_type: risk.riskType,
          resident_id: risk.residentId,
          caregiver_id: risk.caregiverId,
          current_score: risk.currentScore,
          risk_level: risk.riskLevel,
          confidence_score: risk.confidenceScore,
          contributing_factors: risk.contributingFactors,
          anomaly_ids: risk.anomalyIds,
          trend_direction: risk.trendDirection,
          suggested_interventions: risk.suggestedInterventions,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error storing risk score:', error);
        return risk;
      }

      return { ...risk };
    } catch (error) {
      console.error('Error calculating risk score:', error);
      return null;
    }
  }

  /**
   * Create prioritized issue from risk score
   */
  async createPrioritizedIssue(
    agencyId: string,
    riskScore: RiskScore,
    riskScoreId?: string
  ): Promise<string | null> {
    try {
      // Calculate component scores
      const urgencyScore = this.calculateUrgency(riskScore);
      const severityScore = riskScore.currentScore;
      const confidenceScore = riskScore.confidenceScore * 100;

      // Priority = urgency × severity × confidence (normalized)
      const priorityScore = Math.round((urgencyScore * severityScore * confidenceScore) / 10000);

      // Generate title and description
      const { title, description } = this.generateIssueContent(riskScore);

      const issue: PrioritizedIssue = {
        issueType: riskScore.riskType,
        issueCategory: riskScore.riskCategory === 'resident_health' ? 'resident_health' : 'caregiver_performance',
        residentId: riskScore.residentId,
        caregiverId: riskScore.caregiverId,
        title,
        description,
        priorityScore,
        urgencyScore,
        severityScore,
        confidenceScore: riskScore.confidenceScore,
        riskScoreId,
        anomalyIds: riskScore.anomalyIds,
        suggestedActions: riskScore.suggestedInterventions.map((i) => ({
          action: i.action,
          priority: i.priority,
        })),
      };

      // Store in database
      const { data, error } = await supabase
        .from('prioritized_issues')
        .insert({
          agency_id: agencyId,
          issue_type: issue.issueType,
          issue_category: issue.issueCategory,
          resident_id: issue.residentId,
          caregiver_id: issue.caregiverId,
          title: issue.title,
          description: issue.description,
          priority_score: issue.priorityScore,
          urgency_score: issue.urgencyScore,
          severity_score: issue.severityScore,
          confidence_score: issue.confidenceScore,
          risk_score_id: issue.riskScoreId,
          anomaly_ids: issue.anomalyIds,
          suggested_actions: issue.suggestedActions,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error storing prioritized issue:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error creating prioritized issue:', error);
      return null;
    }
  }

  /**
   * Generate explainability narrative for an issue
   */
  async generateExplainability(
    agencyId: string,
    subjectType: 'anomaly' | 'risk_score' | 'prioritized_issue',
    subjectId: string,
    subjectData: any
  ): Promise<string | null> {
    try {
      let narrative: ExplainabilityNarrative;

      if (subjectType === 'prioritized_issue') {
        narrative = this.generatePriorityExplanation(subjectData);
      } else if (subjectType === 'risk_score') {
        narrative = this.generateRiskExplanation(subjectData);
      } else {
        narrative = this.generateAnomalyExplanation(subjectData);
      }

      // Store in database
      const { data, error } = await supabase
        .from('explainability_narratives')
        .insert({
          agency_id: agencyId,
          subject_type: subjectType,
          subject_id: subjectId,
          narrative_type: narrative.narrativeType,
          narrative_text: narrative.narrativeText,
          narrative_summary: narrative.narrativeSummary,
          reasoning_chain: narrative.reasoningChain,
          evidence_links: narrative.evidenceLinks,
          baseline_references: narrative.baselineReferences,
          confidence_explanation: narrative.confidenceExplanation,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error storing explainability narrative:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error generating explainability:', error);
      return null;
    }
  }

  /**
   * Full intelligence pipeline: anomalies → risks → issues → explanations
   */
  async runIntelligencePipeline(agencyId: string): Promise<{
    risksGenerated: number;
    issuesGenerated: number;
    explanationsGenerated: number;
  }> {
    let risksGenerated = 0;
    let issuesGenerated = 0;
    let explanationsGenerated = 0;

    try {
      // Get recent unprocessed anomalies
      const { data: anomalies } = await supabase
        .from('anomaly_detections')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('status', 'detected')
        .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!anomalies || anomalies.length === 0) {
        return { risksGenerated, issuesGenerated, explanationsGenerated };
      }

      // Group anomalies by resident/caregiver
      const groupedByResident = this.groupAnomaliesByTarget(anomalies, 'resident_id');
      const groupedByCaregiver = this.groupAnomaliesByTarget(anomalies, 'caregiver_id');

      // Process resident risks
      for (const [residentId, residentAnomalies] of Object.entries(groupedByResident)) {
        if (residentAnomalies.length >= 2) {
          const risk = await this.calculateRiskScore(agencyId, residentAnomalies);
          if (risk) {
            risksGenerated++;

            const issueId = await this.createPrioritizedIssue(agencyId, risk);
            if (issueId) {
              issuesGenerated++;

              const explanation = await this.generateExplainability(
                agencyId,
                'prioritized_issue',
                issueId,
                { risk, anomalies: residentAnomalies }
              );
              if (explanation) explanationsGenerated++;
            }
          }
        }
      }

      // Process caregiver risks
      for (const [caregiverId, caregiverAnomalies] of Object.entries(groupedByCaregiver)) {
        if (caregiverAnomalies.length >= 2) {
          const risk = await this.calculateRiskScore(agencyId, caregiverAnomalies);
          if (risk) {
            risksGenerated++;

            const issueId = await this.createPrioritizedIssue(agencyId, risk);
            if (issueId) {
              issuesGenerated++;

              const explanation = await this.generateExplainability(
                agencyId,
                'prioritized_issue',
                issueId,
                { risk, anomalies: caregiverAnomalies }
              );
              if (explanation) explanationsGenerated++;
            }
          }
        }
      }

      return { risksGenerated, issuesGenerated, explanationsGenerated };
    } catch (error) {
      console.error('Error running intelligence pipeline:', error);
      return { risksGenerated, issuesGenerated, explanationsGenerated };
    }
  }

  // Helper methods

  private groupAnomaliesByType(anomalies: any[]): Record<string, any[]> {
    return anomalies.reduce((groups, anomaly) => {
      const key = anomaly.anomaly_type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(anomaly);
      return groups;
    }, {});
  }

  private groupAnomaliesByTarget(anomalies: any[], targetField: string): Record<string, any[]> {
    return anomalies.reduce((groups, anomaly) => {
      const key = anomaly[targetField];
      if (!key) return groups;
      if (!groups[key]) groups[key] = [];
      groups[key].push(anomaly);
      return groups;
    }, {});
  }

  private getAnomalyTypeWeight(type: string): number {
    const weights: Record<string, number> = {
      vital_sign_deviation: 15,
      vital_sign_trend: 12,
      missed_care: 18,
      rushed_care_pattern: 10,
      medication_adherence: 16,
      caregiver_performance: 8,
      caregiver_workload: 10,
    };
    return weights[type] || 10;
  }

  private calculateSeverityWeight(anomalies: any[]): number {
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const avgSeverity =
      anomalies.reduce((sum, a) => sum + (severityScores[a.severity as keyof typeof severityScores] || 1), 0) / anomalies.length;
    return avgSeverity;
  }

  private classifyRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  private generateInterventions(riskType: string, riskScore: number, isResident: boolean): Array<{ action: string; priority: number; rationale: string }> {
    const interventions: Array<{ action: string; priority: number; rationale: string }> = [];

    if (isResident) {
      if (riskType.includes('vital_sign')) {
        interventions.push({
          action: 'Schedule nurse assessment within 4 hours',
          priority: 1,
          rationale: 'Vital sign deviations require clinical evaluation',
        });
        interventions.push({
          action: 'Increase vital sign monitoring frequency',
          priority: 2,
          rationale: 'Close monitoring can detect further deterioration',
        });
      }
      if (riskType.includes('medication')) {
        interventions.push({
          action: 'Review medication administration records with pharmacist',
          priority: 1,
          rationale: 'Medication adherence issues may indicate side effects or resident resistance',
        });
      }
      if (riskType.includes('missed_care')) {
        interventions.push({
          action: 'Reassign tasks to ensure coverage',
          priority: 1,
          rationale: 'Missed care must be completed to maintain quality standards',
        });
      }
    } else {
      if (riskType.includes('performance')) {
        interventions.push({
          action: 'Schedule check-in with caregiver',
          priority: 1,
          rationale: 'Performance degradation may indicate fatigue, stress, or training needs',
        });
      }
      if (riskType.includes('workload')) {
        interventions.push({
          action: 'Rebalance shift assignments',
          priority: 1,
          rationale: 'High workload increases error risk and burnout',
        });
      }
    }

    return interventions;
  }

  private async calculateRiskTrend(
    targetId: string,
    isResident: boolean,
    riskType: string
  ): Promise<'improving' | 'worsening' | 'stable' | 'unknown'> {
    try {
      const { data: historicalRisks } = await supabase
        .from('risk_scores')
        .select('current_score, computed_at')
        .eq(isResident ? 'resident_id' : 'caregiver_id', targetId)
        .eq('risk_type', riskType)
        .order('computed_at', { ascending: false })
        .limit(3);

      if (!historicalRisks || historicalRisks.length < 2) return 'unknown';

      const recentScore = historicalRisks[0].current_score;
      const previousScore = historicalRisks[1].current_score;

      const change = recentScore - previousScore;
      if (Math.abs(change) < 5) return 'stable';
      return change > 0 ? 'worsening' : 'improving';
    } catch {
      return 'unknown';
    }
  }

  private calculateUrgency(risk: RiskScore): number {
    let urgency = 50;

    // Critical risk = maximum urgency
    if (risk.riskLevel === 'critical') urgency = 100;
    else if (risk.riskLevel === 'high') urgency = 80;
    else if (risk.riskLevel === 'medium') urgency = 60;

    // Worsening trend increases urgency
    if (risk.trendDirection === 'worsening') urgency += 15;

    // Certain risk types are inherently more urgent
    if (risk.riskType.includes('vital_sign')) urgency += 10;
    if (risk.riskType.includes('medication')) urgency += 10;

    return Math.min(100, urgency);
  }

  private generateIssueContent(risk: RiskScore): { title: string; description: string } {
    const target = risk.residentId ? `Resident ${risk.residentId.slice(0, 8)}` : `Caregiver ${risk.caregiverId?.slice(0, 8)}`;
    const title = `${risk.riskLevel.toUpperCase()} Risk: ${risk.riskType.replace(/_/g, ' ')} - ${target}`;

    const factorsList = risk.contributingFactors
      .slice(0, 3)
      .map((f) => `• ${f.description}`)
      .join('\n');

    const description = `Brain Intelligence has detected ${risk.riskLevel} ${risk.riskType} risk (score: ${risk.currentScore}/100, confidence: ${(risk.confidenceScore * 100).toFixed(0)}%).\n\nContributing factors:\n${factorsList}\n\nTrend: ${risk.trendDirection || 'unknown'}`;

    return { title, description };
  }

  private generatePriorityExplanation(data: any): ExplainabilityNarrative {
    const { risk, anomalies } = data;

    const reasoningChain = [
      {
        step: 1,
        reasoning: `Detected ${anomalies.length} anomalies across ${new Set(anomalies.map((a: any) => a.anomaly_type)).size} categories`,
        confidence: 0.9,
      },
      {
        step: 2,
        reasoning: `Calculated risk score of ${risk.currentScore}/100 based on anomaly severity and type weights`,
        confidence: risk.confidenceScore,
      },
      {
        step: 3,
        reasoning: `Determined ${risk.riskLevel} priority based on urgency, severity, and confidence factors`,
        confidence: risk.confidenceScore,
      },
    ];

    const evidenceLinks = anomalies.map((a: any) => ({
      type: 'anomaly',
      id: a.id,
      description: `${a.anomaly_type}: ${a.severity}`,
    }));

    return {
      subjectType: 'prioritized_issue',
      subjectId: '',
      narrativeType: 'priority_reasoning',
      narrativeSummary: `Flagged due to ${anomalies.length} detected anomalies indicating ${risk.riskLevel} ${risk.riskType} risk`,
      narrativeText: `This issue was flagged because the Brain Intelligence Layer detected ${anomalies.length} anomalies over the past 24 hours. The anomalies span ${new Set(anomalies.map((a: any) => a.anomaly_type)).size} distinct categories. Based on the severity and type of these anomalies, a risk score of ${risk.currentScore}/100 was calculated with ${(risk.confidenceScore * 100).toFixed(0)}% confidence. The risk trend is ${risk.trendDirection || 'unknown'}. ${risk.suggestedInterventions.length} interventions are recommended.`,
      reasoningChain,
      evidenceLinks,
      baselineReferences: [],
      confidenceExplanation: `Confidence is ${(risk.confidenceScore * 100).toFixed(0)}% based on ${anomalies.length} supporting anomalies and ${risk.contributingFactors.length} contributing factors.`,
    };
  }

  private generateRiskExplanation(data: any): ExplainabilityNarrative {
    return {
      subjectType: 'risk_score',
      subjectId: '',
      narrativeType: 'risk_justification',
      narrativeSummary: `Risk score calculated from anomaly patterns`,
      narrativeText: `Risk assessment based on detected anomalies`,
      reasoningChain: [],
      evidenceLinks: [],
      baselineReferences: [],
      confidenceExplanation: 'Based on anomaly analysis',
    };
  }

  private generateAnomalyExplanation(data: any): ExplainabilityNarrative {
    return {
      subjectType: 'anomaly',
      subjectId: '',
      narrativeType: 'detection_explanation',
      narrativeSummary: `Anomaly detected through baseline deviation`,
      narrativeText: `Detected deviation from established baseline`,
      reasoningChain: [],
      evidenceLinks: [],
      baselineReferences: [],
      confidenceExplanation: 'Based on statistical analysis',
    };
  }
}

export const brainIntelligenceOrchestrator = new BrainIntelligenceOrchestrator();
