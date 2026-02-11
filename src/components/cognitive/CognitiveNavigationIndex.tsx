import React from 'react';

interface ViewOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  userType: string;
}

const cognitiveViews: ViewOption[] = [
  {
    id: 'instant-context',
    title: 'Instant Context Access',
    description: 'Scan QR code or enter room number for immediate resident context',
    icon: '📱',
    route: '#instant-context',
    color: 'from-blue-400 to-blue-600',
    userType: 'All Caregivers'
  },
  {
    id: 'caregiver-cognitive',
    title: 'Caregiver Cognitive View',
    description: 'Situation-first care coordination with NOW/NEXT/LATER prioritization',
    icon: '🏥',
    route: '#caregiver-cognitive',
    color: 'from-green-400 to-green-600',
    userType: 'Caregiver'
  },
  {
    id: 'supervisor-cognitive',
    title: 'Supervisor Exceptions View',
    description: 'Intelligence-driven oversight showing only items requiring attention',
    icon: '👔',
    route: '#supervisor-cognitive',
    color: 'from-gray-400 to-gray-600',
    userType: 'Supervisor'
  },
  {
    id: 'brain-proof',
    title: 'Brain Proof Mode',
    description: 'Transparent intelligence verification showing capabilities and evidence',
    icon: '🧠',
    route: '#brain-proof',
    color: 'from-blue-400 to-blue-600',
    userType: 'All Users'
  },
  {
    id: 'operational-reality',
    title: 'Operational Reality Showcase',
    description: 'Complete operational workflow demonstrations',
    icon: '⚡',
    route: '#operational-reality',
    color: 'from-orange-400 to-orange-600',
    userType: 'Demo'
  }
];

export const CognitiveNavigationIndex: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            AgeEmpower Cognitive UI
          </h1>
          <p className="text-xl text-blue-200 mb-2">
            Situation-first care coordination
          </p>
          <p className="text-sm text-blue-300">
            Intelligence visible • Complexity hidden • Action immediate
          </p>
        </header>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-3">Design Principles</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="font-semibold text-blue-200 mb-1">✓ Situation First</div>
              <div className="text-blue-300">Who/where/what matters now, not category tabs</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="font-semibold text-green-200 mb-1">✓ Intelligence Visible</div>
              <div className="text-green-300">System shows what it knows and why it matters</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="font-semibold text-gray-200 mb-1">✓ Zero Navigation</div>
              <div className="text-gray-300">Inline actions, no tab hunting, no forms maze</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="font-semibold text-orange-200 mb-1">✓ Explicit All Clear</div>
              <div className="text-orange-300">Never blank screens, always show system state</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cognitiveViews.map(view => (
            <a
              key={view.id}
              href={view.route}
              className="group bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:border-white/40 rounded-xl p-6 transition-all hover:scale-105 hover:shadow-2xl"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-16 h-16 bg-gradient-to-br ${view.color} rounded-xl flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                  {view.icon}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-blue-300 mb-1">{view.userType}</div>
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors">
                    {view.title}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-blue-200 mb-4">{view.description}</p>
              <div className="flex items-center text-sm font-semibold text-blue-300 group-hover:text-white transition-colors">
                <span>Open View</span>
                <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </a>
          ))}
        </div>

        <footer className="mt-12 text-center text-blue-300 text-sm">
          <div className="bg-white/5 rounded-lg p-4 inline-block">
            <div className="font-semibold mb-2">Core Philosophy</div>
            <div className="space-y-1 text-xs">
              <div>Humans do the work • System observes, structures, validates, remembers</div>
              <div>AI never executes, never decides, never replaces human responsibility</div>
              <div>Everything traceable, explainable, and verifiable</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
