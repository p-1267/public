import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface EvidenceItem {
  id: string;
  evidence_type: string;
  quality_score: number;
  completeness: number;
  confidence: number;
  issues: string[];
  captured_at: string;
}

interface EvidenceQualityScoreProps {
  taskId: string;
  compact?: boolean;
}

export function EvidenceQualityScore({ taskId, compact = false }: EvidenceQualityScoreProps) {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvidenceQuality();
  }, [taskId]);

  async function loadEvidenceQuality() {
    setLoading(true);

    const { data } = await supabase
      .from('task_evidence')
      .select('*')
      .eq('task_id', taskId);

    if (data) {
      const scoredEvidence: EvidenceItem[] = data.map(item => {
        const quality = calculateQualityScore(item);
        return {
          id: item.id,
          evidence_type: item.evidence_type,
          quality_score: quality.score,
          completeness: quality.completeness,
          confidence: quality.confidence,
          issues: quality.issues,
          captured_at: item.captured_at
        };
      });

      setEvidence(scoredEvidence);

      if (scoredEvidence.length > 0) {
        const avgScore = scoredEvidence.reduce((sum, e) => sum + e.quality_score, 0) / scoredEvidence.length;
        setOverallScore(avgScore);
      }
    }

    setLoading(false);
  }

  function calculateQualityScore(item: any): {
    score: number;
    completeness: number;
    confidence: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 100;
    let completeness = 100;
    let confidence = 100;

    if (item.evidence_type === 'photo') {
      if (!item.file_url) {
        issues.push('Photo file missing');
        score -= 50;
        completeness -= 50;
      }
      if (item.file_size && item.file_size < 50000) {
        issues.push('Photo quality may be low (small file size)');
        score -= 20;
        confidence -= 20;
      }
    }

    if (item.evidence_type === 'voice') {
      if (!item.transcription || item.transcription.length < 10) {
        issues.push('Voice transcription too short');
        score -= 30;
        completeness -= 30;
      }
      if (item.translation_confidence && item.translation_confidence < 0.7) {
        issues.push(`Translation confidence low (${(item.translation_confidence * 100).toFixed(0)}%)`);
        score -= 20;
        confidence = item.translation_confidence * 100;
      }
    }

    if (item.evidence_type === 'metric') {
      if (!item.structured_data || !item.structured_data.value) {
        issues.push('Metric value missing');
        score -= 40;
        completeness -= 40;
      }
      if (!item.structured_data?.unit) {
        issues.push('Measurement unit not specified');
        score -= 10;
      }
    }

    if (item.evidence_type === 'note') {
      if (!item.note_text || item.note_text.length < 20) {
        issues.push('Note too brief for complete documentation');
        score -= 25;
        completeness -= 25;
      }
    }

    return {
      score: Math.max(0, score),
      completeness: Math.max(0, completeness),
      confidence: Math.max(0, confidence),
      issues
    };
  }

  function getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-700';
    if (score >= 70) return 'text-yellow-700';
    return 'text-red-700';
  }

  function getScoreBg(score: number): string {
    if (score >= 90) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Analyzing evidence quality...</div>;
  }

  if (evidence.length === 0) {
    return (
      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
        No evidence captured yet
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded border ${getScoreBg(overallScore)}`}>
        <span className={`text-lg font-bold ${getScoreColor(overallScore)}`}>
          {overallScore.toFixed(0)}%
        </span>
        <span className="text-sm text-gray-700">
          Quality Score
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Evidence Quality Analysis</h3>
            <p className="text-xs text-gray-500 mt-1">
              Automated quality scoring for captured evidence
            </p>
          </div>
          <div className={`px-3 py-2 rounded border ${getScoreBg(overallScore)}`}>
            <div className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600">Overall</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {evidence.map((item) => (
          <div key={item.id} className="px-4 py-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-gray-900 capitalize">
                  {item.evidence_type}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(item.captured_at).toLocaleString()}
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-sm font-bold ${getScoreColor(item.quality_score)}`}>
                {item.quality_score.toFixed(0)}%
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-2">
              <div>
                <span className="text-gray-500">Completeness:</span>
                <span className="ml-2 font-medium">{item.completeness.toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Confidence:</span>
                <span className="ml-2 font-medium">{item.confidence.toFixed(0)}%</span>
              </div>
            </div>

            {item.issues.length > 0 && (
              <div className="mt-2 space-y-1">
                {item.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-amber-700">
                    <span>⚠</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}

            {item.quality_score >= 90 && (
              <div className="mt-2 text-xs text-green-700">
                ✓ High quality - meets compliance standards
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Quality scores calculated based on completeness, confidence, and data standards
      </div>
    </div>
  );
}
