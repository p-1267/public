/**
 * Intelligence Signal Card
 *
 * Displays proactive intelligence signals detected by AI
 * Shows reasoning, boundaries, and required human decisions
 */

import React from 'react';
import { IntelligenceSignalDetection } from '../services/intelligenceOrchestrator';

interface IntelligenceSignalCardProps {
  signal: IntelligenceSignalDetection;
  onDismiss?: () => void;
  onTakeAction?: (action: string) => void;
}

export function IntelligenceSignalCard({
  signal,
  onDismiss,
  onTakeAction
}: IntelligenceSignalCardProps) {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          badge: 'bg-red-500',
          icon: '🚨'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-500',
          badge: 'bg-orange-500',
          icon: '⚠️'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          badge: 'bg-yellow-500',
          icon: '⚡'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-500',
          badge: 'bg-blue-500',
          icon: 'ℹ️'
        };
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'PROACTIVE':
        return { text: 'Proactive Detection', color: 'bg-green-100 text-green-800' };
      case 'REACTIVE':
        return { text: 'Reactive Alert', color: 'bg-blue-100 text-blue-800' };
      case 'PREDICTIVE':
        return { text: 'Predictive Analysis', color: 'bg-purple-100 text-purple-800' };
      default:
        return { text: 'Intelligence', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const config = getSeverityConfig(signal.severity);
  const categoryBadge = getCategoryBadge(signal.category);

  return (
    <div className={`${config.bg} border-l-4 ${config.border} rounded-lg shadow-md overflow-hidden`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-2xl">{config.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${config.badge}`}>
                  {signal.severity}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryBadge.color}`}>
                  {categoryBadge.text}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                  {Math.round(signal.reasoning.confidenceLevel * 100)}% Confidence
                </span>
              </div>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">What AI Detected:</h4>
            <p className="text-sm text-gray-800">{signal.reasoning.whatDetected}</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Why This Matters:</h4>
            <p className="text-sm text-gray-800">{signal.reasoning.whyMatters}</p>
          </div>

          {signal.reasoning.supportingEvidence.length > 0 && (
            <div className="bg-white bg-opacity-70 rounded p-4">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">Supporting Evidence:</h4>
              <ul className="space-y-1">
                {signal.reasoning.supportingEvidence.map((evidence, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{evidence}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white bg-opacity-70 rounded p-4">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Signal Sources:</h4>
            <div className="flex flex-wrap gap-2">
              {signal.source.dataPoints.map((point, idx) => (
                <span
                  key={`data-${idx}`}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                >
                  📊 {point}
                </span>
              ))}
              {signal.source.rules.map((rule, idx) => (
                <span
                  key={`rule-${idx}`}
                  className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
                >
                  📜 {rule}
                </span>
              ))}
              {signal.source.patterns.map((pattern, idx) => (
                <span
                  key={`pattern-${idx}`}
                  className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                >
                  🔍 {pattern}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-300 pt-4">
            <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <span className="text-lg">🚫</span>
              What AI Cannot Do
            </h4>
            <div className="space-y-3">
              <div className="bg-red-100 bg-opacity-50 rounded p-3">
                <p className="text-xs font-semibold text-red-900 uppercase tracking-wide mb-1.5">REASONS:</p>
                <ul className="space-y-1">
                  {signal.aiCannotAct.reasons.map((reason, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">▸</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-100 bg-opacity-50 rounded p-3">
                <p className="text-xs font-semibold text-red-900 uppercase tracking-wide mb-1.5">BOUNDARIES:</p>
                <ul className="space-y-1">
                  {signal.aiCannotAct.boundaries.map((boundary, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">▸</span>
                      <span>{boundary}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-300 pt-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="text-lg">👤</span>
              Your Decision Required
            </h4>
            <div className="bg-blue-100 bg-opacity-50 rounded p-4 mb-3">
              <p className="text-sm font-medium text-blue-900 mb-2">Decision:</p>
              <p className="text-sm text-gray-800">{signal.humanDecisionRequired.decision}</p>
            </div>

            {signal.humanDecisionRequired.options.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-900 mb-2">Options:</p>
                <div className="space-y-2">
                  {signal.humanDecisionRequired.options.map((option, idx) => (
                    <div key={idx} className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-sm text-gray-800 mb-2">{option}</p>
                      {signal.humanDecisionRequired.consequences[option] && (
                        <p className="text-xs text-gray-600">
                          <strong>Consequence:</strong> {signal.humanDecisionRequired.consequences[option]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {signal.suggestedActions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">AI Suggested Actions:</p>
                <div className="space-y-2">
                  {signal.suggestedActions.map((action, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded p-3 border-2 border-blue-200 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 flex-1">{action.action}</p>
                        {onTakeAction && (
                          <button
                            onClick={() => onTakeAction(action.action)}
                            className="ml-3 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-medium"
                          >
                            Take Action
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{action.reasoning}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-gray-500">Required:</span>
                        {action.requiresRole.length > 0 && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            Role: {action.requiresRole.join(', ')}
                          </span>
                        )}
                        {action.requiresPermission.length > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Permission: {action.requiresPermission.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-100 px-5 py-3 text-xs text-gray-600 border-t border-gray-200">
        <p>
          <strong>Signal ID:</strong> {signal.signalId} |{' '}
          <strong>Category:</strong> {signal.category} |{' '}
          <strong>Confidence:</strong> {Math.round(signal.reasoning.confidenceLevel * 100)}%
        </p>
        <p className="mt-1">
          <em>This signal is informational and suggestive only. You retain full decision authority.</em>
        </p>
      </div>
    </div>
  );
}
