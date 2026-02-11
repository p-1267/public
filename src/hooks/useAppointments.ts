import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Appointment {
  id: string;
  appointment_type: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  location: string | null;
  provider_name: string | null;
  notes: string | null;
  prep_instructions: Array<{
    type: string;
    text: string;
    priority: number;
  }>;
}

export interface LabTest {
  id: string;
  test_type: string;
  test_name: string;
  description: string | null;
  scheduled_at: string | null;
  status: string;
  location: string | null;
  lab_name: string | null;
  fasting_required: boolean;
  special_prep: string | null;
  prep_instructions: Array<{
    type: string;
    text: string;
    priority: number;
  }>;
}

export function useAppointments(residentId: string | null) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!residentId) {
      setLoading(false);
      return;
    }

    fetchAppointmentsAndTests();
  }, [residentId]);

  const fetchAppointmentsAndTests = async () => {
    if (!residentId) return;

    try {
      setLoading(true);
      setError(null);

      const [appointmentsResult, testsResult] = await Promise.all([
        supabase.rpc('get_upcoming_appointments', {
          p_resident_id: residentId,
          p_days_ahead: 90
        }),
        supabase.rpc('get_upcoming_tests', {
          p_resident_id: residentId,
          p_days_ahead: 90
        })
      ]);

      if (appointmentsResult.error) throw appointmentsResult.error;
      if (testsResult.error) throw testsResult.error;

      setAppointments(appointmentsResult.data || []);
      setTests(testsResult.data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (data: {
    resident_id: string;
    appointment_type: string;
    title: string;
    scheduled_at: string;
    provider_id?: string;
    description?: string;
    duration_minutes?: number;
    location?: string;
    provider_name?: string;
    notes?: string;
    prep_instructions?: Array<{ type: string; text: string; priority?: number }>;
  }) => {
    try {
      const { data: appointmentId, error } = await supabase.rpc('create_appointment', {
        p_resident_id: data.resident_id,
        p_appointment_type: data.appointment_type,
        p_title: data.title,
        p_scheduled_at: data.scheduled_at,
        p_provider_id: data.provider_id || null,
        p_description: data.description || null,
        p_duration_minutes: data.duration_minutes || 30,
        p_location: data.location || null,
        p_provider_name: data.provider_name || null,
        p_notes: data.notes || null,
        p_prep_instructions: data.prep_instructions || []
      });

      if (error) throw error;

      await fetchAppointmentsAndTests();
      return appointmentId;
    } catch (err) {
      console.error('Error creating appointment:', err);
      throw err;
    }
  };

  const updateAppointment = async (
    appointmentId: string,
    updates: {
      title?: string;
      description?: string;
      scheduled_at?: string;
      location?: string;
      notes?: string;
      status?: string;
    }
  ) => {
    try {
      const { error } = await supabase.rpc('update_appointment', {
        p_appointment_id: appointmentId,
        p_title: updates.title || null,
        p_description: updates.description || null,
        p_scheduled_at: updates.scheduled_at || null,
        p_location: updates.location || null,
        p_notes: updates.notes || null,
        p_status: updates.status || null
      });

      if (error) throw error;

      await fetchAppointmentsAndTests();
    } catch (err) {
      console.error('Error updating appointment:', err);
      throw err;
    }
  };

  const cancelAppointment = async (appointmentId: string, reason: string) => {
    try {
      const { error } = await supabase.rpc('cancel_appointment', {
        p_appointment_id: appointmentId,
        p_cancellation_reason: reason
      });

      if (error) throw error;

      await fetchAppointmentsAndTests();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      throw err;
    }
  };

  const rescheduleAppointment = async (
    appointmentId: string,
    newScheduledAt: string,
    reason?: string
  ) => {
    try {
      const { data: newAppointmentId, error } = await supabase.rpc('reschedule_appointment', {
        p_appointment_id: appointmentId,
        p_new_scheduled_at: newScheduledAt,
        p_reason: reason || null
      });

      if (error) throw error;

      await fetchAppointmentsAndTests();
      return newAppointmentId;
    } catch (err) {
      console.error('Error rescheduling appointment:', err);
      throw err;
    }
  };

  const markRunningLate = async (appointmentId: string) => {
    try {
      const { error } = await supabase.rpc('mark_appointment_running_late', {
        p_appointment_id: appointmentId
      });

      if (error) throw error;

      await fetchAppointmentsAndTests();
    } catch (err) {
      console.error('Error marking running late:', err);
      throw err;
    }
  };

  const createLabTest = async (data: {
    resident_id: string;
    test_type: string;
    test_name: string;
    description?: string;
    ordered_by?: string;
    scheduled_at?: string;
    location?: string;
    lab_name?: string;
    fasting_required?: boolean;
    special_prep?: string;
  }) => {
    try {
      const { data: testId, error } = await supabase.rpc('create_lab_test', {
        p_resident_id: data.resident_id,
        p_test_type: data.test_type,
        p_test_name: data.test_name,
        p_description: data.description || null,
        p_ordered_by: data.ordered_by || null,
        p_scheduled_at: data.scheduled_at || null,
        p_location: data.location || null,
        p_lab_name: data.lab_name || null,
        p_fasting_required: data.fasting_required || false,
        p_special_prep: data.special_prep || null
      });

      if (error) throw error;

      await fetchAppointmentsAndTests();
      return testId;
    } catch (err) {
      console.error('Error creating lab test:', err);
      throw err;
    }
  };

  const updateLabTest = async (
    testId: string,
    updates: {
      scheduled_at?: string;
      location?: string;
      status?: string;
      notes?: string;
    }
  ) => {
    try {
      const { error } = await supabase.rpc('update_lab_test', {
        p_test_id: testId,
        p_scheduled_at: updates.scheduled_at || null,
        p_location: updates.location || null,
        p_status: updates.status || null,
        p_notes: updates.notes || null
      });

      if (error) throw error;

      await fetchAppointmentsAndTests();
    } catch (err) {
      console.error('Error updating lab test:', err);
      throw err;
    }
  };

  return {
    appointments,
    tests,
    loading,
    error,
    refresh: fetchAppointmentsAndTests,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    rescheduleAppointment,
    markRunningLate,
    createLabTest,
    updateLabTest
  };
}
