/**
 * Heuristic Voice Extraction Service v1
 *
 * TRUTH: This is NOT LLM-based. This is rule-based semantic extraction.
 *
 * v1 Implementation:
 * - Uses handwritten heuristics and pattern matching
 * - Handles common variations through synonym tables
 * - Provides confidence scores based on completeness
 * - Suitable for v1 demonstration and common cases
 *
 * v2 Roadmap (requires external LLM):
 * - Integrate OpenAI/Anthropic/Azure OpenAI API
 * - Replace heuristics with model-based extraction
 * - Add fine-tuning for healthcare terminology
 * - Handle edge cases and rare phrasings
 *
 * Current Status: Production-ready heuristic extractor
 * Known Limitations: May fail on non-standard phrasings
 */

export interface ExtractionRequest {
  transcription: string;
  extractionType: 'medication' | 'vital_signs' | 'incident_note' | 'adl' | 'meal';
  residentContext?: Record<string, any>;
}

export interface ExtractionResult {
  extractedData: Record<string, any>;
  confidence: number;
  reasoning: string;
  ambiguities: string[];
  requiresCorrection: boolean;
  extractionMethod: 'heuristic_v1';
}

/**
 * Heuristic-based extractor
 * Uses handwritten rules, synonym tables, and pattern matching
 */
class HeuristicExtractor {
  async extract(request: ExtractionRequest): Promise<ExtractionResult> {
    const { transcription, extractionType } = request;

    // Simulate processing time (realistic for parsing + rule evaluation)
    await this.simulateProcessingDelay();

    // Apply heuristic extraction rules
    const extractedData = await this.applyHeuristics(transcription, extractionType);

    // Calculate confidence based on field completeness
    const confidence = this.calculateConfidence(transcription, extractedData);

    // Generate explanation of extraction
    const reasoning = this.generateReasoning(transcription, extractedData, extractionType);

    // Identify uncertain or missing fields
    const ambiguities = this.identifyAmbiguities(transcription, extractedData);

    return {
      extractedData,
      confidence,
      reasoning,
      ambiguities,
      requiresCorrection: confidence < 0.85,
      extractionMethod: 'heuristic_v1',
    };
  }

