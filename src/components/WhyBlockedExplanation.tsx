import React from 'react';

interface WhyBlockedExplanationProps {
  reason: string;
  requirement: string;
  enforcedBy: 'Brain' | 'Permission' | 'RLS' | 'Policy';
  suggestedAction?: string;
}

export function WhyBlockedExplanation({ reason, requirement, enforcedBy, suggestedAction }: WhyBlockedExplanationProps) {
  const getEnforcementColor = () => {
    switch (enforcedBy) {
      case 'Brain':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'Permission':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'RLS':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'Policy':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${getEnforcementColor()}`}>
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <div className="font-bold mb-1">Action Blocked</div>
          <div className="text-sm mb-2">{reason}</div>
          <div className="text-xs font-semibold mb-1">Required:</div>
          <div className="text-xs mb-2">{requirement}</div>
          {suggestedAction && (
            <>
              <div className="text-xs font-semibold mb-1">Next Step:</div>
              <div className="text-xs mb-2">{suggestedAction}</div>
            </>
          )}
          <div className="text-xs font-bold mt-3">
            Enforced by: {enforcedBy}
          </div>
        </div>
      </div>
    </div>
  );
}
