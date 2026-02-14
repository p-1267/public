import { useState, useEffect } from 'react'
import { useBrainState } from '../hooks/useBrainState'
import { useUserPermissions } from '../hooks/useUserPermissions'
import { useOnboardingWizard } from '../hooks/useOnboardingWizard'
import { supabase } from '../lib/supabase'
import { SHOWCASE_MODE } from '../config/showcase'
import { useShowcase } from '../contexts/ShowcaseContext'
import { BrainStateDisplay } from './BrainStateDisplay'
import { SyncStatus } from './SyncStatus'
import { EmergencyIndicator } from './EmergencyIndicator'
import { EmergencyActionButtons } from './EmergencyActionButtons'
import { AuditLogViewer } from './AuditLogViewer'
import { AILearningInputsViewer } from './AILearningInputsViewer'
import { CompliancePanel } from './CompliancePanel'
import { SupervisorDashboard } from './SupervisorDashboard'
import { BrainStateHistoryViewer } from './BrainStateHistoryViewer'
import { TransitionTimeline } from './TransitionTimeline'
import { AgencyDashboard } from './AgencyDashboard'
import { AgencyUsers } from './AgencyUsers'
import { AgencyResidents } from './AgencyResidents'
import { AgencyAssignments } from './AgencyAssignments'
import { SeniorDashboard } from './SeniorDashboard'
import { SystemHealthPanel } from './SystemHealthPanel'
import { SystemFinalizationPanel } from './SystemFinalizationPanel'
import { FinalReadinessDeclaration } from './FinalReadinessDeclaration'
import { OrganizationOnboardingWizard } from './OrganizationOnboardingWizard'
import { SeniorHome } from './SeniorHome'
import { FamilyHome } from './FamilyHome'
import { CaregiverHome } from './CaregiverHome'
import { SupervisorHome } from './SupervisorHome'
import { AgencyAdminHome } from './AgencyAdminHome'
import { ScenarioWiringInspector } from './ScenarioWiringInspector'
import { SessionGuard } from './SessionGuard'
import { ScenarioIdentityBanner } from './ScenarioIdentityBanner'
import { ScenarioStoryPanel } from './ScenarioStoryPanel'
import type { EmergencyState } from '../types/care'
import type { ShowcaseRole } from '../config/showcase'

type TabId = 'state' | 'dashboard' | 'history' | 'audit' | 'ai-inputs' | 'compliance' | 'agency' | 'users' | 'residents' | 'assignments' | 'senior' | 'system-health' | 'system-status'

function getInitialTabForRole(role: ShowcaseRole | null): TabId {
  if (!role) return 'dashboard'

  switch (role) {
    case 'AGENCY_ADMIN':
      return 'agency'
    case 'SUPERVISOR':
      return 'dashboard'
    case 'CAREGIVER':
      return 'assignments'
    case 'SENIOR':
      return 'senior'
    case 'FAMILY_VIEWER':
    case 'FAMILY_ADMIN':
      return 'senior'
    default:
      return 'dashboard'
  }
}

const baseTabs: { id: TabId; label: string; requiresPermission?: string }[] = [
  { id: 'state', label: 'State' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'history', label: 'History' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'ai-inputs', label: 'AI Inputs' },
  { id: 'compliance', label: 'Compliance' },
]

const agencyTabs: { id: TabId; label: string; requiresPermission: string }[] = [
  { id: 'agency', label: 'Agency', requiresPermission: 'agency.view' },
  { id: 'users', label: 'Users', requiresPermission: 'user.invite' },
  { id: 'residents', label: 'Residents', requiresPermission: 'resident.view' },
  { id: 'assignments', label: 'Assignments', requiresPermission: 'assignment.view' },
]

const seniorTabs: { id: TabId; label: string; requiresPermission: string }[] = [
  { id: 'senior', label: 'My Care', requiresPermission: 'view_own_resident_data' },
]

const adminTabs: { id: TabId; label: string; requiresPermission: string }[] = [
  { id: 'system-health', label: 'System Health', requiresPermission: 'view_system_health' },
  { id: 'system-status', label: 'System Status', requiresPermission: 'view_system_health' },
]

