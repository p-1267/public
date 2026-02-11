import React, { useState } from 'react';

export interface WhyData {
  summary: string;
  observed: string[];
  rulesFired: string[];
  dataUsed: string[];
  cannotConclude?: string[];
  humanAction?: string;
}

interface WhyExplanationProps {
  why: WhyData;
  inline?: boolean;
  defaultExpanded?: boolean;
}

export const WhyExplanation: React.FC<WhyExplanationProps> = ({
  why,
  inline = false,
  defaultExpanded = false
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (inline && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
      >
        <span>Why?</span>
      </button>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💡</span>
          <h3 className="font-semibold text-blue-900">Why this matters</h3>
        </div>
        {inline && (
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Close
          </button>
        )}
      </div>

      <div className="text-sm text-blue-900 space-y-3">
        <p className="font-medium">{why.summary}</p>

        {why.observed.length > 0 && (
          <div>
            <div className="font-semibold mb-1">What was observed:</div>
            <ul className="list-disc list-inside space-y-1 ml-2">
              {why.observed.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {why.rulesFired.length > 0 && (
          <div>
            <div className="font-semibold mb-1">Rules triggered:</div>
            <ul className="list-disc list-inside space-y-1 ml-2">
              {why.rulesFired.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {why.dataUsed.length > 0 && (
          <div>
            <div className="font-semibold mb-1">Data used:</div>
            <ul className="list-disc list-inside space-y-1 ml-2">
              {why.dataUsed.map((item, i) => (
                <li key={i} className="text-xs">{item}</li>
              ))}
            </ul>
          </div>
        )}

        {why.cannotConclude && why.cannotConclude.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
            <div className="font-semibold mb-1 text-yellow-900">System cannot conclude:</div>
            <ul className="list-disc list-inside space-y-1 ml-2 text-yellow-900">
              {why.cannotConclude.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {why.humanAction && (
          <div className="bg-white border border-blue-300 rounded p-2 mt-2">
            <div className="font-semibold mb-1">What you can do:</div>
            <p>{why.humanAction}</p>
          </div>
        )}
      </div>
    </div>
  );
};
