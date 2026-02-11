import React, { useState, useEffect } from 'react';
import { useProviderMessaging, ProviderMessage, MessageTemplate } from '../hooks/useProviderMessaging';
import { useSeniorResident } from '../hooks/useSeniorResident';
import { useShowcase } from '../contexts/ShowcaseContext';
import { supabase } from '../lib/supabase';

export function SeniorMessagingPage() {
  const { resident: authResident, loading: authLoading } = useSeniorResident();
  const { selectedResidentId, isShowcaseMode, mockAgencyId } = useShowcase();
  const [showcaseResident, setShowcaseResident] = useState<any>(null);
  const [showcaseLoading, setShowcaseLoading] = useState(true);

  useEffect(() => {
    if (isShowcaseMode && selectedResidentId) {
      setShowcaseLoading(true);
      supabase
        .from('residents')
        .select('*')
        .eq('id', selectedResidentId)
        .maybeSingle()
        .then(({ data }) => {
          setShowcaseResident(data);
          setShowcaseLoading(false);
        })
        .catch(() => setShowcaseLoading(false));
    } else if (!isShowcaseMode) {
      setShowcaseLoading(false);
    }
  }, [isShowcaseMode, selectedResidentId]);

  const resident = isShowcaseMode ? showcaseResident : authResident;
  const residentLoading = isShowcaseMode ? showcaseLoading : authLoading;

  const agencyId = mockAgencyId || 'a0000000-0000-0000-0000-000000000001';
  const { messages, templates, loading, sendMessage, sendFromTemplate, markAsRead } = useProviderMessaging(resident?.id || null, agencyId);
  const [showComposeForm, setShowComposeForm] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ProviderMessage | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  if (residentLoading) {
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

  const handleMessageClick = async (message: ProviderMessage) => {
    setSelectedMessage(message);
    if (!message.read_at) {
      await markAsRead(message.id);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Messages
          </h1>
          <p className="text-2xl text-gray-600">
            Contact your doctors, pharmacy, and healthcare providers
          </p>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowComposeForm(true)}
            className="flex-1 p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg text-2xl font-semibold transition-colors"
          >
            + New Message
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="flex-1 p-6 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg text-2xl font-semibold transition-colors"
          >
            Quick Messages
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center">
            <p className="text-3xl text-gray-500">No messages yet</p>
            <p className="text-xl text-gray-400 mt-4">
              Send a message to your doctor or pharmacy
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                onClick={() => handleMessageClick(message)}
              />
            ))}
          </div>
        )}

        {showComposeForm && (
          <ComposeMessageModal
            residentId={resident.id}
            onClose={() => setShowComposeForm(false)}
            onSend={sendMessage}
          />
        )}

        {showTemplates && (
          <QuickMessageModal
            templates={templates}
            residentId={resident.id}
            onClose={() => setShowTemplates(false)}
            onSend={sendFromTemplate}
          />
        )}

        {selectedMessage && (
          <MessageDetailModal
            message={selectedMessage}
            onClose={() => setSelectedMessage(null)}
          />
        )}
      </div>
    </div>
  );
}

interface MessageCardProps {
  message: ProviderMessage;
  onClick: () => void;
}

