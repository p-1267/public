import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SubscriptionGateModalProps {
  feature: string;
  onClose: () => void;
  onUpgrade?: () => void;
}

interface FeatureAccessResult {
  allowed: boolean;
  reason: string;
  required_tier?: string;
  current_tier?: string;
  feature_description?: string;
}

export function SubscriptionGateModal({ feature, onClose, onUpgrade }: SubscriptionGateModalProps) {
  const [accessInfo, setAccessInfo] = useState<FeatureAccessResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFeatureAccess();
  }, [feature]);

  const checkFeatureAccess = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single();

      if (!profile?.agency_id) return;

      const { data, error } = await supabase.rpc('check_feature_access', {
        p_agency_id: profile.agency_id,
        p_feature_key: feature
      });

      if (error) throw error;
      setAccessInfo(data);
    } catch (err) {
      console.error('Failed to check feature access:', err);
    } finally {
      setLoading(false);
    }
  };

  const tierFeatures = {
    TRIAL: ['Basic resident management', 'Limited users (3)', '30 days access'],
    BASIC: ['Up to 50 residents', '10 users', 'Basic reporting', 'Email support'],
    PROFESSIONAL: ['Unlimited residents', 'Unlimited users', 'Advanced analytics', 'AI assistance', 'Priority support', 'Custom integrations'],
    ENTERPRISE: ['All Professional features', 'Multi-location support', 'Dedicated account manager', 'Custom SLAs', 'White-label options']
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (accessInfo?.allowed) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">Feature Unavailable</h2>
            <p className="text-gray-600 mt-1">Upgrade required to access this feature</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <div className="font-bold text-red-900 mb-2">Access Denied</div>
          <div className="text-sm text-red-800">{accessInfo?.reason}</div>
        </div>

        {accessInfo?.required_tier && (
          <>
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">Current Plan:</div>
              <div className="text-xl font-bold">{accessInfo.current_tier || 'TRIAL'}</div>
            </div>

            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">Required Plan:</div>
              <div className="text-xl font-bold text-blue-600">{accessInfo.required_tier}</div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <div className="font-bold mb-4">What you'll get with {accessInfo.required_tier}:</div>
              <ul className="space-y-2">
                {(tierFeatures[accessInfo.required_tier as keyof typeof tierFeatures] || []).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Maybe Later
          </button>
          <button
            onClick={() => {
              if (onUpgrade) onUpgrade();
              else alert('Contact sales@example.com to upgrade your subscription');
            }}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Upgrade Now
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          Questions? Contact sales@example.com
        </div>
      </div>
    </div>
  );
}
