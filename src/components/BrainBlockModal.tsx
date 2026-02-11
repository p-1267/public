/**
 * Brain Block Modal Component
 *
 * Purpose: Display Brain enforcement blocking messages
 *
 * CRITICAL: This modal shows when Phase 1 requirements are not met
 * - Shows blocking rule name
 * - Shows master-spec section
 * - Shows risk being prevented
 * - Shows remediation path
 * - Cannot be dismissed without action
 *
 * Section: Phase 1 - Brain Blocking UI
 */

import React from 'react';
import { BlockingRule } from '../types/brainBlocking';

interface BrainBlockModalProps {
  rule: BlockingRule;
  mode: 'production' | 'showcase';
  onClose: () => void;
  onNavigateToFix?: () => void;
}

export function BrainBlockModal({ rule, mode, onClose, onNavigateToFix }: BrainBlockModalProps) {
  const isShowcase = mode === 'showcase';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 ${isShowcase ? 'bg-blue-600' : 'bg-red-600'} text-white rounded-t-lg`}>
          <div className="flex items-start justify-between">
            <div>
              {isShowcase && (
                <div className="mb-2 text-blue-100 text-sm font-medium">
                  🎭 SHOWCASE MODE — NON-OPERATIONAL
                </div>
              )}
              <h2 className="text-2xl font-bold flex items-center gap-2">
                🚫 Action Blocked
              </h2>
              <p className="mt-1 text-sm opacity-90">
                This action cannot proceed due to Phase 1 enforcement
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Rule Name */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Blocking Rule
            </h3>
            <p className="text-lg font-medium text-gray-900">
              {rule.reason}
            </p>
          </div>

          {/* Master Spec Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Master Specification
            </h3>
            <p className="text-base text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded">
              {rule.masterSpecSection}
            </p>
          </div>

          {/* Risk Prevented */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Why This Is Blocked
            </h3>
            <p className="text-base text-gray-900 leading-relaxed">
              {rule.riskPrevented}
            </p>
          </div>

          {/* Remediation Path */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider mb-2">
              Required Action
            </h3>
            <p className="text-base text-blue-900 leading-relaxed">
              {rule.remediationPath}
            </p>
          </div>

          {/* Details (if present) */}
          {rule.blockingDetails && Object.keys(rule.blockingDetails).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Additional Details
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                  {JSON.stringify(rule.blockingDetails, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Showcase Mode Notice */}
          {isShowcase && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    You are in <strong>Showcase Mode</strong>. This is a demonstration of the Brain enforcement system.
                    In production, completing the required action would allow this workflow to proceed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
          {onNavigateToFix && !isShowcase && (
            <button
              onClick={onNavigateToFix}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Fix
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
