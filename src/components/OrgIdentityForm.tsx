import { useState } from 'react';
import { OrgIdentityData } from '../hooks/useOnboardingWizard';

interface Props {
  agencyId: string;
  onSave: (data: OrgIdentityData) => Promise<any>;
  onError: (error: string | null) => void;
}

const ORGANIZATION_TYPES = [
  { value: 'HOME_CARE_AGENCY', label: 'Home Care Agency' },
  { value: 'ASSISTED_LIVING', label: 'Assisted Living' },
  { value: 'GROUP_HOME', label: 'Group Home' },
  { value: 'FAMILY_CARE_UNIT', label: 'Family Care Unit' }
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Mandarin',
  'Cantonese',
  'Tagalog',
  'Vietnamese',
  'Korean',
  'Japanese',
  'Arabic',
  'Russian',
  'Portuguese',
  'Italian',
  'Polish',
  'Hindi',
  'Other'
];

export function OrgIdentityForm({ onSave, onError }: Props) {
  const [formData, setFormData] = useState<OrgIdentityData>({
    legalName: '',
    organizationType: 'HOME_CARE_AGENCY',
    country: '',
    stateProvince: '',
    primaryLanguage: 'English',
    secondaryLanguages: []
  });

  const [saving, setSaving] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);

    if (!formData.legalName.trim()) {
      onError('Legal organization name is required');
      return;
    }

    if (!formData.country.trim()) {
      onError('Country is required');
      return;
    }

    if (!formData.stateProvince.trim()) {
      onError('State/Province is required');
      return;
    }

    if (!acknowledged) {
      onError('You must acknowledge the permanent jurisdiction lock');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save organization identity');
    } finally {
      setSaving(false);
    }
  };

  const handleSecondaryLanguageToggle = (lang: string) => {
    setFormData(prev => ({
      ...prev,
      secondaryLanguages: prev.secondaryLanguages.includes(lang)
        ? prev.secondaryLanguages.filter(l => l !== lang)
        : [...prev.secondaryLanguages, lang]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          State 1: Organization Identity & Jurisdiction
        </h2>
        <p className="text-gray-600">
          Establish your organization's legal identity and operating jurisdiction.
        </p>
      </div>

      <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-semibold text-red-900 mb-1">PERMANENT JURISDICTION LOCK</h3>
            <p className="text-sm text-red-800 mb-2">
              Your jurisdiction selection is <strong>PERMANENTLY LOCKED</strong> after this step and CANNOT be edited after acceptance.
            </p>
            <p className="text-sm text-red-800 mb-2">
              Jurisdiction determines:
            </p>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>Data retention rules</li>
              <li>AI permission defaults</li>
              <li>Reporting obligations</li>
              <li>Emergency escalation legality</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Legal Organization Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.legalName}
            onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter exact legal name as registered"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Must match legal registration documents exactly
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Organization Type <span className="text-red-600">*</span>
          </label>
          <select
            value={formData.organizationType}
            onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {ORGANIZATION_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Country <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., United States"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              State / Province <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.stateProvince}
              onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., California"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Primary Operating Language <span className="text-red-600">*</span>
          </label>
          <select
            value={formData.primaryLanguage}
            onChange={(e) => setFormData({ ...formData, primaryLanguage: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {LANGUAGES.map(lang => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Secondary Languages (Optional)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {LANGUAGES.filter(lang => lang !== formData.primaryLanguage).map(lang => (
              <label key={lang} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.secondaryLanguages.includes(lang)}
                  onChange={() => handleSecondaryLanguageToggle(lang)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{lang}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Select all languages your organization operates in
          </p>
        </div>

        <div className="border-t pt-6">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              required
            />
            <span className="text-sm text-gray-700">
              <strong className="text-gray-900">I acknowledge</strong> that the jurisdiction information (country and state/province)
              is <strong className="text-red-600">permanently locked</strong> after this step and cannot be changed.
              This jurisdiction will determine data retention rules, AI permissions, reporting obligations, and emergency escalation protocols.
            </span>
          </label>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="submit"
            disabled={saving || !acknowledged}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving...' : 'Save & Continue to State 2'}
          </button>
        </div>
      </form>
    </div>
  );
}
