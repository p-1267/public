import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useOperatingMode } from '../hooks/useOperatingMode';
import { useAppointments } from '../hooks/useAppointments';
import { LanguageSwitcher } from './LanguageSwitcher';

export function FamilyAdminDashboard() {
  const [resident, setResident] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { mode, setOperatingMode, isFamilyAdmin } = useOperatingMode(resident?.id);
  const { appointments, tests, createAppointment, cancelAppointment } = useAppointments(resident?.id);

  useEffect(() => {
    loadResidentData();
  }, []);

  const loadResidentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: links } = await supabase
        .from('senior_resident_links')
        .select('resident_id')
        .eq('senior_user_id', user.id)
        .maybeSingle();

      if (links) {
        const { data: residentData } = await supabase
          .from('residents')
          .select('*')
          .eq('id', links.resident_id)
          .single();

        setResident(residentData);

        const { data: meds } = await supabase
          .from('resident_medications')
          .select('*')
          .eq('resident_id', links.resident_id)
          .eq('status', 'ACTIVE');

        setMedications(meds || []);
      }
    } catch (err) {
      console.error('Error loading resident data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = async () => {
    try {
      const newMode = isFamilyAdmin ? 'SELF_MANAGE' : 'FAMILY_ADMIN';
      await setOperatingMode(newMode as any, `User switched to ${newMode}`);
    } catch (err) {
      alert('Failed to switch mode');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl p-12 text-center max-w-2xl">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">No Resident Profile</h1>
          <p className="text-2xl text-gray-600">Please contact support to link your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b-2 border-gray-200 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900">
              {resident.first_name} {resident.last_name}
            </h1>
            <p className="text-2xl text-gray-600 mt-2">
              Mode: <span className="font-semibold">{mode}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <LanguageSwitcher />
            <button
              onClick={handleModeSwitch}
              className={`px-8 py-4 rounded-xl text-2xl font-bold text-white transition-colors ${
                isFamilyAdmin
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isFamilyAdmin ? 'Switch to Self-Manage' : 'Enable Family Admin'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="bg-white rounded-2xl p-8 shadow-md">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Medications</h2>
          {medications.length === 0 ? (
            <p className="text-2xl text-gray-500">No medications</p>
          ) : (
            <div className="space-y-4">
              {medications.map(med => (
                <div key={med.id} className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                  <h3 className="text-3xl font-bold text-gray-900">{med.medication_name}</h3>
                  <p className="text-2xl text-gray-700">
                    {med.dosage} {med.dosage_unit} - {med.frequency}
                  </p>
                  {med.scheduled_time && (
                    <p className="text-xl text-gray-600 mt-2">Time: {med.scheduled_time}</p>
                  )}
                  {isFamilyAdmin && (
                    <button className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xl font-semibold transition-colors">
                      Edit Medication
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-md">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Appointments</h2>
          {appointments.length === 0 ? (
            <p className="text-2xl text-gray-500">No upcoming appointments</p>
          ) : (
            <div className="space-y-4">
              {appointments.map(apt => (
                <div key={apt.id} className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                  <h3 className="text-3xl font-bold text-gray-900">{apt.title}</h3>
                  <p className="text-2xl text-gray-700">
                    {new Date(apt.scheduled_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                  {apt.provider_name && (
                    <p className="text-xl text-gray-600 mt-2">Provider: {apt.provider_name}</p>
                  )}
                  {isFamilyAdmin && (
                    <button className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xl font-semibold transition-colors">
                      Manage Appointment
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 rounded-2xl p-8 border-2 border-blue-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Operating Mode Info</h2>
          {isFamilyAdmin ? (
            <div>
              <p className="text-2xl text-gray-700 mb-4">
                ✓ Family Admin Mode is <span className="font-bold text-blue-600">ACTIVE</span>
              </p>
              <ul className="text-xl text-gray-700 space-y-2">
                <li>• You can manage medications, appointments, and documents</li>
                <li>• Senior still has read access to all information</li>
                <li>• All changes are logged for transparency</li>
              </ul>
            </div>
          ) : (
            <div>
              <p className="text-2xl text-gray-700 mb-4">
                ✓ Self-Manage Mode is <span className="font-bold text-blue-600">ACTIVE</span>
              </p>
              <ul className="text-xl text-gray-700 space-y-2">
                <li>• You have full control of your health information</li>
                <li>• Family can view but not modify</li>
                <li>• Switch to Family Admin mode if you need help</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
