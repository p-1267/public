import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TaskDashboard } from './TaskDashboard';
import { SupervisorOverview } from './SupervisorOverview';
import { HandoffSummary } from './HandoffSummary';
import { EscalationNotifications } from './EscalationNotifications';
import '../styles/animations.css';

export function TaskEnginePage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRoleAndHandoff();
  }, []);

  const checkUserRoleAndHandoff = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select(`
        role_id,
        role:roles(name)
      `)
      .eq('id', user.id)
      .single();

    if (profile) {
      setUserRole((profile.role as any)?.name || null);
    }

    const { data: handoff } = await supabase
      .from('handoff_summaries')
      .select('id')
      .eq('to_user_id', user.id)
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (handoff) {
      setShowHandoff(true);
    }

    setLoading(false);
  };

  const handleHandoffAcknowledge = () => {
    setShowHandoff(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (showHandoff) {
    return <HandoffSummary onAcknowledge={handleHandoffAcknowledge} />;
  }

  return (
    <div className="relative">
      {userRole === 'SUPERVISOR' || userRole === 'AGENCY_ADMIN' ? (
        <SupervisorOverview />
      ) : (
        <TaskDashboard />
      )}
      <EscalationNotifications />
    </div>
  );
}
