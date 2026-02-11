import React, { useState } from 'react';
import { useSeniorResident } from '../hooks/useSeniorResident';
import { supabase } from '../lib/supabase';

export const SeniorHealthInputsPageReal: React.FC = () => {
  const { resident, loading } = useSeniorResident();
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [weight, setWeight] = useState('');
  const [temperature, setTemperature] = useState('');
  const [painLevel, setPainLevel] = useState('0');
  const [mood, setMood] = useState('Good');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-2xl text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-2xl text-gray-600">No resident found</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!resident) return;

    setSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const metrics: any[] = [];

      if (systolic && diastolic) {
        metrics.push({
          resident_id: resident.id,
          metric_type: 'BLOOD_PRESSURE_SYSTOLIC',
          value: parseFloat(systolic),
          unit: 'mmHg',
          measured_at: timestamp,
          source: 'MANUAL_ENTRY',
          confidence: 'HIGH'
        });
        metrics.push({
          resident_id: resident.id,
          metric_type: 'BLOOD_PRESSURE_DIASTOLIC',
          value: parseFloat(diastolic),
          unit: 'mmHg',
          measured_at: timestamp,
          source: 'MANUAL_ENTRY',
          confidence: 'HIGH'
        });
      }

      if (heartRate) {
        metrics.push({
          resident_id: resident.id,
          metric_type: 'HEART_RATE',
          value: parseFloat(heartRate),
          unit: 'bpm',
          measured_at: timestamp,
          source: 'MANUAL_ENTRY',
          confidence: 'HIGH'
        });
      }

      if (weight) {
        metrics.push({
          resident_id: resident.id,
          metric_type: 'WEIGHT',
          value: parseFloat(weight),
          unit: 'lbs',
          measured_at: timestamp,
          source: 'MANUAL_ENTRY',
          confidence: 'HIGH'
        });
      }

      if (temperature) {
        metrics.push({
          resident_id: resident.id,
          metric_type: 'BODY_TEMPERATURE',
          value: parseFloat(temperature),
          unit: 'F',
          measured_at: timestamp,
          source: 'MANUAL_ENTRY',
          confidence: 'HIGH'
        });
      }

      if (metrics.length > 0) {
        const { error } = await supabase
          .from('health_metrics')
          .insert(metrics);

        if (error) throw error;
      }

      // Also log in observation events for brain
      if (notes || painLevel !== '0' || mood !== 'Good') {
        await supabase.from('observation_events').insert({
          resident_id: resident.id,
          agency_id: resident.agency_id,
          caregiver_id: resident.id, // Self-reported
          event_type: 'health_self_report',
          event_subtype: 'pain_mood_assessment',
          event_timestamp: timestamp,
          event_data: {
            pain_level: painLevel,
            mood,
            notes,
            manually_entered: true
          },
          requires_followup: parseInt(painLevel) >= 7 // High pain requires followup
        });
      }

      alert('Health data logged successfully!\n\nYour care team has been notified.');

      // Clear form
      setSystolic('');
      setDiastolic('');
      setHeartRate('');
      setWeight('');
      setTemperature('');
      setPainLevel('0');
      setMood('Good');
      setNotes('');
    } catch (err) {
      console.error('Error logging health data:', err);
      alert('Failed to log health data');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Health Inputs
          </h1>
          <p className="text-2xl text-gray-600">
            Log your daily health measurements
          </p>
        </div>

        <div className="space-y-6">
          {/* Blood Pressure */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Blood Pressure
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Record your blood pressure readings
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  Systolic (top number)
                </label>
                <input
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="e.g., 120"
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  Diastolic (bottom number)
                </label>
                <input
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="e.g., 80"
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Heart Rate */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Heart Rate
            </h2>

            <div>
              <label className="block text-2xl font-semibold text-gray-700 mb-2">
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="e.g., 72"
                className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Weight & Temperature */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Weight & Temperature
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g., 165"
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  Temperature (°F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="e.g., 98.6"
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Symptoms & How You Feel */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Symptoms & How You Feel
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  Pain Level (0-10)
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painLevel}
                  onChange={(e) => setPainLevel(e.target.value)}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-lg text-gray-600">0 (No pain)</span>
                  <span className="text-3xl font-bold text-gray-900">{painLevel}</span>
                  <span className="text-lg text-gray-600">10 (Worst pain)</span>
                </div>
              </div>

              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  How do you feel today?
                </label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  <option>Great</option>
                  <option>Good</option>
                  <option>Okay</option>
                  <option>Not well</option>
                  <option>Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  Any symptoms or notes?
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe any symptoms, concerns, or how you're feeling..."
                  rows={4}
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full mt-8 p-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-2xl shadow-lg text-2xl font-semibold transition-colors"
        >
          {submitting ? 'Logging...' : 'Log Health Data'}
        </button>

        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
          <p className="text-xl text-blue-800">
            💡 Your care team monitors these values. They'll reach out if they see any concerning changes.
          </p>
        </div>
      </div>
    </div>
  );
};
