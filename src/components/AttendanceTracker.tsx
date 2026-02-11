import { useState, useEffect } from 'react';
import { useAttendance } from '../hooks/useAttendance';

interface Props {
  shiftId: string;
  caregiverId: string;
  caregiverName: string;
}

export function AttendanceTracker({ shiftId, caregiverId, caregiverName }: Props) {
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { getShiftAttendance, clockIn, clockOut } = useAttendance();

  useEffect(() => {
    loadAttendance();
  }, [shiftId]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const data = await getShiftAttendance(shiftId);
      setAttendance(data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setProcessing(true);
      setMessage(null);

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await clockIn({
        shiftId,
        deviceFingerprint: navigator.userAgent,
        connectivityState: navigator.onLine ? 'ONLINE' : 'OFFLINE',
        deviceTimestamp: new Date().toISOString(),
        gpsLatitude: position.coords.latitude,
        gpsLongitude: position.coords.longitude,
        gpsAccuracy: position.coords.accuracy
      });

      setMessage({ type: 'success', text: 'Clocked in successfully' });
      loadAttendance();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to clock in' });
    } finally {
      setProcessing(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setProcessing(true);
      setMessage(null);

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await clockOut({
        shiftId,
        deviceFingerprint: navigator.userAgent,
        connectivityState: navigator.onLine ? 'ONLINE' : 'OFFLINE',
        deviceTimestamp: new Date().toISOString(),
        gpsLatitude: position.coords.latitude,
        gpsLongitude: position.coords.longitude,
        gpsAccuracy: position.coords.accuracy
      });

      setMessage({ type: 'success', text: 'Clocked out successfully' });
      loadAttendance();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to clock out' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading attendance...</div>
      </div>
    );
  }

  const hasClockIn = attendance?.clock_in !== null;
  const hasClockOut = attendance?.clock_out !== null;
  const isComplete = attendance?.is_complete || false;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-2">Attendance Tracking</h2>
      <p className="text-gray-600 mb-6">{caregiverName}</p>

      {message && (
        <div className={`border rounded p-4 mb-6 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className={`border rounded p-4 ${hasClockIn ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold">Clock In</div>
              {hasClockIn ? (
                <div className="text-sm text-gray-600 mt-1">
                  {new Date(attendance.clock_in.timestamp).toLocaleString()}
                </div>
              ) : (
                <div className="text-sm text-gray-600 mt-1">Not clocked in</div>
              )}
            </div>
            {hasClockIn ? (
              <span className="text-green-600 font-bold">✓</span>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Clock In'}
              </button>
            )}
          </div>
        </div>

        <div className={`border rounded p-4 ${hasClockOut ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold">Clock Out</div>
              {hasClockOut ? (
                <div className="text-sm text-gray-600 mt-1">
                  {new Date(attendance.clock_out.timestamp).toLocaleString()}
                </div>
              ) : (
                <div className="text-sm text-gray-600 mt-1">Not clocked out</div>
              )}
            </div>
            {hasClockOut ? (
              <span className="text-green-600 font-bold">✓</span>
            ) : (
              <button
                onClick={handleClockOut}
                disabled={processing || !hasClockIn}
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Clock Out'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isComplete && attendance.duration_minutes && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <div className="font-semibold text-blue-900">Shift Duration</div>
          <div className="text-2xl font-bold text-blue-800 mt-1">
            {(attendance.duration_minutes / 60).toFixed(2)} hours
          </div>
          <div className="text-sm text-blue-700 mt-1">
            {attendance.duration_minutes.toFixed(0)} minutes
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mt-6">
        <p className="text-sm text-yellow-800 font-semibold">Attendance Evidence:</p>
        <p className="text-sm text-yellow-800 mt-1">
          All clock events are GPS-verified and server-timestamped. Once sealed, attendance becomes immutable for payroll and billing.
        </p>
      </div>
    </div>
  );
}
