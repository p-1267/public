import { useState, useEffect } from 'react';
import { useMessaging } from '../hooks/useMessaging';

export function MessagingCenter() {
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const {
    getUserThreads,
    getThreadMessages,
    sendMessage,
    markMessageRead
  } = useMessaging();

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread.id);
    }
  }, [selectedThread]);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const data = await getUserThreads();
      setThreads(data.threads || []);
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const data = await getThreadMessages(threadId);
      setMessages(data.messages || []);

      // Mark messages as read
      for (const msg of data.messages || []) {
        if (msg.sender_id !== msg.my_receipt?.user_id && !msg.my_receipt?.read_at) {
          await markMessageRead(msg.id);
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedThread || !newMessage.trim()) {
      setMessage({ type: 'error', text: 'Please enter a message' });
      return;
    }

    try {
      setMessage(null);
      await sendMessage({
        threadId: selectedThread.id,
        content: newMessage
      });
      setNewMessage('');
      loadMessages(selectedThread.id);
      setMessage({ type: 'success', text: 'Message sent' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send message' });
    }
  };

  const getContextBadge = (contextType: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      RESIDENT_THREAD: { text: 'Resident', color: 'bg-blue-100 text-blue-800' },
      SHIFT_THREAD: { text: 'Shift', color: 'bg-green-100 text-green-800' },
      INCIDENT_THREAD: { text: 'Incident', color: 'bg-red-100 text-red-800' },
      ANNOUNCEMENT_THREAD: { text: 'Announcement', color: 'bg-yellow-100 text-yellow-800' }
    };
    const badge = badges[contextType] || { text: contextType, color: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading messaging center...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg h-[600px] flex">
      {/* Thread List */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Message Threads</h2>
        </div>
        {threads.length === 0 ? (
          <div className="p-4 text-gray-600 text-center">No threads found</div>
        ) : (
          <div>
            {threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                  selectedThread?.id === thread.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-semibold text-sm">{thread.subject}</div>
                  {getContextBadge(thread.context_type)}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Created by {thread.created_by}
                </div>
                {thread.last_message_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    Last: {new Date(thread.last_message_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message View */}
      <div className="flex-1 flex flex-col">
        {!selectedThread ? (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            Select a thread to view messages
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">{selectedThread.subject}</h3>
                  <div className="text-sm text-gray-600 mt-1">
                    {getContextBadge(selectedThread.context_type)}
                  </div>
                </div>
                {selectedThread.can_send ? (
                  <span className="text-sm text-green-600 font-semibold">Can Send</span>
                ) : (
                  <span className="text-sm text-gray-600 font-semibold">Read Only</span>
                )}
              </div>
            </div>

            {message && (
              <div className={`mx-4 mt-4 border rounded p-3 ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-gray-600 text-center">No messages in this thread</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`border rounded p-3 ${
                      msg.is_redacted ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-sm">{msg.sender_name}</div>
                        <div className="text-xs text-gray-600">{msg.sender_role}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(msg.sent_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm">
                      {msg.is_redacted ? (
                        <span className="text-gray-600 italic">[REDACTED]</span>
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.is_offline_queued && (
                      <div className="text-xs text-yellow-600 mt-1">Sent offline</div>
                    )}
                    {msg.my_receipt && (
                      <div className="text-xs text-gray-500 mt-2 flex gap-3">
                        {msg.my_receipt.delivered_at && <span>Delivered</span>}
                        {msg.my_receipt.read_at && <span>Read</span>}
                        {msg.my_receipt.acknowledged_at && <span>Acknowledged</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            {selectedThread.can_send && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="w-72 border-l border-gray-200 p-4 bg-gray-50">
        <h3 className="font-semibold mb-3">Context Principles</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>Accountable:</strong> All messages are scoped to context</p>
          <p><strong>Context-Aware:</strong> No context-less messaging</p>
          <p><strong>Defensible:</strong> Complete audit trail</p>
          <p><strong>Retention:</strong> Messages follow jurisdictional rules</p>
        </div>
      </div>
    </div>
  );
}
