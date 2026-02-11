/**
 * Showcase Mode Banner Component
 *
 * Purpose: Display non-dismissible banner when in Showcase Mode
 *
 * CRITICAL: This banner MUST be visible on ALL pages in Showcase Mode
 * - Shows that the system is non-operational
 * - Cannot be dismissed
 * - All actions show Brain blocking
 *
 * Phase 1: Showcase Mode Enforcement
 */

import React from 'react';

export function ShowcaseModeBanner() {
  return (
    <div className="bg-blue-600 text-white px-4 py-2 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span className="font-semibold text-sm">🎭 SHOWCASE MODE</span>
          </div>
          <div className="hidden sm:block text-sm opacity-90">
            Non-Operational / Read-Only — All actions are visible but blocked
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-blue-500 bg-opacity-50 px-2 py-1 rounded">
            Phase 1 Enforcement Active
          </span>
        </div>
      </div>
    </div>
  );
}

export function ShowcaseModeBlockedAction() {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-800">
            Showcase Mode — Action Blocked
          </h3>
          <div className="mt-2 text-sm text-blue-700">
            <p>
              This action is blocked by Brain enforcement to prevent unsafe or illegal care operations.
              In production mode, completing the required Phase 1 setup would allow this action to proceed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
