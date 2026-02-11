import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface HourBreakdown {
  shift_id: string;
  shift_date: string;
  clock_in: string;
  clock_out: string;
  hours_worked: number;
  hourly_rate: number;
  shift_amount: number;
  overtime_hours?: number;
  overtime_rate?: number;
}

export function PayrollDetailBreakdown({ caregiverId, startDate, endDate }: {
  caregiverId: string;
  startDate: string;
  endDate: string;
}) {
  const [breakdown, setBreakdown] = useState<HourBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ hours: 0, amount: 0, shifts: 0 });

  useEffect(() => {
    loadBreakdown();
  }, [caregiverId, startDate, endDate]);

  const loadBreakdown = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_caregiver_hours', {
        p_caregiver_id: caregiverId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;

      const hours = data || [];
      setBreakdown(hours);

      const totalHours = hours.reduce((sum: number, h: HourBreakdown) => sum + h.hours_worked, 0);
      const totalAmount = hours.reduce((sum: number, h: HourBreakdown) => sum + h.shift_amount, 0);

      setTotals({
        hours: totalHours,
        amount: totalAmount,
        shifts: hours.length
      });
    } catch (err) {
      console.error('Failed to load payroll breakdown:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading payroll details...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Payroll Hour Breakdown</h3>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <div className="text-sm text-blue-600 font-semibold">Total Hours</div>
          <div className="text-2xl font-bold text-blue-900">{totals.hours.toFixed(2)}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <div className="text-sm text-green-600 font-semibold">Total Amount</div>
          <div className="text-2xl font-bold text-green-900">${totals.amount.toFixed(2)}</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded p-4">
          <div className="text-sm text-gray-600 font-semibold">Shifts</div>
          <div className="text-2xl font-bold text-gray-900">{totals.shifts}</div>
        </div>
      </div>

      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Clock In</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Clock Out</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Hours</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Rate</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {breakdown.map((shift, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{new Date(shift.shift_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">{new Date(shift.clock_in).toLocaleTimeString()}</td>
                <td className="px-4 py-3 text-sm">{new Date(shift.clock_out).toLocaleTimeString()}</td>
                <td className="px-4 py-3 text-sm text-right font-semibold">{shift.hours_worked.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-right">${shift.hourly_rate.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-right font-bold">${shift.shift_amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
        <div className="text-sm font-bold text-blue-900 mb-2">Payroll Calculation Details:</div>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Hours calculated from verified clock-in/out timestamps</li>
          <li>• Rates pulled from caregiver_rates table (effective date-based)</li>
          <li>• Overtime calculated if applicable (hours &gt; 40/week)</li>
          <li>• All calculations auditable via attendance_audit table</li>
        </ul>
      </div>
    </div>
  );
}
