import { useEffect } from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';

const BUILD_TIME = new Date().toISOString();

export const BuildSignature: React.FC = () => {
  const { currentScenario, currentRole } = useShowcase();

  useEffect(() => {
    console.log('[SHOWCASE_PROOF]', {
      buildTime: BUILD_TIME,
      scenarioId: currentScenario?.id || 'NONE',
      scenarioLabel: currentScenario?.label || 'NONE',
      currentRole: currentRole || 'NONE',
      timestamp: new Date().toISOString()
    });
  }, [currentScenario, currentRole]);

  return (
    <div className="fixed top-2 right-2 z-[9999] bg-slate-900 text-white text-xs px-3 py-1.5 rounded shadow-lg font-mono">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Build:</span>
          <span className="text-green-400">{BUILD_TIME.slice(11, 19)}</span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Scenario:</span>
          <span className="text-blue-400">{currentScenario?.id || 'NONE'}</span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Role:</span>
          <span className="text-purple-400">{currentRole || 'NONE'}</span>
        </div>
      </div>
    </div>
  );
};
