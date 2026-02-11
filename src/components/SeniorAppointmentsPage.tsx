import React, { useState, useEffect } from 'react';
import { useAppointments, Appointment, LabTest } from '../hooks/useAppointments';
import { useSeniorResident } from '../hooks/useSeniorResident';
import { useShowcase } from '../contexts/ShowcaseContext';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';

export function SeniorAppointmentsPage() {
  const { resident: authResident } = useSeniorResident();
  const { selectedResidentId } = useShowcase();
  const [showcaseResident, setShowcaseResident] = useState<any>(null);

  useEffect(() => {
    if (SHOWCASE_MODE && selectedResidentId) {
      supabase
        .from('residents')
        .select('*')
        .eq('id', selectedResidentId)
        .maybeSingle()
        .then(({ data }) => setShowcaseResident(data));
    }
  }, [selectedResidentId]);

  const resident = SHOWCASE_MODE && selectedResidentId ? showcaseResident : authResident;
  const { appointments, tests, loading, createAppointment, cancelAppointment, rescheduleAppointment, markRunningLate } = useAppointments(resident?.id || null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Appointment | LabTest | null>(null);

  if (!resident) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-2xl text-gray-600">Loading...</p>
      </div>
    );
  }

  const upcomingItems = [
    ...appointments.map(a => ({ ...a, itemType: 'appointment' as const })),
    ...tests.map(t => ({ ...t, itemType: 'test' as const }))
  ].sort((a, b) => {
    const dateA = a.itemType === 'appointment' ? a.scheduled_at : a.scheduled_at || a.id;
    const dateB = b.itemType === 'appointment' ? b.scheduled_at : b.scheduled_at || b.id;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Appointments & Tests
          </h1>
          <p className="text-2xl text-gray-600">
            Your upcoming visits and lab work
          </p>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full mb-8 p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg text-2xl font-semibold transition-colors"
        >
          + Request New Appointment
        </button>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          </div>
        ) : upcomingItems.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center">
            <p className="text-3xl text-gray-500">No upcoming appointments or tests</p>
            <p className="text-xl text-gray-400 mt-4">
              Tap the button above to request a new appointment
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingItems.map((item) => (
              <AppointmentCard
                key={item.id}
                item={item}
                onSelect={() => setSelectedItem(item)}
                onRunningLate={item.itemType === 'appointment' ? () => markRunningLate(item.id) : undefined}
              />
            ))}
          </div>
        )}

        {showCreateForm && (
          <CreateAppointmentModal
            residentId={resident.id}
            onClose={() => setShowCreateForm(false)}
            onCreate={createAppointment}
          />
        )}

        {selectedItem && (
          <AppointmentDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onCancel={selectedItem.itemType === 'appointment' ? cancelAppointment : undefined}
            onReschedule={selectedItem.itemType === 'appointment' ? rescheduleAppointment : undefined}
          />
        )}
      </div>
    </div>
  );
}

interface AppointmentCardProps {
  item: (Appointment & { itemType: 'appointment' }) | (LabTest & { itemType: 'test' });
  onSelect: () => void;
  onRunningLate?: () => void;
}

function AppointmentCard({ item, onSelect, onRunningLate }: AppointmentCardProps) {
  const scheduledDate = item.itemType === 'appointment' ? new Date(item.scheduled_at) : (item.scheduled_at ? new Date(item.scheduled_at) : null);
  const title = item.itemType === 'appointment' ? item.title : item.test_name;
  const location = item.itemType === 'appointment' ? item.location : item.location;
  const provider = item.itemType === 'appointment' ? item.provider_name : item.lab_name;

  const isToday = scheduledDate &&
    scheduledDate.toDateString() === new Date().toDateString();

  const isTomorrow = scheduledDate &&
    scheduledDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

  const statusColor = item.status === 'SCHEDULED' || item.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                      item.status === 'RUNNING_LATE' ? 'bg-yellow-100 text-yellow-800' :
                      item.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800';

  return (
    <div
      data-testid="appointment-row"
      onClick={onSelect}
      className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-400 cursor-pointer transition-all shadow-sm hover:shadow-md"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-3xl font-bold text-gray-900 mb-2">{title}</h3>
          {scheduledDate && (
            <div className="text-2xl text-gray-700 mb-2">
              {isToday && <span className="font-semibold text-blue-600">Today</span>}
              {isTomorrow && <span className="font-semibold text-blue-600">Tomorrow</span>}
              {!isToday && !isTomorrow && scheduledDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' at '}
              {scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
          {provider && <p className="text-xl text-gray-600">{provider}</p>}
          {location && <p className="text-xl text-gray-600">{location}</p>}
        </div>
        <span className={`px-4 py-2 rounded-full text-lg font-semibold ${statusColor}`}>
          {item.status}
        </span>
      </div>

      {item.itemType === 'test' && item.fasting_required && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
          <p className="text-xl font-semibold text-yellow-800">Fasting Required</p>
          <p className="text-lg text-yellow-700">No food or drink (except water) for 8-12 hours before test</p>
        </div>
      )}

      {item.prep_instructions && item.prep_instructions.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-xl font-semibold text-blue-800 mb-2">Preparation Instructions:</p>
          <ul className="space-y-1">
            {item.prep_instructions.map((instr, idx) => (
              <li key={idx} className="text-lg text-blue-700">• {instr.text}</li>
            ))}
          </ul>
        </div>
      )}

      {isToday && onRunningLate && item.status === 'SCHEDULED' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRunningLate();
          }}
          className="w-full mt-4 p-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-xl font-semibold transition-colors"
        >
          I'm Running Late
        </button>
      )}
    </div>
  );
}

