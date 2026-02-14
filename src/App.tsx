import { HostShell } from './components/HostShell'
import { ShowcaseLogin } from './components/ShowcaseLogin'
import { ShowcaseNavPanel } from './components/ShowcaseNavPanel'
import { ShowcaseHomeButton } from './components/ShowcaseHomeButton'
import { ShowcaseScenarioSelector } from './components/ShowcaseScenarioSelector'
import { ScenarioArchitectureView } from './components/ScenarioArchitectureView'
import { ShowcaseIntelligenceOverview } from './components/ShowcaseIntelligenceOverview'
import { OperationalRealityShowcase } from './components/showcase/OperationalRealityShowcase'
import { ShowcaseDashboard } from './components/showcase/ShowcaseDashboard'
import { CaregiverHome } from './components/CaregiverHome'
import { SupervisorHome } from './components/SupervisorHome'
import { BrainProofScreen } from './components/BrainProofScreen'
import { BrainProofWithLevel4 } from './components/BrainProofWithLevel4'
import { CaregiverCognitiveView } from './components/cognitive/CaregiverCognitiveView'
import { SupervisorExceptionsView } from './components/cognitive/SupervisorExceptionsView'
import { InstantContextScreen } from './components/cognitive/InstantContextScreen'
import { BrainProofView } from './components/cognitive/BrainProofView'
import { CognitiveNavigationIndex } from './components/cognitive/CognitiveNavigationIndex'
import { WP1ScenarioExecution } from './components/WP1ScenarioExecution'
import { WP2TruthEnforcedAcceptance } from './components/WP2TruthEnforcedAcceptance'
import { WP3BrainIntelligenceShowcase } from './components/WP3BrainIntelligenceShowcase'
import { WP4ShadowAIShowcase } from './components/WP4ShadowAIShowcase'
import { WP5AIReportsShowcase } from './components/WP5AIReportsShowcase'
import { WP6OfflineFirstShowcase } from './components/WP6OfflineFirstShowcase'
import { WP6OfflineFirstAcceptance } from './components/WP6OfflineFirstAcceptance'
import { WP7BackgroundJobsShowcase } from './components/WP7BackgroundJobsShowcase'
import { WP7BackgroundJobsAcceptance } from './components/WP7BackgroundJobsAcceptance'
import { WP8ExternalIntegrationsAcceptance } from './components/WP8ExternalIntegrationsAcceptance'
import { Step2BidirectionalWiringTest } from './components/Step2BidirectionalWiringTest'
import { Step3CompoundIntelligenceTest } from './components/Step3CompoundIntelligenceTest'
import { ShowcaseSeniorFamilyScenario } from './components/ShowcaseSeniorFamilyScenario'
import { ShowcaseDeviceIntegrationPage } from './components/ShowcaseDeviceIntegrationPage'
import { AIIntelligenceDashboard } from './components/AIIntelligenceDashboard'
import { ShowcaseWatchdog } from './components/ShowcaseWatchdog'
import { BuildSignature } from './components/BuildSignature'
import { useShowcase } from './contexts/ShowcaseContext'
import { SHOWCASE_MODE } from './config/showcase'
import { useState, useEffect } from 'react'

