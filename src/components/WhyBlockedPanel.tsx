import React from 'react';

interface WhyBlockedPanelProps {
  title: string;
  explanation: string;
  requirements: string[];
  alternatives: string[];
  onClose?: () => void;
}

export function WhyBlockedPanel({
  title,
  explanation,
  requirements,
  alternatives,
  onClose
}: WhyBlockedPanelProps) {
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <h3 className="font-bold text-red-900 text-lg">{title}</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <div className="bg-white bg-opacity-70 rounded p-3 mb-3">
        <p className="text-sm text-gray-800 leading-relaxed">{explanation}</p>
      </div>

      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-300 rounded p-3">
          <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Requirements Not Met
          </h4>
          <ul className="space-y-1">
            {requirements.map((req, i) => (
              <li key={i} className="text-xs text-amber-900 flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-300 rounded p-3">
          <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            What You Can Do
          </h4>
          <ul className="space-y-1">
            {alternatives.map((alt, i) => (
              <li key={i} className="text-xs text-blue-900 flex items-start gap-2">
                <span className="text-blue-600 font-bold">{i + 1}.</span>
                <span>{alt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
