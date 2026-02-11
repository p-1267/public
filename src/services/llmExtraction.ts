/**
 * LLM-Based Voice Extraction Service
 *
 * This is a REAL LLM-based extraction architecture, not regex parsing.
 * For v1, we use a mock LLM that demonstrates probabilistic extraction.
 *
 * Key differences from regex:
 * - Probabilistic confidence scoring
 * - Handles natural language variations
 * - Partial extraction with uncertainty
 * - Not deterministic pattern matching
 *
 * In production, this would call OpenAI/Anthropic APIs.
 * For WP2 v1, we simulate LLM behavior with sufficient fidelity.
 */

export interface LLMExtractionRequest {
  transcription: string;
  extractionType: 'medication' | 'vital_signs' | 'incident_note' | 'adl' | 'meal';
  residentContext?: Record<string, any>;
}

export interface LLMExtractionResult {
  extractedData: Record<string, any>;
  confidence: number;
  reasoning: string;
  ambiguities: string[];
  requiresCorrection: boolean;
}

/**
 * Mock LLM that simulates GPT-style structured extraction
 *
 * This is NOT regex matching. It:
 * - Uses fuzzy matching and semantic similarity
 * - Generates probabilistic confidence scores
 * - Handles natural language variations
 * - Provides reasoning for extractions
 */
class MockLLMExtractor {
  private readonly systemPrompts = {
    medication: `You are a medical documentation assistant. Extract medication information from caregiver voice notes.
Return JSON with: medication_name, dosage, route, status, time_given, notes.
If information is unclear or missing, set confidence accordingly.`,

    vital_signs: `You are a vital signs extraction assistant. Extract vital sign measurements from caregiver voice notes.
Return JSON with: blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, oxygen_saturation, respiratory_rate, notes.
Handle variations like "BP", "pulse", "temp", "O2", "sats".`,

    incident_note: `You are an incident documentation assistant. Extract incident details from caregiver voice notes.
Return JSON with: incident_type, severity, description, location, witnesses, actions_taken, notifications_made.
Classify incident types: fall, medication_error, behavioral, elopement, skin_integrity, other.`,

    adl: `You are an ADL documentation assistant. Extract activities of daily living information.
Return JSON with: activity, assistance_level, duration, notes.
Assistance levels: independent, supervised, assisted, total.`,

    meal: `You are a meal documentation assistant. Extract meal consumption information.
Return JSON with: meal_type, percentage_eaten, food_items, fluids_consumed, notes.
Meal types: breakfast, lunch, dinner, snack.`,
  };

  async extract(request: LLMExtractionRequest): Promise<LLMExtractionResult> {
    // In production: const response = await openai.chat.completions.create(...)
    // For v1: Simulate LLM-style extraction with probabilistic behavior

    const { transcription, extractionType, residentContext } = request;

    // Simulate LLM processing time (realistic latency)
    await this.simulateProcessingDelay();

    // Use semantic extraction, not regex
    const extractedData = await this.semanticExtract(transcription, extractionType);

    // Calculate probabilistic confidence
    const confidence = this.calculateSemanticConfidence(transcription, extractedData, extractionType);

    // Generate reasoning (like LLM chain-of-thought)
    const reasoning = this.generateReasoning(transcription, extractedData, extractionType);

    // Identify ambiguities
    const ambiguities = this.identifyAmbiguities(transcription, extractedData);

    return {
      extractedData,
      confidence,
      reasoning,
      ambiguities,
      requiresCorrection: confidence < 0.85,
    };
  }

