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
import { useShowcase } from './contexts/ShowcaseContext'
import { SHOWCASE_MODE } from './config/showcase'
import { useState, useEffect } from 'react'

function App() {
  const { isAuthenticated, currentRole, currentScenario, currentStep } = useShowcase()
  const [currentRoute, setCurrentRoute] = useState('')

  console.log('[APP_RENDER] currentStep=', currentStep, 'currentRole=', currentRole, 'currentScenario=', currentScenario?.id)
  console.log('[LOCATION] pathname=', window.location.pathname, 'hash=', window.location.hash)

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash.replace('#', '')
      setCurrentRoute(hash)
    }

    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

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
    console.log('[APP_RENDER] SHOWCASE_MODE, currentStep=', currentStep, 'currentRole=', currentRole);
    if (currentStep === 'SCENARIO_SELECT') {
      console.log('[APP_RENDER] Rendering ShowcaseScenarioSelector');
      return <ShowcaseScenarioSelector />
    }

    // Scenario selected → render HostShell with role home
    console.log('[APP_RENDER] Scenario active, rendering HostShell');
    const remountKey = `${currentRole || 'none'}`
    return (
      <>
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

  // Fallback: render HostShell
  const remountKey = SHOWCASE_MODE
    ? `${currentRole || 'none'}`
    : 'production'

  console.log('[APP_RENDER] Fallback, rendering HostShell with key=', remountKey);
  return (
    <>
      {SHOWCASE_MODE && <ShowcaseNavPanel />}
      {SHOWCASE_MODE && <ShowcaseHomeButton />}
      <HostShell key={remountKey} />
    </>
  )
}

export default App
