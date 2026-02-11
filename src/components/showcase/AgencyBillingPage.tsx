import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

interface BillingInfo {
  agency_name: string;
  plan: string;
  monthly_cost: number;
  active_residents: number;
  active_caregivers: number;
  care_logs_this_month: number;
  medication_records_this_month: number;
  billing_cycle: string;
}

export const AgencyBillingPage: React.FC = () => {
  const { isShowcaseMode, showcaseAgencyId } = useShowcaseMode();
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingInfo | null>(null);

  useEffect(() => {
    loadBilling();
  }, [showcaseAgencyId, isShowcaseMode]);

  const loadBilling = async () => {
    if (!showcaseAgencyId) return;

    setLoading(true);
    const { data, error } = await supabase.rpc('get_agency_billing_info', {
      p_agency_id: showcaseAgencyId,
      p_include_simulation: isShowcaseMode,
    });

    if (!error && data) {
      setBilling(data);
    }
    setLoading(false);
  };

  if (loading || !billing) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Loading billing info...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing & Plans</h1>
        <p className="text-gray-600">View your subscription and usage information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Plan</span>
              <span className="font-semibold text-gray-900">{billing.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Cost</span>
              <span className="font-semibold text-gray-900">${billing.monthly_cost}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Billing Cycle</span>
              <span className="font-semibold text-gray-900">{billing.billing_cycle}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Usage</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Residents</span>
              <span className="font-semibold text-gray-900">{billing.active_residents} of 50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Caregivers</span>
              <span className="font-semibold text-gray-900">{billing.active_caregivers} (unlimited)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Care Logs This Month</span>
              <span className="font-semibold text-gray-900">{billing.care_logs_this_month.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Medication Records</span>
              <span className="font-semibold text-gray-900">{billing.medication_records_this_month.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {isShowcaseMode && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Showcase Mode:</strong> In production, you can update payment methods, view invoices, and manage your subscription.
          </p>
        </div>
      )}
    </div>
  );
};
