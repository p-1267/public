import React, { useState, useEffect } from 'react';
import { useDocuments, Document } from '../hooks/useDocuments';
import { useSeniorResident } from '../hooks/useSeniorResident';
import { useShowcase } from '../contexts/ShowcaseContext';
import { supabase } from '../lib/supabase';

export function SeniorDocumentsPage() {
  const { resident: authResident, loading: authLoading } = useSeniorResident();
  const { selectedResidentId, isShowcaseMode } = useShowcase();
  const [showcaseResident, setShowcaseResident] = useState<any>(null);
  const [showcaseLoading, setShowcaseLoading] = useState(true);

  useEffect(() => {
    if (isShowcaseMode && selectedResidentId) {
      setShowcaseLoading(true);
      supabase
        .from('residents')
        .select('*')
        .eq('id', selectedResidentId)
        .maybeSingle()
        .then(({ data }) => {
          setShowcaseResident(data);
          setShowcaseLoading(false);
        })
        .catch(() => setShowcaseLoading(false));
    } else if (!isShowcaseMode) {
      setShowcaseLoading(false);
    }
  }, [isShowcaseMode, selectedResidentId]);

  const resident = isShowcaseMode ? showcaseResident : authResident;
  const residentLoading = isShowcaseMode ? showcaseLoading : authLoading;

  const { documents, loading, uploadDocument, logDocumentAccess, deleteDocument } = useDocuments(resident?.id || null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  if (residentLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-2xl text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-2xl text-gray-600">No resident found</p>
      </div>
    );
  }

  const categories = ['all', 'Medical Records', 'Lab Results', 'Prescriptions', 'Insurance', 'Legal', 'Care Plans', 'Photos', 'Other'];

  const filteredDocs = documents.filter(doc => {
    if (selectedCategory !== 'all' && doc.category_name !== selectedCategory) return false;
    if (searchText && !doc.title.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const handleDocumentView = async (doc: Document) => {
    setSelectedDoc(doc);
    await logDocumentAccess(doc.id, 'VIEW');
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            My Documents
          </h1>
          <p className="text-2xl text-gray-600">
            Medical records, test results, and important files
          </p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search documents..."
            className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-3 rounded-xl text-xl font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? 'All Documents' : cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowUploadForm(true)}
          className="w-full mb-8 p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg text-2xl font-semibold transition-colors"
        >
          + Upload New Document
        </button>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center">
            <p className="text-3xl text-gray-500">No documents found</p>
            <p className="text-xl text-gray-400 mt-4">
              Upload documents to keep everything organized
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={() => handleDocumentView(doc)}
              />
            ))}
          </div>
        )}

        {selectedDoc && (
          <DocumentViewModal
            document={selectedDoc}
            onClose={() => setSelectedDoc(null)}
            onDelete={async () => {
              await deleteDocument(selectedDoc.id);
              setSelectedDoc(null);
            }}
          />
        )}

        {showUploadForm && (
          <UploadDocumentModal
            residentId={resident.id}
            onClose={() => setShowUploadForm(false)}
            onUpload={uploadDocument}
          />
        )}
      </div>
    </div>
  );
}

interface DocumentCardProps {
  document: Document;
  onView: () => void;
}

function DocumentCard({ document, onView }: DocumentCardProps) {
  const fileIcon = document.file_type?.includes('pdf') ? '📄' :
                   document.file_type?.includes('image') ? '🖼️' :
                   document.file_type?.includes('doc') ? '📝' :
                   '📋';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onView}
      className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-400 cursor-pointer transition-all shadow-sm hover:shadow-md"
    >
      <div className="text-5xl mb-4">{fileIcon}</div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2 line-clamp-2">{document.title}</h3>
      {document.category_name && (
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-2">
          {document.category_name}
        </span>
      )}
      {document.document_date && (
        <p className="text-lg text-gray-600 mb-1">Date: {formatDate(document.document_date)}</p>
      )}
      <p className="text-lg text-gray-500">Uploaded {formatDate(document.uploaded_at)}</p>
      {document.is_sensitive && (
        <div className="mt-3 flex items-center text-orange-600">
          <span className="text-xl">🔒</span>
          <span className="ml-2 text-sm font-semibold">Sensitive</span>
        </div>
      )}
    </div>
  );
}

interface DocumentViewModalProps {
  document: Document;
  onClose: () => void;
  onDelete: () => Promise<void>;
}

function DocumentViewModal({ document, onClose, onDelete }: DocumentViewModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      alert('Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-6">{document.title}</h2>

        <div className="space-y-4 mb-8">
          {document.description && (
            <div>
              <p className="text-xl font-semibold text-gray-700">Description</p>
              <p className="text-lg text-gray-600">{document.description}</p>
            </div>
          )}

          {document.category_name && (
            <div>
              <p className="text-xl font-semibold text-gray-700">Category</p>
              <p className="text-lg text-gray-600">{document.category_name}</p>
            </div>
          )}

          {document.document_date && (
            <div>
              <p className="text-xl font-semibold text-gray-700">Document Date</p>
              <p className="text-lg text-gray-600">{formatDate(document.document_date)}</p>
            </div>
          )}

          <div>
            <p className="text-xl font-semibold text-gray-700">File Name</p>
            <p className="text-lg text-gray-600">{document.file_name}</p>
          </div>

          {document.file_size && (
            <div>
              <p className="text-xl font-semibold text-gray-700">File Size</p>
              <p className="text-lg text-gray-600">{(document.file_size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}

          {document.uploaded_by_name && (
            <div>
              <p className="text-xl font-semibold text-gray-700">Uploaded By</p>
              <p className="text-lg text-gray-600">{document.uploaded_by_name} on {formatDate(document.uploaded_at)}</p>
            </div>
          )}

          {document.tags && document.tags.length > 0 && (
            <div>
              <p className="text-xl font-semibold text-gray-700">Tags</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {document.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {!showDeleteConfirm ? (
          <div className="flex flex-col gap-4">
            {document.can_download && (
              <button
                onClick={() => window.open(document.storage_path, '_blank')}
                className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-2xl font-semibold transition-colors"
              >
                Download / View
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full p-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-2xl font-semibold transition-colors"
            >
              Delete Document
            </button>
            <button
              onClick={onClose}
              className="w-full p-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-2xl font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            <p className="text-2xl text-red-600 font-semibold mb-6">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 p-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-2xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 p-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-2xl font-semibold transition-colors"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface UploadDocumentModalProps {
  residentId: string;
  onClose: () => void;
  onUpload: (data: any) => Promise<string>;
}

function UploadDocumentModal({ residentId, onClose, onUpload }: UploadDocumentModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Medical Records');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !file) return;

    setUploading(true);
    try {
      const storagePath = `documents/${residentId}/${Date.now()}_${file.name}`;

      await onUpload({
        resident_id: residentId,
        title,
        file_name: file.name,
        storage_path: storagePath,
        category_id: category,
        description: description || undefined,
        file_size: file.size,
        file_type: file.type,
        auto_share_with_family: true
      });

      onClose();
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-6">Upload Document</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Blood Test Results - Jan 2026"
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option>Medical Records</option>
              <option>Lab Results</option>
              <option>Prescriptions</option>
              <option>Insurance</option>
              <option>Legal</option>
              <option>Care Plans</option>
              <option>Photos</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes about this document..."
              rows={3}
              className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-2xl font-semibold text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-4 text-xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
            {file && (
              <p className="mt-2 text-lg text-gray-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-lg text-blue-800">
              This document will be automatically shared with your family members.
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            className="flex-1 p-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-2xl font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title || !file || uploading}
            className="flex-1 p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-2xl font-semibold transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
