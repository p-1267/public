import React from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';

export function ShowcaseBanner() {
  const { isShowcaseMode, currentScenario, resetScenario } = useShowcase();

  if (!isShowcaseMode || !currentScenario) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b-2 border-yellow-400 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-yellow-900">
              SHOWCASE MODE
            </span>
          </div>
          <div className="h-4 w-px bg-yellow-300"></div>
          <span className="text-sm text-yellow-800">
            Scenario: <strong>{currentScenario.name}</strong>
          </span>
          <div className="h-4 w-px bg-yellow-300"></div>
          <span className="text-xs text-yellow-700 italic">
            Changes are simulated and not saved
          </span>
        </div>
        <button
          onClick={resetScenario}
          className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded font-medium transition-colors"
        >
          Reset Scenario
        </button>
      </div>
    </div>
  );
}
