import { useState } from 'react';
import { useMedicationManagement, MedicationScheduleItem } from '../hooks/useMedicationManagement';
import { useShowcase } from '../contexts/ShowcaseContext';
import { SHOWCASE_MODE } from '../config/showcase';
import { BrainBlockModal } from './BrainBlockModal';

interface MedicationQuickTapProps {
  residentId: string;
}

export function MedicationQuickTap({ residentId }: MedicationQuickTapProps) {
  const { schedule, loading, error, logAdministration, checkInteractions } = useMedicationManagement(residentId);
  const { mockUserId } = useShowcase();
  const [processing, setProcessing] = useState<string | null>(null);
  const [showDualVerify, setShowDualVerify] = useState<string | null>(null);
  const [blockingRule, setBlockingRule] = useState<any | null>(null);
  const [interactionWarning, setInteractionWarning] = useState<any | null>(null);

  const handleTaken = async (item: MedicationScheduleItem) => {
    if (SHOWCASE_MODE) {
      setBlockingRule({
        section: 'Phase 2 — Medication Management',
        rule: 'Medication administration requires production mode',
        risk: 'In Showcase Mode, all write operations are blocked to prevent data corruption',
        remediation: 'Switch to production mode with valid credentials to execute medication actions'
      });
      return;
    }

    if (item.is_controlled) {
      setShowDualVerify(item.id);
      return;
    }

    await executeTaken(item);
  };

  const executeTaken = async (item: MedicationScheduleItem, verifiedBy?: string) => {
    setProcessing(item.id);
    setInteractionWarning(null);
    setBlockingRule(null);

    try {
      const interactions = await checkInteractions(item.medication_name);

      if (interactions.has_blocking_interaction) {
        setInteractionWarning({
          item,
          interactions,
          verifiedBy
        });
        return;
      }

      if (interactions.has_interactions) {
        const proceed = window.confirm(
          `Warning: This medication has known interactions.\n\n${
            interactions.interactions.map((i: any) =>
              `${i.interaction_type}: ${i.description}\n${i.recommendation}`
            ).join('\n\n')
          }\n\nProceed with administration?`
        );

        if (!proceed) {
          setProcessing(null);
          return;
        }
      }

      await logAdministration({
        medicationId: item.id,
        scheduleId: item.id,
        status: 'TAKEN',
        dosageGiven: item.dosage,
        routeUsed: item.route,
        verifiedBy
      });

      setShowDualVerify(null);
    } catch (err: any) {
      alert(`Failed to log medication: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleSkipped = async (item: MedicationScheduleItem) => {
    if (SHOWCASE_MODE) {
      setBlockingRule({
        section: 'Phase 2 — Medication Management',
        rule: 'Medication skip requires production mode',
        risk: 'In Showcase Mode, all write operations are blocked',
        remediation: 'Switch to production mode to skip medications'
      });
      return;
    }

    const reason = prompt('Reason for skipping this medication:');
    if (!reason) return;

    setProcessing(item.id);

    try {
      await logAdministration({
        medicationId: item.id,
        scheduleId: item.id,
        status: 'SKIPPED',
        dosageGiven: '',
        routeUsed: item.route,
        reasonForSkip: reason
      });
    } catch (err: any) {
      alert(`Failed to log skip: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleDualVerifyComplete = async (item: MedicationScheduleItem, verifierUserId: string) => {
    await executeTaken(item, verifierUserId);
  };

  if (loading) {
    return <div className="text-gray-600">Loading medication schedule...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  const pendingMeds = schedule.filter(s => s.status === 'PENDING');

  if (pendingMeds.length === 0) {
    return <div className="text-gray-600">No pending medications</div>;
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Pending Medications</h3>
        {pendingMeds.map(item => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-gray-900">{item.medication_name}</div>
                <div className="text-sm text-gray-600">{item.dosage} - {item.route}</div>
                <div className="text-xs text-gray-500">
                  Scheduled: {new Date(item.expected_at).toLocaleTimeString()}
                </div>
                {item.is_controlled && (
                  <div className="text-xs text-red-600 font-semibold mt-1">
                    ⚠️ CONTROLLED SUBSTANCE - Dual verification required
                  </div>
                )}
                {item.special_instructions && (
                  <div className="text-xs text-blue-600 mt-1">
                    📋 {item.special_instructions}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleTaken(item)}
                disabled={processing !== null}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {processing === item.id ? 'Processing...' : 'Taken'}
              </button>
              <button
                onClick={() => handleSkipped(item)}
                disabled={processing !== null}
                className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                Skip
              </button>
            </div>
          </div>
        ))}
      </div>

      {showDualVerify && (
        <DualVerificationModal
          medication={pendingMeds.find(m => m.id === showDualVerify)!}
          onVerify={(verifierId) => handleDualVerifyComplete(
            pendingMeds.find(m => m.id === showDualVerify)!,
            verifierId
          )}
          onCancel={() => setShowDualVerify(null)}
        />
      )}

      {interactionWarning && (
        <InteractionWarningModal
          warning={interactionWarning}
          onProceed={() => {
            executeTaken(interactionWarning.item, interactionWarning.verifiedBy);
            setInteractionWarning(null);
          }}
          onCancel={() => {
            setInteractionWarning(null);
            setProcessing(null);
          }}
        />
      )}

      {blockingRule && (
        <BrainBlockModal
          rule={blockingRule}
          mode={SHOWCASE_MODE ? 'showcase' : 'production'}
          onClose={() => setBlockingRule(null)}
        />
      )}
    </>
  );
}

function DualVerificationModal({ medication, onVerify, onCancel }: any) {
  const [verifierId, setVerifierId] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Controlled Substance Verification
        </h3>
        <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-900 font-semibold">
            ⚠️ This medication requires dual verification
          </p>
          <p className="text-xs text-red-800 mt-1">
            {medication.medication_name} ({medication.dosage})
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verifier User ID
          </label>
          <input
            type="text"
            value={verifierId}
            onChange={(e) => setVerifierId(e.target.value)}
            placeholder="Enter second staff member ID"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onVerify(verifierId)}
            disabled={!verifierId}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Verify & Administer
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function InteractionWarningModal({ warning, onProceed, onCancel }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-red-900 mb-4">
          🚨 BLOCKING Drug Interaction Detected
        </h3>
        <div className="space-y-3 mb-4">
          {warning.interactions.interactions.map((interaction: any, idx: number) => (
            <div key={idx} className="bg-red-50 border border-red-200 rounded p-3">
              <div className="font-semibold text-red-900">{interaction.interaction_type}</div>
              <div className="text-sm text-red-800 mt-1">{interaction.description}</div>
              <div className="text-sm text-red-700 mt-2">
                <strong>Recommendation:</strong> {interaction.recommendation}
              </div>
              <div className="text-xs text-red-600 mt-1">
                Conflicting with: {interaction.conflicting_medication}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-sm text-yellow-900">
            Administration is BLOCKED. Supervisor override may be required.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
          >
            Cancel Administration
          </button>
        </div>
      </div>
    </div>
  );
}
