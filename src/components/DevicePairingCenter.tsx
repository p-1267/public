import { useState } from 'react';
import { useDeviceManagement } from '../hooks/useDeviceManagement';

interface Props {
  residentId: string;
  residentName: string;
  onComplete: () => void;
  onCancel: () => void;
}

type PairingStep = 'DISCOVERY' | 'IDENTITY_VERIFICATION' | 'RESIDENT_BINDING' | 'CAPABILITY_DETECTION' | 'TEST_SIGNAL' | 'REGISTRATION_CONFIRMATION';

const STEPS: { id: PairingStep; label: string; description: string; }[] = [
  { id: 'DISCOVERY', label: 'Discovery', description: 'Device discovered and basic info collected' },
  { id: 'IDENTITY_VERIFICATION', label: 'Identity Verification', description: 'Verifying device identity and authenticity' },
  { id: 'RESIDENT_BINDING', label: 'Resident Binding', description: 'Binding device to resident' },
  { id: 'CAPABILITY_DETECTION', label: 'Capability Detection', description: 'Detecting device capabilities' },
  { id: 'TEST_SIGNAL', label: 'Test Signal', description: 'Validating device test signal' },
  { id: 'REGISTRATION_CONFIRMATION', label: 'Registration', description: 'Finalizing device registration' }
];

const DEVICE_TYPES = [
  { value: 'BLE_HEALTH_SENSOR', label: 'BLE Health Sensor' },
  { value: 'WIFI_FALL_DETECTION', label: 'Wi-Fi Fall Detection' },
  { value: 'GPS_TRACKER', label: 'GPS Tracker' },
  { value: 'ENVIRONMENTAL_SENSOR', label: 'Environmental Sensor' },
  { value: 'EMERGENCY_BUTTON', label: 'Emergency Button' }
];

export function DevicePairingCenter({ residentId, residentName, onComplete, onCancel }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [pairingSessionId, setPairingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<PairingStep>>(new Set());

  const {
    startDevicePairing,
    completePairingStep,
    finalizeDevicePairing
  } = useDeviceManagement();

  const [deviceData, setDeviceData] = useState({
    deviceId: '',
    deviceType: 'BLE_HEALTH_SENSOR',
    deviceName: '',
    manufacturer: '',
    model: '',
    firmwareVersion: '',
    batteryLevel: 100
  });

  const handleStartPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await startDevicePairing({
        deviceId: deviceData.deviceId,
        residentId,
        deviceType: deviceData.deviceType,
        deviceName: deviceData.deviceName,
        manufacturer: deviceData.manufacturer,
        model: deviceData.model
      });

      setPairingSessionId(result.pairing_session_id);
      setCompletedSteps(new Set(['DISCOVERY']));
      setCurrentStepIndex(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start pairing');
    }
  };

  const handleCompleteStep = async (step: PairingStep) => {
    if (!pairingSessionId) return;

    setError(null);

    try {
      const stepData = {
        step_completed: step,
        timestamp: new Date().toISOString()
      };

      await completePairingStep({
        pairingSessionId,
        deviceId: deviceData.deviceId,
        residentId,
        step,
        stepData,
        success: true
      });

      setCompletedSteps(prev => new Set(prev).add(step));

      if (currentStepIndex < STEPS.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete step');
    }
  };

  const handleFinalizePairing = async () => {
    if (!pairingSessionId) return;

    setError(null);

    try {
      await finalizeDevicePairing({
        pairingSessionId,
        deviceId: deviceData.deviceId,
        residentId,
        deviceType: deviceData.deviceType,
        deviceName: deviceData.deviceName,
        manufacturer: deviceData.manufacturer,
        model: deviceData.model,
        firmwareVersion: deviceData.firmwareVersion,
        batteryLevel: deviceData.batteryLevel,
        capabilities: {}
      });

      alert('Device paired successfully!');
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize pairing');
    }
  };

  const currentStep = STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Device Pairing Center</h1>
              <p className="text-gray-600">{residentName}</p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>

          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-4">
              {STEPS.map((step, idx) => (
                <div key={step.id} className="flex flex-col items-center" style={{ width: '16%' }}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold ${
                      completedSteps.has(step.id)
                        ? 'bg-green-500 text-white'
                        : currentStepIndex === idx
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {completedSteps.has(step.id) ? '✓' : idx + 1}
                  </div>
                  <span className="text-xs text-gray-600 mt-2 text-center">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
              <p className="text-red-800 font-semibold">Error:</p>
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!pairingSessionId ? (
            <form onSubmit={handleStartPairing} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Step 1: Device Discovery</h2>
              <p className="text-sm text-gray-600 mb-4">
                Enter device information to begin pairing process.
              </p>

              <div>
                <label className="block text-sm font-medium mb-1">Device ID *</label>
                <input
                  type="text"
                  value={deviceData.deviceId}
                  onChange={(e) => setDeviceData({...deviceData, deviceId: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., DEV-12345-ABCDE"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Device Type *</label>
                <select
                  value={deviceData.deviceType}
                  onChange={(e) => setDeviceData({...deviceData, deviceType: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  {DEVICE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Device Name *</label>
                <input
                  type="text"
                  value={deviceData.deviceName}
                  onChange={(e) => setDeviceData({...deviceData, deviceName: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Living Room Sensor"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Manufacturer *</label>
                  <input
                    type="text"
                    value={deviceData.manufacturer}
                    onChange={(e) => setDeviceData({...deviceData, manufacturer: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Model *</label>
                  <input
                    type="text"
                    value={deviceData.model}
                    onChange={(e) => setDeviceData({...deviceData, model: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Firmware Version *</label>
                  <input
                    type="text"
                    value={deviceData.firmwareVersion}
                    onChange={(e) => setDeviceData({...deviceData, firmwareVersion: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., 1.0.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Battery Level (%) *</label>
                  <input
                    type="number"
                    value={deviceData.batteryLevel}
                    onChange={(e) => setDeviceData({...deviceData, batteryLevel: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Start Pairing
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h3 className="font-semibold text-blue-900 mb-2">{currentStep.label}</h3>
                <p className="text-sm text-blue-800">{currentStep.description}</p>
              </div>

              {currentStep.id === 'REGISTRATION_CONFIRMATION' ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <h3 className="font-semibold text-green-900 mb-2">✓ All Steps Completed</h3>
                    <p className="text-sm text-green-800">
                      Device is ready to be registered. Click the button below to finalize pairing.
                    </p>
                  </div>
                  <button
                    onClick={handleFinalizePairing}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
                  >
                    Finalize Pairing & Register Device
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleCompleteStep(currentStep.id)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Complete {currentStep.label}
                </button>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Device Information:</h4>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-gray-600">Device ID:</dt>
                  <dd className="font-medium">{deviceData.deviceId}</dd>
                  <dt className="text-gray-600">Type:</dt>
                  <dd className="font-medium">{DEVICE_TYPES.find(t => t.value === deviceData.deviceType)?.label}</dd>
                  <dt className="text-gray-600">Name:</dt>
                  <dd className="font-medium">{deviceData.deviceName}</dd>
                  <dt className="text-gray-600">Manufacturer:</dt>
                  <dd className="font-medium">{deviceData.manufacturer}</dd>
                  <dt className="text-gray-600">Model:</dt>
                  <dd className="font-medium">{deviceData.model}</dd>
                  <dt className="text-gray-600">Battery:</dt>
                  <dd className="font-medium">{deviceData.batteryLevel}%</dd>
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
