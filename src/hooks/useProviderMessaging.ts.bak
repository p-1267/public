import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ProviderMessage {
  id: string;
  provider_name: string;
  provider_type: string;
  direction: 'OUTBOUND' | 'INBOUND';
  subject: string;
  message_body: string;
  message_type: string;
  is_urgent: boolean;
  sent_by_name: string | null;
  sent_on_behalf_of_resident: boolean;
  status: string;
  sent_at: string;
  read_at: string | null;
  has_attachments: boolean;
  reply_count: number;
}

export interface MessageTemplate {
  id: string;
  template_name: string;
  message_type: string;
  subject_template: string;
  body_template: string;
}

export function useProviderMessaging(residentId: string | null, agencyId: string | null) {
  const [messages, setMessages] = useState<ProviderMessage[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!residentId) {
      setLoading(false);
      return;
    }

    fetchMessages();
  }, [residentId]);

  useEffect(() => {
    if (!agencyId) return;

    fetchTemplates();
  }, [agencyId]);

  const fetchMessages = async (providerId?: string, messageType?: string) => {
    if (!residentId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc('get_provider_messages', {
        p_resident_id: residentId,
        p_provider_id: providerId || null,
        p_message_type: messageType || null,
        p_limit: 100
      });

      if (err) throw err;

      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching provider messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async (messageType?: string) => {
    if (!agencyId) return;

    try {
      const { data, error: err } = await supabase.rpc('get_message_templates', {
        p_agency_id: agencyId,
        p_message_type: messageType || null
      });

      if (err) throw err;

      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching message templates:', err);
    }
  };

  const sendMessage = async (data: {
    resident_id: string;
    provider_name: string;
    provider_type: string;
    subject: string;
    message_body: string;
    message_type: string;
    provider_id?: string;
    is_urgent?: boolean;
    on_behalf_of_resident?: boolean;
    original_language?: string;
    related_appointment_id?: string;
    related_medication_id?: string;
  }) => {
    try {
      const { data: messageId, error } = await supabase.rpc('send_provider_message', {
        p_resident_id: data.resident_id,
        p_provider_name: data.provider_name,
        p_provider_type: data.provider_type,
        p_subject: data.subject,
        p_message_body: data.message_body,
        p_message_type: data.message_type,
        p_provider_id: data.provider_id || null,
        p_is_urgent: data.is_urgent || false,
        p_on_behalf_of_resident: data.on_behalf_of_resident || false,
        p_original_language: data.original_language || null,
        p_related_appointment_id: data.related_appointment_id || null,
        p_related_medication_id: data.related_medication_id || null
      });

      if (error) throw error;

      await fetchMessages();
      return messageId;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase.rpc('mark_provider_message_read', {
        p_message_id: messageId
      });

      if (error) throw error;

      await fetchMessages();
    } catch (err) {
      console.error('Error marking message as read:', err);
      throw err;
    }
  };

  const replyToMessage = async (
    parentMessageId: string,
    messageBody: string,
    onBehalfOfResident: boolean = false
  ) => {
    try {
      const { data: messageId, error } = await supabase.rpc('reply_to_provider_message', {
        p_parent_message_id: parentMessageId,
        p_message_body: messageBody,
        p_on_behalf_of_resident: onBehalfOfResident
      });

      if (error) throw error;

      await fetchMessages();
      return messageId;
    } catch (err) {
      console.error('Error replying to message:', err);
      throw err;
    }
  };

  const sendFromTemplate = async (
    templateId: string,
    residentId: string,
    providerName: string,
    providerType: string,
    providerId?: string,
    replacements?: Record<string, string>
  ) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');

    let subject = template.subject_template;
    let body = template.body_template;

    if (replacements) {
      Object.entries(replacements).forEach(([key, value]) => {
        const placeholder = `[${key}]`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        body = body.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    return sendMessage({
      resident_id: residentId,
      provider_name: providerName,
      provider_type: providerType,
      subject,
      message_body: body,
      message_type: template.message_type,
      provider_id: providerId
    });
  };

  return {
    messages,
    templates,
    loading,
    error,
    refresh: fetchMessages,
    sendMessage,
    markAsRead,
    replyToMessage,
    sendFromTemplate,
    fetchTemplates
  };
}
