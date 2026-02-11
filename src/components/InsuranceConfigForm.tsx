import { useState } from 'react';
import { InsuranceConfigData } from '../hooks/useOnboardingWizard';

interface Props {
  agencyId: string;
  onSave: (data: InsuranceConfigData) => Promise<any>;
  onError: (error: string | null) => void;
}

const POLICY_TYPES = [
  { value: 'general_liability', label: 'General Liability' },
  { value: 'professional_liability', label: 'Professional Liability' },
  { value: 'workers_compensation', label: 'Workers\' Compensation' }
];

const COVERAGE_SCOPES = [
  { value: 'per_caregiver', label: 'Per Caregiver' },
  { value: 'per_resident', label: 'Per Resident' },
  { value: 'facility_wide', label: 'Facility-Wide' }
];

export function InsuranceConfigForm({ onSave, onError }: Props) {
  const [formData, setFormData] = useState<InsuranceConfigData>({
    insuranceProvider: '',
    policyTypes: [],
    coverageScope: 'facility_wide',
    expirationDate: '',
    incidentTimeline: '',
    policyUrl: ''
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);

    if (!formData.insuranceProvider.trim()) {
      onError('Insurance provider is required');
      return;
    }

    if (formData.policyTypes.length === 0) {
      onError('At least one policy type must be selected');
      return;
    }

    if (!formData.expirationDate) {
      onError('Insurance expiration date is required');
      return;
    }

    if (!formData.incidentTimeline.trim()) {
      onError('Incident reporting timeline is required');
      return;
    }

    if (!formData.policyUrl.trim()) {
      onError('Insurance policy PDF URL is required');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save insurance configuration');
    } finally {
      setSaving(false);
    }
  };

  const handlePolicyTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      policyTypes: prev.policyTypes.includes(type)
        ? prev.policyTypes.filter(t => t !== type)
        : [...prev.policyTypes, type]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          State 2: Insurance & Liability Configuration
        </h2>
        <p className="text-gray-600">
          Configure your organization's insurance coverage and liability parameters.
        </p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Insurance Tracking</h3>
            <p className="text-sm text-blue-800">
              Insurance expiration is actively tracked. If insurance expires, the system will enter
              <strong> RESTRICTED_MODE</strong> and care execution will be BLOCKED.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Insurance Provider Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.insuranceProvider}
            onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Acme Insurance Company"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Policy Type(s) <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            {POLICY_TYPES.map(type => (
              <label key={type.value} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.policyTypes.includes(type.value)}
                  onChange={() => handlePolicyTypeToggle(type.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{type.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Select all applicable policy types
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Coverage Scope <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            {COVERAGE_SCOPES.map(scope => (
              <label key={scope.value} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="coverageScope"
                  value={scope.value}
                  checked={formData.coverageScope === scope.value}
                  onChange={(e) => setFormData({ ...formData, coverageScope: e.target.value })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{scope.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Insurance Expiration Date <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={formData.expirationDate}
              onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              System will alert before expiration
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Incident Reporting Timeline <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.incidentTimeline}
              onChange={(e) => setFormData({ ...formData, incidentTimeline: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Within 24 hours"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Insurance Policy Document URL <span className="text-red-600">*</span>
          </label>
          <input
            type="url"
            value={formData.policyUrl}
            onChange={(e) => setFormData({ ...formData, policyUrl: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com/policy.pdf"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Upload your insurance policy PDF and provide the URL. In production, this would use Supabase Storage.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Insurance Scope Impact</h4>
          <p className="text-sm text-gray-600 mb-2">
            Your insurance scope selection determines:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Incident logging strictness level</li>
            <li>Timestamp precision requirements</li>
            <li>Report generation behavior</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving...' : 'Save & Continue to State 3'}
          </button>
        </div>
      </form>
    </div>
  );
}
