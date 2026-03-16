'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ArrowLeft, Upload, FileText, Trash2, DownloadCloud } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Document {
  id: number;
  file_name: string;
  file_url?: string | null;
  uploaded_at: string;
}

export default function DocumentsPage() {
  const params = useParams();
  const courseId = params.id;
  const router = useRouter();
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchDocuments();
    }
  }, [courseId]);

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/courses/${courseId}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.post(`/courses/${courseId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setDocuments([...documents, response.data]);
      setSelectedFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      await api.delete(`/courses/${courseId}/documents/${docId}`);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" onClick={() => router.push(`/courses/${courseId}`)} className="mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to course
      </Button>

      <h1 className="text-3xl font-semibold text-slate-900 font-display mb-6">Course documents</h1>

      {isTeacher && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Upload document</h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select file (PDF, DOCX, TXT)
              </label>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <Button type="submit" disabled={!selectedFile || uploading}>
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Uploaded documents</h2>
        </div>
        {documents.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No documents uploaded yet</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-slate-400 mr-3" />
                  <div>
                    <p className="font-medium text-slate-900">{doc.file_name}</p>
                    <p className="text-sm text-slate-500">
                      Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <DownloadCloud className="w-4 h-4" />
                      Download
                    </a>
                  )}
                  {isTeacher && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
