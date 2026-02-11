/**
 * Explainability Card
 *
 * Reusable component for showing AI reasoning
 * Makes all intelligence transparent and auditable
 */

import React from 'react';
import { ExplainabilityCard as ExplainabilityCardType } from '../services/intelligenceOrchestrator';

interface ExplainabilityCardProps {
  card: ExplainabilityCardType;
  onClose?: () => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

export function ExplainabilityCard({
  card,
  onClose,
  actions
}: ExplainabilityCardProps) {
  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'BLOCKED':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          icon: '🚫',
          iconBg: 'bg-red-500'
        };
      case 'ALLOWED':
        return {
          bg: 'bg-green-50',
          border: 'border-green-500',
          icon: '✓',
          iconBg: 'bg-green-500'
        };
      case 'RISKY':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-500',
          icon: '⚠️',
          iconBg: 'bg-orange-500'
        };
      case 'SUGGESTION':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-500',
          icon: '💡',
          iconBg: 'bg-blue-500'
        };
      case 'BOUNDARY':
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-500',
          icon: '🤖',
          iconBg: 'bg-gray-500'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-500',
          icon: 'ℹ️',
          iconBg: 'bg-gray-500'
        };
    }
  };

  const getButtonClass = (variant?: string) => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700';
      default:
        return 'bg-gray-300 text-gray-800 hover:bg-gray-400';
    }
  };

  const config = getCategoryConfig(card.category);

  return (
    <div className={`${config.bg} border-2 ${config.border} rounded-xl shadow-xl overflow-hidden max-w-3xl`}>
      <div className="relative">
        <div className="flex items-center gap-4 p-6 bg-white bg-opacity-50">
          <div className={`${config.iconBg} w-14 h-14 rounded-full flex items-center justify-center text-2xl`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{card.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.iconBg} text-white`}>
                {card.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                {Math.round(card.confidence * 100)}% Confidence
              </span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Summary:</h4>
          <p className="text-sm text-gray-800 leading-relaxed">{card.reasoning.summary}</p>
        </div>

        {card.reasoning.details.length > 0 && (
          <div className="bg-white bg-opacity-70 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Details:</h4>
            <ul className="space-y-1.5">
              {card.reasoning.details.map((detail, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">▸</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {card.reasoning.sources.length > 0 && (
          <div className="bg-white bg-opacity-70 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Sources:</h4>
            <div className="flex flex-wrap gap-2">
              {card.reasoning.sources.map((source, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                >
                  📚 {source}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="border-t-2 border-gray-300 pt-5">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-lg">🤖</span>
            AI Knowledge Boundaries
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-green-100 bg-opacity-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-2">
                ✓ AI Knows:
              </p>
              <ul className="space-y-1">
                {card.boundaries.whatAIKnows.map((item, idx) => (
                  <li key={idx} className="text-xs text-gray-700">• {item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-100 bg-opacity-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-yellow-900 uppercase tracking-wide mb-2">
                ? AI Doesn't Know:
              </p>
              <ul className="space-y-1">
                {card.boundaries.whatAIDoesNotKnow.map((item, idx) => (
                  <li key={idx} className="text-xs text-gray-700">• {item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-red-100 bg-opacity-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-900 uppercase tracking-wide mb-2">
                ✗ AI Cannot Decide:
              </p>
              <ul className="space-y-1">
                {card.boundaries.whatAICannotDecide.map((item, idx) => (
                  <li key={idx} className="text-xs text-gray-700">• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-gray-300 pt-5">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-lg">👤</span>
            Your Control & Decision
          </h4>

          <div className="space-y-3">
            <div className="bg-blue-100 bg-opacity-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Required Decision:</p>
              <p className="text-sm text-gray-800">{card.humanControl.requiredDecision}</p>
            </div>

            {card.humanControl.alternatives.length > 0 && (
              <div className="bg-gray-100 bg-opacity-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Alternatives:</p>
                <ul className="space-y-1">
                  {card.humanControl.alternatives.map((alt, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-gray-500 mt-0.5">→</span>
                      <span>{alt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {actions && actions.length > 0 && (
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-300 flex items-center justify-end gap-3">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${getButtonClass(action.variant)}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div className="bg-gray-200 px-6 py-2 text-xs text-gray-600 text-center">
        <p>
          <strong>Explainability Guarantee:</strong> All AI reasoning is transparent, auditable, and requires human control
        </p>
      </div>
    </div>
  );
}
