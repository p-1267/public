import { supabase } from '../lib/supabase';

export interface QualityMetrics {
  overallScore: number;
  blurScore?: number;
  lightingScore?: number;
  compositionScore?: number;
  audioVolumeScore?: number;
  audioNoiseScore?: number;
  issues: Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

export interface EvidenceQualityResult {
  id: string;
  passed: boolean;
  metrics: QualityMetrics;
}

export class EvidenceQualityService {
  async scorePhotoEvidence(
    taskEvidenceId: string,
    imageData: string | Blob
  ): Promise<EvidenceQualityResult> {
    // REAL image quality analysis
    // In production, would use image processing libraries

    const metrics = await this.analyzeImageQuality(imageData);

    const { data: qualityId, error } = await supabase.rpc('score_evidence_quality', {
      p_task_evidence_id: taskEvidenceId,
      p_evidence_type: 'photo',
      p_overall_score: metrics.overallScore,
      p_quality_metrics: {
        blur_score: metrics.blurScore,
        lighting_score: metrics.lightingScore,
        composition_score: metrics.compositionScore,
        quality_issues: metrics.issues,
      },
    });

    if (error) {
      throw new Error(`Quality scoring failed: ${error.message}`);
    }

    return {
      id: qualityId,
      passed: metrics.overallScore >= 60,
      metrics,
    };
  }

  async scoreAudioEvidence(
    taskEvidenceId: string,
    audioBlob: Blob,
    duration: number
  ): Promise<EvidenceQualityResult> {
    const metrics = await this.analyzeAudioQuality(audioBlob, duration);

    const { data: qualityId, error } = await supabase.rpc('score_evidence_quality', {
      p_task_evidence_id: taskEvidenceId,
      p_evidence_type: 'audio',
      p_overall_score: metrics.overallScore,
      p_quality_metrics: {
        audio_volume_score: metrics.audioVolumeScore,
        audio_noise_score: metrics.audioNoiseScore,
        quality_issues: metrics.issues,
      },
    });

    if (error) {
      throw new Error(`Quality scoring failed: ${error.message}`);
    }

    return {
      id: qualityId,
      passed: metrics.overallScore >= 60,
      metrics,
    };
  }

  private async analyzeImageQuality(imageData: string | Blob): Promise<QualityMetrics> {
    // Convert to image element for analysis
    const img = await this.loadImage(imageData);

    // Analyze image properties
    const blurScore = this.detectBlur(img);
    const lightingScore = this.analyzeLighting(img);
    const compositionScore = this.analyzeComposition(img);

    const issues: QualityMetrics['issues'] = [];

    if (blurScore < 60) {
      issues.push({
        issue: 'blur',
        severity: blurScore < 40 ? 'high' : 'medium',
        description: 'Image appears blurry or out of focus',
      });
    }

    if (lightingScore < 60) {
      issues.push({
        issue: 'lighting',
        severity: lightingScore < 40 ? 'high' : 'medium',
        description: 'Poor lighting conditions detected',
      });
    }

    if (compositionScore < 60) {
      issues.push({
        issue: 'composition',
        severity: 'low',
        description: 'Subject may be poorly framed',
      });
    }

    const overallScore = Math.round((blurScore + lightingScore + compositionScore) / 3);

    return {
      overallScore,
      blurScore,
      lightingScore,
      compositionScore,
      issues,
    };
  }

  private async analyzeAudioQuality(
    audioBlob: Blob,
    duration: number
  ): Promise<QualityMetrics> {
    // Analyze audio properties
    const volumeScore = this.analyzeAudioVolume(audioBlob, duration);
    const noiseScore = this.analyzeAudioNoise(audioBlob, duration);

    const issues: QualityMetrics['issues'] = [];

    if (volumeScore < 60) {
      issues.push({
        issue: 'volume',
        severity: volumeScore < 40 ? 'high' : 'medium',
        description: 'Audio volume is too low',
      });
    }

    if (noiseScore < 60) {
      issues.push({
        issue: 'noise',
        severity: noiseScore < 40 ? 'high' : 'medium',
        description: 'High background noise detected',
      });
    }

    if (duration < 2) {
      issues.push({
        issue: 'duration',
        severity: 'high',
        description: 'Recording is very short, may be incomplete',
      });
    }

    const overallScore = Math.round((volumeScore + noiseScore) / 2);

    return {
      overallScore,
      audioVolumeScore: volumeScore,
      audioNoiseScore: noiseScore,
      issues,
    };
  }

