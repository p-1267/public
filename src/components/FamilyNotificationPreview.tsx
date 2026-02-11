import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface NotificationPreview {
  notification_type: string;
  trigger_condition: string;
  recipients: string[];
  delivery_methods: string[];
  example_message: string;
  frequency_limit: string;
  is_enabled: boolean;
}

interface FamilyNotificationPreviewProps {
  residentId: string;
  familyUserId?: string;
}

export function FamilyNotificationPreview({ residentId, familyUserId }: FamilyNotificationPreviewProps) {
  const [previews, setPreviews] = useState<NotificationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotificationPreviews();
  }, [residentId, familyUserId]);

  async function loadNotificationPreviews() {
    setLoading(true);

    const mockPreviews: NotificationPreview[] = [
      {
        notification_type: 'Medication Missed',
        trigger_condition: 'Medication not administered within 60 minutes of scheduled time',
        recipients: ['Primary Contact', 'Secondary Contact'],
        delivery_methods: ['SMS', 'App Push', 'Email'],
        example_message: 'Alert: Dorothy\'s 2:00 PM medication was not administered on schedule. Care team has been notified.',
        frequency_limit: 'Maximum once per medication per day',
        is_enabled: true
      },
      {
        notification_type: 'Fall Detected',
        trigger_condition: 'Fall event recorded by caregiver or device sensor',
        recipients: ['Primary Contact', 'Emergency Contact'],
        delivery_methods: ['Phone Call', 'SMS', 'App Push'],
        example_message: 'URGENT: Dorothy experienced a fall at 3:45 PM. Staff are assessing. No injuries apparent. We will call you shortly.',
        frequency_limit: 'Immediate, no limit',
        is_enabled: true
      },
      {
        notification_type: 'Daily Summary',
        trigger_condition: 'End of day (8:00 PM)',
        recipients: ['Primary Contact'],
        delivery_methods: ['Email', 'App'],
        example_message: 'Dorothy\'s Daily Summary: All medications taken on time. Participated in 2 activities. Vitals normal. 3 meals completed.',
        frequency_limit: 'Once per day',
        is_enabled: true
      },
      {
        notification_type: 'Vitals Out of Range',
        trigger_condition: 'Vital signs exceed baseline thresholds',
        recipients: ['Primary Contact'],
        delivery_methods: ['App Push', 'SMS'],
        example_message: 'Notice: Dorothy\'s blood pressure reading was higher than normal at 10:15 AM (145/92). Nurse has been consulted.',
        frequency_limit: 'Maximum 3 per day',
        is_enabled: true
      },
      {
        notification_type: 'Appointment Reminder',
        trigger_condition: '24 hours before scheduled appointment',
        recipients: ['Primary Contact', 'Secondary Contact'],
        delivery_methods: ['Email', 'SMS', 'App'],
        example_message: 'Reminder: Dorothy has a podiatry appointment tomorrow at 2:00 PM. Transportation arranged.',
        frequency_limit: 'Per scheduled appointment',
        is_enabled: false
      }
    ];

    setPreviews(mockPreviews);
    setLoading(false);
  }

  function getDeliveryIcon(method: string): string {
    if (method === 'Phone Call') return '📞';
    if (method === 'SMS') return '💬';
    if (method === 'Email') return '📧';
    if (method === 'App Push') return '📱';
    return '🔔';
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading notification preview...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Notification Preview</h3>
        <p className="text-xs text-gray-500 mt-1">
          What notifications you will receive and when
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {previews.map((preview, index) => (
          <div key={index} className="px-4 py-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{preview.notification_type}</span>
                  {preview.is_enabled ? (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                      Enabled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                      Disabled
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-xs text-gray-500">When:</span>
                <p className="text-gray-900 mt-0.5">{preview.trigger_condition}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Who receives it:</span>
                <p className="text-gray-900 mt-0.5">{preview.recipients.join(', ')}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">How you'll be notified:</span>
                <div className="flex items-center gap-2 mt-1">
                  {preview.delivery_methods.map((method, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-800 text-xs">
                      {getDeliveryIcon(method)} {method}
                    </span>
                  ))}
                </div>
              </div>

              <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200">
                <span className="text-xs text-gray-500 block mb-1">Example message:</span>
                <p className="text-sm text-gray-900 italic">"{preview.example_message}"</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Frequency limit:</span>
                <p className="text-gray-700 mt-0.5 text-xs">{preview.frequency_limit}</p>
              </div>
            </div>

            {!preview.is_enabled && (
              <div className="mt-2 text-xs text-gray-500 italic">
                This notification is currently disabled. Enable in settings to receive alerts.
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-blue-50 border-t border-blue-200 text-xs text-blue-800">
        💡 Tip: This preview shows exactly what will happen and when. No surprises. Change preferences anytime.
      </div>
    </div>
  );
}
