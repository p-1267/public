import { useState } from 'react';

interface Props {
  agencyId: string;
  currentSOPCount: number;
  onUpload: (category: string, fileName: string, fileUrl: string, fileSizeBytes: number, mimeType: string) => Promise<any>;
  onComplete: () => Promise<any>;
  onError: (error: string | null) => void;
}

const SOP_CATEGORIES = [
  {
    value: 'MEDICATION_HANDLING',
    label: 'Medication Handling SOP',
    sample: 'Missed doses must be logged within 30 minutes. Failure triggers an incident record and supervisor escalation.'
  },
  {
    value: 'EMERGENCY_ESCALATION',
    label: 'Emergency Escalation SOP',
    sample: 'If no supervisor acknowledgment occurs within 5 minutes, escalate to emergency services.'
  },
  {
    value: 'DOCUMENTATION_TIMING',
    label: 'Documentation Timing SOP',
    sample: 'All incidents must be documented within 60 minutes of occurrence.'
  },
  {
    value: 'CARE_DELIVERY',
    label: 'Care Delivery SOP',
    sample: 'Define procedures for daily care activities, assessment protocols, and quality standards.'
  },
  {
    value: 'FAMILY_COMMUNICATION',
    label: 'Family Communication SOP',
    sample: 'Define communication schedules, notification procedures, and family engagement protocols.'
  }
];

export function SOPIngestionForm({ currentSOPCount, onUpload, onComplete, onError }: Props) {
  const [uploads, setUploads] = useState<Record<string, { fileName: string; fileUrl: string }>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const handleFileInput = async (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      onError('Only PDF files are accepted');
      return;
    }

    try {
      setUploading(category);
      onError(null);

      const mockUrl = `https://storage.example.com/sops/${category}/${file.name}`;

      await onUpload(category, file.name, mockUrl, file.size, file.type);

      setUploads(prev => ({
        ...prev,
        [category]: { fileName: file.name, fileUrl: mockUrl }
      }));

      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to upload SOP document');
    } finally {
      setUploading(null);
    }
  };

  const handleComplete = async () => {
    onError(null);

    if (Object.keys(uploads).length < 5) {
      onError('All 5 SOP categories must be uploaded before proceeding');
      return;
    }

    try {
      setCompleting(true);
      await onComplete();
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to complete SOP ingestion');
    } finally {
      setCompleting(false);
    }
  };

  const uploadedCount = Object.keys(uploads).length;
  const progressPercentage = (uploadedCount / 5) * 100;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          State 3: SOP Ingestion & Policy Binding
        </h2>
        <p className="text-gray-600">
          Upload Standard Operating Procedures for all 5 required categories.
        </p>
      </div>

      <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-semibold text-red-900 mb-1">CRITICAL: EXECUTABLE POLICY INGESTION</h3>
            <p className="text-sm text-red-800 mb-2">
              SOP ingestion is NOT file storage. It is <strong>EXECUTABLE POLICY INGESTION</strong>.
            </p>
            <p className="text-sm text-red-800 mb-2">
              Uploaded SOPs will be:
            </p>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>Stored immutably</li>
              <li>OCR processed</li>
              <li>Semantically parsed</li>
              <li>Rule-extracted (time bounds, conditions, consequences)</li>
              <li>Bound to Brain enforcement layer</li>
            </ul>
            <p className="text-sm text-red-800 mt-2 font-semibold">
              ALL 5 CATEGORIES ARE MANDATORY
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Upload Progress: {uploadedCount} / 5 Categories
          </span>
          <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-6 mb-8">
        {SOP_CATEGORIES.map((category) => {
          const isUploaded = uploads[category.value];
          const isUploading = uploading === category.value;

          return (
            <div
              key={category.value}
              className={`border-2 rounded-lg p-4 transition ${
                isUploaded
                  ? 'border-green-500 bg-green-50'
                  : isUploading
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{category.label}</h3>
                    {isUploaded && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Uploaded
                      </span>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-3 mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">SAMPLE TEST VECTOR:</p>
                    <p className="text-sm text-gray-700 italic">&ldquo;{category.sample}&rdquo;</p>
                  </div>
                  {isUploaded && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">File:</span> {uploads[category.value].fileName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileInput(category.value, e)}
                    disabled={isUploading || isUploaded}
                    className="hidden"
                  />
                  <span
                    className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm cursor-pointer transition ${
                      isUploaded
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : isUploading
                        ? 'bg-blue-100 text-blue-700 cursor-wait'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </>
                    ) : isUploaded ? (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Uploaded
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload PDF
                      </>
                    )}
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-900 mb-2">SOP Processing Pipeline</h4>
        <p className="text-sm text-gray-600 mb-2">
          Each uploaded SOP will go through:
        </p>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Immutable storage</li>
          <li>OCR (Optical Character Recognition)</li>
          <li>Semantic parsing</li>
          <li>Rule extraction (time bounds, conditions, consequences)</li>
          <li>Binding to Brain enforcement layer</li>
        </ol>
        <p className="text-sm text-gray-600 mt-2">
          If SOP parsing fails, Phase 18 completion will be BLOCKED.
        </p>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <button
          onClick={handleComplete}
          disabled={completing || uploadedCount < 5}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {completing ? 'Processing...' : uploadedCount < 5 ? `Upload ${5 - uploadedCount} More SOPs` : 'Complete SOP Ingestion & Continue to State 4'}
        </button>
      </div>
    </div>
  );
}
