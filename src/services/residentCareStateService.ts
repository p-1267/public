import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';

export interface CareStateItem {
  id: string;
  type: 'medication' | 'vital' | 'care_note' | 'incident' | 'signal' | 'task';
  status: 'completed' | 'due' | 'overdue' | 'pending' | 'active';
  description: string;
  scheduledTime?: string;
  completedAt?: string;
  completedBy?: string;
  dueInMinutes?: number;
  overdueMinutes?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  sourceType: string;
  sourceId: string;
  createdAt: string;
  createdBy?: string;
  metadata?: any;
}

export interface ResidentCareState {
  residentId: string;
  residentName: string;
  lastUpdated: string;
  status: 'all_clear' | 'attention_needed' | 'urgent';
  recentActions: CareStateItem[];
  pendingActions: CareStateItem[];
  activeSignals: CareStateItem[];
  nextScheduledAction?: {
    type: string;
    description: string;
    scheduledTime: string;
    dueInMinutes: number;
  };
  summary: {
    completedLast2Hours: number;
    dueSoon: number;
    overdue: number;
    activeIncidents: number;
    activeSignals: number;
  };
}

export class ResidentCareStateService {
  private static instance: ResidentCareStateService;
  private subscriptions: Map<string, any> = new Map();

  static getInstance(): ResidentCareStateService {
    if (!ResidentCareStateService.instance) {
      ResidentCareStateService.instance = new ResidentCareStateService();
    }
    return ResidentCareStateService.instance;
  }

  async fetchResidentCareState(
    residentId: string,
    agencyId?: string,
    windowHours: number = 2
  ): Promise<ResidentCareState> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

    const { data: resident } = await supabase
      .from('residents')
      .select('id, full_name')
      .eq('id', residentId)
      .maybeSingle();

    if (!resident) {
      throw new Error('Resident not found');
    }

    const [
      medications,
      vitals,
      careNotes,
      incidents,
      signals,
      scheduledMeds
    ] = await Promise.all([
      this.fetchRecentMedications(residentId, windowStart),
      this.fetchRecentVitals(residentId, windowStart),
      this.fetchRecentCareNotes(residentId, windowStart),
      this.fetchRecentIncidents(residentId),
      this.fetchActiveSignals(residentId),
      this.fetchScheduledMedications(residentId)
    ]);

    const recentActions: CareStateItem[] = [
      ...medications.completed,
      ...vitals,
      ...careNotes
    ].sort((a, b) =>
      new Date(b.completedAt || b.createdAt).getTime() -
      new Date(a.completedAt || a.createdAt).getTime()
    );

