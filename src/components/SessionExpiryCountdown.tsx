import { useEffect, useState } from 'react';

interface SessionExpiryCountdownProps {
  expiresAt: string;
  sessionType: string;
  onExpired?: () => void;
}

export function SessionExpiryCountdown({ expiresAt, sessionType, onExpired }: SessionExpiryCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [warningLevel, setWarningLevel] = useState<'normal' | 'warning' | 'critical'>('normal');

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, expiry - now);

      setTimeRemaining(remaining);

      if (remaining === 0 && onExpired) {
        onExpired();
      } else if (remaining < 5 * 60 * 1000) {
        setWarningLevel('critical');
      } else if (remaining < 15 * 60 * 1000) {
        setWarningLevel('warning');
      } else {
        setWarningLevel('normal');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  function getBannerStyle(): string {
    if (warningLevel === 'critical') {
      return 'bg-red-600 text-white border-red-700';
    } else if (warningLevel === 'warning') {
      return 'bg-amber-500 text-white border-amber-600';
    }
    return 'bg-blue-600 text-white border-blue-700';
  }

  function getIconForSessionType(): string {
    if (sessionType === 'qr_limited') return '📱';
    if (sessionType === 'shared_tablet') return '📋';
    return '🔐';
  }

  if (timeRemaining === 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 border-b-2 border-red-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <div className="font-medium">Session Expired</div>
              <div className="text-sm opacity-90">Please scan QR code again to continue</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (warningLevel === 'normal') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-2 border-b border-blue-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span>{getIconForSessionType()}</span>
            <span>{sessionType === 'qr_limited' ? 'QR Session' : 'Shared Device'}</span>
          </div>
          <div className="text-sm">
            Expires in {formatTime(timeRemaining)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${getBannerStyle()} px-4 py-3 border-b-2`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl animate-pulse">
              {warningLevel === 'critical' ? '⚠️' : '⏰'}
            </span>
            <div>
              <div className="font-medium">
                {warningLevel === 'critical' ? 'Session Expiring Soon!' : 'Session Time Remaining'}
              </div>
              <div className="text-sm opacity-90">
                {warningLevel === 'critical'
                  ? 'Save your work - session will end soon'
                  : 'Session will expire automatically'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-xs opacity-75">
              {sessionType === 'qr_limited' ? 'Scan QR to extend' : 'Re-login to extend'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
