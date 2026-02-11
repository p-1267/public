export interface VoiceRecordingResult {
  audioBlob: Blob;
  duration: number;
  timestamp: Date;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
}

export interface TranslationResult {
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  targetLanguage: string;
}

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY || '';
const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY || '';

export async function transcribeAudio(audioBlob: Blob, language: string = 'en'): Promise<TranscriptionResult> {
  if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === 'your_deepgram_api_key_here') {
    throw new Error('Deepgram API key not configured. Set VITE_DEEPGRAM_API_KEY in .env file.');
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm',
      },
      body: audioBlob,
    });

    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.statusText}`);
    }

    const data = await response.json();
    const transcript = data.results?.channels?.[0]?.alternatives?.[0];

    if (!transcript) {
      throw new Error('No transcription returned from Deepgram');
    }

    return {
      text: transcript.transcript,
      confidence: transcript.confidence || 0,
      language: language,
    };
  } catch (error: any) {
    console.error('Transcription error:', error);
    throw new Error(`Speech-to-text failed: ${error.message}`);
  }
}

export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string = 'en'
): Promise<TranslationResult> {
  if (sourceLanguage === targetLanguage) {
    return {
      originalText: text,
      originalLanguage: sourceLanguage,
      translatedText: text,
      targetLanguage: targetLanguage,
    };
  }

  if (!GOOGLE_TRANSLATE_API_KEY || GOOGLE_TRANSLATE_API_KEY === 'your_google_translate_api_key_here') {
    throw new Error('Google Translate API key not configured. Set VITE_GOOGLE_TRANSLATE_API_KEY in .env file.');
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.statusText}`);
    }

    const data = await response.json();
    const translation = data.data?.translations?.[0]?.translatedText;

    if (!translation) {
      throw new Error('No translation returned from Google Translate');
    }

    return {
      originalText: text,
      originalLanguage: sourceLanguage,
      translatedText: translation,
      targetLanguage: targetLanguage,
    };
  } catch (error: any) {
    console.error('Translation error:', error);
    throw new Error(`Translation failed: ${error.message}`);
  }
}

export function detectLanguage(text: string): string {
  const patterns = [
    { lang: 'es', pattern: /\b(el|la|los|las|un|una|de|que|es|por|para|con|en|su)\b/i },
    { lang: 'fr', pattern: /\b(le|la|les|un|une|de|que|est|pour|avec|dans|son)\b/i },
    { lang: 'zh', pattern: /[\u4e00-\u9fff]/ },
    { lang: 'ar', pattern: /[\u0600-\u06ff]/ },
    { lang: 'hi', pattern: /[\u0900-\u097f]/ },
  ];

  for (const { lang, pattern } of patterns) {
    if (pattern.test(text)) {
      return lang;
    }
  }

  return 'en';
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.startTime = Date.now();
    } catch (error: any) {
      throw new Error(`Failed to start recording: ${error.message}`);
    }
  }

  async stopRecording(): Promise<VoiceRecordingResult> {
    if (!this.mediaRecorder) {
      throw new Error('No active recording');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const duration = (Date.now() - this.startTime) / 1000;

        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());

        resolve({
          audioBlob,
          duration,
          timestamp: new Date(),
        });
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }
}
