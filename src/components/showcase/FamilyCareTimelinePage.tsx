import React, { useState, useEffect } from 'react';
import { useShowcase } from '../../contexts/ShowcaseContext';
import { supabase } from '../../lib/supabase';

type FilterType = 'all' | 'medication' | 'meal' | 'check';

interface CareLog {
  id: string;
  action_type: string;
  description: string;
  timestamp: string;
  caregiver_name?: string;
}

export const FamilyCareTimelinePage: React.FC = () => {
  const { selectedResidentId, isShowcaseMode } = useShowcase();
  const [filter, setFilter] = useState<FilterType>('all');
  const [allCareLogs, setAllCareLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCareTimeline();
  }, [selectedResidentId]);

  const loadCareTimeline = async () => {
    setLoading(true);
    try {
      let residentId = selectedResidentId;

      // If not in showcase mode, get resident from family links
      if (!isShowcaseMode) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: links } = await supabase
          .from('family_resident_links')
          .select('resident_id')
          .eq('family_user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!links) {
          setLoading(false);
          return;
        }
        residentId = links.resident_id;
      }

      if (!residentId) {
        setLoading(false);
        return;
      }

      // Fetch medication administration log
      const { data: medLogs } = await supabase
        .from('medication_administration_log')
        .select(`
          id,
          administered_at,
          dosage_given,
          status,
          resident_medications!inner(medication_name),
          user_profiles(full_name)
        `)
        .eq('resident_id', residentId)
        .order('administered_at', { ascending: false })
        .limit(50);

      // Fetch tasks (meals, checks, etc)
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          category,
          completed_at,
          user_profiles(full_name)
        `)
        .eq('resident_id', residentId)
        .eq('status', 'COMPLETED')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(50);

      // Transform medication logs
      const medCareLogs: CareLog[] = (medLogs || []).map(log => ({
        id: log.id,
        action_type: 'medication',
        description: `${(log.resident_medications as any).medication_name} - ${log.dosage_given || 'Standard dose'} (${log.status})`,
        timestamp: new Date(log.administered_at).toLocaleString(),
        caregiver_name: (log.user_profiles as any)?.full_name
      }));

      // Transform task logs
      const taskCareLogs: CareLog[] = (tasks || []).map(task => ({
        id: task.id,
        action_type: task.category === 'MEAL' ? 'meal' : task.category === 'HYGIENE' || task.category === 'HEALTH_CHECK' ? 'check' : 'activity',
        description: task.title,
        timestamp: new Date(task.completed_at!).toLocaleString(),
        caregiver_name: (task.user_profiles as any)?.full_name
      }));

      // Combine and sort all logs
      const combined = [...medCareLogs, ...taskCareLogs].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setAllCareLogs(combined);
    } catch (err) {
      console.error('Failed to load care timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const careLogs = filter === 'all'
    ? allCareLogs
    : allCareLogs.filter(log => log.action_type === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-2xl text-gray-600">Loading care timeline...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-8 shadow-lg border border-slate-200 mb-6">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Care Timeline
          </h1>
          <p className="text-base text-slate-600">
            Complete history of care activities, medications, and health observations.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 mb-4 shadow-lg border border-slate-200">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-5 py-3 text-base font-bold rounded-lg shadow-md transition-colors ${
                filter === 'all'
                  ? 'text-white bg-gradient-to-r from-blue-600 to-blue-700'
                  : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
              }`}
            >
              All Activity ({allCareLogs.length})
            </button>
            <button
              onClick={() => setFilter('medication')}
              className={`px-5 py-3 text-base font-semibold rounded-lg transition-colors ${
                filter === 'medication'
                  ? 'text-white bg-gradient-to-r from-emerald-600 to-emerald-700'
                  : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
              }`}
            >
              Medications ({allCareLogs.filter(l => l.action_type === 'medication').length})
            </button>
            <button
              onClick={() => setFilter('meal')}
              className={`px-5 py-3 text-base font-semibold rounded-lg transition-colors ${
                filter === 'meal'
                  ? 'text-white bg-gradient-to-r from-amber-600 to-amber-700'
                  : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
              }`}
            >
              Meals ({allCareLogs.filter(l => l.action_type === 'meal').length})
            </button>
            <button
              onClick={() => setFilter('check')}
              className={`px-5 py-3 text-base font-semibold rounded-lg transition-colors ${
                filter === 'check'
                  ? 'text-white bg-gradient-to-r from-sky-600 to-sky-700'
                  : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
              }`}
            >
              Health Checks ({allCareLogs.filter(l => l.action_type === 'check').length})
            </button>
          </div>
        </div>

        {careLogs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-lg border border-slate-200">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              No activity yet
            </h3>
            <p className="text-base text-slate-600">
              Care activities will appear here
            </p>
          </div>
        ) : (
          <div className="relative pl-10">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-300" />

            {careLogs.map((log, idx) => (
              <div
                key={idx}
                className="relative mb-6"
              >
                <div className={`absolute -left-7 top-2 w-3 h-3 rounded-full border-2 border-white shadow-md ${
                  log.action_type === 'medication' ? 'bg-emerald-500' : log.action_type === 'meal' ? 'bg-amber-500' : 'bg-sky-500'
                }`} />

                <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {log.action_type === 'medication' && '💊 Medication'}
                      {log.action_type === 'meal' && '🍽️ Meal'}
                      {log.action_type === 'activity' && '🎯 Activity'}
                      {log.action_type === 'check' && '✓ Check-in'}
                    </h3>
                    <span className="text-sm text-slate-500 font-mono">
                      {log.timestamp}
                    </span>
                  </div>
                  <p className="text-base text-slate-700 leading-relaxed mb-2">
                    {log.description}
                  </p>
                  {log.caregiver_name && (
                    <div className="text-sm text-slate-600">
                      Caregiver: <strong className="font-bold text-slate-900">{log.caregiver_name}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