export function HostShell() {
  const showcaseContext = SHOWCASE_MODE ? useShowcase() : null
  const { brainState, isLoading, error } = useBrainState()
  const { hasPermission } = useUserPermissions()

  const initialTab = SHOWCASE_MODE && showcaseContext?.currentRole
    ? getInitialTabForRole(showcaseContext.currentRole)
    : 'dashboard'

  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const [userAgencyId, setUserAgencyId] = useState<string | null>(null)
  const [onboardingCheckComplete, setOnboardingCheckComplete] = useState(false)

  // Render immediately - database seeds in background

  const { status: onboardingStatus, loading: onboardingLoading, refresh: refreshOnboarding } = useOnboardingWizard(userAgencyId)

  useEffect(() => {
    const fetchUserAgency = async () => {
      if (SHOWCASE_MODE && showcaseContext?.mockAgencyId) {
        setUserAgencyId(showcaseContext.mockAgencyId)
        setOnboardingCheckComplete(true)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('agency_id')
          .eq('id', user.id)
          .maybeSingle()

        if (data) {
          setUserAgencyId(data.agency_id)
          setOnboardingCheckComplete(true)
        }
      }
    }

    fetchUserAgency()
  }, [showcaseContext])

  const visibleTabs = SHOWCASE_MODE
    ? [
        ...agencyTabs.filter((tab) => hasPermission(tab.requiresPermission)),
        ...seniorTabs.filter((tab) => hasPermission(tab.requiresPermission)),
        ...adminTabs.filter((tab) => hasPermission(tab.requiresPermission))
      ]
    : [
        ...baseTabs,
        ...agencyTabs.filter((tab) => hasPermission(tab.requiresPermission)),
        ...seniorTabs.filter((tab) => hasPermission(tab.requiresPermission)),
        ...adminTabs.filter((tab) => hasPermission(tab.requiresPermission))
      ]

  const handleOnboardingComplete = () => {
    refreshOnboarding()
  }

  if (!SHOWCASE_MODE && onboardingCheckComplete && !onboardingLoading && onboardingStatus) {
    if (!onboardingStatus.initialized || (onboardingStatus.currentState !== 'COMPLETED' || !onboardingStatus.locked)) {
      return <OrganizationOnboardingWizard agencyId={userAgencyId!} onComplete={handleOnboardingComplete} />
    }
  }

  if (SHOWCASE_MODE && showcaseContext?.currentRole && showcaseContext.selectedResidentId) {
    console.log('[HOSTSHELL_MOUNT] SHOWCASE_MODE=true, currentRole:', showcaseContext.currentRole, 'selectedResidentId:', showcaseContext.selectedResidentId);
    const PersonaHome = {
      'SENIOR': SeniorHome,
      'FAMILY_VIEWER': FamilyHome,
      'FAMILY_ADMIN': FamilyHome,
      'CAREGIVER': CaregiverHome,
      'SUPERVISOR': SupervisorHome,
      'AGENCY_ADMIN': AgencyAdminHome,
    }[showcaseContext.currentRole]

    console.log('[HOSTSHELL_MOUNT] PersonaHome component:', PersonaHome?.name || 'not found');

    if (PersonaHome) {
      console.log('[HOSTSHELL_MOUNT] Rendering PersonaHome for role:', showcaseContext.currentRole);

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50">
          <ScenarioIdentityBanner residentId={showcaseContext.selectedResidentId} />

          <div className="p-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <ScenarioStoryPanel
                  scenarioId={showcaseContext.currentScenario?.id || 'self-managed'}
                  currentRole={showcaseContext.currentRole}
                />
              </div>

              <div className="lg:col-span-3">
                <PersonaHome />
              </div>
            </div>
          </div>

          {SHOWCASE_MODE && <ScenarioWiringInspector />}

          {/* DEBUG BADGE */}
          <div className="fixed bottom-4 right-4 bg-green-900 text-white p-3 rounded text-xs font-mono space-y-1 shadow-lg z-50 max-w-xs">
            <div className="font-bold text-green-300 mb-2">✅ HOSTSHELL MOUNTED</div>
            <div><span className="text-gray-300">currentStep:</span> {showcaseContext.currentStep}</div>
            <div><span className="text-gray-300">currentScenario:</span> {showcaseContext.currentScenario?.id || 'null'}</div>
            <div><span className="text-gray-300">currentRole:</span> {showcaseContext.currentRole || 'null'}</div>
            <div><span className="text-gray-300">selectedResidentId:</span> {showcaseContext.selectedResidentId?.slice(0, 8) || 'null'}...</div>
          </div>
        </div>
      )
    }
  } else {
    console.log('[HostShell] Not showing PersonaHome - SHOWCASE_MODE:', SHOWCASE_MODE, 'currentRole:', showcaseContext?.currentRole);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50">
      <FinalReadinessDeclaration />

      <header className="bg-gradient-to-r from-white to-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Brain State Monitor
        </h1>
        <div className="flex items-center gap-4">
          {!SHOWCASE_MODE && <SyncStatus />}
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 px-6 flex gap-1">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 border-b-2 border-transparent hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className={`${activeTab === 'senior' ? '' : 'max-w-6xl mx-auto p-6 pb-20'}`}>
        {activeTab === 'state' && (
          <>
            {SHOWCASE_MODE ? (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-lg">
                <div className="text-2xl font-bold text-slate-900 mb-3">
                  System State (Showcase Mode)
                </div>
                <div className="text-base text-slate-600">
                  Brain state transitions are simulated in Showcase Mode. In production, this page displays real-time system state including care status, emergency state, and connectivity.
                </div>
              </div>
            ) : (
              <>
                {isLoading && (
                  <div className="text-center p-12 text-slate-600">
                    Loading Brain state...
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                    Error: {error}
                  </div>
                )}

                {!isLoading && !error && brainState && (
                  <>
                    {brainState.emergency_state !== 'NONE' && (
                      <div className="mb-6">
                        <EmergencyIndicator state={brainState.emergency_state} />
                      </div>
                    )}
                    <BrainStateDisplay brainState={brainState} />
                    <div className="mt-6">
                      <EmergencyActionButtons
                        emergencyState={brainState.emergency_state as EmergencyState}
                        version={brainState.state_version}
                      />
                    </div>
                  </>
                )}

                {!isLoading && !error && !brainState && (
                  <div className="text-center p-12 text-slate-600">
                    No Brain state found
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'dashboard' && <SupervisorDashboard />}

        {activeTab === 'history' && (
          <div>
            <BrainStateHistoryViewer />
            <div className="mt-12">
              <TransitionTimeline />
            </div>
          </div>
        )}

        {activeTab === 'audit' && <AuditLogViewer />}

        {activeTab === 'ai-inputs' && <AILearningInputsViewer />}

        {activeTab === 'compliance' && <CompliancePanel />}

        {activeTab === 'agency' && (
          userAgencyId ? (
            <AgencyDashboard agencyId={userAgencyId} />
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <div className="text-2xl font-bold text-slate-900 mb-3">
                Agency Dashboard
              </div>
              <div className="text-base text-slate-600">
                Agency information is loading. In production, this displays agency settings, policies, and operational metrics.
              </div>
            </div>
          )
        )}

        {activeTab === 'users' && (
          userAgencyId ? (
            <AgencyUsers agencyId={userAgencyId} />
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <div className="text-2xl font-bold text-slate-900 mb-3">
                User Management
              </div>
              <div className="text-base text-slate-600">
                User information is loading. In production, this displays staff members, roles, and access controls.
              </div>
            </div>
          )
        )}

        {activeTab === 'residents' && (
          userAgencyId ? (
            <AgencyResidents agencyId={userAgencyId} />
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <div className="text-2xl font-bold text-slate-900 mb-3">
                Resident Management
              </div>
              <div className="text-base text-slate-600">
                Resident information is loading. In production, this displays all residents under agency care.
              </div>
            </div>
          )
        )}

        {activeTab === 'assignments' && (
          userAgencyId ? (
            <AgencyAssignments agencyId={userAgencyId} />
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <div className="text-2xl font-bold text-slate-900 mb-3">
                Caregiver Assignments
              </div>
              <div className="text-base text-slate-600">
                Assignment information is loading. In production, this displays caregiver-to-resident assignments and schedules.
              </div>
            </div>
          )
        )}

        {activeTab === 'senior' && <SeniorDashboard />}

        {activeTab === 'system-health' && <SystemHealthPanel />}

        {activeTab === 'system-status' && <SystemFinalizationPanel />}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 px-6 py-3 bg-white border-t border-slate-200 text-center text-xs text-slate-500">
        Real-time subscription active
      </footer>

      {SHOWCASE_MODE && <ScenarioWiringInspector />}
    </div>
  )
}