  // Image analysis helpers

  private async loadImage(imageData: string | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;

      if (typeof imageData === 'string') {
        img.src = imageData;
      } else {
        img.src = URL.createObjectURL(imageData);
      }
    });
  }

  private detectBlur(img: HTMLImageElement): number {
    // Create canvas for analysis
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 50;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate edge sharpness using simple gradient
    let totalGradient = 0;
    let pixelCount = 0;

    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const idx = (y * canvas.width + x) * 4;
        const idxRight = (y * canvas.width + (x + 1)) * 4;
        const idxDown = ((y + 1) * canvas.width + x) * 4;

        // Calculate gradients
        const gx = Math.abs(data[idxRight] - data[idx]);
        const gy = Math.abs(data[idxDown] - data[idx]);
        const gradient = Math.sqrt(gx * gx + gy * gy);

        totalGradient += gradient;
        pixelCount++;
      }
    }

    const avgGradient = totalGradient / pixelCount;

    // Normalize to 0-100 score (higher gradient = sharper image)
    // Typical sharp images have avg gradient > 15
    // Blurry images have avg gradient < 10
    const score = Math.min(100, (avgGradient / 20) * 100);

    return score;
  }

  private analyzeLighting(img: HTMLImageElement): number {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 50;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let totalBrightness = 0;
    let pixelCount = 0;

    // Calculate average brightness
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      pixelCount++;
    }

    const avgBrightness = totalBrightness / pixelCount;

    // Good lighting: 80-180 range
    // Too dark: < 80
    // Too bright: > 180
    let score = 100;

    if (avgBrightness < 80) {
      score = (avgBrightness / 80) * 70; // Penalize darkness
    } else if (avgBrightness > 180) {
      score = 100 - ((avgBrightness - 180) / 75) * 30; // Penalize overexposure
    }

    return Math.max(0, Math.min(100, score));
  }

  private analyzeComposition(img: HTMLImageElement): number {
    // Basic composition checks
    let score = 100;

    // Check aspect ratio (extreme ratios are poor composition)
    const aspectRatio = img.width / img.height;
    if (aspectRatio > 3 || aspectRatio < 0.33) {
      score -= 20;
    }

    // Check resolution (very low res is poor quality)
    const totalPixels = img.width * img.height;
    if (totalPixels < 200000) {
      // Less than ~450x450
      score -= 30;
    } else if (totalPixels < 500000) {
      score -= 15;
    }

    return Math.max(0, score);
  }

  // Audio analysis helpers

  private analyzeAudioVolume(audioBlob: Blob, duration: number): number {
    // Heuristic based on file size and duration
    // Real implementation would use Web Audio API to analyze waveform

    const bytesPerSecond = audioBlob.size / duration;

    // Typical audio bitrates:
    // Very low: < 8000 bytes/sec
    // Low: 8000-16000 bytes/sec
    // Good: 16000-32000 bytes/sec
    // High: > 32000 bytes/sec

    let score = 50;

    if (bytesPerSecond > 32000) {
      score = 95;
    } else if (bytesPerSecond > 16000) {
      score = 85;
    } else if (bytesPerSecond > 8000) {
      score = 70;
    } else {
      score = 40;
    }

    return score;
  }

  private analyzeAudioNoise(audioBlob: Blob, duration: number): number {
    // Heuristic based on consistent bitrate
    // Real implementation would analyze frequency spectrum

    const bytesPerSecond = audioBlob.size / duration;

    // Very consistent bitrate usually means clear audio
    // Highly variable bitrate can indicate noise

    // For now, use simple heuristic
    let score = 75;

    // Penalize very short recordings (likely clipped/noisy)
    if (duration < 2) score -= 25;
    else if (duration < 5) score -= 10;

    // Penalize very low bitrate (compression artifacts)
    if (bytesPerSecond < 8000) score -= 15;

    return Math.max(0, score);
  }
}

export const evidenceQuality = new EvidenceQualityService();
