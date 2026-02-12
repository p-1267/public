import { useEffect, useState } from 'react';
import { CognitiveJudgmentPanel } from '../CognitiveJudgmentPanel';
import { RoleBoundaryEnforcement } from '../RoleBoundaryEnforcement';
import { ResidentRiskJudgment } from '../ResidentRiskJudgment';

export function CognitiveAuthorityDemo() {
  const [judgments, setJudgments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      setJudgments([]);
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const determineSeverity = (judgment: string): 'CRITICAL' | 'UNSAFE' | 'CONCERNING' | 'ACCEPTABLE' => {
    const lower = judgment.toLowerCase();
    if (lower.includes('unacceptable') || lower.includes('must be blocked')) return 'CRITICAL';
    if (lower.includes('unsafe') || lower.includes('immediate')) return 'UNSAFE';
    if (lower.includes('requires')) return 'CONCERNING';
    return 'ACCEPTABLE';
  };

  const mockViolations = [
    {
      id: 'v1',
      caregiver_name: 'Robert Chen',
      caregiver_role: 'CARE_AIDE',
      attempted_action: 'Administer insulin injection',
      required_role: 'LICENSED_NURSE',
      violation_type: 'LICENSURE' as const,
      risk_level: 'CRITICAL' as const,
      timestamp: new Date().toISOString(),
      was_blocked: false,
      system_judgment: 'CRITICAL: Care aide lacks licensure for injectable medications. This action is UNACCEPTABLE and creates immediate legal and safety risk. Must be blocked.'
    },
    {
      id: 'v2',
      caregiver_name: 'Jennifer Martinez',
      caregiver_role: 'AGENCY_FLOAT',
      attempted_action: 'Complex wound dressing',
      required_role: 'LICENSED_NURSE',
      violation_type: 'LICENSURE' as const,
      risk_level: 'HIGH' as const,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      was_blocked: true,
      system_judgment: 'Agency credentials not verified before task assignment. System blocked action pending verification.'
    }
  ];

  const mockResidents = [
    {
      resident_id: 'r1',
      resident_name: 'Margaret Thompson',
      room: '308',
      current_state: 'CRITICAL' as const,
      system_judgment: 'CRITICAL: Resident showing multi-day deterioration across nutrition, mobility, and alertness. Early infection or metabolic change likely. Requires immediate physician evaluation.',
      what_is_wrong: [
        'Food intake decreased 40% over 4 days',
        'Mobility decreased from independent to requires assistance',
        'Increased confusion during evening hours',
        'Vital signs within normal limits but trending toward upper bounds'
      ],
      what_is_at_risk: [
        'Undiagnosed infection progressing without treatment',
        'Fall risk due to decreased mobility and confusion',
        'Malnutrition if intake continues to decline',
        'Rapid decompensation if underlying cause not identified'
      ],
      trend: 'WORSENING' as const,
      days_in_current_state: 4,
      next_action_required: 'IMMEDIATE: Contact physician for evaluation within 4 hours. Increase monitoring to q2h. Document all observations for clinical review.',
      action_deadline: new Date(Date.now() + 4 * 3600000).toISOString(),
      consequences_if_not_addressed: [
        'Resident condition may rapidly decline',
        'Potential hospitalization for condition that could be managed in facility',
        'Family trust compromised if deterioration not caught early',
        'Regulatory citation if decline deemed preventable'
      ],
      assigned_caregiver: 'Sarah Williams, RN',
      last_assessment: new Date(Date.now() - 8 * 3600000).toISOString()
    },
    {
      resident_id: 'r2',
      resident_name: 'David Martinez',
      room: '204',
      current_state: 'UNSAFE' as const,
      system_judgment: 'UNSAFE: Housekeeping schedule conflicts with critical medication window. Clinical task must take priority.',
      what_is_wrong: [
        'Post-meal insulin window (12:15-12:45) conflicts with scheduled room cleaning (12:30)',
        'Resident becomes agitated with multiple people in room',
        'Medication timing is time-critical for diabetic control'
      ],
      what_is_at_risk: [
        'Medication delayed or skipped due to scheduling conflict',
        'Diabetic control compromised',
        'Resident safety during agitation'
      ],
      trend: 'STABLE' as const,
      days_in_current_state: 1,
      next_action_required: 'Reschedule housekeeping to 2:00 PM. Update scheduling algorithm to detect clinical conflicts.',
      action_deadline: new Date(Date.now() + 30 * 60000).toISOString(),
      consequences_if_not_addressed: [
        'Repeated medication delays',
        'Resident agitation and potential behavioral incident',
        'Inefficient workflow for both clinical and housekeeping staff'
      ],
      assigned_caregiver: 'Alice Johnson, CNA',
      last_assessment: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      resident_id: 'r3',
      resident_name: 'John Smith',
      room: '108',
      current_state: 'ACCEPTABLE' as const,
      system_judgment: 'ACCEPTABLE: All current operations within safe parameters. No intervention required.',
      what_is_wrong: [],
      what_is_at_risk: [],
      trend: 'STABLE' as const,
      days_in_current_state: 7,
      next_action_required: 'Continue routine monitoring',
      action_deadline: new Date(Date.now() + 24 * 3600000).toISOString(),
      consequences_if_not_addressed: [],
      assigned_caregiver: 'Michael Torres, CNA',
      last_assessment: new Date(Date.now() - 4 * 3600000).toISOString()
    }
  ];

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-2xl font-bold mb-4">Generating Cognitive Authority Analysis...</div>
        <div className="text-gray-600">Creating rich scenarios with conflicts, violations, and risks</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-6">
        <div className="text-2xl font-bold text-blue-900 mb-3">COGNITIVE CARE AUTHORITY SYSTEM</div>
        <div className="text-base text-blue-800 mb-4">
          This system explicitly THINKS, JUDGES, and STATES CONCLUSIONS about operational reality.
          It never executes actions autonomously. All judgments require human confirmation.
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded p-3">
            <div className="font-bold text-blue-900 mb-1">✓ WHAT SYSTEM DOES</div>
            <ul className="text-blue-800 space-y-1">
              <li>• Observes continuously</li>
              <li>• Judges explicitly</li>
              <li>• States conclusions</li>
              <li>• Warns of risks</li>
              <li>• Guides decisions</li>
            </ul>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-bold text-red-900 mb-1">✗ WHAT SYSTEM NEVER DOES</div>
            <ul className="text-red-800 space-y-1">
              <li>• Execute actions</li>
              <li>• Override humans</li>
              <li>• Prescribe treatment</li>
              <li>• Make final decisions</li>
              <li>• Act autonomously</li>
            </ul>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-bold text-gray-900 mb-1">🧠 SYSTEM LIMITATIONS</div>
            <ul className="text-gray-800 space-y-1">
              <li>• Cannot diagnose medical conditions</li>
              <li>• Cannot determine root causes</li>
              <li>• Cannot predict all outcomes</li>
              <li>• Explicitly states what it cannot determine</li>
            </ul>
          </div>
        </div>
      </div>

      <ResidentRiskJudgment residents={mockResidents} />

      <CognitiveJudgmentPanel judgments={judgments} />

      <RoleBoundaryEnforcement violations={mockViolations} />

      <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
        <div className="text-lg font-bold text-gray-900 mb-3">SYSTEM OPERATIONAL PRINCIPLES</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-bold text-gray-700 mb-2">Judgment Language (Required)</div>
            <ul className="text-gray-600 space-y-1">
              <li>• "This is CRITICAL"</li>
              <li>• "This is UNSAFE"</li>
              <li>• "This is ACCEPTABLE"</li>
              <li>• "This is WORSENING"</li>
              <li>• "This must NOT be done"</li>
              <li>• "This requires immediate action"</li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-gray-700 mb-2">What System Always Answers</div>
            <ul className="text-gray-600 space-y-1">
              <li>• What is happening right now</li>
              <li>• What is wrong</li>
              <li>• What is at risk</li>
              <li>• Who is affected</li>
              <li>• What should happen next</li>
              <li>• What must NOT be done</li>
              <li>• What system cannot determine</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
