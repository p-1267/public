import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Document {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;
  document_date: string | null;
  category_name: string | null;
  tags: string[] | null;
  is_sensitive: boolean;
  uploaded_by_name: string | null;
  uploaded_at: string;
  is_shared_with_me: boolean;
  can_download: boolean;
}

export interface DocumentShare {
  shared_with_user_id: string;
  user_name: string;
  user_email: string;
  can_view: boolean;
  can_download: boolean;
  shared_at: string;
  expires_at: string | null;
}

export function useDocuments(residentId: string | null) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!residentId) {
      setLoading(false);
      return;
    }

    fetchDocuments();
  }, [residentId]);

  const fetchDocuments = async (categoryId?: string, searchText?: string) => {
    if (!residentId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc('get_resident_documents', {
        p_resident_id: residentId,
        p_category_id: categoryId || null,
        p_search_text: searchText || null
      });

      if (err) throw err;

      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (data: {
    resident_id: string;
    title: string;
    file_name: string;
    storage_path: string;
    category_id?: string;
    description?: string;
    file_size?: number;
    file_type?: string;
    document_date?: string;
    tags?: string[];
    is_sensitive?: boolean;
    auto_share_with_family?: boolean;
  }) => {
    try {
      const { data: documentId, error } = await supabase.rpc('upload_document', {
        p_resident_id: data.resident_id,
        p_title: data.title,
        p_file_name: data.file_name,
        p_storage_path: data.storage_path,
        p_category_id: data.category_id || null,
        p_description: data.description || null,
        p_file_size: data.file_size || null,
        p_file_type: data.file_type || null,
        p_document_date: data.document_date || null,
        p_tags: data.tags || null,
        p_is_sensitive: data.is_sensitive || false,
        p_auto_share_with_family: data.auto_share_with_family !== false
      });

      if (error) throw error;

      await fetchDocuments();
      return documentId;
    } catch (err) {
      console.error('Error uploading document:', err);
      throw err;
    }
  };

  const shareDocument = async (
    documentId: string,
    sharedWithUserId: string,
    options: {
      can_view?: boolean;
      can_download?: boolean;
      expires_at?: string;
    } = {}
  ) => {
    try {
      const { data: shareId, error } = await supabase.rpc('share_document', {
        p_document_id: documentId,
        p_shared_with_user_id: sharedWithUserId,
        p_can_view: options.can_view !== false,
        p_can_download: options.can_download !== false,
        p_expires_at: options.expires_at || null
      });

      if (error) throw error;

      return shareId;
    } catch (err) {
      console.error('Error sharing document:', err);
      throw err;
    }
  };

  const revokeDocumentShare = async (documentId: string, userId: string) => {
    try {
      const { error } = await supabase.rpc('revoke_document_share', {
        p_document_id: documentId,
        p_user_id: userId
      });

      if (error) throw error;
    } catch (err) {
      console.error('Error revoking document share:', err);
      throw err;
    }
  };

  const logDocumentAccess = async (
    documentId: string,
    accessType: 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'DELETE'
  ) => {
    try {
      const { error } = await supabase.rpc('log_document_access', {
        p_document_id: documentId,
        p_access_type: accessType,
        p_ip_address: null,
        p_user_agent: navigator.userAgent
      });

      if (error) throw error;
    } catch (err) {
      console.error('Error logging document access:', err);
    }
  };

  const getDocumentShares = async (documentId: string): Promise<DocumentShare[]> => {
    try {
      const { data, error } = await supabase.rpc('get_document_shares', {
        p_document_id: documentId
      });

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error getting document shares:', err);
      throw err;
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      await logDocumentAccess(documentId, 'DELETE');

      const { error } = await supabase
        .from('resident_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      await fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      throw err;
    }
  };

  return {
    documents,
    loading,
    error,
    refresh: fetchDocuments,
    uploadDocument,
    shareDocument,
    revokeDocumentShare,
    logDocumentAccess,
    getDocumentShares,
    deleteDocument
  };
}
