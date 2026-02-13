import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { SHOWCASE_MODE, ShowcaseRole, ShowcaseScenario, SHOWCASE_SCENARIOS } from '../config/showcase';
import type { OperatingMode } from '../types/operationalModel';
import { supabase } from '../lib/supabase';

const ROLE_PERMISSIONS: Record<ShowcaseRole, string[]> = {
  AGENCY_ADMIN: [
    'agency.view',
    'user.invite',
    'resident.view',
    'assignment.manage',
    'view_system_health',
    'view_own_resident_data'
  ],
  SUPERVISOR: [
    'agency.view',
    'resident.view',
    'assignment.manage',
    'user.invite'
  ],
  CAREGIVER: [
    'resident.view',
    'assignment.view'
  ],
  SENIOR: [
    'view_own_resident_data'
  ],
  FAMILY_VIEWER: [
    'view_own_resident_data'
  ],
  FAMILY_ADMIN: [
    'view_own_resident_data'
  ]
};

export type ShowcaseStep = 'SCENARIO_SELECT' | 'ARCHITECTURE_OVERVIEW' | 'INTELLIGENCE_OVERVIEW' | 'ROLE_INTERFACE';

interface ShowcaseContextType {
  isShowcaseMode: boolean;
  isAuthenticated: boolean;
  currentScenario: ShowcaseScenario | null;
  currentRole: ShowcaseRole | null;
  selectedResidentId: string | null;
  mockUserId: string | null;
  mockAgencyId: string | null;
  permissions: Set<string>;
  currentStep: ShowcaseStep;
  operatingMode: OperatingMode;
  login: (role: ShowcaseRole) => void;
  logout: () => void;
  setScenario: (scenarioId: string) => void;
  setRole: (role: ShowcaseRole) => void;
  setSelectedResident: (residentId: string) => void;
  resetScenario: () => void;
  executeShowcaseAction: (action: string, data: any) => Promise<any>;
  hasPermission: (permission: string) => boolean;
  showToast: (message: string) => void;
  advanceToNextStep: (scenarioIdOverride?: string) => void;
  goBackToScenarioSelection: () => void;
  setOperatingMode: (mode: OperatingMode) => void;
}

const ShowcaseContext = createContext<ShowcaseContextType | undefined>(undefined);

