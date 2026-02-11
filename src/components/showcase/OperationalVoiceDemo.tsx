import React, { useState } from 'react';

interface Props {
  onNavigate: (path: string) => void;
}

export function OperationalVoiceDemo({ onNavigate }: Props) {
  const [step, setStep] = useState<'idle' | 'recording' | 'translating' | 'confirming' | 'complete'>('idle');
  const [selectedLanguage, setSelectedLanguage] = useState('es');

  const mockTranslations = {
    es: {
      original: 'La residente tomó toda su medicación sin problemas. Presión arterial 128 sobre 80, pulso 76 latidos por minuto. Se ve cómoda y en buen estado.',
      translated: 'The resident took all her medication without problems. Blood pressure 128 over 80, pulse 76 beats per minute. She looks comfortable and in good condition.',
      vitalSigns: { blood_pressure: '128/80', pulse: '76' },
      observations: ['Medication taken completely', 'No issues reported', 'Resident comfortable'],
      confidence: 0.87
    },
    fr: {
      original: 'La résidente a pris tous ses médicaments sans difficulté. Tension artérielle 125 sur 78, pouls 74. Aucun signe de douleur ou d\'inconfort.',
      translated: 'The resident took all her medications without difficulty. Blood pressure 125 over 78, pulse 74. No signs of pain or discomfort.',
      vitalSigns: { blood_pressure: '125/78', pulse: '74' },
      observations: ['All medications taken', 'No pain reported', 'No discomfort'],
      confidence: 0.91
    },
    zh: {
      original: '居民已经服用所有药物。血压 120/75，心率 72。状态良好，没有不适。',
      translated: 'The resident has taken all medications. Blood pressure 120/75, heart rate 72. Condition is good, no discomfort.',
      vitalSigns: { blood_pressure: '120/75', heart_rate: '72' },
      observations: ['All medications taken', 'Good condition', 'No discomfort'],
      confidence: 0.89
    }
  };

  const languages = [
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' }
  ];

  const currentTranslation = mockTranslations[selectedLanguage as keyof typeof mockTranslations];

  const handleRecord = () => {
    setStep('recording');
    setTimeout(() => {
      setStep('translating');
      setTimeout(() => {
        setStep('confirming');
      }, 1500);
    }, 2000);
  };

  const handleConfirm = () => {
    setStep('complete');
    setTimeout(() => {
      onNavigate('/showcase/operational/context');
    }, 2000);
  };

  const handleReject = () => {
    setStep('idle');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <button
          onClick={() => onNavigate('/showcase/operational/context')}
          className="mb-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
        >
          ← Back to Context
        </button>

        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
              <span className="text-3xl">🎤</span>
            </div>
            <h1 className="text-4xl font-light text-gray-900 mb-2">Multilingual Voice Input</h1>
            <p className="text-lg text-gray-600">
              Speak in any language → Translation → Human confirmation
            </p>
          </div>

          <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
            <h3 className="font-semibold text-blue-900 mb-2">NO SILENT REWRITING:</h3>
            <div className="text-blue-800 space-y-2">
              <p>• Original transcript ALWAYS preserved</p>
              <p>• Translation shown side-by-side</p>
              <p>• Human must explicitly confirm</p>
              <p>• Audit trail: who confirmed + when</p>
            </div>
          </div>

          {step === 'idle' && (
            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 mb-3 text-lg font-medium">Select Language for Demo:</label>
                <div className="grid grid-cols-3 gap-4">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang.code)}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        selectedLanguage === lang.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-4xl mb-2">{lang.flag}</div>
                      <div className="font-medium text-gray-900">{lang.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleRecord}
                className="w-full p-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-all"
              >
                <div className="text-6xl mb-3">🎤</div>
                <div className="text-2xl font-medium">Tap to Speak</div>
                <div className="text-sm opacity-80 mt-2">
                  Demo will simulate voice input in {languages.find(l => l.code === selectedLanguage)?.name}
                </div>
              </button>
            </div>
          )}

          {step === 'recording' && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-red-500 text-white mb-6 animate-pulse">
                <span className="text-6xl">🎤</span>
              </div>
              <h2 className="text-3xl font-light text-gray-900 mb-2">Recording...</h2>
              <p className="text-lg text-gray-600">Speak naturally in {languages.find(l => l.code === selectedLanguage)?.name}</p>
              <div className="mt-6 p-4 bg-gray-100 rounded-2xl max-w-2xl mx-auto">
                <div className="text-gray-700 italic text-lg">
                  "{currentTranslation.original.substring(0, 50)}..."
                </div>
              </div>
            </div>
          )}

          {step === 'translating' && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-blue-500 text-white mb-6">
                <span className="text-6xl animate-spin">🔄</span>
              </div>
              <h2 className="text-3xl font-light text-gray-900 mb-2">Processing...</h2>
              <p className="text-lg text-gray-600">Translating and extracting structured data</p>
            </div>
          )}

          {step === 'confirming' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-gray-700">
                      Original ({selectedLanguage.toUpperCase()})
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-gray-700 text-white text-xs">
                      {languages.find(l => l.code === selectedLanguage)?.name}
                    </span>
                  </div>
                  <div className="text-gray-900 leading-relaxed">
                    {currentTranslation.original}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-500">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-blue-900">
                      Translated (EN)
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs">
                      {(currentTranslation.confidence * 100).toFixed(0)}% Confident
                    </span>
                  </div>
                  <div className="text-gray-900 leading-relaxed">
                    {currentTranslation.translated}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-500">
                <div className="text-sm font-medium text-green-900 mb-4">Extracted Information</div>

                {Object.keys(currentTranslation.vitalSigns).length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-blue-700 mb-2">Vital Signs:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(currentTranslation.vitalSigns).map(([key, value]) => (
                        <span key={key} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                          {key.replace(/_/g, ' ')}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {currentTranslation.observations.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Observations:</div>
                    <ul className="space-y-1">
                      {currentTranslation.observations.map((obs, idx) => (
                        <li key={idx} className="text-sm text-gray-700">• {obs}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleReject}
                  className="flex-1 p-4 rounded-2xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Reject & Re-record
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 p-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-medium transition-all"
                >
                  ✓ Confirm & Save
                </button>
              </div>

              <div className="text-center text-sm text-gray-500">
                Confirmation will be logged for audit trail
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-green-500 text-white mb-6">
                <span className="text-6xl">✓</span>
              </div>
              <h2 className="text-3xl font-light text-gray-900 mb-2">Evidence Saved</h2>
              <p className="text-lg text-gray-600">Translation confirmed and logged</p>
              <p className="text-sm text-gray-500 mt-2">Redirecting to context screen...</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Translation Features</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🌍</span>
              <div>
                <div className="font-medium text-gray-900">Multi-Language Support</div>
                <div className="text-sm text-gray-600">
                  Detects and translates 50+ languages automatically
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🏥</span>
              <div>
                <div className="font-medium text-gray-900">Medical Term Preservation</div>
                <div className="text-sm text-gray-600">
                  Preserves medical terminology and vital signs during translation
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🔍</span>
              <div>
                <div className="font-medium text-gray-900">Structured Data Extraction</div>
                <div className="text-sm text-gray-600">
                  Automatically extracts vital signs, observations, concerns, medications
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="font-medium text-gray-900">Human Confirmation Required</div>
                <div className="text-sm text-gray-600">
                  No auto-submission - caregiver must review and approve translation
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
