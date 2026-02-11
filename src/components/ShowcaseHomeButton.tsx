import { useShowcase } from '../contexts/ShowcaseContext';
import { SHOWCASE_MODE } from '../config/showcase';

export function ShowcaseHomeButton() {
  const { goBackToScenarioSelection, currentStep } = useShowcase();

  if (!SHOWCASE_MODE || currentStep === 'SCENARIO_SELECT') {
    return null;
  }

  return (
    <button
      onClick={goBackToScenarioSelection}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '120px',
        zIndex: 9999,
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
        cursor: 'pointer',
        fontSize: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.backgroundColor = '#2563eb';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.backgroundColor = '#3b82f6';
      }}
      title="Back to Scenario Selection"
    >
      🏠
    </button>
  );
}
