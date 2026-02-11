import React, { useState } from 'react';

interface Props {
  onNavigate: (path: string) => void;
}

export function OperationalLookupDemo({ onNavigate }: Props) {
  const [code, setCode] = useState('');
  const [scanMode, setScanMode] = useState(false);

  const handleQRScan = () => {
    setScanMode(true);
    setTimeout(() => {
      setCode('RES8472');
      setScanMode(false);
      setTimeout(() => {
        onNavigate('/showcase/operational/context');
      }, 1000);
    }, 1500);
  };

  const handleCodeSubmit = () => {
    if (code.trim()) {
      onNavigate('/showcase/operational/context');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-4xl font-light text-gray-900 mb-2">Resident Access</h1>
          <p className="text-lg text-gray-600">Scan QR code or enter short code</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleQRScan}
            disabled={scanMode}
            className="w-full p-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50"
          >
            <div className="text-6xl mb-3">📱</div>
            <div className="text-xl font-medium">
              {scanMode ? 'Scanning...' : 'Scan QR Code'}
            </div>
            <div className="text-sm opacity-80 mt-1">
              {scanMode ? 'Reading code...' : 'Tap to open camera'}
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

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2 text-lg">Short Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RES1234"
                className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none text-2xl text-center font-mono tracking-wider"
                maxLength={10}
                onKeyPress={(e) => e.key === 'Enter' && handleCodeSubmit()}
              />
            </div>

            <button
              onClick={handleCodeSubmit}
              disabled={!code.trim()}
              className="w-full p-4 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
            <div className="text-sm font-medium text-blue-900 mb-2">Demo Codes:</div>
            <div className="space-y-1 text-sm text-blue-800">
              <div className="flex items-center justify-between">
                <span>• RES8472</span>
                <button
                  onClick={() => setCode('RES8472')}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                >
                  Use
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span>• RES3391</span>
                <button
                  onClick={() => setCode('RES3391')}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                >
                  Use
                </button>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>🎯 Operational Reality Demo</p>
            <p className="mt-1">Zero-friction resident access via QR/code</p>
          </div>
        </div>
      </div>
    </div>
  );
}