function App() {
  console.log('[APP_INIT] App component rendering...');
  console.log('[BOOT] App.tsx mounted - React is running');
  console.log('[ENV_CHECK] Supabase URL present:', !!import.meta.env.VITE_SUPABASE_URL);
  console.log('[ENV_CHECK] Supabase Key present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

  const { isAuthenticated, currentRole, currentScenario, currentStep } = useShowcase()
  const [currentRoute, setCurrentRoute] = useState('')
  const [watchdogVisible, setWatchdogVisible] = useState(false)
  const [watchdogInfo, setWatchdogInfo] = useState<any>({})
  const [appMounted, setAppMounted] = useState(false)

  console.log('[APP_STATE] currentStep:', currentStep, 'currentRole:', currentRole, 'currentRoute:', currentRoute);

  useEffect(() => {
    console.log('[APP_MOUNT] ✅ App component mounted successfully');
    setAppMounted(true);
  }, [])


  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash.replace('#', '')
      setCurrentRoute(hash)
    }

    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  // Watchdog timer - DISABLED for debugging
  useEffect(() => {
    if (!SHOWCASE_MODE) return;

    // Watchdog disabled - not blocking UI anymore
    console.log('[WATCHDOG] Watchdog timer disabled - UI will render normally');

    return () => {};
  }, [])

  // WATCHDOG DEBUG PANEL (DISABLED - will never show)
  if (false && watchdogVisible) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.95)',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        padding: '40px',
        overflowY: 'auto',
        zIndex: 99999
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#ff6b6b' }}>
            🔴 WATCHDOG: App Loading Timeout Detected
          </h1>
          <div style={{ background: '#222', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '10px' }}><strong>✅ App Mounted:</strong> React is running</div>
            <div style={{ marginBottom: '10px' }}><strong>📍 Current Step:</strong> {watchdogInfo.currentStep}</div>
            <div style={{ marginBottom: '10px' }}><strong>👤 Current Role:</strong> {watchdogInfo.currentRole || 'NONE'}</div>
            <div style={{ marginBottom: '10px' }}><strong>🎬 Scenario:</strong> {watchdogInfo.currentScenario || 'NONE'}</div>
            <div style={{ marginBottom: '10px' }}><strong>🔐 Authenticated:</strong> {String(watchdogInfo.isAuthenticated)}</div>
            <div style={{ marginBottom: '10px' }}><strong>🔗 Route:</strong> {watchdogInfo.currentRoute || '(empty)'}</div>
            <div style={{ marginBottom: '10px' }}><strong>📍 Hash:</strong> {watchdogInfo.hash || '(none)'}</div>
            <div style={{ marginBottom: '10px' }}><strong>⏰ Timestamp:</strong> {watchdogInfo.timestamp}</div>
          </div>
          <div style={{ background: '#1a1a2e', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>📋 Likely Causes:</h2>
            <ul style={{ lineHeight: '1.8' }}>
              <li>Database seeding RPC hanging (check Supabase logs)</li>
              <li>Network request timeout (check DevTools Network tab)</li>
              <li>Missing environment variables</li>
              <li>Infinite loading state in component</li>
            </ul>
          </div>
          <div style={{ background: '#0f3460', padding: '20px', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>🔧 Next Steps:</h2>
            <ol style={{ lineHeight: '1.8' }}>
              <li>Open DevTools Console - check for red errors</li>
              <li>Open DevTools Network - find pending request</li>
              <li>Check Supabase dashboard for RPC failures</li>
              <li>Click button below to force bypass and continue</li>
            </ol>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              onClick={() => {
                console.log('[WATCHDOG] User clicked bypass - hiding panel');
                setWatchdogVisible(false);
              }}
              style={{
                padding: '12px 24px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🚀 Hide and Continue
            </button>
            {SHOWCASE_MODE && (
              <button
                onClick={() => {
                  console.log('[WATCHDOG] User clicked reset - hard reloading');
                  window.location.reload();
                }}
                style={{
                  padding: '12px 24px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🔄 Reset Showcase
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentRoute === 'showcase-dashboard') {
    return (
      <>
        <ShowcaseDashboard />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'cognitive') {
    return (
      <>
        <CognitiveNavigationIndex />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'operational-reality') {
    return (
      <>
        <OperationalRealityShowcase />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'caregiver-cognitive') {
    return (
      <>
        <CaregiverCognitiveView />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'supervisor-cognitive') {
    return (
      <>
        <SupervisorExceptionsView />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'instant-context') {
    return (
      <>
        <InstantContextScreen />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'brain-proof') {
    return (
      <>
        <BrainProofWithLevel4 />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  const showcaseAgencyId = 'a0000000-0000-0000-0000-000000000001'

  if (currentRoute === 'wp1-scenario-execution') {
    return (
      <>
        <WP1ScenarioExecution agencyId={showcaseAgencyId} />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'wp2-truth-enforced') {
    return (
      <>
        <WP2TruthEnforcedAcceptance agencyId={showcaseAgencyId} />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'wp3-brain-intelligence') {
    return (
      <>
        <WP3BrainIntelligenceShowcase agencyId={showcaseAgencyId} />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'wp4-shadow-ai') {
    return (
      <>
        <WP4ShadowAIShowcase agencyId={showcaseAgencyId} />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'wp5-ai-reports') {
    return (
      <>
        <WP5AIReportsShowcase agencyId={showcaseAgencyId} />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'wp6-offline-first') {
    return (
      <>
        <WP6OfflineFirstShowcase agencyId={showcaseAgencyId} />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'wp6-acceptance') {
    return (
      <>
        <WP6OfflineFirstAcceptance agencyId={showcaseAgencyId} />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'wp7-background-jobs') {
    return (
      <>
        <WP7BackgroundJobsShowcase agencyId={showcaseAgencyId} />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'wp7-acceptance') {
    return (
      <>
        <WP7BackgroundJobsAcceptance agencyId={showcaseAgencyId} />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'wp8-acceptance') {
    return (
      <>
        <WP8ExternalIntegrationsAcceptance agencyId={showcaseAgencyId} />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'step2-bidirectional-wiring') {
    return (
      <>
        <Step2BidirectionalWiringTest />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'step3-compound-intelligence') {
    return (
      <>
        <Step3CompoundIntelligenceTest />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'senior-family-scenario') {
    return (
      <>
        <ShowcaseSeniorFamilyScenario />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'device-integration') {
    return (
      <>
        <ShowcaseDeviceIntegrationPage />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  if (currentRoute === 'ai-intelligence') {
    return (
      <>
        <AIIntelligenceDashboard />
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
      </>
    )
  }

  // SHOWCASE_MODE: State-driven routing (no hash dependency)
  if (SHOWCASE_MODE && !currentRoute) {
    console.log('[APP_RENDER] SHOWCASE_MODE routing - currentStep:', currentStep, 'currentRole:', currentRole, 'currentScenario:', currentScenario?.id);

    if (currentStep === 'SCENARIO_SELECT') {
      console.log('[APP_RENDER] Rendering ShowcaseScenarioSelector');
      return (
        <>
          {appMounted && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              background: '#10b981',
              color: 'white',
              padding: '8px 16px',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              zIndex: 9999
            }}>
              ✅ App Loaded - Scenario Selector Active
            </div>
          )}
          <ShowcaseScenarioSelector />
        </>
      )
    }

    console.log('[APP_RENDER] Rendering HostShell with role:', currentRole);
    const remountKey = `${currentRole || 'none'}`
    return (
      <>
        <BuildSignature />
        <ShowcaseNavPanel />
        <ShowcaseHomeButton />
        <HostShell key={remountKey} />
      </>
    )
  }

  // Default route: Show scenario selector landing page (non-showcase mode)
  if (!currentRoute || currentRoute === '') {
    return <ShowcaseScenarioSelector />
  }

  // Brain State Monitor accessible via specific route
  if (currentRoute === 'brain-monitor') {
    const remountKey = SHOWCASE_MODE
      ? `${currentRole || 'none'}`
      : 'production'

    return (
      <>
        {SHOWCASE_MODE && <ShowcaseNavPanel />}
        {SHOWCASE_MODE && <ShowcaseHomeButton />}
        <HostShell key={remountKey} />
      </>
    )
  }

  const remountKey = SHOWCASE_MODE
    ? `${currentRole || 'none'}`
    : 'production'

  return (
    <>
      {SHOWCASE_MODE && <ShowcaseNavPanel />}
      {SHOWCASE_MODE && <ShowcaseHomeButton />}
      {SHOWCASE_MODE && <ShowcaseWatchdog />}
      <HostShell key={remountKey} />
    </>
  )
}

export default App