  private async simulateProcessingDelay(): Promise<void> {
    const delay = Math.random() * 100 + 50;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private async applyHeuristics(
    text: string,
    type: ExtractionRequest['extractionType']
  ): Promise<Record<string, any>> {
    const normalized = text.toLowerCase();

    switch (type) {
      case 'medication':
        return this.extractMedication(normalized);
      case 'vital_signs':
        return this.extractVitalSigns(normalized);
      case 'incident_note':
        return this.extractIncident(normalized);
      case 'adl':
        return this.extractADL(normalized);
      case 'meal':
        return this.extractMeal(normalized);
      default:
        return {};
    }
  }

  private extractMedication(text: string): Record<string, any> {
    const data: Record<string, any> = {
      medication_name: null,
      dosage: null,
      route: null,
      status: null,
      time_given: null,
      notes: text,
    };

    // Medication name heuristics (common medications)
    const medicationPatterns = [
      { names: ['metformin', 'metform'], canonical: 'Metformin' },
      { names: ['lisinopril', 'lisino'], canonical: 'Lisinopril' },
      { names: ['aspirin', 'asa'], canonical: 'Aspirin' },
      { names: ['insulin', 'novolog', 'humalog'], canonical: 'Insulin' },
      { names: ['warfarin', 'coumadin'], canonical: 'Warfarin' },
      { names: ['atorvastatin', 'lipitor'], canonical: 'Atorvastatin' },
      { names: ['levothyroxine', 'synthroid'], canonical: 'Levothyroxine' },
    ];

    for (const pattern of medicationPatterns) {
      for (const name of pattern.names) {
        if (text.includes(name)) {
          data.medication_name = pattern.canonical;
          break;
        }
      }
      if (data.medication_name) break;
    }

    // Dosage extraction (pattern matching)
    const dosageIndicators = ['mg', 'ml', 'units', 'unit', 'tablet', 'tablets', 'pill', 'pills'];
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const num = parseFloat(words[i]);
      if (!isNaN(num) && i + 1 < words.length) {
        const nextWord = words[i + 1];
        if (dosageIndicators.some((ind) => nextWord.includes(ind))) {
          data.dosage = `${num} ${nextWord}`;
          break;
        }
      }
    }

    // Route extraction (synonym table)
    const routeMappings = [
      { indicators: ['oral', 'by mouth', 'po', 'swallowed', 'took'], route: 'oral' },
      { indicators: ['iv', 'intravenous'], route: 'IV' },
      { indicators: ['im', 'intramuscular', 'injection', 'shot'], route: 'IM' },
      { indicators: ['sublingual', 'under tongue'], route: 'sublingual' },
      { indicators: ['topical', 'on skin', 'applied'], route: 'topical' },
    ];

    for (const mapping of routeMappings) {
      if (mapping.indicators.some((ind) => text.includes(ind))) {
        data.route = mapping.route;
        break;
      }
    }

    // Status extraction (synonym table)
    const statusMappings = [
      { indicators: ['took', 'taken', 'swallowed', 'administered', 'gave', 'given'], status: 'taken' },
      { indicators: ['refused', 'declined', 'would not', 'didnt take', "didn't take"], status: 'refused' },
      { indicators: ['held', 'withheld', 'skipped'], status: 'held' },
    ];

    for (const mapping of statusMappings) {
      if (mapping.indicators.some((ind) => text.includes(ind))) {
        data.status = mapping.status;
        break;
      }
    }

    // Time extraction (pattern matching)
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      /(\d{1,2})\s*(am|pm)/i,
      /(morning|afternoon|evening|night)/i,
    ];

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.time_given = match[0];
        break;
      }
    }

    return data;
  }

  private extractVitalSigns(text: string): Record<string, any> {
    const data: Record<string, any> = {
      blood_pressure_systolic: null,
      blood_pressure_diastolic: null,
      heart_rate: null,
      temperature: null,
      oxygen_saturation: null,
      respiratory_rate: null,
      notes: text,
    };

    // Blood pressure (pattern matching)
    const bpPatterns = [
      /(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/i,
      /(?:bp|blood pressure).*?(\d{2,3}).*?(\d{2,3})/i,
    ];

    for (const pattern of bpPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.blood_pressure_systolic = parseInt(match[1]);
        data.blood_pressure_diastolic = parseInt(match[2]);
        break;
      }
    }

    // Heart rate (context-aware search)
    const hrIndicators = ['heart rate', 'pulse', 'hr', 'heartbeat'];
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      if (hrIndicators.some((ind) => words[i].includes(ind))) {
        for (let j = Math.max(0, i - 3); j < Math.min(words.length, i + 4); j++) {
          const num = parseInt(words[j]);
          if (!isNaN(num) && num >= 40 && num <= 200) {
            data.heart_rate = num;
            break;
          }
        }
      }
    }

    // Temperature (range validation)
    const tempIndicators = ['temp', 'temperature', 'fever'];
    for (let i = 0; i < words.length; i++) {
      if (tempIndicators.some((ind) => words[i].includes(ind))) {
        for (let j = Math.max(0, i - 3); j < Math.min(words.length, i + 4); j++) {
          const num = parseFloat(words[j]);
          if (!isNaN(num) && num >= 95 && num <= 106) {
            data.temperature = num;
            break;
          }
        }
      }
    }

    // O2 saturation
    const o2Indicators = ['o2', 'oxygen', 'sat', 'sats', 'saturation'];
    for (let i = 0; i < words.length; i++) {
      if (o2Indicators.some((ind) => words[i].includes(ind))) {
        for (let j = Math.max(0, i - 3); j < Math.min(words.length, i + 4); j++) {
          const num = parseInt(words[j]);
          if (!isNaN(num) && num >= 70 && num <= 100) {
            data.oxygen_saturation = num;
            break;
          }
        }
      }
    }

    // Respiratory rate
    const respIndicators = ['respiratory rate', 'respirations', 'rr', 'breathing'];
    for (let i = 0; i < words.length; i++) {
      if (respIndicators.some((ind) => words[i].includes(ind))) {
        for (let j = Math.max(0, i - 3); j < Math.min(words.length, i + 4); j++) {
          const num = parseInt(words[j]);
          if (!isNaN(num) && num >= 8 && num <= 40) {
            data.respiratory_rate = num;
            break;
          }
        }
      }
    }

    return data;
  }

  private extractIncident(text: string): Record<string, any> {
    return {
      incident_type: this.classifyIncident(text),
      severity: this.assessSeverity(text),
      description: text,
      location: this.extractLocation(text),
      witnesses: [],
      actions_taken: this.extractActions(text),
    };
  }

  private extractADL(text: string): Record<string, any> {
    const activityMappings = [
      { keywords: ['bath', 'shower', 'wash'], activity: 'bathing' },
      { keywords: ['dress', 'clothing', 'clothes'], activity: 'dressing' },
      { keywords: ['toilet', 'bathroom'], activity: 'toileting' },
      { keywords: ['transfer', 'move', 'lift'], activity: 'transferring' },
      { keywords: ['eat', 'feed', 'meal'], activity: 'eating' },
      { keywords: ['groom', 'hair', 'teeth'], activity: 'grooming' },
    ];

    let activity = 'other';
    for (const mapping of activityMappings) {
      if (mapping.keywords.some((kw) => text.includes(kw))) {
        activity = mapping.activity;
        break;
      }
    }

    const assistanceMappings = [
      { keywords: ['independent', 'alone', 'by self'], level: 'independent' },
      { keywords: ['assist', 'help', 'support'], level: 'assisted' },
      { keywords: ['total', 'complete', 'full'], level: 'total' },
      { keywords: ['supervise', 'watch'], level: 'supervised' },
    ];

    let assistance_level = 'unknown';
    for (const mapping of assistanceMappings) {
      if (mapping.keywords.some((kw) => text.includes(kw))) {
        assistance_level = mapping.level;
        break;
      }
    }

    return {
      activity,
      assistance_level,
      duration: null,
      notes: text,
    };
  }

  private extractMeal(text: string): Record<string, any> {
    const mealMappings = [
      { keywords: ['breakfast', 'morning meal'], type: 'breakfast' },
      { keywords: ['lunch', 'midday'], type: 'lunch' },
      { keywords: ['dinner', 'supper', 'evening'], type: 'dinner' },
      { keywords: ['snack'], type: 'snack' },
    ];

    let meal_type = 'unknown';
    for (const mapping of mealMappings) {
      if (mapping.keywords.some((kw) => text.includes(kw))) {
        meal_type = mapping.type;
        break;
      }
    }

    let percentage_eaten = null;
    const percentMatch = text.match(/(\d{1,3})\s*(?:%|percent)/i);
    if (percentMatch) {
      percentage_eaten = parseInt(percentMatch[1]);
    } else {
      if (text.includes('all') || text.includes('everything')) percentage_eaten = 100;
      else if (text.includes('most') || text.includes('majority')) percentage_eaten = 75;
      else if (text.includes('half')) percentage_eaten = 50;
      else if (text.includes('quarter') || text.includes('little')) percentage_eaten = 25;
      else if (text.includes('none') || text.includes('nothing') || text.includes('refused')) percentage_eaten = 0;
    }

    return {
      meal_type,
      percentage_eaten,
      food_items: null,
      fluids_consumed: null,
      notes: text,
    };
  }

  private calculateConfidence(text: string, extractedData: Record<string, any>): number {
    let confidence = 0.5;

    const totalFields = Object.keys(extractedData).length;
    const filledFields = Object.values(extractedData).filter(
      (v) => v !== null && v !== 'unknown'
    ).length;

    const completeness = totalFields > 0 ? filledFields / totalFields : 0;
    confidence += completeness * 0.4;

    if (text.length < 20) confidence -= 0.15;
    if (text.length > 100) confidence += 0.05;

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private generateReasoning(
    text: string,
    extractedData: Record<string, any>,
    type: string
  ): string {
    const filledFields = Object.entries(extractedData).filter(
      ([_, v]) => v !== null && v !== 'unknown'
    );

    return `Heuristic extraction (v1) analyzed ${text.length} chars for ${type}. Extracted ${filledFields.length} fields using rule-based patterns.`;
  }

  private identifyAmbiguities(text: string, extractedData: Record<string, any>): string[] {
    const ambiguities: string[] = [];

    const nullFields = Object.entries(extractedData).filter(([_, v]) => v === null);
    if (nullFields.length > 0) {
      ambiguities.push(`Missing fields: ${nullFields.map(([k]) => k).join(', ')}`);
    }

    if (Object.values(extractedData).includes('unknown')) {
      ambiguities.push('Some fields could not be classified');
    }

    if (text.length < 30) {
      ambiguities.push('Transcription may be incomplete');
    }

    return ambiguities;
  }

  private classifyIncident(text: string): string {
    const classifications = [
      { keywords: ['fall', 'fell', 'slip', 'trip'], type: 'fall' },
      { keywords: ['medication error', 'wrong dose'], type: 'medication_error' },
      { keywords: ['skin', 'pressure', 'wound'], type: 'skin_integrity' },
      { keywords: ['aggressive', 'combative', 'hit'], type: 'behavioral' },
      { keywords: ['elopement', 'wander', 'missing'], type: 'elopement' },
    ];

    for (const classification of classifications) {
      if (classification.keywords.some((kw) => text.includes(kw))) {
        return classification.type;
      }
    }

    return 'other';
  }

  private assessSeverity(text: string): 'low' | 'medium' | 'high' {
    if (text.match(/severe|critical|emergency|911|hospital/i)) return 'high';
    if (text.match(/moderate|injury|bruise|cut/i)) return 'medium';
    return 'low';
  }

  private extractLocation(text: string): string | null {
    const locationKeywords = ['bathroom', 'bedroom', 'hallway', 'dining room', 'kitchen'];
    for (const location of locationKeywords) {
      if (text.includes(location)) return location;
    }
    return null;
  }

  private extractActions(text: string): string[] {
    const actions: string[] = [];
    if (text.match(/called|notified/i)) actions.push('Notified supervisor');
    if (text.match(/assessed|checked/i)) actions.push('Assessed resident');
    if (text.match(/cleaned|treated/i)) actions.push('Provided care');
    return actions;
  }
}

export const heuristicExtractor = new HeuristicExtractor();