interface CreateAppointmentModalProps {
  residentId: string;
  onClose: () => void;
  onCreate: (data: any) => Promise<string>;
}

function CreateAppointmentModal({ residentId, onClose, onCreate }: CreateAppointmentModalProps) {
  const [title, setTitle] = useState('');
  const [providerName, setProviderName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title || !scheduledAt) return;

    setSubmitting(true);
    try {
      await onCreate({
        resident_id: residentId,
        appointment_type: 'DOCTOR_VISIT',
        title,
        provider_name: providerName || undefined,
        scheduled_at: scheduledAt,
        location: location || undefined,
        notes: notes || undefined
      });
      onClose();
    } catch (err) {
      console.error('Error creating appointment:', err);
      alert('Failed to create appointment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-6">Request Appointment</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              What type of visit?
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Doctor checkup, Follow-up visit"
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              Doctor or Clinic
            </label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="Dr. Smith, Main St Clinic"
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              When?
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="123 Main St, Suite 100"
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={3}
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            className="flex-1 p-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-2xl font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title || !scheduledAt || submitting}
            className="flex-1 p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-2xl font-semibold transition-colors"
          >
            {submitting ? 'Creating...' : 'Request Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AppointmentDetailModalProps {
  item: (Appointment & { itemType: 'appointment' }) | (LabTest & { itemType: 'test' });
  onClose: () => void;
  onCancel?: (id: string, reason: string) => Promise<void>;
  onReschedule?: (id: string, newDate: string, reason?: string) => Promise<string>;
}

function AppointmentDetailModal({ item, onClose, onCancel, onReschedule }: AppointmentDetailModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');

  const handleCancel = async () => {
    if (!onCancel || !cancelReason) return;

    try {
      await onCancel(item.id, cancelReason);
      onClose();
    } catch (err) {
      alert('Failed to cancel appointment');
    }
  };

  const handleReschedule = async () => {
    if (!onReschedule || !newDate) return;

    try {
      await onReschedule(item.id, newDate, 'Rescheduled by resident');
      onClose();
    } catch (err) {
      alert('Failed to reschedule appointment');
    }
  };

  const title = item.itemType === 'appointment' ? item.title : item.test_name;
  const scheduledDate = item.itemType === 'appointment' ? new Date(item.scheduled_at) : (item.scheduled_at ? new Date(item.scheduled_at) : null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-6">{title}</h2>

        {scheduledDate && (
          <div className="mb-6">
            <p className="text-2xl text-gray-700 font-semibold">
              {scheduledDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-2xl text-gray-700">
              {scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        )}

        {item.itemType === 'appointment' && item.provider_name && (
          <div className="mb-4">
            <p className="text-xl text-gray-600">Provider: {item.provider_name}</p>
          </div>
        )}

        {item.itemType === 'test' && item.lab_name && (
          <div className="mb-4">
            <p className="text-xl text-gray-600">Lab: {item.lab_name}</p>
          </div>
        )}

        {item.itemType === 'appointment' && item.location && (
          <div className="mb-4">
            <p className="text-xl text-gray-600">Location: {item.location}</p>
          </div>
        )}

        {item.itemType === 'test' && item.location && (
          <div className="mb-4">
            <p className="text-xl text-gray-600">Location: {item.location}</p>
          </div>
        )}

        {!showCancelConfirm && !showReschedule && (
          <div className="flex flex-col gap-4 mt-8">
            {onReschedule && item.status !== 'CANCELLED' && (
              <button
                onClick={() => setShowReschedule(true)}
                className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-2xl font-semibold transition-colors"
              >
                Reschedule
              </button>
            )}
            {onCancel && item.status !== 'CANCELLED' && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full p-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-2xl font-semibold transition-colors"
              >
                Cancel Appointment
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full p-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-2xl font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {showCancelConfirm && (
          <div className="mt-8">
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              Why are you cancelling?
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Optional reason..."
              rows={3}
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 p-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-2xl font-semibold transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 p-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-2xl font-semibold transition-colors"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        )}

        {showReschedule && (
          <div className="mt-8">
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              New Date & Time
            </label>
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowReschedule(false)}
                className="flex-1 p-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-2xl font-semibold transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleReschedule}
                disabled={!newDate}
                className="flex-1 p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-2xl font-semibold transition-colors"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
