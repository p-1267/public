import React, { useEffect, useState } from 'react';
import { BrainOutputService, type BrainOutput, type BrainOutputContext } from '../services/brainOutputService';

interface BrainOutputPanelProps {
  context: BrainOutputContext;
  title?: string;
  compact?: boolean;
}

export function BrainOutputPanel({ context, title = 'System Observation', compact = false }: BrainOutputPanelProps) {
  const [outputs, setOutputs] = useState<BrainOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadOutputs() {
      try {
        setLoading(true);
        setError(null);
        const data = await BrainOutputService.generateOutputs(context);
        if (mounted) {
          setOutputs(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load system observations');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadOutputs();

    return () => {
      mounted = false;
    };
  }, [context.residentId, context.agencyId, context.shiftId, context.windowHours]);

  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-slate-600">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Loading system observations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">Unable to load observations: {error}</p>
      </div>
    );
  }

  if (outputs.length === 0) {
    return null;
  }

  const severityStyles = {
    INFO: 'bg-blue-50 border-blue-200',
    ATTENTION: 'bg-amber-50 border-amber-300',
    URGENT: 'bg-red-50 border-red-300'
  };

  const severityBadgeStyles = {
    INFO: 'bg-blue-100 text-blue-800',
    ATTENTION: 'bg-amber-100 text-amber-900',
    URGENT: 'bg-red-100 text-red-900'
  };

  const severityIcons = {
    INFO: (
      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    ATTENTION: (
      <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    URGENT: (
      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  };

  return (
    <div className="bg-white border-2 border-slate-300 rounded-lg overflow-hidden">
      <div className="bg-slate-100 border-b border-slate-300 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
          </svg>
          <h3 className="font-bold text-slate-900">{title}</h3>
          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium">
            {outputs.length} {outputs.length === 1 ? 'observation' : 'observations'}
          </span>
        </div>
      </div>

      <div className={compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}>
        {outputs.map((output, index) => (
          <div
            key={`${output.type}-${index}`}
            className={`border-2 rounded-lg ${severityStyles[output.severity]} ${compact ? 'p-2' : 'p-3'}`}
          >
            <div className="flex items-start gap-2 mb-2">
              <div className="mt-0.5">
                {severityIcons[output.severity]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${severityBadgeStyles[output.severity]}`}>
                    {output.severity}
                  </span>
                  {output.confidence < 1.0 && (
                    <span className="text-xs text-slate-600">
                      {Math.round(output.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <p className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>
                  {output.observation}
                </p>
              </div>
            </div>

            {!compact && (
              <>
                <div className="mb-2 pl-7">
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">Why it matters:</span> {output.whyItMatters}
                  </p>
                </div>

                <div className="bg-white bg-opacity-60 rounded p-2 mb-2 pl-7">
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">Current status:</span> {output.currentRiskFraming}
                  </p>
                </div>
              </>
            )}

            <div className="pl-7">
              <details className="group">
                <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-800 font-medium list-none flex items-center gap-1">
                  <svg className="w-4 h-4 group-open:rotate-90 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  System boundaries & data sources
                </summary>
                <div className="mt-2 pl-5 border-l-2 border-slate-300">
                  <p className="text-xs text-slate-700 mb-2 italic">
                    {output.explicitBoundaries}
                  </p>
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Data sources:</span> {output.dataSource.join(', ')}
                  </p>
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Time window:</span>{' '}
                    {new Date(output.timeWindow.start).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}{' '}
                    to{' '}
                    {new Date(output.timeWindow.end).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2">
        <p className="text-xs text-slate-600 italic">
          This layer is read-only. The system observes and explains but does not execute actions, make clinical decisions, or predict outcomes.
        </p>
      </div>
    </div>
  );
}
