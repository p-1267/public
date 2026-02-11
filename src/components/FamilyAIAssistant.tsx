import React, { useState, useEffect } from 'react';
import { SHOWCASE_MODE } from '../config/showcase';

interface AIInsight {
  id: string;
  type: 'SUMMARY' | 'CHANGE_DETECTION' | 'HEALTH_INSIGHT' | 'PREDICTION' | 'RECOMMENDATION';
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  reasoning: string;
  timestamp: string;
  actions?: { label: string; handler: () => void }[];
}

export function FamilyAIAssistant({ residentId }: { residentId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'alerts' | 'summaries' | 'predictions'>('all');

  useEffect(() => {
    loadAIInsights();
  }, [residentId]);

  const loadAIInsights = () => {
    const mockInsights: AIInsight[] = [
      {
        id: '1',
        type: 'SUMMARY',
        severity: 'INFO',
        title: 'Daily Care Summary',
        description: 'Your loved one had a good day today. All scheduled care was completed, medications taken on time, and vital signs within normal range.',
        reasoning: 'AI analyzed 12 care events, 3 medication administrations, and 8 vital sign readings. Pattern analysis shows consistent routine adherence and stable health indicators.',
        timestamp: new Date().toISOString(),
        actions: [
          { label: 'View Details', handler: () => console.log('View details') }
        ]
      },
      {
        id: '2',
        type: 'CHANGE_DETECTION',
        severity: 'MEDIUM',
        title: 'Activity Level Change Detected',
        description: 'Your loved one\'s daily step count has decreased by 22% over the past 3 days.',
        reasoning: '7-day average: 3,200 steps/day. Last 3 days: 2,496 steps/day. AI detected this is outside normal variance (±15%). Possible causes: weather changes, minor illness, or reduced motivation.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        actions: [
          { label: 'Review Timeline', handler: () => console.log('Review') },
          { label: 'Message Caregiver', handler: () => console.log('Message') }
        ]
      },
      {
        id: '3',
        type: 'HEALTH_INSIGHT',
        severity: 'LOW',
        title: 'Sleep Quality Improving',
        description: 'Sleep duration has increased from 5.5 to 7 hours over the past week.',
        reasoning: 'AI trend analysis shows consistent improvement in sleep patterns. This correlates with recent medication timing adjustment and reduced evening stimulation.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        type: 'PREDICTION',
        severity: 'HIGH',
        title: 'Potential Medication Adherence Risk',
        description: 'AI predicts 68% chance of missed evening medication within next 48 hours.',
        reasoning: 'Pattern analysis: Evening medication missed 3 times in past 2 weeks, all on days with similar activity patterns. Current day matches those patterns: reduced mobility, late lunch, lower engagement scores.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        actions: [
          { label: 'Set Extra Reminder', handler: () => console.log('Reminder') },
          { label: 'Call to Check In', handler: () => console.log('Call') }
        ]
      },
      {
        id: '5',
        type: 'RECOMMENDATION',
        severity: 'INFO',
        title: 'Hydration Opportunity',
        description: 'AI suggests encouraging fluid intake during afternoon hours.',
        reasoning: 'Historical data shows better evening comfort when afternoon fluid intake ≥16oz. Current intake: 8oz. Temperature today: 78°F, higher than usual.',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ];

    setInsights(mockInsights);
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-900', badge: 'bg-red-600' };
      case 'HIGH':
        return { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-900', badge: 'bg-orange-600' };
      case 'MEDIUM':
        return { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-900', badge: 'bg-yellow-600' };
      case 'LOW':
        return { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-900', badge: 'bg-blue-600' };
      default:
        return { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-900', badge: 'bg-green-600' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUMMARY': return '📋';
      case 'CHANGE_DETECTION': return '📊';
      case 'HEALTH_INSIGHT': return '💡';
      case 'PREDICTION': return '🔮';
      case 'RECOMMENDATION': return '✨';
      default: return '🤖';
    }
  };

  const filteredInsights = insights.filter(insight => {
    if (activeTab === 'all') return true;
    if (activeTab === 'alerts') return insight.severity === 'HIGH' || insight.severity === 'CRITICAL';
    if (activeTab === 'summaries') return insight.type === 'SUMMARY';
    if (activeTab === 'predictions') return insight.type === 'PREDICTION';
    return true;
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-50 flex items-center justify-center group"
      >
        <span className="text-2xl">🤖</span>
        {insights.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {insights.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🤖</span>
                  <div>
                    <h2 className="text-2xl font-bold">AI Care Assistant</h2>
                    <p className="text-blue-100 text-sm">Intelligent insights about your loved one's care</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'all' ? 'bg-white text-blue-700' : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  All ({insights.length})
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'alerts' ? 'bg-white text-blue-700' : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  Alerts ({insights.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').length})
                </button>
                <button
                  onClick={() => setActiveTab('summaries')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'summaries' ? 'bg-white text-blue-700' : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  Summaries
                </button>
                <button
                  onClick={() => setActiveTab('predictions')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'predictions' ? 'bg-white text-blue-700' : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  Predictions
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {filteredInsights.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 block">✨</span>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No insights in this category</h3>
                  <p className="text-gray-600">Check back later or view other categories</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredInsights.map(insight => {
                    const styles = getSeverityStyles(insight.severity);
                    return (
                      <div
                        key={insight.id}
                        className={`border-2 rounded-xl p-6 ${styles.bg} ${styles.border} transition-all hover:shadow-md`}
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <span className="text-4xl">{getTypeIcon(insight.type)}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className={`text-lg font-bold ${styles.text}`}>{insight.title}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${styles.badge}`}>
                                {insight.severity}
                              </span>
                            </div>
                            <p className={`text-base ${styles.text} mb-3`}>{insight.description}</p>
                          </div>
                        </div>

                        <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-gray-700">🧠 AI Reasoning:</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{insight.reasoning}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            {new Date(insight.timestamp).toLocaleString()}
                          </span>
                          {insight.actions && insight.actions.length > 0 && (
                            <div className="flex gap-2">
                              {insight.actions.map((action, idx) => (
                                <button
                                  key={idx}
                                  onClick={action.handler}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-200">
              <p className="text-xs text-gray-600 text-center">
                AI insights are generated from care data, health metrics, and pattern analysis. Always consult healthcare providers for medical decisions.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