    const pendingActions: CareStateItem[] = [
      ...medications.due,
      ...medications.overdue
    ].sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (b.status === 'overdue' && a.status !== 'overdue') return 1;
      return (a.dueInMinutes || 0) - (b.dueInMinutes || 0);
    });

    const activeSignals: CareStateItem[] = signals;

    const nextScheduled = scheduledMeds[0];

    const summary = {
      completedLast2Hours: recentActions.length,
      dueSoon: medications.due.length,
      overdue: medications.overdue.length,
      activeIncidents: incidents.length,
      activeSignals: signals.length
    };

    let status: 'all_clear' | 'attention_needed' | 'urgent' = 'all_clear';
    if (summary.overdue > 0 || summary.activeIncidents > 0 ||
        signals.some(s => s.severity === 'critical' || s.severity === 'high')) {
      status = 'urgent';
    } else if (summary.dueSoon > 0 || summary.activeSignals > 0) {
      status = 'attention_needed';
    }

    return {
      residentId: resident.id,
      residentName: resident.full_name,
      lastUpdated: now.toISOString(),
      status,
      recentActions,
      pendingActions,
      activeSignals: [...activeSignals, ...incidents],
      nextScheduledAction: nextScheduled,
      summary
    };
  }

  private async fetchRecentMedications(residentId: string, since: Date) {
    const now = new Date();

    const { data: administered } = await supabase
      .from('medication_administration')
      .select(`
        id,
        administered_at,
        status,
        dosage_given,
        medication_id,
        administered_by,
        resident_medications!inner(medication_name, dosage, route)
      `)
      .eq('resident_id', residentId)
      .gte('administered_at', since.toISOString())
      .order('administered_at', { ascending: false });

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name');

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    const completed: CareStateItem[] = (administered || []).map(med => ({
      id: med.id,
      type: 'medication' as const,
      status: 'completed' as const,
      description: `${(med.resident_medications as any).medication_name} ${(med.resident_medications as any).dosage}`,
      completedAt: med.administered_at,
      completedBy: profileMap.get(med.administered_by) || 'Unknown',
      sourceType: 'medication_administration',
      sourceId: med.id,
      createdAt: med.administered_at,
      createdBy: profileMap.get(med.administered_by),
      metadata: {
        status: med.status,
        route: (med.resident_medications as any).route
      }
    }));

    const { data: scheduledMeds } = await supabase
      .from('resident_medications')
      .select('id, medication_name, dosage, schedule_times, last_administered_at')
      .eq('resident_id', residentId)
      .eq('is_active', true)
      .eq('is_prn', false);

    const due: CareStateItem[] = [];
    const overdue: CareStateItem[] = [];

    (scheduledMeds || []).forEach(med => {
      const scheduleTimes = med.schedule_times || [];
      scheduleTimes.forEach((time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduled = new Date(now);
        scheduled.setHours(hours, minutes, 0, 0);

        if (scheduled < now) {
          scheduled.setDate(scheduled.getDate() + 1);
        }

        const dueInMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);

        if (dueInMinutes < 60 && dueInMinutes > 0) {
          due.push({
            id: `${med.id}-${time}`,
            type: 'medication',
            status: 'due',
            description: `${med.medication_name} ${med.dosage}`,
            scheduledTime: scheduled.toISOString(),
            dueInMinutes: Math.floor(dueInMinutes),
            sourceType: 'resident_medications',
            sourceId: med.id,
            createdAt: med.last_administered_at || scheduled.toISOString()
          });
        } else if (dueInMinutes < 0 && dueInMinutes > -60) {
          overdue.push({
            id: `${med.id}-${time}`,
            type: 'medication',
            status: 'overdue',
            description: `${med.medication_name} ${med.dosage}`,
            scheduledTime: scheduled.toISOString(),
            overdueMinutes: Math.abs(Math.floor(dueInMinutes)),
            severity: 'high',
            sourceType: 'resident_medications',
            sourceId: med.id,
            createdAt: med.last_administered_at || scheduled.toISOString()
          });
        }
      });
    });

    return { completed, due, overdue };
  }

  private async fetchRecentVitals(residentId: string, since: Date) {
    const { data: vitals } = await supabase
      .from('vital_signs_simple')
      .select('id, recorded_at, recorded_by, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, temperature, oxygen_saturation')
      .eq('resident_id', residentId)
      .gte('recorded_at', since.toISOString())
      .order('recorded_at', { ascending: false });

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name');

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    return (vitals || []).map(v => ({
      id: v.id,
      type: 'vital' as const,
      status: 'completed' as const,
      description: `Vitals: HR ${v.heart_rate}, BP ${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}, Temp ${v.temperature}°F`,
      completedAt: v.recorded_at,
      completedBy: profileMap.get(v.recorded_by) || 'Unknown',
      sourceType: 'vital_signs_simple',
      sourceId: v.id,
      createdAt: v.recorded_at,
      createdBy: profileMap.get(v.recorded_by),
      metadata: {
        heart_rate: v.heart_rate,
        blood_pressure: `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`,
        temperature: v.temperature,
        oxygen_saturation: v.oxygen_saturation
      }
    }));
  }

  private async fetchRecentCareNotes(residentId: string, since: Date) {
    const { data: notes } = await supabase
      .from('audit_log')
      .select('id, created_at, user_id, details')
      .eq('table_name', 'residents')
      .eq('record_id', residentId)
      .eq('action', 'care_note')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name');

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    return (notes || []).map(n => ({
      id: n.id,
      type: 'care_note' as const,
      status: 'completed' as const,
      description: n.details?.note || 'Care note logged',
      completedAt: n.created_at,
      completedBy: profileMap.get(n.user_id) || 'Unknown',
      sourceType: 'audit_log',
      sourceId: n.id,
      createdAt: n.created_at,
      createdBy: profileMap.get(n.user_id)
    }));
  }

  private async fetchRecentIncidents(residentId: string) {
    const { data: incidents } = await supabase
      .from('audit_log')
      .select('id, created_at, user_id, action, details')
      .eq('table_name', 'residents')
      .eq('record_id', residentId)
      .in('action', ['incident_reported', 'fall_detected', 'emergency'])
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name');

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    return (incidents || []).map(i => ({
      id: i.id,
      type: 'incident' as const,
      status: 'active' as const,
      description: i.action.replace('_', ' ').toUpperCase(),
      severity: 'critical' as const,
      sourceType: 'audit_log',
      sourceId: i.id,
      createdAt: i.created_at,
      createdBy: profileMap.get(i.user_id),
      metadata: i.details
    }));
  }

  private async fetchActiveSignals(residentId: string) {
    const { data: signals } = await supabase
      .from('intelligence_signals')
      .select('id, created_at, signal_type, severity, message, metadata')
      .eq('resident_id', residentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    return (signals || []).map(s => ({
      id: s.id,
      type: 'signal' as const,
      status: 'active' as const,
      description: s.message || s.signal_type,
      severity: s.severity as any,
      sourceType: 'intelligence_signals',
      sourceId: s.id,
      createdAt: s.created_at,
      metadata: s.metadata
    }));
  }

  private async fetchScheduledMedications(residentId: string) {
    const now = new Date();

    const { data: meds } = await supabase
      .from('resident_medications')
      .select('id, medication_name, dosage, schedule_times')
      .eq('resident_id', residentId)
      .eq('is_active', true)
      .eq('is_prn', false);

    const upcoming: any[] = [];

    (meds || []).forEach(med => {
      const scheduleTimes = med.schedule_times || [];
      scheduleTimes.forEach((time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduled = new Date(now);
        scheduled.setHours(hours, minutes, 0, 0);

        if (scheduled < now) {
          scheduled.setDate(scheduled.getDate() + 1);
        }

        const dueInMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);

        upcoming.push({
          type: 'medication',
          description: `${med.medication_name} ${med.dosage}`,
          scheduledTime: scheduled.toISOString(),
          dueInMinutes: Math.floor(dueInMinutes)
        });
      });
    });

    upcoming.sort((a, b) => a.dueInMinutes - b.dueInMinutes);

    return upcoming;
  }

  subscribeResidentCareState(
    residentId: string,
    callback: (state: ResidentCareState) => void
  ): () => void {
    const channelName = `resident_care_state:${residentId}`;

    if (this.subscriptions.has(channelName)) {
      return () => {};
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medication_administration',
          filter: `resident_id=eq.${residentId}`
        },
        () => this.handleRealtimeUpdate(residentId, callback)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vital_signs_simple',
          filter: `resident_id=eq.${residentId}`
        },
        () => this.handleRealtimeUpdate(residentId, callback)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intelligence_signals',
          filter: `resident_id=eq.${residentId}`
        },
        () => this.handleRealtimeUpdate(residentId, callback)
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(channelName);
    };
  }

  private async handleRealtimeUpdate(
    residentId: string,
    callback: (state: ResidentCareState) => void
  ) {
    try {
      const state = await this.fetchResidentCareState(residentId);
      callback(state);
    } catch (error) {
      console.error('Error handling realtime update:', error);
    }
  }

  async checkDuplicateAction(
    residentId: string,
    actionType: 'vitals' | 'medication' | 'prn',
    medicationId?: string,
    windowMinutes: number = 30
  ): Promise<{ isDuplicate: boolean; lastAction?: any }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

    if (actionType === 'vitals') {
      const { data: recent } = await supabase
        .from('vital_signs_simple')
        .select('id, recorded_at, recorded_by, user_profiles!inner(full_name)')
        .eq('resident_id', residentId)
        .gte('recorded_at', windowStart.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (recent && recent.length > 0) {
        return {
          isDuplicate: true,
          lastAction: {
            type: 'vitals',
            timestamp: recent[0].recorded_at,
            by: (recent[0].user_profiles as any).full_name,
            minutesAgo: Math.floor((now.getTime() - new Date(recent[0].recorded_at).getTime()) / (1000 * 60))
          }
        };
      }
    } else if ((actionType === 'medication' || actionType === 'prn') && medicationId) {
      const { data: recent } = await supabase
        .from('medication_administration')
        .select('id, administered_at, administered_by, user_profiles!inner(full_name)')
        .eq('resident_id', residentId)
        .eq('medication_id', medicationId)
        .gte('administered_at', windowStart.toISOString())
        .order('administered_at', { ascending: false })
        .limit(1);

      if (recent && recent.length > 0) {
        return {
          isDuplicate: true,
          lastAction: {
            type: 'medication',
            timestamp: recent[0].administered_at,
            by: (recent[0].user_profiles as any).full_name,
            minutesAgo: Math.floor((now.getTime() - new Date(recent[0].administered_at).getTime()) / (1000 * 60))
          }
        };
      }
    }

    return { isDuplicate: false };
  }

  computeStateFromSources(rawData: any): ResidentCareState {
    return rawData;
  }
}

export const residentCareStateService = ResidentCareStateService.getInstance();
