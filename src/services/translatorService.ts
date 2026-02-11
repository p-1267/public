interface TranslationResult {
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  structuredData?: {
    type: string;
    observations: string[];
    concerns?: string[];
    vitalSigns?: Record<string, string>;
    medications?: string[];
  };
  confidence: number;
}

interface TranslatorService {
  isAvailable(): boolean;
  translate(text: string, targetLanguage?: string): Promise<TranslationResult>;
  structureObservation(text: string): Promise<TranslationResult>;
}

class MockTranslatorService implements TranslatorService {
  isAvailable(): boolean {
    return true;
  }

  async translate(text: string, targetLanguage: string = 'en'): Promise<TranslationResult> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const detectedLanguage = this.detectLanguage(text);

    if (detectedLanguage === 'en') {
      return {
        originalText: text,
        originalLanguage: 'en',
        translatedText: text,
        confidence: 1.0
      };
    }

    return {
      originalText: text,
      originalLanguage: detectedLanguage,
      translatedText: this.mockTranslate(text, detectedLanguage),
      confidence: 0.85
    };
  }

  async structureObservation(text: string): Promise<TranslationResult> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const translationResult = await this.translate(text);
    const structured = this.extractStructuredData(translationResult.translatedText);

    return {
      ...translationResult,
      structuredData: structured
    };
  }

  private detectLanguage(text: string): string {
    const spanishPatterns = /\b(el|la|los|las|un|una|de|que|y|es|en|por|para|no|se|con|su|como|está|fue|dio|tiene|había|dijo)\b/gi;
    const frenchPatterns = /\b(le|la|les|un|une|de|que|et|est|en|pour|ne|se|avec|son|comme|a|été|avait|dit)\b/gi;
    const germanPatterns = /\b(der|die|das|den|dem|des|ein|eine|und|ist|in|zu|nicht|sich|mit|sein|wie|war|hat|hatte|sagte)\b/gi;

    if (spanishPatterns.test(text)) return 'es';
    if (frenchPatterns.test(text)) return 'fr';
    if (germanPatterns.test(text)) return 'de';

    return 'en';
  }

  private mockTranslate(text: string, fromLang: string): string {
    const translations: Record<string, string> = {
      'es': `[Translated from Spanish] ${text}`,
      'fr': `[Translated from French] ${text}`,
      'de': `[Translated from German] ${text}`
    };

    return translations[fromLang] || text;
  }

  private extractStructuredData(text: string): TranslationResult['structuredData'] {
    const lowerText = text.toLowerCase();
    const observations: string[] = [];
    const concerns: string[] = [];
    const vitalSigns: Record<string, string> = {};
    const medications: string[] = [];

    const bpMatch = text.match(/(\d{2,3})\/(\d{2,3})/);
    if (bpMatch) {
      vitalSigns.blood_pressure = `${bpMatch[1]}/${bpMatch[2]}`;
      observations.push(`Blood pressure: ${bpMatch[1]}/${bpMatch[2]}`);
    }

    const tempMatch = text.match(/(\d{2,3}\.?\d?)\s*(°|deg|degrees|F|C)/i);
    if (tempMatch) {
      vitalSigns.temperature = tempMatch[1];
      observations.push(`Temperature: ${tempMatch[1]}°`);
    }

    const pulseMatch = text.match(/pulse:?\s*(\d{2,3})|heart rate:?\s*(\d{2,3})|(\d{2,3})\s*bpm/i);
    if (pulseMatch) {
      const pulse = pulseMatch[1] || pulseMatch[2] || pulseMatch[3];
      vitalSigns.pulse = pulse;
      observations.push(`Pulse: ${pulse} bpm`);
    }

    if (lowerText.includes('pain') || lowerText.includes('hurt') || lowerText.includes('discomfort')) {
      concerns.push('Patient reported pain or discomfort');
    }

    if (lowerText.includes('refused') || lowerText.includes('declined') || lowerText.includes('did not want')) {
      concerns.push('Patient refused or declined care activity');
    }

    if (lowerText.includes('fall') || lowerText.includes('fell')) {
      concerns.push('CRITICAL: Fall incident mentioned');
    }

    if (lowerText.includes('medication') || lowerText.includes('medicine') || lowerText.includes('pill')) {
      observations.push('Medication-related observation');
      const medMatch = text.match(/\b([A-Z][a-z]+(?:in|ol|ide|ine|one))\b/g);
      if (medMatch) {
        medications.push(...medMatch);
      }
    }

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    observations.push(...sentences.map(s => s.trim()).filter(s =>
      !observations.some(o => o.includes(s)) && s.length > 10
    ));

    return {
      type: concerns.length > 0 ? 'concern' : 'observation',
      observations: observations.slice(0, 5),
      concerns: concerns.length > 0 ? concerns : undefined,
      vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
      medications: medications.length > 0 ? medications : undefined
    };
  }
}

export const translatorService: TranslatorService = new MockTranslatorService();
