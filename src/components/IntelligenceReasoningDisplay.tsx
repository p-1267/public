/**
 * Intelligence Reasoning Display
 *
 * Shows AI's reasoning about user intent BEFORE action proceeds
 * Makes intelligence transparent and gives human control
 */

import React from 'react';
import { IntentReasoning } from '../services/intelligenceOrchestrator';

interface IntelligenceReasoningDisplayProps {
  reasoning: IntentReasoning;
  onProceed?: () => void;
  onCancel?: () => void;
}

export function IntelligenceReasoningDisplay({
  reasoning,
  onProceed,
  onCancel
}: IntelligenceReasoningDisplayProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'bg-red-100 border-red-500 text-red-900';
      case 'HIGH': return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'MEDIUM': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'LOW': return 'bg-blue-100 border-blue-500 text-blue-900';
      default: return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className={`border-l-4 rounded-lg p-6 ${getRiskColor(reasoning.riskLevel)}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">AI Intent Analysis</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskBadgeColor(reasoning.riskLevel)}`}>
                {reasoning.riskLevel} RISK
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                {Math.round(reasoning.confidence * 100)}% confidence
              </span>
            </div>
            <p className="text-sm leading-relaxed">{reasoning.intentDescription}</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-white bg-opacity-50 rounded border border-current">
          <p className="text-sm font-medium mb-1">Risk Assessment:</p>
          <p className="text-sm">{reasoning.riskReasoning}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">🔍</span>
            Prerequisites Check
          </h4>
          {reasoning.prerequisitesCheck.complete ? (
            <div className="flex items-center gap-2 text-green-700">
              <span className="text-xl">✓</span>
              <span className="text-sm font-medium">All prerequisites met</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <span className="text-xl">⚠</span>
                <span className="text-sm font-medium">Missing {reasoning.prerequisitesCheck.missing.length} item(s)</span>
              </div>
              <ul className="space-y-1 ml-6">
                {reasoning.prerequisitesCheck.missing.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-700 list-disc">
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-3 p-3 bg-gray-50 rounded text-xs space-y-1">
                {reasoning.prerequisitesCheck.reasoning.map((r, idx) => (
                  <p key={idx} className="text-gray-600">{r}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">🧠</span>
            Brain Enforcement
          </h4>
          {reasoning.brainAllowance.wouldAllow ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <span className="text-xl">✓</span>
                <span className="text-sm font-medium">Brain allows this action</span>
              </div>
              <p className="text-xs text-gray-600">{reasoning.brainAllowance.reason}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <span className="text-xl">🚫</span>
                <span className="text-sm font-medium">Brain blocks this action</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{reasoning.brainAllowance.reason}</p>
              {reasoning.brainAllowance.blockingRules && reasoning.brainAllowance.blockingRules.length > 0 && (
                <div className="mt-2 p-3 bg-red-50 rounded text-xs">
                  <p className="font-medium text-red-900 mb-1">Blocking Rules:</p>
                  <ul className="space-y-1">
                    {reasoning.brainAllowance.blockingRules.map((rule, idx) => (
                      <li key={idx} className="text-red-700">• {rule}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-lg">🤖</span>
          What AI Can and Cannot Do
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">AI CAN:</p>
            <ul className="space-y-1.5">
              {reasoning.aiCapability.whatAICanDo.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">AI CANNOT:</p>
            <ul className="space-y-1.5">
              {reasoning.aiCapability.whatAICannotDo.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 p-4 bg-white rounded border border-blue-200">
          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2">WHY AI CANNOT ACT:</p>
          <ul className="space-y-1">
            {reasoning.aiCapability.whyAICannotAct.map((reason, idx) => (
              <li key={idx} className="text-sm text-gray-700">• {reason}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-lg">👤</span>
          Your Decision Required
        </h4>
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">Human Decision:</p>
            <p className="text-sm text-gray-700">{reasoning.nextSteps.humanDecision}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">System Validation Path:</p>
            <ol className="space-y-1">
              {reasoning.nextSteps.systemValidation.map((step, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-500">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-900 mb-2">If You Proceed:</p>
            <p className="text-sm text-gray-700">{reasoning.nextSteps.executionPath}</p>
          </div>
        </div>
      </div>

      {(onProceed || onCancel) && (
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
          {onProceed && reasoning.brainAllowance.wouldAllow && (
            <button
              onClick={onProceed}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              I Understand - Proceed
              <span>→</span>
            </button>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
        <p>This analysis is provided to help you make informed decisions. You retain full control and accountability.</p>
      </div>
    </div>
  );
}
