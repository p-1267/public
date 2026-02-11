import React, { useState, useEffect } from 'react';
import { useShowcase } from '../../contexts/ShowcaseContext';
import { supabase } from '../../lib/supabase';

interface ResidentWithStats {
  id: string;
  full_name: string;
  room_number: string;
  medications_due: number;
  care_tasks: number;
  last_checkin: string;
}

export const CaregiverResidentsPage: React.FC = () => {
  const { mockAgencyId } = useShowcase();
  const [residents, setResidents] = useState<ResidentWithStats[]>([]);

  useEffect(() => {
    if (!mockAgencyId) return;
    loadResidentsWithStats();
  }, [mockAgencyId]);

  const loadResidentsWithStats = async () => {
    if (!mockAgencyId) return;

    const { data: residentData } = await supabase.rpc('get_agency_residents', { p_agency_id: mockAgencyId });
    if (!residentData) return;

    const residentsWithStats = await Promise.all(
      residentData.slice(0, 3).map(async (resident: any) => {
        const [medRes, taskRes, checkinRes] = await Promise.all([
          supabase
            .from('resident_medications')
            .select('id', { count: 'exact', head: true })
            .eq('resident_id', resident.id)
            .eq('is_active', true),
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('resident_id', resident.id)
            .in('state', ['scheduled', 'due', 'in_progress']),
          supabase
            .from('observation_events')
            .select('recorded_at')
            .eq('resident_id', resident.id)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        const minutesAgo = checkinRes.data?.recorded_at
          ? Math.floor((Date.now() - new Date(checkinRes.data.recorded_at).getTime()) / 60000)
          : null;

        return {
          id: resident.id,
          full_name: resident.full_name,
          room_number: resident.metadata?.room || 'N/A',
          medications_due: medRes.count || 0,
          care_tasks: taskRes.count || 0,
          last_checkin: minutesAgo !== null ? `${minutesAgo} min ago` : 'No data'
        };
      })
    );

    setResidents(residentsWithStats);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-8 shadow-lg border border-slate-200 mb-6">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            My Residents
          </h1>
          <p className="text-base text-slate-600">
            Residents currently assigned to you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {residents.map((resident) => (
            <div
              key={resident.id}
              className="bg-white rounded-xl p-5 shadow-md border border-slate-200 cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all"
              onClick={() => alert(`Would navigate to ${resident.full_name}'s profile\n\n(Showcase Mode: Profile pages coming soon)`)}
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {resident.full_name}
              </h3>
              <div className="text-base text-slate-600 mb-4">
                Room {resident.room_number}
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
                <div className="flex justify-between text-base">
                  <span className="text-slate-600">Medications Due</span>
                  <span className="font-bold text-slate-900 text-lg">{resident.medications_due}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-slate-600">Care Tasks</span>
                  <span className="font-bold text-slate-900 text-lg">{resident.care_tasks}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-slate-600">Last Check-in</span>
                  <span className="font-bold text-emerald-600 text-lg">{resident.last_checkin}</span>
                </div>
              </div>

              <button className="mt-4 w-full py-3 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all shadow-md">
                View Profile
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
