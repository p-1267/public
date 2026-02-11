import { useState, useEffect } from 'react';

interface TemporaryAccessIndicatorProps {
  expiresAt: string;
  onExpiry?: () => void;
}

export function TemporaryAccessIndicator({ expiresAt, onExpiry }: TemporaryAccessIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, expiry - now);

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        if (onExpiry) onExpiry();
      } else if (remaining <= 5 * 60 * 1000) {
        setShowWarning(true);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpiry]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (timeRemaining <= 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 text-center font-bold">
        Session Expired - Please scan QR code again to continue
      </div>
    );
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 p-3 text-center font-semibold ${
      showWarning
        ? 'bg-yellow-500 text-yellow-900'
        : 'bg-blue-100 text-blue-900'
    }`}>
      <div className="flex items-center justify-center gap-3">
        <span>🔓 Temporary Access</span>
        <span className="text-lg font-mono">
          {formatTime(timeRemaining)}
        </span>
        {showWarning && (
          <span className="text-sm">
            ⚠ Expiring soon
          </span>
        )}
      </div>
    </div>
  );
}
