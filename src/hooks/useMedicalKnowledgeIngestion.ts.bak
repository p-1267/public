import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface MedicalDocumentUpload {
  id: string;
  resident_id: string;
  document_type: string;
  file_name: string;
  ocr_status: string;
  created_at: string;
}

export interface MedicalExtraction {
  id: string;
  document_id: string;
  extraction_type: string;
  test_name?: string;
  test_value?: string;
  test_unit?: string;
  normal_range_low?: string;
  normal_range_high?: string;
  flag_status?: string;
  confidence_score: number;
  approval_status: string;
  is_active: boolean;
}

export function useMedicalKnowledgeIngestion(residentId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadDocument = useCallback(async (params: {
    residentId: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storagePath: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('medical_document_uploads')
        .insert({
          resident_id: params.residentId,
          document_type: params.documentType,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          file_name: params.fileName,
          file_size_bytes: params.fileSize,
          mime_type: params.mimeType,
          storage_path: params.storagePath,
          ocr_status: 'PENDING'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDocumentExtractions = useCallback(async (documentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('medical_document_extractions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      return data as MedicalExtraction[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const approveExtraction = useCallback(async (extractionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error: updateError } = await supabase
        .from('medical_document_extractions')
        .update({
          approval_status: 'APPROVED',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          is_active: true,
          activated_at: new Date().toISOString()
        })
        .eq('id', extractionId)
        .select()
        .single();

      if (updateError) throw updateError;

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectExtraction = useCallback(async (extractionId: string, reason: string) => {
    setLoading(true);
    setError(null);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error: updateError } = await supabase
        .from('medical_document_extractions')
        .update({
          approval_status: 'REJECTED',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
          is_active: false
        })
        .eq('id', extractionId)
        .select()
        .single();

      if (updateError) throw updateError;

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getResidentBaselines = useCallback(async (residentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('medical_baseline_values')
        .select('*')
        .eq('resident_id', residentId)
        .order('updated_at', { ascending: false });

      if (queryError) throw queryError;

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    uploadDocument,
    getDocumentExtractions,
    approveExtraction,
    rejectExtraction,
    getResidentBaselines
  };
}
