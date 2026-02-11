import { useState } from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';
import { validateScenarioWiring, getWiringSummary } from '../services/scenarioWiringValidator';
import type { ScenarioWiringValidation } from '../types/scenarioWiring';

export function ScenarioWiringInspector() {
  const { currentScenario, currentRole } = useShowcase();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'tabs' | 'actions' | 'forms' | 'reports' | 'summary'>('summary');

  if (!currentScenario || !currentRole) {
    return null;
  }

  const validation = validateScenarioWiring(currentScenario, currentRole);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-700 text-sm font-medium z-50"
      >
        Inspect Wiring
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl w-96 max-h-[600px] overflow-hidden flex flex-col z-50">
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Scenario Wiring Inspector</h3>
        <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
          ✕
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveSection('summary')}
          className={`flex-1 px-3 py-2 text-xs font-medium ${activeSection === 'summary' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveSection('tabs')}
          className={`flex-1 px-3 py-2 text-xs font-medium ${activeSection === 'tabs' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Tabs
        </button>
        <button
          onClick={() => setActiveSection('actions')}
          className={`flex-1 px-3 py-2 text-xs font-medium ${activeSection === 'actions' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Actions
        </button>
        <button
          onClick={() => setActiveSection('forms')}
          className={`flex-1 px-3 py-2 text-xs font-medium ${activeSection === 'forms' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Forms
        </button>
        <button
          onClick={() => setActiveSection('reports')}
          className={`flex-1 px-3 py-2 text-xs font-medium ${activeSection === 'reports' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Reports
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeSection === 'summary' && <SummaryView validation={validation} />}
        {activeSection === 'tabs' && <TabsView validation={validation} />}
        {activeSection === 'actions' && <ActionsView validation={validation} />}
        {activeSection === 'forms' && <FormsView validation={validation} />}
        {activeSection === 'reports' && <ReportsView validation={validation} />}
      </div>
    </div>
  );
}

function SummaryView({ validation }: { validation: ScenarioWiringValidation }) {
  const statusColor = validation.overallStatus === 'VALID' ? 'text-green-600' :
                      validation.overallStatus === 'INCOMPLETE' ? 'text-red-600' : 'text-yellow-600';

  return (
    <div className="space-y-4 text-xs">
      <div>
        <div className="font-semibold text-gray-700">{validation.scenarioName}</div>
        <div className={`font-bold ${statusColor}`}>{validation.overallStatus}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-gray-500">Tabs</div>
          <div className="font-bold text-gray-900">{validation.tabs.length}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-gray-500">Actions</div>
          <div className="font-bold text-gray-900">{validation.actions.length}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-gray-500">Forms</div>
          <div className="font-bold text-gray-900">{validation.forms.length}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-gray-500">Reports</div>
          <div className="font-bold text-gray-900">{validation.reports.length}</div>
        </div>
      </div>

      {validation.gaps.length > 0 && (
        <div>
          <div className="font-semibold text-red-600 mb-1">Gaps ({validation.gaps.length})</div>
          <ul className="space-y-1 text-red-700">
            {validation.gaps.map((gap, i) => (
              <li key={i} className="text-xs">• {gap}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.extras.length > 0 && (
        <div>
          <div className="font-semibold text-yellow-600 mb-1">Extras ({validation.extras.length})</div>
          <ul className="space-y-1 text-yellow-700">
            {validation.extras.map((extra, i) => (
              <li key={i} className="text-xs">• {extra}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.mismatches.length > 0 && (
        <div>
          <div className="font-semibold text-yellow-600 mb-1">Mismatches ({validation.mismatches.length})</div>
          <ul className="space-y-1 text-yellow-700">
            {validation.mismatches.map((mismatch, i) => (
              <li key={i} className="text-xs">• {mismatch}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TabsView({ validation }: { validation: ScenarioWiringValidation }) {
  return (
    <div className="space-y-3">
      {validation.tabs.map(tab => (
        <div key={tab.tabId} className="border border-gray-200 rounded p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="font-semibold text-gray-900 text-xs">{tab.tabName}</div>
            <StatusBadge status={tab.status} />
          </div>
          <div className="text-xs text-gray-600 mb-2">{tab.purpose}</div>
          <div className="space-y-1 text-xs">
            <div><span className="text-gray-500">Data Mode:</span> <span className="font-medium">{tab.dataMode}</span></div>
            <div><span className="text-gray-500">Backend:</span> <span className="font-medium">{tab.backendServices.join(', ')}</span></div>
            <div><span className="text-gray-500">Roles:</span> <span className="font-medium">{tab.allowedRoles.join(', ')}</span></div>
          </div>
          {tab.issues && tab.issues.length > 0 && (
            <div className="mt-2 text-xs text-yellow-700">
              {tab.issues.map((issue, i) => (
                <div key={i}>⚠ {issue}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ActionsView({ validation }: { validation: ScenarioWiringValidation }) {
  return (
    <div className="space-y-3">
      {validation.actions.map(action => (
        <div key={action.actionId} className="border border-gray-200 rounded p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="font-semibold text-gray-900 text-xs">{action.actionName}</div>
            <StatusBadge status={action.status} />
          </div>
          <div className="text-xs text-gray-600 mb-2">{action.purpose}</div>
          <div className="space-y-1 text-xs">
            <div><span className="text-gray-500">Tab:</span> <span className="font-medium">{action.tabId}</span></div>
            {action.opensModal && <div><span className="text-gray-500">Opens:</span> <span className="font-medium">{action.opensModal}</span></div>}
            {action.opensForm && <div><span className="text-gray-500">Form:</span> <span className="font-medium">{action.opensForm}</span></div>}
            <div><span className="text-gray-500">Reads:</span> <span className="font-medium">{action.readsData.join(', ')}</span></div>
            <div><span className="text-gray-500">Writes:</span> <span className="font-medium">{action.writesData.join(', ')}</span></div>
            {action.canBeBlocked && (
              <div><span className="text-gray-500">Can Block:</span> <span className="font-medium text-red-600">{action.blockReasons?.join(', ')}</span></div>
            )}
            <div><span className="text-gray-500">Simulated:</span> <span className="font-medium">{action.isSimulatedInShowcase ? 'Yes' : 'No'}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FormsView({ validation }: { validation: ScenarioWiringValidation }) {
  return (
    <div className="space-y-3">
      {validation.forms.map(form => (
        <div key={form.formId} className="border border-gray-200 rounded p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="font-semibold text-gray-900 text-xs">{form.formName}</div>
            <StatusBadge status={form.status} />
          </div>
          <div className="text-xs text-gray-600 mb-2">{form.purpose}</div>
          <div className="space-y-1 text-xs">
            <div><span className="text-gray-500">Required:</span> <span className="font-medium">{form.requiredFields.join(', ')}</span></div>
            <div><span className="text-gray-500">Optional:</span> <span className="font-medium">{form.optionalFields.join(', ')}</span></div>
            <div><span className="text-gray-500">Target:</span> <span className="font-medium">{form.backendTarget}</span></div>
          </div>
          {form.missingFields && form.missingFields.length > 0 && (
            <div className="mt-2 text-xs text-red-700">
              Missing: {form.missingFields.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ReportsView({ validation }: { validation: ScenarioWiringValidation }) {
  return (
    <div className="space-y-3">
      {validation.reports.map(report => (
        <div key={report.reportId} className="border border-gray-200 rounded p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="font-semibold text-gray-900 text-xs">{report.reportName}</div>
            <StatusBadge status={report.status} />
          </div>
          <div className="space-y-1 text-xs">
            <div><span className="text-gray-500">Data Source:</span> <span className="font-medium">{report.dataSource.join(', ')}</span></div>
            <div><span className="text-gray-500">Filters:</span> <span className="font-medium">{report.filters.join(', ')}</span></div>
            <div><span className="text-gray-500">Export:</span> <span className="font-medium">{report.exportEnabled ? 'Enabled' : 'Disabled'}</span></div>
          </div>
        </div>
      ))}

      <div className="border border-gray-200 rounded p-3 bg-gray-50">
        <div className="font-semibold text-gray-900 text-xs mb-2">Language Configuration</div>
        <div className="space-y-1 text-xs">
          <div><span className="text-gray-500">Voice Input:</span> <span className="font-medium">{validation.language.voiceInputLanguages.join(', ')}</span></div>
          <div><span className="text-gray-500">Output:</span> <span className="font-medium">{validation.language.outputLanguages.join(', ')}</span></div>
          <div><span className="text-gray-500">Translation:</span> <span className="font-medium">{validation.language.translationMode}</span></div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'FULLY_WIRED': 'bg-green-100 text-green-800',
    'WIRED': 'bg-green-100 text-green-800',
    'COMPLETE': 'bg-green-100 text-green-800',
    'AVAILABLE': 'bg-green-100 text-green-800',
    'PARTIALLY_WIRED': 'bg-yellow-100 text-yellow-800',
    'INCOMPLETE': 'bg-yellow-100 text-yellow-800',
    'NEEDS_REVIEW': 'bg-yellow-100 text-yellow-800',
    'MISCONFIGURED': 'bg-red-100 text-red-800',
    'MISSING': 'bg-red-100 text-red-800',
    'BROKEN': 'bg-red-100 text-red-800',
    'EXTRA': 'bg-blue-100 text-blue-800'
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
