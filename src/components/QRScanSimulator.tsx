import React, { useState } from 'react';
import { useResidents } from '../hooks/useResidents';
import { useResidentInstantContext } from '../hooks/useResidentInstantContext';
import { ResidentInstantContext } from './ResidentInstantContext';

interface QRScanSimulatorProps {
  onClose: () => void;
}

export function QRScanSimulator({ onClose }: QRScanSimulatorProps) {
  const { residents, loading: residentsLoading } = useResidents();
  const { fetchInstantContext, loading, error, context } = useResidentInstantContext();
  const [selectedResidentId, setSelectedResidentId] = useState<string>('');
  const [showContext, setShowContext] = useState(false);
  const [mockAccessResult, setMockAccessResult] = useState<any>(null);

  const handleSimulateScan = async () => {
    if (!selectedResidentId) return;

    try {
      await fetchInstantContext(selectedResidentId);

      setMockAccessResult({
        access_log_id: 'showcase-mock',
        resident_id: selectedResidentId,
        duplicate_visit_detected: false,
        last_visit_by: null,
        last_visit_minutes_ago: null
      });

      setShowContext(true);
    } catch (err) {
      console.error('Failed to simulate scan:', err);
    }
  };

  const handleCloseContext = () => {
    setShowContext(false);
    onClose();
  };

  if (showContext && context && mockAccessResult) {
    return (
      <ResidentInstantContext
        context={context}
        accessResult={mockAccessResult}
        onClose={handleCloseContext}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">QR Scan Simulator</h2>
              <p className="text-sm text-gray-600 mt-1">Showcase Mode - Simulated Scan</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  In production, caregivers would scan a QR code at the resident's bedside or use proximity access.
                  Select a resident below to simulate instant context access.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Resident to Scan
            </label>
            <select
              value={selectedResidentId}
              onChange={(e) => setSelectedResidentId(e.target.value)}
              disabled={residentsLoading || loading}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Choose a resident --</option>
              {residents.map((resident) => (
                <option key={resident.id} value={resident.id}>
                  {resident.first_name} {resident.last_name} - Room {resident.room_number}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center mb-6">
            <div className="bg-gray-100 p-8 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                <rect x="7" y="7" width="3" height="3" fill="currentColor" />
                <rect x="14" y="7" width="3" height="3" fill="currentColor" />
                <rect x="7" y="14" width="3" height="3" fill="currentColor" />
                <rect x="14" y="14" width="3" height="3" fill="currentColor" />
              </svg>
              <p className="text-center text-sm text-gray-500 mt-2">QR Code Placeholder</p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSimulateScan}
              disabled={!selectedResidentId || loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Scanning...
                </span>
              ) : (
                'Simulate Scan'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