export function ShowcaseProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<ShowcaseScenario | null>(null);
  const [currentRole, setCurrentRole] = useState<ShowcaseRole | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ShowcaseStep>('SCENARIO_SELECT');
  const [operatingMode, setOperatingModeState] = useState<OperatingMode>('AGENCY');
  const [urlInitialized, setUrlInitialized] = useState(false);

  // URL-driven scenario entry (non-blocking)
  useEffect(() => {
    if (!SHOWCASE_MODE || urlInitialized) return;

    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const scenarioParam = params.get('scenario');
    const roleParam = params.get('role');

    setUrlInitialized(true);

    if (scenarioParam && roleParam) {
      const normalizedRole = roleParam.toUpperCase() as ShowcaseRole;
      console.log('[ShowcaseContext] 🎬 URL init:', scenarioParam, normalizedRole);
      initializeFromUrl(scenarioParam, normalizedRole);
    }
  }, [urlInitialized]);

  const initializeFromUrl = (scenarioId: string, role: ShowcaseRole) => {
    const scenario = SHOWCASE_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) {
      console.error('[ShowcaseContext] ❌ Scenario not found:', scenarioId);
      return;
    }

    // Set state immediately - UI renders right away
    setCurrentScenario(scenario);
    setCurrentRole(role);
    setIsAuthenticated(true);
    setCurrentStep('ROLE_INTERFACE');
    setSelectedResidentId('b0000000-0000-0000-0000-000000000001');

    // Seed database in background (idempotent, non-blocking)
    seedScenarioDatabase();
  };

  const mockUserId = useMemo(() => {
    if (!SHOWCASE_MODE || !currentRole) return null;
    // Return actual showcase user IDs that exist in database (from seed_senior_family_scenario)
    const roleUserMap: Record<ShowcaseRole, string> = {
      'CAREGIVER': 'a0000000-0000-0000-0000-000000000003', // Mike Chen
      'SUPERVISOR': 'a0000000-0000-0000-0000-000000000005', // Sarah Johnson
      'AGENCY_ADMIN': 'a0000000-0000-0000-0000-000000000005', // Sarah Johnson (also acts as admin)
      'SENIOR': 'a0000000-0000-0000-0000-000000000001', // Dorothy Miller
      'FAMILY_VIEWER': 'a0000000-0000-0000-0000-000000000002', // Robert Miller
      'FAMILY_ADMIN': 'a0000000-0000-0000-0000-000000000002' // Robert Miller
    };
    return roleUserMap[currentRole] || null;
  }, [currentRole]);

  // CRITICAL: This is ONLY for Showcase Mode (non-operational display)
  // Production mode MUST use real agency IDs from user authentication
  // Showcase Mode is read-only and all write operations are blocked by Brain enforcement
  const mockAgencyId = useMemo(() => {
    if (!SHOWCASE_MODE) return null;
    return 'a0000000-0000-0000-0000-000000000010'; // Fixed showcase agency ID matching seed_senior_family_scenario (latest version)
  }, []); // Always available in showcase mode, not dependent on scenario selection

  const permissions = useMemo(() => {
    if (!SHOWCASE_MODE || !currentRole) return new Set<string>();
    return new Set(ROLE_PERMISSIONS[currentRole]);
  }, [currentRole]);

  const hasPermission = (permission: string): boolean => {
    return permissions.has(permission);
  };

  // Idempotent background seeding - never blocks UI
  const seedScenarioDatabase = () => {
    const start = Date.now();
    console.log('[ShowcaseContext] 🌱 Seeding database...');

    supabase.rpc('seed_senior_family_scenario')
      .then(({ data, error }) => {
        const elapsed = Date.now() - start;
        if (error) {
          console.warn('[ShowcaseContext] ⚠️ Seed error (' + elapsed + 'ms):', error.message);
        } else if (data) {
          console.log('[ShowcaseContext] ✅ Seed complete (' + elapsed + 'ms)');
          if (data.resident_id) {
            setSelectedResidentId(data.resident_id);
          }
        }
      })
      .catch(err => {
        console.warn('[ShowcaseContext] ⚠️ Seed failed:', err.message);
      });
  };

  const advanceToNextStep = (scenarioIdOverride?: string) => {
    console.log('[STEP_TRANSITION] advanceToNextStep called with:', scenarioIdOverride);
    const scenario = scenarioIdOverride
      ? SHOWCASE_SCENARIOS.find(s => s.id === scenarioIdOverride)
      : currentScenario;

    console.log('[STEP_TRANSITION] Found scenario:', scenario?.id, scenario?.name);

    if (scenario) {
      console.log('[STEP_TRANSITION] Setting state:', {
        scenarioId: scenario.id,
        defaultRole: scenario.defaultRole,
        step: 'ROLE_INTERFACE'
      });
      setCurrentScenario(scenario);
      setCurrentStep('ROLE_INTERFACE');
      setCurrentRole(scenario.defaultRole);
      setIsAuthenticated(true);
      setSelectedResidentId('b0000000-0000-0000-0000-000000000001');
      console.log('[STEP_TRANSITION] State set complete');
    } else {
      console.error('[STEP_TRANSITION] Scenario NOT found for ID:', scenarioIdOverride);
    }
  };

  const goBackToScenarioSelection = () => {
    setCurrentStep('SCENARIO_SELECT');
    setCurrentScenario(null);
    setCurrentRole(null);
    setIsAuthenticated(false);
  };

  const login = async (role: ShowcaseRole) => {
    setCurrentRole(role);
    setIsAuthenticated(true);

    try {
      // CRITICAL: Call RPC to seed database - Showcase = Live, single source of truth
      console.log('[ShowcaseContext] Seeding database (login)...');

      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database seed timeout')), 10000)
      );

      const seedPromise = supabase.rpc('seed_senior_family_scenario');

      const { data: seedData, error: seedError } = await Promise.race([
        seedPromise,
        timeoutPromise
      ]) as any;

      if (seedError) {
        console.error('[ShowcaseContext] Seed error:', seedError);
      } else if (seedData) {
        console.log('[ShowcaseContext] Scenario seeded:', seedData);
        setSelectedResidentId(seedData.resident_id);
      }
    } catch (err) {
      console.error('Failed to seed showcase database:', err);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentRole(null);
    setSelectedResidentId(null);
    setCurrentScenario(null);
    setActionLog([]);
    setCurrentStep('SCENARIO_SELECT');
  };

  const setSelectedResident = (residentId: string) => {
    setSelectedResidentId(residentId);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  };

  const setScenario = (scenarioId: string) => {
    console.log('[ShowcaseContext] setScenario called with:', scenarioId);
    const scenario = SHOWCASE_SCENARIOS.find(s => s.id === scenarioId);
    console.log('[ShowcaseContext] Found scenario:', scenario?.name);
    if (scenario) {
      setCurrentScenario(scenario);
      setActionLog([]);
      // DO NOT reset currentStep here - advanceToNextStep will handle it
      console.log('[ShowcaseContext] Scenario set, ready to advance');
    } else {
      console.error('[ShowcaseContext] Scenario not found:', scenarioId);
    }
  };

  const setRole = (role: ShowcaseRole) => {
    setCurrentRole(role);
  };

  const resetScenario = () => {
    setActionLog([]);
  };

  const setOperatingMode = (mode: OperatingMode) => {
    setOperatingModeState(mode);
    // No in-memory data - all data comes from database
  };

  const executeShowcaseAction = async (action: string, data: any): Promise<any> => {
    if (!SHOWCASE_MODE) {
      throw new Error('Showcase actions only available in showcase mode');
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      data,
      role: currentRole
    };
    setActionLog(prev => [...prev, logEntry]);

    switch (action) {
      case 'administer_medication':
        return {
          success: true,
          message: 'Medication administration simulated',
          simulated: true
        };

      case 'update_care_status':
        return {
          success: true,
          message: 'Care status update simulated',
          simulated: true
        };

      case 'create_shift':
        return {
          success: true,
          message: 'Shift operations must use database RPCs',
          simulated: true
        };

      case 'assign_caregiver':
        return {
          success: true,
          message: 'Assignment operations must use database RPCs',
          simulated: true
        };

      default:
        return {
          success: true,
          message: `Action "${action}" simulated`,
          simulated: true
        };
    }
  };

  const value: ShowcaseContextType = {
    isShowcaseMode: SHOWCASE_MODE,
    isAuthenticated,
    currentScenario,
    currentRole,
    selectedResidentId,
    mockUserId,
    mockAgencyId,
    permissions,
    currentStep,
    operatingMode,
    login,
    logout,
    setScenario,
    setRole,
    setSelectedResident,
    resetScenario,
    executeShowcaseAction,
    hasPermission,
    showToast,
    advanceToNextStep,
    goBackToScenarioSelection,
    setOperatingMode
  };

  return (
    <ShowcaseContext.Provider value={value}>
      {children}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#1e293b',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          fontSize: '14px',
          fontWeight: 500
        }}>
          {toastMessage}
        </div>
      )}
    </ShowcaseContext.Provider>
  );
}

export function useShowcase() {
  const context = useContext(ShowcaseContext);
  if (context === undefined) {
    throw new Error('useShowcase must be used within a ShowcaseProvider');
  }
  return context;
}

