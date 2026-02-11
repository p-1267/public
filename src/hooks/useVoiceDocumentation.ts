import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface VoiceRecording {
  audioBlob: Blob;
  duration: number;
  detectedLanguage?: string;
}

export interface VoiceTranscriptionResult {
  jobId: string;
  transcript: string;
  originalLanguage: string;
  confidence: number;
  translatedText?: string;
}

export function useVoiceDocumentation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startRecording = async (): Promise<MediaRecorder | null> => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      setIsRecording(true);
      return mediaRecorder;
    } catch (err) {
      setError('Microphone access denied. Please enable microphone permissions.');
      console.error('Failed to start recording:', err);
      return null;
    }
  };

  const stopRecording = (mediaRecorder: MediaRecorder): Promise<Blob> => {
    return new Promise((resolve) => {
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  };

  const uploadAudio = async (
    audioBlob: Blob,
    taskId?: string,
    residentId?: string
  ): Promise<{ path: string; filename: string } | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filename = `voice_${Date.now()}_${user.id}.webm`;
      const filePath = `audio/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(filePath, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      return { path: filePath, filename };
    } catch (err) {
      console.error('Failed to upload audio:', err);
      setError('Failed to upload audio recording');
      return null;
    }
  };

  const submitForTranscription = async (
    audioPath: string,
    audioFilename: string,
    audioDuration: number,
    audioSize: number,
    taskId?: string,
    residentId?: string
  ): Promise<string | null> => {
    try {
      setIsProcessing(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.agency_id) {
        throw new Error('User agency not found');
      }

      const { data, error } = await supabase.rpc('submit_voice_transcription', {
        p_agency_id: profile.agency_id,
        p_audio_storage_path: audioPath,
        p_audio_filename: audioFilename,
        p_audio_duration: audioDuration,
        p_audio_size_bytes: audioSize,
        p_task_id: taskId || null,
        p_resident_id: residentId || null
      });

      if (error) throw error;

      return data.job_id;
    } catch (err) {
      console.error('Failed to submit transcription:', err);
      setError('Failed to submit for transcription');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const pollTranscriptionStatus = async (
    jobId: string
  ): Promise<VoiceTranscriptionResult | null> => {
    try {
      const { data, error } = await supabase.rpc('poll_voice_transcription', {
        p_job_id: jobId
      });

      if (error) throw error;

      if (data.status === 'completed' && data.transcript) {
        return {
          jobId,
          transcript: data.transcript,
          originalLanguage: data.language || 'en',
          confidence: data.confidence || 0.95,
          translatedText: data.transcript
        };
      }

      if (data.status === 'failed') {
        throw new Error(data.error || 'Transcription failed');
      }

      return null;
    } catch (err) {
      console.error('Failed to poll transcription:', err);
      setError('Failed to check transcription status');
      return null;
    }
  };

  const recordAndTranscribe = async (
    taskId?: string,
    residentId?: string
  ): Promise<VoiceTranscriptionResult | null> => {
    const mediaRecorder = await startRecording();
    if (!mediaRecorder) return null;

    return new Promise((resolve) => {
      mediaRecorder.start();

      setTimeout(async () => {
        const audioBlob = await stopRecording(mediaRecorder);
        const uploadResult = await uploadAudio(audioBlob, taskId, residentId);

        if (!uploadResult) {
          resolve(null);
          return;
        }

        const jobId = await submitForTranscription(
          uploadResult.path,
          uploadResult.filename,
          3,
          audioBlob.size,
          taskId,
          residentId
        );

        if (!jobId) {
          resolve(null);
          return;
        }

        setIsProcessing(true);

        const pollInterval = setInterval(async () => {
          const result = await pollTranscriptionStatus(jobId);

          if (result) {
            clearInterval(pollInterval);
            setIsProcessing(false);
            resolve(result);
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
          setIsProcessing(false);
          setError('Transcription timeout');
          resolve(null);
        }, 60000);
      }, 5000);
    });
  };

  return {
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    uploadAudio,
    submitForTranscription,
    pollTranscriptionStatus,
    recordAndTranscribe
  };
}
