import React, { useState } from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';
import type { ShowcaseRole } from '../config/showcase';

interface Tab {
  id: string;
  label: string;
}

interface ShowcaseNavWrapperProps {
  role: ShowcaseRole;
  children: (activeTab: string, setActiveTab: (tab: string) => void) => React.ReactNode;
}

const roleTabsMap: Record<ShowcaseRole, Tab[]> = {
  'SENIOR': [
    { id: 'home', label: 'My Day' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'medications', label: 'Medications' },
    { id: 'lab-tests', label: 'Lab Results' },
    { id: 'care-plan', label: 'Care Plan' },
    { id: 'care-timeline', label: 'Care Timeline' },
    { id: 'care-notes', label: 'Care Notes' },
    { id: 'health', label: 'My Vitals' },
    { id: 'devices', label: 'My Devices' },
    { id: 'health-dashboard', label: 'Health Dashboard' },
    { id: 'documents', label: 'Documents' },
    { id: 'messages', label: 'Messages' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'settings', label: 'Settings' },
  ],
  'FAMILY_VIEWER': [
    { id: 'home', label: 'Overview' },
    { id: 'departments', label: 'Departments' },
    { id: 'care', label: 'Care Timeline' },
    { id: 'care-plan', label: 'Care Plan' },
    { id: 'health-monitoring', label: 'Health Monitoring' },
    { id: 'medications', label: 'Medications & Interactions' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'documents', label: 'Documents' },
    { id: 'safety', label: 'Safety & Tracking' },
    { id: 'communication', label: 'Communication' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'settings', label: 'Settings' },
  ],
  'CAREGIVER': [
    { id: 'home', label: 'Today' },
    { id: 'departments', label: 'Departments' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'residents', label: 'Residents' },
    { id: 'medications', label: 'Medications' },
    { id: 'care-log', label: 'Care Log' },
    { id: 'voice-doc', label: 'Voice Documentation' },
    { id: 'reports', label: 'My Reports' },
    { id: 'shift', label: 'My Shift' },
  ],
  'SUPERVISOR': [
    { id: 'home', label: 'Dashboard' },
    { id: 'departments', label: 'Departments' },
    { id: 'ai-intelligence', label: 'AI Intelligence' },
    { id: 'scheduling', label: 'Scheduling' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'residents', label: 'Residents' },
    { id: 'staff', label: 'Staff' },
    { id: 'reports', label: 'Reports' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'review', label: 'Review' },
    { id: 'devices', label: 'Devices' },
    { id: 'automation', label: 'Automation' },
  ],
  'AGENCY_ADMIN': [
    { id: 'home', label: 'Dashboard' },
    { id: 'residents', label: 'Residents' },
    { id: 'departments', label: 'Departments' },
    { id: 'settings', label: 'Agency Settings' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'devices', label: 'Devices' },
    { id: 'reports', label: 'All Reports' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'audit', label: 'Audit Log' },
    { id: 'policies', label: 'Policies' },
    { id: 'templates', label: 'Templates' },
    { id: 'users', label: 'Users & Roles' },
    { id: 'billing', label: 'Billing' },
  ],
};

export const ShowcaseNavWrapper: React.FC<ShowcaseNavWrapperProps> = ({ role, children }) => {
  const [activeTab, setActiveTab] = useState('home');
  const tabs = roleTabsMap[role] || [];
  const showcaseContext = useShowcase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50">
      <header className="bg-gradient-to-r from-white to-slate-50 border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              CareCompass
            </h1>
            <div className="text-sm text-slate-600 mt-1 font-medium">
              {role === 'SENIOR' && 'Senior View'}
              {role === 'FAMILY_VIEWER' && 'Family Member View'}
              {role === 'CAREGIVER' && 'Caregiver View'}
              {role === 'SUPERVISOR' && 'Supervisor View'}
              {role === 'AGENCY_ADMIN' && 'Agency Admin View'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-amber-100 border border-amber-400 rounded-lg text-sm font-bold text-amber-900">
              SHOWCASE MODE
            </div>
            <button
              onClick={() => {
                if (showcaseContext?.logout) {
                  showcaseContext.logout();
                }
              }}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Switch Role
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 px-6 flex gap-1 overflow-x-auto shadow-sm" style={{ position: 'relative', zIndex: 1100 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 border-b-2 border-transparent hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main>
        {children(activeTab, setActiveTab)}
      </main>
    </div>
  );
};
