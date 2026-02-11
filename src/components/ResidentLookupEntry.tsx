import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onResidentFound: (residentId: string) => void;
}

export function ResidentLookupEntry({ onResidentFound }: Props) {
  const [shortCode, setShortCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState(false);

  const handleCodeSubmit = async (code: string) => {
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: lookupError } = await supabase.rpc('lookup_resident_by_code', {
        p_code: code.trim().toUpperCase()
      });

      if (lookupError) throw lookupError;

      if (!data || data.success === false) {
        setError(data?.error || 'Resident not found. Check the code and try again.');
        return;
      }

      if (!data.resident_id) {
        setError('Invalid response from server.');
        return;
      }

      onResidentFound(data.resident_id);
    } catch (err) {
      console.error('Lookup error:', err);
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCodeSubmit(shortCode);
  };

  const simulateQRScan = () => {
    setScanMode(true);
    const mockCode = 'RES' + Math.floor(1000 + Math.random() * 9000);
    setShortCode(mockCode);
    handleCodeSubmit(mockCode);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && shortCode.trim()) {
        handleCodeSubmit(shortCode);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [shortCode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-gray-900 mb-2">Resident Access</h1>
          <p className="text-lg text-gray-600">Scan QR code or enter short code</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={simulateQRScan}
            disabled={loading}
            className="w-full p-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-6xl mb-3">📱</div>
            <div className="text-xl font-medium">
              {scanMode ? 'Scanning...' : 'Scan QR Code'}
            </div>
            <div className="text-sm opacity-80 mt-1">
              Tap to open camera
            </div>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or enter manually</span>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2 text-lg">Short Code</label>
              <input
                type="text"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                placeholder="RES1234"
                disabled={loading}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none text-2xl text-center font-mono tracking-wider disabled:opacity-50"
                maxLength={10}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !shortCode.trim()}
              className="w-full p-4 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Looking up...' : 'Continue'}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
              <p className="text-red-700 text-center">{error}</p>
            </div>
          )}

          <div className="text-center text-sm text-gray-500 mt-6">
            <p>Need help? Contact your supervisor</p>
          </div>
        </div>
      </div>
    </div>
  );
}
