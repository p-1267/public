import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface StateTransition {
  id: string;
  entity_type: string;
  entity_id: string;
  transition_type: string;
  from_state: any;
  to_state: any;
  trigger_event: string | null;
  validation_passed: boolean;
  created_at: string;
}

export function StateTransitionVisualizer({ agencyId }: { agencyId: string }) {
  const [transitions, setTransitions] = useState<StateTransition[]>([]);
  const [selectedTransition, setSelectedTransition] = useState<StateTransition | null>(
    null
  );
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadTransitions();
    const subscription = subscribeToTransitions();
    return () => {
      subscription.unsubscribe();
    };
  }, [agencyId, filterType]);

  const loadTransitions = async () => {
    let query = supabase
      .from('state_transition_log')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (filterType !== 'all') {
      query = query.eq('entity_type', filterType);
    }

    const { data } = await query;
    if (data) setTransitions(data);
  };

  const subscribeToTransitions = () => {
    return supabase
      .channel('state_transitions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'state_transition_log',
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload) => {
          setTransitions((prev) =>
            [payload.new as StateTransition, ...prev].slice(0, 50)
          );
        }
      )
      .subscribe();
  };

  const getValidationColor = (passed: boolean) => {
    return passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            State Transition Visualizer
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Track all state changes across the system
          </p>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="brain_state">Brain State</option>
          <option value="task">Task</option>
          <option value="assignment">Assignment</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {transitions.map((transition) => (
            <button
              key={transition.id}
              onClick={() => setSelectedTransition(transition)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                selectedTransition?.id === transition.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {transition.entity_type}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getValidationColor(
                    transition.validation_passed
                  )}`}
                >
                  {transition.validation_passed ? 'Valid' : 'Invalid'}
                </span>
              </div>
              <div className="text-xs text-gray-600">{transition.transition_type}</div>
              <div className="text-xs text-gray-500">
                {new Date(transition.created_at).toLocaleTimeString()}
              </div>
            </button>
          ))}
        </div>

        <div className="border-l-2 border-gray-200 pl-6">
          {selectedTransition ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Transition Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Entity Type:</span>{' '}
                    <span className="font-medium">{selectedTransition.entity_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Transition:</span>{' '}
                    <span className="font-medium">
                      {selectedTransition.transition_type}
                    </span>
                  </div>
                  {selectedTransition.trigger_event && (
                    <div>
                      <span className="text-gray-600">Trigger:</span>{' '}
                      <span className="font-medium">
                        {selectedTransition.trigger_event}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">From State</h3>
                <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto">
                  {JSON.stringify(selectedTransition.from_state, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-center py-2">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">To State</h3>
                <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto">
                  {JSON.stringify(selectedTransition.to_state, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select a transition to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
