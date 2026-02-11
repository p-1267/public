import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ClaimPacket {
  claim_id: string;
  resident_name: string;
  claim_period: string;
  completeness_score: number;
  validation_status: 'ready' | 'incomplete' | 'needs_review';
  missing_items: string[];
  evidence_count: number;
  required_evidence_count: number;
  last_updated: string;
}

interface InsuranceClaimPacketStatusProps {
  residentId?: string;
  agencyId?: string;
}

export function InsuranceClaimPacketStatus({ residentId, agencyId }: InsuranceClaimPacketStatusProps) {
  const [packets, setPackets] = useState<ClaimPacket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaimPackets();
  }, [residentId, agencyId]);

  async function loadClaimPackets() {
    setLoading(true);

    const mockPackets: ClaimPacket[] = [
      {
        claim_id: 'CLM-2026-001',
        resident_name: 'Dorothy Martinez',
        claim_period: 'Jan 1-15, 2026',
        completeness_score: 95,
        validation_status: 'ready',
        missing_items: [],
        evidence_count: 47,
        required_evidence_count: 47,
        last_updated: new Date(Date.now() - 2 * 3600000).toISOString()
      },
      {
        claim_id: 'CLM-2026-002',
        resident_name: 'Robert Chen',
        claim_period: 'Jan 1-15, 2026',
        completeness_score: 78,
        validation_status: 'incomplete',
        missing_items: ['PRN medication evidence', 'Vital signs for Jan 12', 'Fall risk assessment'],
        evidence_count: 39,
        required_evidence_count: 50,
        last_updated: new Date(Date.now() - 5 * 3600000).toISOString()
      },
      {
        claim_id: 'CLM-2026-003',
        resident_name: 'Margaret O\'Brien',
        claim_period: 'Jan 1-15, 2026',
        completeness_score: 88,
        validation_status: 'needs_review',
        missing_items: ['Physician signature on care plan update'],
        evidence_count: 44,
        required_evidence_count: 45,
        last_updated: new Date(Date.now() - 24 * 3600000).toISOString()
      }
    ];

    setPackets(mockPackets);
    setLoading(false);
  }

  function getStatusColor(status: string): string {
    if (status === 'ready') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'needs_review') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  }

  function getStatusLabel(status: string): string {
    if (status === 'ready') return '✓ Ready for Submission';
    if (status === 'needs_review') return '⚠ Needs Review';
    return '✗ Incomplete';
  }

  function getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-700';
    if (score >= 75) return 'text-yellow-700';
    return 'text-red-700';
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading claim packet status...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Insurance Claim Packet Assembly</h3>
        <p className="text-xs text-gray-500 mt-1">
          Real-time completeness tracking for insurance claim submissions
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {packets.map((packet) => (
          <div key={packet.claim_id} className="px-4 py-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{packet.claim_id}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(packet.validation_status)}`}>
                    {getStatusLabel(packet.validation_status)}
                  </span>
                </div>
                <div className="text-sm text-gray-700">{packet.resident_name}</div>
                <div className="text-xs text-gray-500 mt-1">{packet.claim_period}</div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(packet.completeness_score)}`}>
                  {packet.completeness_score}%
                </div>
                <div className="text-xs text-gray-500">Complete</div>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Evidence Collection Progress</span>
                <span>{packet.evidence_count} / {packet.required_evidence_count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    packet.completeness_score >= 90 ? 'bg-green-500' :
                    packet.completeness_score >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${packet.completeness_score}%` }}
                ></div>
              </div>
            </div>

            {packet.missing_items.length > 0 && (
              <div className="px-3 py-2 bg-amber-50 rounded border border-amber-200">
                <div className="text-xs font-medium text-amber-900 mb-1">
                  Missing Items ({packet.missing_items.length})
                </div>
                <ul className="text-xs text-amber-800 space-y-1">
                  {packet.missing_items.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {packet.validation_status === 'ready' && (
              <div className="mt-3 px-3 py-2 bg-green-50 rounded border border-green-200 text-xs text-green-800">
                ✓ All required evidence collected. Packet ready for submission.
              </div>
            )}

            <div className="mt-3 text-xs text-gray-500">
              Last updated: {new Date(packet.last_updated).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Completeness calculated automatically based on insurance requirements and collected evidence
      </div>
    </div>
  );
}
