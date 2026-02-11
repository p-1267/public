import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

interface Policy {
  id: string;
  title: string;
  category: string;
  effective_date: string;
  status: string;
}

export const AgencyPoliciesPage: React.FC = () => {
  const { isShowcaseMode, showcaseAgencyId } = useShowcaseMode();
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<Policy[]>([]);

  useEffect(() => {
    loadPolicies();
  }, [showcaseAgencyId, isShowcaseMode]);

  const loadPolicies = async () => {
    if (!showcaseAgencyId) return;

    setLoading(true);
    const { data, error } = await supabase.rpc('get_agency_policies_list', {
      p_agency_id: showcaseAgencyId,
      p_include_simulation: isShowcaseMode,
    });

    if (!error && data) {
      setPolicies(data.policies || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Loading policies...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Policies & Procedures</h1>
        <p className="text-gray-600">Manage standardized policies and protocols</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Policies ({policies.length})</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {policies.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No policies found
            </div>
          ) : (
            policies.map((policy) => (
              <div key={policy.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{policy.title}</h3>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {policy.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Effective {new Date(policy.effective_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className="ml-4 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    {policy.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isShowcaseMode && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Showcase Mode:</strong> In production, you can create, edit, and publish policies with staff acknowledgment tracking.
          </p>
        </div>
      )}
    </div>
  );
};
