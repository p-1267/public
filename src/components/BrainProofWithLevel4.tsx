import { Level4ActivePanel } from './Level4ActivePanel';
import { ShowcaseDecisionSpineView } from './ShowcaseDecisionSpineView';

export function BrainProofWithLevel4() {
  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-blue-900 text-white rounded-lg p-6 border-4 border-blue-500">
        <div className="text-4xl font-bold mb-2">🧠 BRAIN PROOF: SYSTEM INTELLIGENCE DEMONSTRATION</div>
        <div className="text-xl opacity-90">Complete evidence of automated judgment, reasoning, and decision-making</div>
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-400 p-6">
        <div className="text-2xl font-bold text-gray-900 mb-4">LEVEL 1-3: OPERATIONAL INTELLIGENCE (PRODUCTION ACTIVE)</div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-900">✓</div>
            <div className="font-bold text-green-900 mb-1">Level 1: Data Collection</div>
            <div className="text-sm text-green-800">Real-time vital signs, medication administration, task completion tracking with authorship</div>
          </div>
          <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-900">✓</div>
            <div className="font-bold text-green-900 mb-1">Level 2: Pattern Detection</div>
            <div className="text-sm text-green-800">Multi-day trend analysis, deterioration detection, medication timing patterns, workflow bottlenecks</div>
          </div>
          <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-900">✓</div>
            <div className="font-bold text-green-900 mb-1">Level 3: Judgment & Blocking</div>
            <div className="text-sm text-green-800">CRITICAL/UNSAFE/CONCERNING/ACCEPTABLE classification, role boundary enforcement, automated blocking</div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-400">
          <div className="font-bold text-blue-900 mb-2">PROOF OF AUTOMATION (Level 1-3):</div>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Decision Spine evaluates all residents continuously (see below)</li>
            <li>• Every task completion includes: performer name, role, department, credential status, supervisor acknowledgement</li>
            <li>• Role boundaries enforced: CNA cannot give insulin (BLOCKED), RN can (ALLOWED)</li>
            <li>• Pattern detection: Margaret Thompson 6-day deterioration, Maria Rodriguez medication timing pattern</li>
            <li>• System judges: "This is UNSAFE and must be corrected immediately" (not just "this is a concern")</li>
            <li>• Consequences stated: "Patient safety compromised, Regulatory violation, Facility liability"</li>
            <li>• Prohibitions explicit: "DO NOT allow injectable medication administration by this caregiver"</li>
            <li>• Accountability assigned: Supervisor Mark Davis must acknowledge within 24 hours</li>
          </ul>
        </div>
      </div>

      <Level4ActivePanel showToggle={false} />

      <div className="bg-white rounded-lg border-2 border-gray-400 p-6">
        <div className="text-2xl font-bold text-gray-900 mb-4">DECISION SPINE OUTPUT: EVERY RESIDENT EVALUATED</div>
        <ShowcaseDecisionSpineView />
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-400 p-6">
        <div className="text-2xl font-bold text-gray-900 mb-4">DEPARTMENT ATTRIBUTION: WHO DID WHAT</div>
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-400">
            <div className="font-bold text-blue-900 text-lg mb-2">🏥 NURSING DEPARTMENT</div>
            <div className="text-sm text-blue-800 mb-2">
              All clinical tasks (medications, vitals, assessments, wound care) attributed to specific person + role + credentials
            </div>
            <div className="bg-white rounded p-3 border border-blue-300 text-xs">
              <div className="font-bold text-blue-900">Example Entry:</div>
              <div className="text-blue-800 mt-1">
                Task: Morning insulin injection<br/>
                Performed by: Sarah Williams (RN, License RN-12345)<br/>
                Department: NURSING<br/>
                Credentials: VERIFIED<br/>
                Completed: 2026-01-06 08:05 (5 minutes late)<br/>
                Supervisor acknowledgement: ACKNOWLEDGED by Mark Davis (Nursing Supervisor) at 08:32
              </div>
            </div>
          </div>

          <div className="bg-teal-50 rounded-lg p-4 border-2 border-teal-400">
            <div className="font-bold text-teal-900 text-lg mb-2">🧹 HOUSEKEEPING DEPARTMENT</div>
            <div className="text-sm text-teal-800 mb-2">
              All room services (cleaning, linen change, maintenance issues) attributed with voice reporting capability
            </div>
            <div className="bg-white rounded p-3 border border-teal-300 text-xs">
              <div className="font-bold text-teal-900">Example Entry:</div>
              <div className="text-teal-800 mt-1">
                Task: Room 210 cleaning<br/>
                Performed by: Carlos Rodriguez (Housekeeper)<br/>
                Department: HOUSEKEEPING<br/>
                Voice report (Spanish, 94% confidence): "Habitación 210 limpiada, sábanas cambiadas, todo listo."<br/>
                Translation: "Room 210 cleaned, linens changed, everything ready."<br/>
                Supervisor acknowledgement: APPROVED by Maria Gonzalez (Housekeeping Supervisor) at 10:15
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-400">
            <div className="font-bold text-orange-900 text-lg mb-2">🍽️ KITCHEN DEPARTMENT</div>
            <div className="text-sm text-orange-800 mb-2">
              All meal prep, delivery, and intake logging attributed to specific person + department
            </div>
            <div className="bg-white rounded p-3 border border-orange-300 text-xs">
              <div className="font-bold text-orange-900">Example Entry:</div>
              <div className="text-orange-800 mt-1">
                Meal: BREAKFAST - 08:00<br/>
                Prepared by: Angela Chen (Cook, KITCHEN)<br/>
                Delivered by: Thomas Brown (Meal Delivery, KITCHEN)<br/>
                Resident: Margaret Thompson (Room 308)<br/>
                Intake: 40% (CONCERNING - declining)<br/>
                Intake logged by: Alice Johnson (CNA, NURSING) at 08:45<br/>
                Meal plan: Diabetic, 600 calories, 20g protein, Low sugar restrictions
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-100 rounded-lg border-4 border-green-600 p-6">
        <div className="text-2xl font-bold text-green-900 mb-4">✓ PROOF COMPLETE</div>
        <div className="space-y-2 text-green-800">
          <div>• System actively judges every situation (CRITICAL/UNSAFE/CONCERNING/ACCEPTABLE)</div>
          <div>• Role boundaries enforced with blocking (CNA cannot give insulin)</div>
          <div>• Department attribution on every entry (who, role, department, credentials)</div>
          <div>• Supervisor acknowledgement workflow active (pending/acknowledged/approved)</div>
          <div>• Reporting workflows operational (nursing, housekeeping, kitchen)</div>
          <div>• Level 4 predictive intelligence active in showcase (with boundaries)</div>
          <div>• Evidence links provided for all forecasts</div>
          <div>• System states what it cannot determine (no false certainty)</div>
        </div>
      </div>
    </div>
  );
}
