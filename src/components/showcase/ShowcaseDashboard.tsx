import React, { useState } from 'react';
import { BrainDecisionInspector } from './BrainDecisionInspector';
import { BackgroundJobMonitor } from './BackgroundJobMonitor';
import { FeatureCompletionDashboard } from './FeatureCompletionDashboard';
import { ShowcaseControlPanel } from './ShowcaseControlPanel';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

export function ShowcaseDashboard() {
  const { isShowcaseMode, agencyId, agencyName, loading, switchToAgency } =
    useShowcaseMode();
  const [activeTab, setActiveTab] = useState<'completion' | 'brain' | 'jobs'>(
    'completion'
  );
  const [showControl, setShowControl] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading showcase mode...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isShowcaseMode && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-3 py-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Showcase Mode</span>
              </div>
              <span className="text-blue-100 text-sm">{agencyName}</span>
            </div>
            <button
              onClick={() => setShowControl(true)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Open Control Panel
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!isShowcaseMode || !agencyId ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Showcase Mode
            </h2>
            <p className="text-gray-600 mb-6">
              Create a showcase agency to experience the full application with real
              data and complete transparency.
            </p>
            <button
              onClick={() => setShowControl(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-medium hover:shadow-lg transition-shadow"
            >
              Create Showcase Agency
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center gap-2 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('completion')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                      activeTab === 'completion'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Feature Completion
                  </button>
                  <button
                    onClick={() => setActiveTab('brain')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                      activeTab === 'brain'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Brain Inspector
                  </button>
                  <button
                    onClick={() => setActiveTab('jobs')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                      activeTab === 'jobs'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Background Jobs
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'completion' && (
              <FeatureCompletionDashboard agencyId={agencyId} />
            )}
            {activeTab === 'brain' && (
              <BrainDecisionInspector agencyId={agencyId} />
            )}
            {activeTab === 'jobs' && <BackgroundJobMonitor agencyId={agencyId} />}
          </>
        )}
      </div>

      {showControl && (
        <ShowcaseControlPanel
          currentAgencyId={agencyId}
          isShowcaseMode={isShowcaseMode}
          onAgencySwitch={switchToAgency}
        />
      )}

      {isShowcaseMode && !showControl && (
        <button
          onClick={() => setShowControl(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 z-40"
        >
          <span className="text-xl">🎯</span>
          <span className="font-medium">Showcase Control</span>
        </button>
      )}
    </div>
  );
}
