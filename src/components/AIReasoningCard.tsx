import React from 'react';
import type { AISuggestionReasoning } from '../services/orchestrationLayer';

interface AIReasoningCardProps {
  reasoning: AISuggestionReasoning;
  onAccept?: () => void;
  onDismiss?: () => void;
}

export function AIReasoningCard({ reasoning, onAccept, onDismiss }: AIReasoningCardProps) {
  const confidenceColor = {
    HIGH: 'text-green-700 bg-green-100',
    MEDIUM: 'text-yellow-700 bg-yellow-100',
    LOW: 'text-gray-700 bg-gray-100'
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
          <h3 className="font-bold text-blue-900">AI Suggestion</h3>
        </div>
        <span className={`text-xs px-2 py-1 rounded font-bold ${confidenceColor[reasoning.confidence]}`}>
          {reasoning.confidence}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900 mb-2">{reasoning.suggestion}</p>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Reasoning
          </h4>
          <ul className="text-xs text-gray-700 space-y-1">
            {reasoning.reasoning.map((r, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded p-2">
          <h4 className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Why AI Cannot Act
          </h4>
          <ul className="text-xs text-amber-900 space-y-1">
            {reasoning.whyCannotAct.map((w, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded p-2">
          <h4 className="text-xs font-bold text-green-900 mb-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Action Required
          </h4>
          <ul className="text-xs text-green-900 space-y-1">
            {reasoning.actionRequired.map((a, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="font-bold text-green-600">{i + 1}.</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs text-gray-600">
          <span className="font-semibold">Sources:</span>
          <ul className="mt-1 space-y-0.5">
            {reasoning.sources.map((s, i) => (
              <li key={i} className="text-gray-600">• {s}</li>
            ))}
          </ul>
        </div>
      </div>

      {(onAccept || onDismiss) && (
        <div className="mt-4 flex gap-2">
          {onAccept && (
            <button
              onClick={onAccept}
              className="flex-1 bg-blue-600 text-white text-xs font-semibold py-2 px-3 rounded hover:bg-blue-700 transition-colors"
            >
              Accept Suggestion
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-1 bg-gray-200 text-gray-700 text-xs font-semibold py-2 px-3 rounded hover:bg-gray-300 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
