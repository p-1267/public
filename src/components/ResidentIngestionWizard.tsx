import { useState } from 'react';
import { useResidentBaseline } from '../hooks/useResidentBaseline';

interface Props {
  residentId: string;
  residentName: string;
  onComplete: () => void;
}

type Step = 'baseline' | 'emergency' | 'physician' | 'medications' | 'care-plan' | 'consent' | 'seal';

const STEPS: { id: Step; label: string; }[] = [
  { id: 'baseline', label: 'Health Baseline' },
  { id: 'emergency', label: 'Emergency Contacts' },
  { id: 'physician', label: 'Primary Physician' },
  { id: 'medications', label: 'Medications' },
  { id: 'care-plan', label: 'Care Plan' },
  { id: 'consent', label: 'Consent' },
  { id: 'seal', label: 'Seal Baseline' }
];

export function ResidentIngestionWizard({ residentId, residentName, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>('baseline');
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());

  const {
    createBaseline,
    addEmergencyContact,
    addPhysician,
    addMedication,
    createCarePlanAnchors,
    setConsentConfig,
    validateCompleteness,
    sealBaseline
  } = useResidentBaseline();

  const [baselineData, setBaselineData] = useState({
    bpSystolic: '',
    bpDiastolic: '',
    heartRate: '',
    weightKg: '',
    mobilityStatus: 'INDEPENDENT',
    cognitiveStatus: 'NORMAL',
    fallRiskLevel: 'LOW',
    notes: ''
  });

  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [physicianData, setPhysicianData] = useState({
    name: '',
    specialty: 'PRIMARY_CARE',
    clinicName: '',
    phone: '',
    email: '',
    address: ''
  });

  const [medications, setMedications] = useState<any[]>([]);
  const [carePlanData, setCarePlanData] = useState({
    careFrequency: 'DAILY',
    mobilityNeeds: [] as string[],
    behavioralConsiderations: '',
    dietaryRestrictions: [] as string[],
    dietaryPreferences: [] as string[]
  });

  const [consentData, setConsentData] = useState({
    familyVisibilityLevel: 'SUMMARY',
    aiAssistanceLevel: 'MODERATE',
    dataSharingScope: 'AGENCY_ONLY',
    photoConsent: false,
    voiceRecordingConsent: false,
    biometricConsent: false,
    thirdPartySharingConsent: false,
    obtainedFrom: 'RESIDENT'
  });

  const handleBaselineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createBaseline(residentId, baselineData);
      setCompletedSteps(prev => new Set(prev).add('baseline'));
      setCurrentStep('emergency');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save baseline');
    }
  };

  const handleAddEmergencyContact = async (contact: any) => {
    setError(null);

    try {
      await addEmergencyContact(residentId, contact);
      setEmergencyContacts(prev => [...prev, contact]);

      if (emergencyContacts.length + 1 >= 2) {
        setCompletedSteps(prev => new Set(prev).add('emergency'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add emergency contact');
    }
  };

  const handlePhysicianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await addPhysician(residentId, { ...physicianData, isPrimary: true });
      setCompletedSteps(prev => new Set(prev).add('physician'));
      setCurrentStep('medications');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add physician');
    }
  };

  const handleAddMedication = async (medication: any) => {
    setError(null);

    try {
      await addMedication(residentId, medication);
      setMedications(prev => [...prev, medication]);
      setCompletedSteps(prev => new Set(prev).add('medications'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add medication');
    }
  };

  const handleCarePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createCarePlanAnchors(residentId, carePlanData);
      setCompletedSteps(prev => new Set(prev).add('care-plan'));
      setCurrentStep('consent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save care plan');
    }
  };

  const handleConsentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await setConsentConfig(residentId, consentData);
      setCompletedSteps(prev => new Set(prev).add('consent'));
      setCurrentStep('seal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save consent config');
    }
  };

  const handleSealBaseline = async () => {
    setError(null);

    try {
      const validation = await validateCompleteness(residentId);

      if (!validation.is_complete) {
        setError(`Baseline incomplete: ${validation.missing_items.join(', ')}`);
        return;
      }

      const confirmationText = "I confirm this baseline represents the resident's current state.";
      await sealBaseline(residentId, confirmationText);

      alert('Baseline sealed successfully! Care execution is now unlocked.');
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seal baseline');
    }
  };

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resident Baseline Ingestion</h1>
          <p className="text-gray-600 mb-4">{residentName}</p>

          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {STEPS.map((step, idx) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      completedSteps.has(step.id)
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {completedSteps.has(step.id) ? '✓' : idx + 1}
                  </div>
                  <span className="text-xs text-gray-600 mt-1 text-center max-w-[80px]">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {currentStep === 'baseline' && (
            <form onSubmit={handleBaselineSubmit} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Step 1: Health Baseline Snapshot</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Systolic BP *</label>
                  <input
                    type="number"
                    value={baselineData.bpSystolic}
                    onChange={(e) => setBaselineData({...baselineData, bpSystolic: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    required
                    min="50"
                    max="250"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Diastolic BP *</label>
                  <input
                    type="number"
                    value={baselineData.bpDiastolic}
                    onChange={(e) => setBaselineData({...baselineData, bpDiastolic: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    required
                    min="30"
                    max="150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Heart Rate (BPM) *</label>
                  <input
                    type="number"
                    value={baselineData.heartRate}
                    onChange={(e) => setBaselineData({...baselineData, heartRate: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    required
                    min="30"
                    max="200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={baselineData.weightKg}
                    onChange={(e) => setBaselineData({...baselineData, weightKg: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    required
                    min="20"
                    max="300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mobility Status *</label>
                  <select
                    value={baselineData.mobilityStatus}
                    onChange={(e) => setBaselineData({...baselineData, mobilityStatus: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="INDEPENDENT">Independent</option>
                    <option value="ASSISTED">Assisted</option>
                    <option value="WHEELCHAIR">Wheelchair</option>
                    <option value="BEDBOUND">Bedbound</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cognitive Status *</label>
                  <select
                    value={baselineData.cognitiveStatus}
                    onChange={(e) => setBaselineData({...baselineData, cognitiveStatus: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="MILD_IMPAIRMENT">Mild Impairment</option>
                    <option value="MODERATE_IMPAIRMENT">Moderate Impairment</option>
                    <option value="SEVERE_IMPAIRMENT">Severe Impairment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fall Risk Level *</label>
                  <select
                    value={baselineData.fallRiskLevel}
                    onChange={(e) => setBaselineData({...baselineData, fallRiskLevel: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="LOW">Low</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="HIGH">High</option>
                    <option value="VERY_HIGH">Very High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={baselineData.notes}
                  onChange={(e) => setBaselineData({...baselineData, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Save & Continue to Emergency Contacts
              </button>
            </form>
          )}

          {currentStep === 'emergency' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 2: Emergency Contacts (Min 2 Required)</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  Added: {emergencyContacts.length} / 2 minimum
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {emergencyContacts.map((contact, idx) => (
                  <div key={idx} className="border rounded p-3 bg-gray-50">
                    <p className="font-medium">{contact.name} - {contact.relationship}</p>
                    <p className="text-sm text-gray-600">{contact.phonePrimary}</p>
                  </div>
                ))}
              </div>

              {emergencyContacts.length < 2 && (
                <div className="border rounded p-4 mb-4">
                  <h3 className="font-semibold mb-3">Add Emergency Contact #{emergencyContacts.length + 1}</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleAddEmergencyContact({
                      name: formData.get('name'),
                      relationship: formData.get('relationship'),
                      phonePrimary: formData.get('phone'),
                      isPrimary: emergencyContacts.length === 0
                    });
                    e.currentTarget.reset();
                  }} className="space-y-3">
                    <input name="name" placeholder="Full Name" className="w-full px-3 py-2 border rounded" required />
                    <input name="relationship" placeholder="Relationship" className="w-full px-3 py-2 border rounded" required />
                    <input name="phone" type="tel" placeholder="Phone Number" className="w-full px-3 py-2 border rounded" required />
                    <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-semibold">
                      Add Contact
                    </button>
                  </form>
                </div>
              )}

              {emergencyContacts.length >= 2 && (
                <button
                  onClick={() => setCurrentStep('physician')}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
                >
                  Continue to Physician
                </button>
              )}
            </div>
          )}

          {currentStep === 'physician' && (
            <form onSubmit={handlePhysicianSubmit} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Step 3: Primary Physician</h2>
              <input
                placeholder="Physician Name *"
                value={physicianData.name}
                onChange={(e) => setPhysicianData({...physicianData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                required
              />
              <input
                placeholder="Clinic Name *"
                value={physicianData.clinicName}
                onChange={(e) => setPhysicianData({...physicianData, clinicName: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                required
              />
              <input
                type="tel"
                placeholder="Phone *"
                value={physicianData.phone}
                onChange={(e) => setPhysicianData({...physicianData, phone: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
              >
                Save & Continue to Medications
              </button>
            </form>
          )}

          {currentStep === 'medications' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 4: Current Medications</h2>
              <p className="text-sm text-gray-600 mb-4">
                Added {medications.length} medication(s). Add at least one or click Skip if none.
              </p>
              <button
                onClick={() => setCurrentStep('care-plan')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold mb-4"
              >
                {medications.length > 0 ? 'Continue to Care Plan' : 'Skip Medications'}
              </button>
            </div>
          )}

          {currentStep === 'care-plan' && (
            <form onSubmit={handleCarePlanSubmit} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Step 5: Care Plan Anchors</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Care Frequency *</label>
                <select
                  value={carePlanData.careFrequency}
                  onChange={(e) => setCarePlanData({...carePlanData, careFrequency: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="HOURLY">Hourly</option>
                  <option value="DAILY_MULTIPLE">Daily Multiple</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="AS_NEEDED">As Needed</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
              >
                Save & Continue to Consent
              </button>
            </form>
          )}

          {currentStep === 'consent' && (
            <form onSubmit={handleConsentSubmit} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Step 6: Consent & Visibility</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Family Visibility *</label>
                <select
                  value={consentData.familyVisibilityLevel}
                  onChange={(e) => setConsentData({...consentData, familyVisibilityLevel: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="FULL">Full</option>
                  <option value="SUMMARY">Summary</option>
                  <option value="EMERGENCY_ONLY">Emergency Only</option>
                  <option value="NONE">None</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">AI Assistance Level *</label>
                <select
                  value={consentData.aiAssistanceLevel}
                  onChange={(e) => setConsentData({...consentData, aiAssistanceLevel: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="FULL">Full</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="MINIMAL">Minimal</option>
                  <option value="NONE">None</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
              >
                Save & Continue to Final Confirmation
              </button>
            </form>
          )}

          {currentStep === 'seal' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 7: Final Confirmation & Seal</h2>
              <div className="bg-red-50 border-2 border-red-600 rounded p-6 mb-6">
                <h3 className="font-bold text-red-900 mb-2">⚠️ PERMANENT ACTION</h3>
                <p className="text-red-800 mb-2">
                  Sealing this baseline will:
                </p>
                <ul className="text-red-800 list-disc list-inside space-y-1 text-sm">
                  <li>LOCK the baseline (cannot be modified)</li>
                  <li>Set resident status to ACTIVE</li>
                  <li>UNLOCK care execution for this resident</li>
                  <li>Create immutable audit record</li>
                </ul>
              </div>
              <button
                onClick={handleSealBaseline}
                className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700"
              >
                🔒 Seal Baseline & Unlock Care Execution
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