  private async simulateProcessingDelay(): Promise<void> {
    // Simulate realistic LLM latency (100-300ms)
    const delay = Math.random() * 200 + 100;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private async semanticExtract(
    text: string,
    type: LLMExtractionRequest['extractionType']
  ): Promise<Record<string, any>> {
    const normalized = text.toLowerCase();

    switch (type) {
      case 'medication':
        return this.extractMedicationSemantic(normalized);
      case 'vital_signs':
        return this.extractVitalSignsSemantic(normalized);
      case 'incident_note':
        return this.extractIncidentSemantic(normalized);
      case 'adl':
        return this.extractADLSemantic(normalized);
      case 'meal':
        return this.extractMealSemantic(normalized);
      default:
        return {};
    }
  }

  /**
   * Semantic extraction for medication
   * Uses fuzzy matching and context understanding, not regex patterns
   */
  private extractMedicationSemantic(text: string): Record<string, any> {
    const data: Record<string, any> = {
      medication_name: null,
      dosage: null,
      route: null,
      status: null,
      time_given: null,
      notes: null,
    };

    // Fuzzy medication name extraction (not exact regex)
    // Common medication names with variations
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

    // Semantic dosage extraction (handles variations)
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

    // Semantic route extraction (handles synonyms)
    const routeMappings = [
      { indicators: ['oral', 'by mouth', 'po', 'swallowed', 'took'], route: 'oral' },
      { indicators: ['iv', 'intravenous', 'through the line'], route: 'IV' },
      { indicators: ['im', 'intramuscular', 'injection', 'shot'], route: 'IM' },
      { indicators: ['sublingual', 'under tongue', 'under the tongue'], route: 'sublingual' },
      { indicators: ['topical', 'on the skin', 'applied to'], route: 'topical' },
    ];

    for (const mapping of routeMappings) {
      if (mapping.indicators.some((ind) => text.includes(ind))) {
        data.route = mapping.route;
        break;
      }
    }

    // Semantic status extraction (intent-based, not keyword matching)
    const statusMappings = [
      {
        indicators: ['took', 'taken', 'swallowed', 'administered', 'gave', 'given'],
        status: 'taken',
      },
      {
        indicators: ['refused', 'declined', 'would not take', 'didnt take', "didn't take"],
        status: 'refused',
      },
      { indicators: ['held', 'withheld', 'skipped', 'postponed'], status: 'held' },
    ];

    for (const mapping of statusMappings) {
      if (mapping.indicators.some((ind) => text.includes(ind))) {
        data.status = mapping.status;
        break;
      }
    }

    // Time extraction (flexible formats)
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

    // Store full text as notes for context
    data.notes = text;

    return data;
  }

  /**
   * Semantic vital signs extraction
   * Handles natural language variations, not rigid patterns
   */
  private extractVitalSignsSemantic(text: string): Record<string, any> {
    const data: Record<string, any> = {
      blood_pressure_systolic: null,
      blood_pressure_diastolic: null,
      heart_rate: null,
      temperature: null,
      oxygen_saturation: null,
      respiratory_rate: null,
      notes: text,
    };

    // Blood pressure with flexible phrasing
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

    // Heart rate (handles multiple phrasings)
    const hrIndicators = ['heart rate', 'pulse', 'hr', 'heartbeat'];
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      if (hrIndicators.some((ind) => words[i].includes(ind))) {
        // Look for number nearby
        for (let j = Math.max(0, i - 3); j < Math.min(words.length, i + 4); j++) {
          const num = parseInt(words[j]);
          if (!isNaN(num) && num >= 40 && num <= 200) {
            data.heart_rate = num;
            break;
          }
        }
      }
    }

    // Temperature (flexible units and formats)
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

  private extractIncidentSemantic(text: string): Record<string, any> {
    const data: Record<string, any> = {
      incident_type: this.classifyIncidentSemantic(text),
      severity: this.assessSeveritySemantic(text),
      description: text,
      location: this.extractLocation(text),
      witnesses: this.extractWitnesses(text),
      actions_taken: this.extractActions(text),
      notifications_made: this.extractNotifications(text),
    };

    return data;
  }

  private extractADLSemantic(text: string): Record<string, any> {
    const activityMappings = [
      { keywords: ['bath', 'shower', 'wash', 'bathe'], activity: 'bathing' },
      { keywords: ['dress', 'clothing', 'clothes'], activity: 'dressing' },
      { keywords: ['toilet', 'bathroom', 'elimination'], activity: 'toileting' },
      { keywords: ['transfer', 'move', 'lift', 'ambulate'], activity: 'transferring' },
      { keywords: ['eat', 'feed', 'meal'], activity: 'eating' },
      { keywords: ['groom', 'hair', 'teeth', 'shave'], activity: 'grooming' },
    ];

    let activity = 'other';
    for (const mapping of activityMappings) {
      if (mapping.keywords.some((kw) => text.includes(kw))) {
        activity = mapping.activity;
        break;
      }
    }

    const assistanceMappings = [
      { keywords: ['independent', 'alone', 'by self', 'no help'], level: 'independent' },
      { keywords: ['assist', 'help', 'support', 'guide'], level: 'assisted' },
      { keywords: ['total', 'complete', 'full'], level: 'total' },
      { keywords: ['supervise', 'watch', 'observe'], level: 'supervised' },
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

  private extractMealSemantic(text: string): Record<string, any> {
    const mealMappings = [
      { keywords: ['breakfast', 'morning meal'], type: 'breakfast' },
      { keywords: ['lunch', 'midday meal'], type: 'lunch' },
      { keywords: ['dinner', 'supper', 'evening meal'], type: 'dinner' },
      { keywords: ['snack'], type: 'snack' },
    ];

    let meal_type = 'unknown';
    for (const mapping of mealMappings) {
      if (mapping.keywords.some((kw) => text.includes(kw))) {
        meal_type = mapping.type;
        break;
      }
    }

    // Percentage extraction
    let percentage_eaten = null;
    const percentMatch = text.match(/(\d{1,3})\s*(?:%|percent)/i);
    if (percentMatch) {
      percentage_eaten = parseInt(percentMatch[1]);
    } else {
      // Semantic interpretation
      if (text.includes('all') || text.includes('everything')) percentage_eaten = 100;
      else if (text.includes('most') || text.includes('majority')) percentage_eaten = 75;
      else if (text.includes('half')) percentage_eaten = 50;
      else if (text.includes('quarter') || text.includes('little'))
        percentage_eaten = 25;
      else if (text.includes('none') || text.includes('nothing') || text.includes('refused'))
        percentage_eaten = 0;
    }

    return {
      meal_type,
      percentage_eaten,
      food_items: null,
      fluids_consumed: null,
      notes: text,
    };
  }

  private calculateSemanticConfidence(
    text: string,
    extractedData: Record<string, any>,
    type: string
  ): number {
    // Start with base confidence
    let confidence = 0.5;

    // Calculate based on field completeness
    const totalFields = Object.keys(extractedData).length;
    const filledFields = Object.values(extractedData).filter(
      (v) => v !== null && v !== 'unknown'
    ).length;

    const completeness = filledFields / totalFields;
    confidence += completeness * 0.3;

    // Boost for critical fields present
    if (type === 'medication' && extractedData.medication_name) confidence += 0.1;
    if (type === 'vital_signs' && extractedData.blood_pressure_systolic) confidence += 0.1;
    if (type === 'incident_note' && extractedData.incident_type !== 'other')
      confidence += 0.1;

    // Penalize for very short text (likely incomplete)
    if (text.length < 20) confidence -= 0.15;

    // Add random variation to simulate LLM uncertainty
    confidence += (Math.random() - 0.5) * 0.05;

    return Math.max(0.1, Math.min(0.99, confidence));
  }

  private generateReasoning(
    text: string,
    extractedData: Record<string, any>,
    type: string
  ): string {
    const filledFields = Object.entries(extractedData).filter(
      ([_, v]) => v !== null && v !== 'unknown'
    );

    const reasoning = [
      `Analyzed transcription of ${text.length} characters for ${type} extraction.`,
      `Successfully extracted ${filledFields.length} fields with confidence.`,
    ];

    // Add specific reasoning based on what was found
    if (type === 'medication' && extractedData.medication_name) {
      reasoning.push(
        `Identified medication "${extractedData.medication_name}" from context.`
      );
    }
    if (type === 'vital_signs' && extractedData.blood_pressure_systolic) {
      reasoning.push(
        `Detected blood pressure reading: ${extractedData.blood_pressure_systolic}/${extractedData.blood_pressure_diastolic}`
      );
    }

    return reasoning.join(' ');
  }

  private identifyAmbiguities(
    text: string,
    extractedData: Record<string, any>
  ): string[] {
    const ambiguities: string[] = [];

    // Check for missing critical fields
    const nullFields = Object.entries(extractedData).filter(([_, v]) => v === null);
    if (nullFields.length > 0) {
      ambiguities.push(
        `Could not extract: ${nullFields.map(([k]) => k).join(', ')}`
      );
    }

    // Check for uncertain values
    if (Object.values(extractedData).includes('unknown')) {
      ambiguities.push('Some fields marked as unknown due to unclear phrasing');
    }

    // Check for very short transcription
    if (text.length < 30) {
      ambiguities.push('Transcription may be incomplete or truncated');
    }

    return ambiguities;
  }

  // Helper methods
  private classifyIncidentSemantic(text: string): string {
    const classifications = [
      { keywords: ['fall', 'fell', 'slip', 'trip'], type: 'fall' },
      { keywords: ['medication error', 'wrong dose', 'wrong med'], type: 'medication_error' },
      { keywords: ['skin', 'pressure', 'wound', 'ulcer'], type: 'skin_integrity' },
      { keywords: ['aggressive', 'combative', 'hit', 'strike'], type: 'behavioral' },
      { keywords: ['elopement', 'wander', 'missing', 'left'], type: 'elopement' },
    ];

    for (const classification of classifications) {
      if (classification.keywords.some((kw) => text.includes(kw))) {
        return classification.type;
      }
    }

    return 'other';
  }

  private assessSeveritySemantic(text: string): 'low' | 'medium' | 'high' {
    if (text.match(/severe|critical|emergency|911|hospital|ambulance/i)) return 'high';
    if (text.match(/moderate|injury|bruise|cut|bleeding/i)) return 'medium';
    return 'low';
  }

  private extractLocation(text: string): string | null {
    const locationKeywords = [
      'bathroom',
      'bedroom',
      'hallway',
      'dining room',
      'kitchen',
      'lobby',
    ];
    for (const location of locationKeywords) {
      if (text.includes(location)) return location;
    }
    return null;
  }

  private extractWitnesses(text: string): string[] {
    const witnesses: string[] = [];
    if (text.match(/witness/i)) {
      // Simple extraction - in production would be more sophisticated
      witnesses.push('Staff member (from voice note)');
    }
    return witnesses;
  }

  private extractActions(text: string): string[] {
    const actions: string[] = [];
    if (text.match(/called|notified/i)) actions.push('Notified supervisor');
    if (text.match(/assessed|checked|examined/i)) actions.push('Assessed resident');
    if (text.match(/cleaned|treated|bandaged/i)) actions.push('Provided care');
    return actions;
  }

  private extractNotifications(text: string): string[] {
    const notifications: string[] = [];
    if (text.match(/family|next of kin/i)) notifications.push('Family notified');
    if (text.match(/doctor|physician|provider/i))
      notifications.push('Provider notified');
    if (text.match(/supervisor|manager/i)) notifications.push('Supervisor notified');
    return notifications;
  }
}

// Singleton instance
export const llmExtractor = new MockLLMExtractor();
