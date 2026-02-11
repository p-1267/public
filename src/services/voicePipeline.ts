import { supabase } from '../lib/supabase';
import { heuristicExtractor } from './heuristicExtraction';
import type { ExtractionRequest } from './heuristicExtraction';

export interface VoiceRecording {
  blob: Blob;
  duration: number;
  url: string;
}

export interface TranscriptionResult {
  id: string;
  text: string;
  confidence: number;
  qualityScore: number;
}

export interface StructuredExtraction {
  id: string;
  type: 'medication' | 'vital_signs' | 'incident_note' | 'adl' | 'meal';
  data: Record<string, any>;
  confidence: number;
  requiresCorrection: boolean;
}

export class VoicePipelineService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      throw new Error(`Failed to start recording: ${error}`);
    }
  }

  async stopRecording(): Promise<VoiceRecording> {
    if (!this.mediaRecorder) {
      throw new Error('No active recording');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No media recorder'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const duration = (Date.now() - this.startTime) / 1000;
        const url = URL.createObjectURL(blob);

        // Stop all tracks
        if (this.mediaRecorder?.stream) {
          this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }

        resolve({ blob, duration, url });
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  async transcribeAudio(recording: VoiceRecording): Promise<TranscriptionResult> {
    // REAL transcription would call Whisper API here
    // For showcase/demo, we use pattern matching on mock text
    // This is acceptable for WP2 v1 per requirements

    // Calculate audio quality score
    const qualityScore = this.calculateAudioQuality(recording.blob, recording.duration);

    // Mock transcription based on duration and quality
    // In production, this would be: const text = await callWhisperAPI(recording.blob)
    const mockText = this.generateMockTranscription(recording.duration);

    // Submit to database
    const { data: transcriptionId, error } = await supabase.rpc(
      'submit_voice_transcription',
      {
        p_task_id: null, // Will be set by caller
        p_audio_url: recording.url,
        p_audio_duration_seconds: recording.duration,
        p_transcription_text: mockText,
        p_transcription_confidence: 0.95,
        p_quality_score: qualityScore,
      }
    );

    if (error) {
      throw new Error(`Transcription failed: ${error.message}`);
    }

    return {
      id: transcriptionId,
      text: mockText,
      confidence: 0.95,
      qualityScore,
    };
  }

  async extractStructuredData(
    transcriptionId: string,
    text: string,
    extractionType: StructuredExtraction['type']
  ): Promise<StructuredExtraction> {
    // TRUTH: v1 uses heuristic extraction (rule-based), NOT LLM
    // v2 will integrate OpenAI/Anthropic for true model-based extraction

    const extractionRequest: ExtractionRequest = {
      transcription: text,
      extractionType,
    };

    // Call heuristic extractor (rule-based with synonym tables)
    const extractionResult = await heuristicExtractor.extract(extractionRequest);

    // Submit extraction to database
    const { data: extractionId, error } = await supabase.rpc(
      'create_structured_extraction',
      {
        p_voice_transcription_id: transcriptionId,
        p_extraction_type: extractionType,
        p_extracted_data: extractionResult.extractedData,
        p_confidence_score: extractionResult.confidence,
      }
    );

    if (error) {
      throw new Error(`Extraction failed: ${error.message}`);
    }

    return {
      id: extractionId,
      type: extractionType,
      data: extractionResult.extractedData,
      confidence: extractionResult.confidence,
      requiresCorrection: extractionResult.requiresCorrection,
    };
  }

  async correctExtraction(
    extractionId: string,
    correctedData: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase.rpc('correct_voice_extraction', {
      p_extraction_id: extractionId,
      p_corrected_data: correctedData,
    });

    if (error) {
      throw new Error(`Correction failed: ${error.message}`);
    }
  }

  // Extraction moved to heuristicExtraction.ts (v1 rule-based)
  // v2 will integrate real LLM providers (OpenAI/Anthropic)

  private calculateAudioQuality(blob: Blob, duration: number): number {
    // Basic quality heuristics
    // In production, would analyze waveform, volume, noise floor

    let score = 100;

    // Penalize very short recordings (likely cut off)
    if (duration < 2) score -= 30;
    else if (duration < 5) score -= 15;

    // Penalize unusually small file size (low bitrate/quality)
    const bytesPerSecond = blob.size / duration;
    if (bytesPerSecond < 8000) score -= 20; // Very low bitrate
    else if (bytesPerSecond < 16000) score -= 10; // Low bitrate

    // Penalize very long recordings (likely has dead air)
    if (duration > 120) score -= 10;

    return Math.max(score, 0);
  }

  private generateMockTranscription(duration: number): string {
    // Generate realistic mock transcription based on duration
    // In production, this would be actual Whisper output

    const samples = [
      'Patient took Metformin 500 mg orally at 9 AM without issues.',
      'Blood pressure is 128 over 82, heart rate 76, temperature 98.2 degrees.',
      'Resident fell in bathroom at 2:15 PM. No visible injuries. Notified supervisor immediately.',
      'Assisted with bathing and dressing this morning. Required moderate support.',
      'Breakfast: ate about 75 percent of meal, drank full glass of juice.',
      'Resident refused morning medication. States feeling nauseous. Will try again after lunch.',
      'Vitals all within normal range. Resident reports feeling well today.',
      'Repositioned to left side at 10 AM. Skin check showed no concerns.',
    ];

    // Select sample based on duration (longer = more detail)
    const index = Math.min(Math.floor(duration / 5), samples.length - 1);
    return samples[index];
  }
}

// Singleton instance
export const voicePipeline = new VoicePipelineService();
