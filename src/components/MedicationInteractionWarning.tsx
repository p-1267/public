import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Interaction {
  medication1: string;
  medication2: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR';
  description: string;
  recommendation: string;
}

interface MedicationInteractionWarningProps {
  residentId: string;
  medications: any[];
}

export function MedicationInteractionWarning({ residentId, medications }: MedicationInteractionWarningProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkInteractions();
  }, [medications]);

  const checkInteractions = async () => {
    if (!medications || medications.length < 2) {
      setInteractions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('check_medication_interactions', {
        p_resident_id: residentId
      });

      if (error) {
        console.error('[MedicationInteractionWarning] Error:', error);
        setInteractions([]);
      } else {
        setInteractions(data || []);
      }
    } catch (err) {
      console.error('[MedicationInteractionWarning] Exception:', err);
      setInteractions([]);
    }

    setLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          text: 'text-red-900',
          badge: 'bg-red-600',
          badgeText: 'text-white'
        };
      case 'MAJOR':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-500',
          text: 'text-orange-900',
          badge: 'bg-orange-600',
          badgeText: 'text-white'
        };
      case 'MODERATE':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          text: 'text-yellow-900',
          badge: 'bg-yellow-600',
          badgeText: 'text-white'
        };
      case 'MINOR':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-400',
          text: 'text-blue-900',
          badge: 'bg-blue-500',
          badgeText: 'text-white'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-400',
          text: 'text-gray-900',
          badge: 'bg-gray-500',
          badgeText: 'text-white'
        };
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-300 rounded-xl">
        <div className="text-sm text-gray-600">Checking medication interactions...</div>
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="p-6 bg-green-50 border border-green-400 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="text-2xl">✓</div>
          <div>
            <div className="font-semibold text-green-900 text-lg">No Known Interactions</div>
            <div className="text-sm text-green-800">Current medications have been reviewed and no significant interactions were detected.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-xl">
        <div className="text-2xl">⚠️</div>
        <div>
          <div className="font-bold text-red-900 text-lg">
            {interactions.length} Medication Interaction{interactions.length > 1 ? 's' : ''} Detected
          </div>
          <div className="text-sm text-red-800">
            Review the following interactions with your healthcare provider.
          </div>
        </div>
      </div>

      {interactions.map((interaction, index) => {
        const colors = getSeverityColor(interaction.severity);
        return (
          <div
            key={index}
            className={`p-6 border-2 rounded-xl ${colors.bg} ${colors.border}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.badge} ${colors.badgeText}`}>
                    {interaction.severity}
                  </span>
                  <div className={`text-lg font-bold ${colors.text}`}>
                    {interaction.medication1} + {interaction.medication2}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Interaction:</div>
                <div className={`text-base ${colors.text}`}>{interaction.description}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Recommendation:</div>
                <div className={`text-base ${colors.text} font-medium`}>{interaction.recommendation}</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-300">
              <div className="text-xs text-gray-600">
                This information is for educational purposes. Always consult your healthcare provider about medication interactions.
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
