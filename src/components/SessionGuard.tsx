import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SessionGuardProps {
  children: React.ReactNode;
  onSessionExpired: () => void;
  enableSharedTabletMode?: boolean;
}

interface ActiveSession {
  id: string;
  user_id: string;
  resident_id: string | null;
  device_id: string;
  session_type: 'full_access' | 'qr_limited' | 'shared_tablet';
  expires_at: string;
  created_at: string;
}

export function SessionGuard({ children, onSessionExpired, enableSharedTabletMode = false }: SessionGuardProps) {
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [currentSession, setCurrentSession] = useState<ActiveSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkSession();

    const interval = setInterval(() => {
      checkSession();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const checkSession = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setIsSessionValid(false);
        setChecking(false);
        onSessionExpired();
        return;
      }

      if (enableSharedTabletMode) {
        const { data: session, error } = await supabase
          .from('active_sessions')
          .select('*')
          .eq('user_id', user.user.id)
          .eq('device_id', getDeviceId())
          .gte('expires_at', new Date().toISOString())
          .maybeSingle();

        if (error || !session) {
          setIsSessionValid(false);
          setChecking(false);
          onSessionExpired();
          return;
        }

        setCurrentSession(session);

        const expiresAt = new Date(session.expires_at);
        const now = new Date();

        if (expiresAt <= now) {
          setIsSessionValid(false);
          onSessionExpired();
          return;
        }
      }

      setIsSessionValid(true);
      setChecking(false);
    } catch (err) {
      console.error('Session check failed:', err);
      setIsSessionValid(false);
      setChecking(false);
    }
  };

  const getDeviceId = (): string => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-xl text-gray-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isSessionValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="text-3xl font-light text-gray-900 mb-4">Session Expired</h1>
            <p className="text-lg text-gray-600 mb-6">
              {enableSharedTabletMode
                ? 'Your shared tablet session has expired. Please scan again to continue.'
                : 'Your session has expired. Please log in again.'}
            </p>
            <button
              onClick={onSessionExpired}
              className="w-full p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium transition-all"
            >
              Return to Login
            </button>
          </div>

          {currentSession && enableSharedTabletMode && (
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl text-sm text-gray-700">
              <div className="font-medium mb-2">Session Details:</div>
              <div className="space-y-1">
                <div>Type: {currentSession.session_type}</div>
                <div>Started: {new Date(currentSession.created_at).toLocaleString()}</div>
                <div>Expired: {new Date(currentSession.expires_at).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {enableSharedTabletMode && currentSession && (
        <SessionExpiryBanner session={currentSession} />
      )}
    </>
  );
}

interface SessionExpiryBannerProps {
  session: ActiveSession;
}

function SessionExpiryBanner({ session }: SessionExpiryBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const expiresAt = new Date(session.expires_at);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) {
        setTimeRemaining(`${diffMins}m remaining`);
      } else {
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        setTimeRemaining(`${diffHours}h ${remainingMins}m remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000);

    return () => clearInterval(interval);
  }, [session.expires_at]);

  const getWarningLevel = () => {
    const expiresAt = new Date(session.expires_at);
    const now = new Date();
    const diffMins = Math.floor((expiresAt.getTime() - now.getTime()) / 60000);

    if (diffMins <= 5) return 'bg-red-500 text-white';
    if (diffMins <= 15) return 'bg-amber-500 text-white';
    return 'bg-gray-700 text-white';
  };

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-xl shadow-lg ${getWarningLevel()}`}>
      <div className="flex items-center space-x-2 text-sm font-medium">
        <span>🔒</span>
        <span>Session: {timeRemaining}</span>
      </div>
    </div>
  );
}
