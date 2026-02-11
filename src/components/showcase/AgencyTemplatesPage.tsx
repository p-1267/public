import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

interface Template {
  id: string;
  name: string;
  type: string;
  used_by: string;
}

export const AgencyTemplatesPage: React.FC = () => {
  const { isShowcaseMode, showcaseAgencyId } = useShowcaseMode();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    loadTemplates();
  }, [showcaseAgencyId, isShowcaseMode]);

  const loadTemplates = async () => {
    if (!showcaseAgencyId) return;

    setLoading(true);
    const { data, error } = await supabase.rpc('get_agency_templates_list', {
      p_agency_id: showcaseAgencyId,
      p_include_simulation: isShowcaseMode,
    });

    if (!error && data) {
      setTemplates(data.templates || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Forms & Templates</h1>
        <p className="text-gray-600">Manage standardized documentation templates</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Templates ({templates.length})</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {templates.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No templates found
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {template.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {template.used_by}
                      </span>
                    </div>
                  </div>
                  <button className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isShowcaseMode && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Showcase Mode:</strong> In production, you can create custom templates, configure form fields, and manage template versions.
          </p>
        </div>
      )}
    </div>
  );
};
