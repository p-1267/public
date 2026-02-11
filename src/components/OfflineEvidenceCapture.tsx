import { useState } from 'react';
import { offlineDB, OfflineEvidence } from '../services/offlineIndexedDB';
import { syncEngine } from '../services/offlineSyncEngine';

interface OfflineEvidenceCaptureProps {
  taskId: string;
  onCapture?: (evidence: OfflineEvidence) => void;
}

export function OfflineEvidenceCapture({ taskId, onCapture }: OfflineEvidenceCaptureProps) {
  const [evidenceType, setEvidenceType] = useState<'photo' | 'audio' | 'numeric' | 'text'>('numeric');
  const [numericValue, setNumericValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [photoData, setPhotoData] = useState<string>('');

  const handleCapture = async () => {
    setCapturing(true);
    try {
      let data: string;

      switch (evidenceType) {
        case 'numeric':
          data = numericValue;
          break;
        case 'text':
          data = textValue;
          break;
        case 'photo':
          data = photoData || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          break;
        case 'audio':
          data = 'audio:placeholder';
          break;
        default:
          data = '';
      }

      const evidence: OfflineEvidence = {
        id: `evidence_${taskId}_${Date.now()}`,
        taskId,
        type: evidenceType,
        data,
        timestamp: Date.now(),
        synced: false
      };

      await offlineDB.addEvidence(evidence);

      await syncEngine.queueEvidenceCapture(
        taskId,
        evidenceType,
        data,
        new Date().toISOString()
      );

      setNumericValue('');
      setTextValue('');
      setPhotoData('');

      if (onCapture) {
        onCapture(evidence);
      }
    } finally {
      setCapturing(false);
    }
  };

  const handlePhotoCapture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial';
      ctx.fillText('Simulated Photo', 80, 120);
      ctx.fillText(new Date().toLocaleTimeString(), 90, 150);
      setPhotoData(canvas.toDataURL());
    }
  };

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#0f172a',
        marginBottom: '12px'
      }}>
        Capture Evidence (Works Offline)
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: '#64748b',
          marginBottom: '6px'
        }}>
          Evidence Type
        </label>
        <select
          value={evidenceType}
          onChange={(e) => setEvidenceType(e.target.value as any)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#fff'
          }}
        >
          <option value="numeric">Numeric (BP, Temp, etc.)</option>
          <option value="text">Text Notes</option>
          <option value="photo">Photo</option>
          <option value="audio">Audio Note</option>
        </select>
      </div>

      {evidenceType === 'numeric' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748b',
            marginBottom: '6px'
          }}>
            Value
          </label>
          <input
            type="text"
            value={numericValue}
            onChange={(e) => setNumericValue(e.target.value)}
            placeholder="e.g., 120/80, 98.6, etc."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>
      )}

      {evidenceType === 'text' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748b',
            marginBottom: '6px'
          }}>
            Notes
          </label>
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Enter notes..."
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>
      )}

      {evidenceType === 'photo' && (
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={handlePhotoCapture}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            Simulate Photo Capture
          </button>
          {photoData && (
            <img
              src={photoData}
              alt="Captured"
              style={{
                width: '100%',
                borderRadius: '6px',
                border: '1px solid #cbd5e1'
              }}
            />
          )}
        </div>
      )}

      {evidenceType === 'audio' && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#92400e',
          marginBottom: '12px'
        }}>
          Audio recording simulated. In production, this would use Web Audio API.
        </div>
      )}

      <button
        onClick={handleCapture}
        disabled={capturing || (evidenceType === 'numeric' && !numericValue) || (evidenceType === 'text' && !textValue)}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: capturing ? '#94a3b8' : '#10b981',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: capturing ? 'not-allowed' : 'pointer'
        }}
      >
        {capturing ? 'Capturing...' : 'Capture Evidence'}
      </button>

      <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#64748b',
        textAlign: 'center'
      }}>
        Evidence saved locally • Will sync when online
      </div>
    </div>
  );
}