function MessageCard({ message, onClick }: MessageCardProps) {
  const isUnread = !message.read_at;
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'READ': return 'bg-gray-100 text-gray-800';
      case 'REPLIED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border-2 rounded-2xl p-6 hover:border-blue-400 cursor-pointer transition-all shadow-sm hover:shadow-md ${
        isUnread ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-gray-900">{message.provider_name}</h3>
            {isUnread && (
              <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                New
              </span>
            )}
            {message.is_urgent && (
              <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-semibold">
                Urgent
              </span>
            )}
          </div>
          <p className="text-xl text-gray-600">{message.subject}</p>
          <p className="text-lg text-gray-500 mt-2 line-clamp-2">{message.message_body}</p>
        </div>
        <div className="text-right ml-4">
          <p className="text-lg text-gray-500 mb-2">{formatDate(message.sent_at)}</p>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(message.status)}`}>
            {message.status}
          </span>
        </div>
      </div>

      {message.reply_count > 0 && (
        <div className="mt-3 flex items-center text-gray-600">
          <span className="text-lg">💬</span>
          <span className="ml-2 text-lg">{message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}</span>
        </div>
      )}
    </div>
  );
}

interface ComposeMessageModalProps {
  residentId: string;
  onClose: () => void;
  onSend: (data: any) => Promise<string>;
}

function ComposeMessageModal({ residentId, onClose, onSend }: ComposeMessageModalProps) {
  const [providerName, setProviderName] = useState('');
  const [providerType, setProviderType] = useState('DOCTOR');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!providerName || !subject || !messageBody) return;

    setSending(true);
    try {
      await onSend({
        resident_id: residentId,
        provider_name: providerName,
        provider_type: providerType,
        subject,
        message_body: messageBody,
        message_type: 'GENERAL',
        is_urgent: isUrgent
      });
      onClose();
    } catch (err) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-6">New Message</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              To (Provider Name)
            </label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="Dr. Smith, Main Street Pharmacy"
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              Provider Type
            </label>
            <select
              value={providerType}
              onChange={(e) => setProviderType(e.target.value)}
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="DOCTOR">Doctor</option>
              <option value="CLINIC">Clinic</option>
              <option value="PHARMACY">Pharmacy</option>
              <option value="LAB">Lab</option>
              <option value="SPECIALIST">Specialist</option>
              <option value="HOSPITAL">Hospital</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this message about?"
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="urgent"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="w-6 h-6 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="urgent" className="ml-3 text-2xl text-gray-700">
              Mark as urgent
            </label>
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
            disabled={!providerName || !subject || !messageBody || sending}
            className="flex-1 p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-2xl font-semibold transition-colors"
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface QuickMessageModalProps {
  templates: MessageTemplate[];
  residentId: string;
  onClose: () => void;
  onSend: (templateId: string, residentId: string, providerName: string, providerType: string, providerId?: string, replacements?: Record<string, string>) => Promise<string>;
}

function QuickMessageModal({ templates, residentId, onClose, onSend }: QuickMessageModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [providerName, setProviderName] = useState('');
  const [providerType, setProviderType] = useState('DOCTOR');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!selectedTemplate || !providerName) return;

    setSending(true);
    try {
      await onSend(selectedTemplate.id, residentId, providerName, providerType);
      onClose();
    } catch (err) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-6">Quick Messages</h2>

        {!selectedTemplate ? (
          <div className="space-y-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className="w-full p-6 bg-white border-2 border-gray-200 hover:border-blue-400 rounded-2xl text-left transition-all"
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{template.template_name}</h3>
                <p className="text-lg text-gray-600">{template.subject_template}</p>
              </button>
            ))}
            <button
              onClick={onClose}
              className="w-full p-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-2xl font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">{selectedTemplate.template_name}</h3>

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <p className="text-xl font-semibold text-gray-700 mb-2">Subject:</p>
              <p className="text-lg text-gray-600 mb-4">{selectedTemplate.subject_template}</p>
              <p className="text-xl font-semibold text-gray-700 mb-2">Message:</p>
              <p className="text-lg text-gray-600 whitespace-pre-line">{selectedTemplate.body_template}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  Send to
                </label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="Provider name"
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  Provider Type
                </label>
                <select
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value)}
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  <option value="DOCTOR">Doctor</option>
                  <option value="CLINIC">Clinic</option>
                  <option value="PHARMACY">Pharmacy</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 p-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-2xl font-semibold transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSend}
                disabled={!providerName || sending}
                className="flex-1 p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-2xl font-semibold transition-colors"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MessageDetailModalProps {
  message: ProviderMessage;
  onClose: () => void;
}

function MessageDetailModal({ message, onClose }: MessageDetailModalProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">{message.subject}</h2>
          <p className="text-xl text-gray-600">{message.provider_name}</p>
          <p className="text-lg text-gray-500 mt-2">{formatDate(message.sent_at)}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <p className="text-2xl text-gray-800 whitespace-pre-line">{message.message_body}</p>
        </div>

        {message.sent_by_name && (
          <p className="text-lg text-gray-600 mb-6">
            {message.sent_on_behalf_of_resident ? `Sent on your behalf by ${message.sent_by_name}` : `Sent by ${message.sent_by_name}`}
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-2xl font-semibold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
