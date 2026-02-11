import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface RPCExecution {
  id: string;
  rpc_name: string;
  parameters: any;
  status: string;
  result: any;
  error_message: string | null;
  execution_time_ms: number | null;
  start_time: string;
  end_time: string | null;
}

export function RPCExecutionTracer({ agencyId }: { agencyId: string }) {
  const [executions, setExecutions] = useState<RPCExecution[]>([]);
  const [selectedRPC, setSelectedRPC] = useState<RPCExecution | null>(null);

  useEffect(() => {
    loadExecutions();
    const subscription = subscribeToExecutions();
    return () => {
      subscription.unsubscribe();
    };
  }, [agencyId]);

  const loadExecutions = async () => {
    const { data } = await supabase
      .from('rpc_execution_log')
      .select('*')
      .eq('agency_id', agencyId)
      .order('start_time', { ascending: false })
      .limit(50);

    if (data) setExecutions(data);
  };

  const subscribeToExecutions = () => {
    return supabase
      .channel('rpc_executions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rpc_execution_log',
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload) => {
          setExecutions((prev) => [payload.new as RPCExecution, ...prev].slice(0, 50));
        }
      )
      .subscribe();
  };

  const getStatusColor = (status: string) => {
    return status === 'success'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">RPC Execution Tracer</h2>
      <p className="text-sm text-gray-600 mb-6">
        Real-time visibility into all RPC calls and their results
      </p>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {executions.map((rpc) => (
            <button
              key={rpc.id}
              onClick={() => setSelectedRPC(rpc)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                selectedRPC?.id === rpc.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-gray-900">
                  {rpc.rpc_name}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    rpc.status
                  )}`}
                >
                  {rpc.status}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {rpc.execution_time_ms}ms • {new Date(rpc.start_time).toLocaleTimeString()}
              </div>
            </button>
          ))}
        </div>

        <div className="border-l-2 border-gray-200 pl-6">
          {selectedRPC ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">RPC Name</h3>
                <p className="text-sm text-gray-700">{selectedRPC.rpc_name}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Parameters</h3>
                <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto">
                  {JSON.stringify(selectedRPC.parameters, null, 2)}
                </pre>
              </div>
              {selectedRPC.result && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Result</h3>
                  <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto">
                    {JSON.stringify(selectedRPC.result, null, 2)}
                  </pre>
                </div>
              )}
              {selectedRPC.error_message && (
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Error</h3>
                  <div className="bg-red-50 rounded p-3 text-sm text-red-700">
                    {selectedRPC.error_message}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select an RPC to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
