import React, { useState } from 'react';
import { OperationalLookupDemo } from './OperationalLookupDemo';
import { OperationalContextDemo } from './OperationalContextDemo';
import { OperationalCollisionDemo } from './OperationalCollisionDemo';
import { OperationalAllClearDemo } from './OperationalAllClearDemo';
import { OperationalVoiceDemo } from './OperationalVoiceDemo';

export function OperationalRealityShowcase() {
  const [currentPath, setCurrentPath] = useState('/showcase/operational/lookup');

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleBackToMain = () => {
    window.location.hash = '';
  };

  return (
    <div className="relative">
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={handleBackToMain}
          className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-lg"
        >
          ← Exit Operational Reality Demo
        </button>
      </div>

      <div className="fixed bottom-4 left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm">
        <div className="font-medium">🎯 Operational Reality Layer</div>
        <div className="text-xs opacity-90">Current: {currentPath.split('/').pop()}</div>
      </div>

      {currentPath === '/showcase/operational/lookup' && (
        <OperationalLookupDemo onNavigate={handleNavigate} />
      )}

      {currentPath === '/showcase/operational/context' && (
        <OperationalContextDemo onNavigate={handleNavigate} />
      )}

      {currentPath === '/showcase/operational/collision' && (
        <OperationalCollisionDemo onNavigate={handleNavigate} />
      )}

      {currentPath === '/showcase/operational/all-clear' && (
        <OperationalAllClearDemo onNavigate={handleNavigate} />
      )}

      {currentPath === '/showcase/operational/voice' && (
        <OperationalVoiceDemo onNavigate={handleNavigate} />
      )}
    </div>
  );
}
