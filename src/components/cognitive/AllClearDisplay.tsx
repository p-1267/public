import React from 'react';

interface AllClearDisplayProps {
  message?: string;
  nextAction?: string;
  nextActionTime?: string;
  details?: string[];
}

export const AllClearDisplay: React.FC<AllClearDisplayProps> = ({
  message = "All tasks completed",
  nextAction,
  nextActionTime,
  details = []
}) => {
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-8 text-center">
      <div className="text-6xl mb-4">✓</div>
      <h2 className="text-2xl font-bold text-green-900 mb-2">{message}</h2>
      <p className="text-green-700 mb-6">No active concerns at this time</p>

      {details.length > 0 && (
        <div className="bg-white/60 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-green-900 mb-2">Current Status:</h3>
          <ul className="space-y-1 text-sm text-green-800">
            {details.map((detail, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextAction && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-blue-900 mb-1">Next Scheduled Action</div>
          <div className="text-blue-800">{nextAction}</div>
          {nextActionTime && (
            <div className="text-sm text-blue-600 mt-1">{nextActionTime}</div>
          )}
        </div>
      )}
    </div>
  );
};
