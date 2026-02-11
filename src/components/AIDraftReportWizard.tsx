import React, { useState } from 'react';
import { mockAI, AIContext } from '../services/mockAIEngine';

type ReportType = 'INCIDENT' | 'FALL' | 'MEDICATION_ERROR' | 'MISSED_CARE' | 'INSURANCE_SUMMARY';
type WizardStep = 'TYPE' | 'FACTS' | 'POLICY' | 'DRAFT' | 'FINALIZE';

interface AIDraftReportWizardProps {
  context: AIContext;
  onClose: () => void;
  onSave?: (draft: any) => void;
}

export const AIDraftReportWizard: React.FC<AIDraftReportWizardProps> = ({
  context,
  onClose,
  onSave,
}) => {
  const [step, setStep] = useState<WizardStep>('TYPE');
  const [reportType, setReportType] = useState<ReportType>('INCIDENT');
  const [facts, setFacts] = useState<Record<string, any>>({
    actor: context.role === 'CAREGIVER' ? 'Jordan Lee' : '',
    resident: context.residentName || '',
    timestamp: new Date().toLocaleString(),
    location: '',
    description: '',
    actions: '',
  });
  const [draft, setDraft] = useState('');
  const [finalText, setFinalText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerateDraft = async () => {
    setLoading(true);
    const response = await mockAI.generateResponse({
      mode: 'DRAFT',
      context,
      reportType,
      structuredFacts: facts,
    });
    setDraft(response.text);
    setFinalText(response.text);
    setLoading(false);
    setStep('DRAFT');
  };

  const handleAcceptDraft = () => {
    alert(
      `✓ Report Draft Accepted\n\n` +
      `Type: ${reportType}\n` +
      `Resident: ${facts.resident}\n` +
      `Reporter: ${facts.actor}\n\n` +
      `(Showcase Mode: Draft saved to in-memory store)\n\n` +
      `In production, this would save to a draft_reports table with:\n` +
      `- Draft status (not submitted)\n` +
      `- AI-generated flag\n` +
      `- Human review required\n` +
      `- No automatic submission`
    );
    if (onSave) {
      onSave({
        type: reportType,
        facts,
        draftText: finalText,
        status: 'DRAFT',
        generatedBy: 'AI',
        requiresReview: true,
      });
    }
    onClose();
  };

  const renderTypeSelection = () => (
    <div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
        Select Report Type
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { type: 'INCIDENT', label: 'General Incident Report', desc: 'Any incident requiring documentation' },
          { type: 'FALL', label: 'Fall Incident Report', desc: 'Resident fall with injury assessment' },
          { type: 'MEDICATION_ERROR', label: 'Medication Error Report', desc: 'Wrong dose, time, or medication' },
          { type: 'MISSED_CARE', label: 'Missed Care Report', desc: 'Delayed or missed scheduled care' },
          { type: 'INSURANCE_SUMMARY', label: 'Insurance Evidence Summary', desc: 'Comprehensive care summary for claims' },
        ].map(({ type, label, desc }) => (
          <button
            key={type}
            onClick={() => {
              setReportType(type as ReportType);
              setStep('FACTS');
            }}
            style={{
              padding: '16px',
              textAlign: 'left',
              backgroundColor: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.backgroundColor = '#eff6ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
              {label}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderFactsForm = () => (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
          Enter Structured Facts
        </h3>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Provide clear, objective facts. AI will draft the narrative.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
            Reporter (who is submitting this report):
          </label>
          <input
            type="text"
            value={facts.actor || ''}
            onChange={(e) => setFacts({ ...facts, actor: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
            Resident:
          </label>
          <input
            type="text"
            value={facts.resident || ''}
            onChange={(e) => setFacts({ ...facts, resident: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
            Date & Time:
          </label>
          <input
            type="text"
            value={facts.timestamp || ''}
            onChange={(e) => setFacts({ ...facts, timestamp: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
            Location / Shift:
          </label>
          <input
            type="text"
            value={facts.location || ''}
            onChange={(e) => setFacts({ ...facts, location: e.target.value })}
            placeholder="e.g., Resident Room 101, Morning Shift"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
            What Happened (bullet facts):
          </label>
          <textarea
            value={facts.description || ''}
            onChange={(e) => setFacts({ ...facts, description: e.target.value })}
            placeholder="• Resident slipped while transferring&#10;• Fall detection triggered at 2:15 PM&#10;• No visible injuries observed"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '10px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
            Actions Taken:
          </label>
          <textarea
            value={facts.actions || ''}
            onChange={(e) => setFacts({ ...facts, actions: e.target.value })}
            placeholder="• Assessed for injury&#10;• Vital signs checked&#10;• Physician notified&#10;• Family contacted"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '10px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {reportType === 'MEDICATION_ERROR' && (
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
              Medication & Error Type:
            </label>
            <input
              type="text"
              value={facts.medication || ''}
              onChange={(e) => setFacts({ ...facts, medication: e.target.value })}
              placeholder="e.g., Lisinopril 10mg instead of 5mg"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '13px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
              }}
            />
          </div>
        )}

        <div style={{
          padding: '12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#92400e',
        }}>
          <strong>Tip:</strong> Be specific and objective. AI will transform these facts into a professional narrative.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button
          onClick={() => setStep('TYPE')}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => setStep('POLICY')}
          disabled={!facts.resident || !facts.description}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#ffffff',
            backgroundColor: !facts.resident || !facts.description ? '#cbd5e1' : '#3b82f6',
            border: 'none',
            borderRadius: '8px',
            cursor: !facts.resident || !facts.description ? 'not-allowed' : 'pointer',
          }}
        >
          Next: Policy Context →
        </button>
      </div>
    </div>
  );

  const renderPolicyContext = () => (
    <div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
        Policy Context
      </h3>

      <div style={{
        padding: '16px',
        backgroundColor: '#eff6ff',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af', marginBottom: '8px' }}>
          🧠 Brain Requirements (Read-Only):
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#1e3a8a' }}>
          <li>Emergency protocol followed: Response within 5 minutes</li>
          <li>Documentation completed within 2 hours of incident</li>
          <li>Supervisor notification: Required for {reportType === 'MEDICATION_ERROR' ? 'medication errors' : 'all incidents'}</li>
          <li>Family notification: Required for {reportType === 'FALL' ? 'falls with injury' : reportType === 'MEDICATION_ERROR' ? 'medication errors' : 'significant incidents'}</li>
        </ul>
      </div>

      <div style={{
        padding: '16px',
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#065f46', marginBottom: '8px' }}>
          📋 Relevant Policy Excerpts:
        </div>
        <div style={{ fontSize: '12px', color: '#064e3b', lineHeight: '1.6' }}>
          <strong>Policy {reportType === 'FALL' ? 'F-101' : reportType === 'MEDICATION_ERROR' ? 'M-205' : 'I-100'}:</strong> All incidents must be documented with objective facts, actions taken, and outcomes. Reports must be submitted for supervisor review within the same shift. Family must be notified of significant events. Physician consultation required when indicated.
        </div>
      </div>

      <div style={{
        padding: '12px',
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#92400e',
      }}>
        <strong>Note:</strong> AI will incorporate policy requirements into the draft, but human review ensures full compliance.
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button
          onClick={() => setStep('FACTS')}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={handleGenerateDraft}
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#ffffff',
            backgroundColor: loading ? '#cbd5e1' : '#10b981',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Generating...' : '✨ Generate Draft'}
        </button>
      </div>
    </div>
  );

  const renderDraft = () => (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
          AI Generated Draft
        </h3>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Review and edit as needed. This is NOT final submission.
        </div>
      </div>

      <div style={{
        padding: '12px',
        backgroundColor: '#fef2f2',
        border: '1px solid #ef4444',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '11px',
        color: '#991b1b',
      }}>
        <strong>AI Draft (Not a medical/legal authority)</strong><br />
        Human review required. No automatic submission.
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
          Edit Draft:
        </label>
        <textarea
          value={finalText}
          onChange={(e) => setFinalText(e.target.value)}
          style={{
            width: '100%',
            minHeight: '300px',
            padding: '12px',
            fontSize: '13px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontFamily: 'monospace',
            lineHeight: '1.6',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setStep('POLICY')}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => setStep('FINALIZE')}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#ffffff',
            backgroundColor: '#3b82f6',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Review & Finalize →
        </button>
      </div>
    </div>
  );

  const renderFinalize = () => (
    <div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
        Review & Accept Draft
      </h3>

      <div style={{
        padding: '16px',
        backgroundColor: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        marginBottom: '16px',
        maxHeight: '300px',
        overflowY: 'auto',
      }}>
        <div style={{ fontSize: '13px', color: '#0f172a', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
          {finalText}
        </div>
      </div>

      <div style={{
        padding: '16px',
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '8px' }}>
          Before Accepting:
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#78350f' }}>
          <li>Verify all facts are accurate</li>
          <li>Ensure professional tone maintained</li>
          <li>Check policy requirements are met</li>
          <li>Confirm no PHI/confidential details exposed</li>
        </ul>
      </div>

      <div style={{
        padding: '12px',
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '12px',
        color: '#065f46',
      }}>
        ✓ This draft will be saved for human review and supervisor approval. It will NOT be automatically submitted.
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setStep('DRAFT')}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          ← Edit Draft
        </button>
        <button
          onClick={handleAcceptDraft}
          style={{
            flex: 2,
            padding: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#ffffff',
            backgroundColor: '#10b981',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          ✓ Accept Draft (Human Review Required)
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 1001,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
              AI Report Draft Wizard
            </h2>
            <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>
              Step {step === 'TYPE' ? '1' : step === 'FACTS' ? '2' : step === 'POLICY' ? '3' : step === 'DRAFT' ? '4' : '5'} of 5
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              fontSize: '18px',
              color: '#64748b',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          padding: '8px 12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#92400e',
          marginBottom: '20px',
        }}>
          SHOWCASE MODE — Mock AI Drafting
        </div>

        {step === 'TYPE' && renderTypeSelection()}
        {step === 'FACTS' && renderFactsForm()}
        {step === 'POLICY' && renderPolicyContext()}
        {step === 'DRAFT' && renderDraft()}
        {step === 'FINALIZE' && renderFinalize()}
      </div>
    </div>
  );
};
