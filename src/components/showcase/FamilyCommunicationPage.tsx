import React, { useState, useEffect } from 'react';
import { useShowcase } from '../../contexts/ShowcaseContext';
import { supabase } from '../../lib/supabase';

interface MessageThread {
  id: string;
  subject: string;
  created_at: string;
  last_message_at: string;
  unread_count: number;
  recipient_name?: string;
}

interface Message {
  id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  sent_at: string;
  is_own: boolean;
}

export const FamilyCommunicationPage: React.FC = () => {
  const { selectedResidentId, isShowcaseMode } = useShowcase();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessageForm, setNewMessageForm] = useState({
    recipient: 'CARE_TEAM',
    subject: '',
    message: '',
    priority: 'NORMAL'
  });
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadThreads();
  }, [selectedResidentId]);

  useEffect(() => {
    if (selectedThreadId) {
      loadMessages(selectedThreadId);
    }
  }, [selectedThreadId]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      let userId: string | null = null;

      if (!isShowcaseMode) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        userId = user.id;
      } else {
        userId = 'showcase-family-user';
      }

      const { data, error } = await supabase
        .from('message_threads')
        .select(`
          id,
          subject,
          created_at,
          last_message_at,
          thread_participants!inner(user_id),
          messages(id)
        `)
        .eq('thread_participants.user_id', userId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const threadData: MessageThread[] = (data || []).map(thread => ({
        id: thread.id,
        subject: thread.subject,
        created_at: thread.created_at,
        last_message_at: thread.last_message_at,
        unread_count: 0
      }));

      setThreads(threadData);
      if (threadData.length > 0 && !selectedThreadId) {
        setSelectedThreadId(threadData[0].id);
      }
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      let currentUserId: string | null = null;

      if (!isShowcaseMode) {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id || null;
      } else {
        currentUserId = 'showcase-family-user';
      }

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          sender_role,
          content,
          sent_at,
          user_profiles(full_name)
        `)
        .eq('thread_id', threadId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      const messageData: Message[] = (data || []).map(msg => ({
        id: msg.id,
        sender_name: (msg.user_profiles as any)?.full_name || 'Unknown',
        sender_role: msg.sender_role,
        content: msg.content,
        sent_at: msg.sent_at,
        is_own: msg.sender_id === currentUserId
      }));

      setMessages(messageData);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const sendNewMessage = async () => {
    if (!selectedResidentId || !newMessageForm.subject || !newMessageForm.message) {
      alert('Please fill in subject and message');
      return;
    }

    setSending(true);
    try {
      let userId: string | null = null;
      let agencyId: string | null = null;

      if (!isShowcaseMode) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;

        const { data: links } = await supabase
          .from('family_resident_links')
          .select('residents!inner(agency_id)')
          .eq('family_user_id', user.id)
          .eq('resident_id', selectedResidentId)
          .maybeSingle();

        agencyId = (links?.residents as any)?.agency_id;
      } else {
        userId = 'showcase-family-user';
        agencyId = 'a0000000-0000-0000-0000-000000000001';
      }

      if (!agencyId) throw new Error('Agency not found');

      const { data: thread, error: threadError } = await supabase
        .from('message_threads')
        .insert([{
          agency_id: agencyId,
          context_type: 'RESIDENT',
          context_id: selectedResidentId,
          subject: newMessageForm.subject,
          created_by: userId
        }])
        .select()
        .single();

      if (threadError) throw threadError;

      const { error: participantError } = await supabase
        .from('thread_participants')
        .insert([{
          thread_id: thread.id,
          user_id: userId,
          role: 'FAMILY'
        }]);

      if (participantError) throw participantError;

      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          thread_id: thread.id,
          sender_id: userId,
          sender_role: 'FAMILY',
          message_type: 'TEXT',
          content: newMessageForm.message
        }]);

      if (messageError) throw messageError;

      setNewMessageForm({ recipient: 'CARE_TEAM', subject: '', message: '', priority: 'NORMAL' });
      setShowNewMessage(false);
      loadThreads();
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const sendReply = async () => {
    if (!selectedThreadId || !replyText.trim()) return;

    setSending(true);
    try {
      let userId: string | null = null;

      if (!isShowcaseMode) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      } else {
        userId = 'showcase-family-user';
      }

      const { error } = await supabase
        .from('messages')
        .insert([{
          thread_id: selectedThreadId,
          sender_id: userId,
          sender_role: 'FAMILY',
          message_type: 'TEXT',
          content: replyText
        }]);

      if (error) throw error;

      await supabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedThreadId);

      setReplyText('');
      loadMessages(selectedThreadId);
      loadThreads();
    } catch (err) {
      console.error('Failed to send reply:', err);
      alert('Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-2xl text-gray-600">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Communication Center
          </h1>
          <p className="text-2xl text-gray-600">
            Connect with your loved one's care team
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
              <button
                onClick={() => setShowNewMessage(!showNewMessage)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
              >
                {showNewMessage ? 'Cancel' : '+ New'}
              </button>
            </div>

            {showNewMessage && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="mb-3">
                  <label className="block text-sm font-semibold mb-1">Subject</label>
                  <input
                    type="text"
                    value={newMessageForm.subject}
                    onChange={(e) => setNewMessageForm({...newMessageForm, subject: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-base"
                    placeholder="What is this about?"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-semibold mb-1">Message</label>
                  <textarea
                    value={newMessageForm.message}
                    onChange={(e) => setNewMessageForm({...newMessageForm, message: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg text-base"
                    placeholder="Type your message..."
                  />
                </div>
                <button
                  onClick={sendNewMessage}
                  disabled={sending}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            )}

            <div className="space-y-2">
              {threads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No messages yet. Start a conversation!
                </div>
              ) : (
                threads.map(thread => (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedThreadId === thread.id
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{thread.subject}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(thread.last_message_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-white border-2 border-gray-200 rounded-2xl p-6">
            {selectedThreadId ? (
              <>
                <div className="border-b pb-4 mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {threads.find(t => t.id === selectedThreadId)?.subject}
                  </h2>
                </div>

                <div className="h-96 overflow-y-auto mb-4 space-y-4">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-lg p-4 rounded-lg ${
                        msg.is_own
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="font-semibold mb-1">
                          {msg.sender_name} <span className="text-sm opacity-75">({msg.sender_role})</span>
                        </div>
                        <div className="text-base">{msg.content}</div>
                        <div className="text-xs opacity-75 mt-2">
                          {new Date(msg.sent_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg text-base"
                    placeholder="Type your reply..."
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a conversation or start a new one
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
