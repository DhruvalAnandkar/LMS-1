'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import Link from 'next/link';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Submission {
  id: number;
  content: string;
  ai_grade: number | null;
  status: string;
  submitted_at: string;
  assignment: { id: number; title: string; course_id: number };
  student: { id: number; full_name: string };
}

export default function AssignmentsPage() {
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await api.get('/submissions/course/1/pending');
        setSubmissions(res.data);
      } catch {
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === 'teacher' || user?.role === 'admin') {
      fetchPending();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pending Grades</h1>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <p className="text-gray-500">No pending submissions to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <Link
              key={sub.id}
              href={`/courses/${sub.assignment.course_id}/assignments/${sub.assignment.id}`}
              className="block bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{sub.assignment.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Submitted by {sub.student.full_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                    <Clock size={14} />
                    {new Date(sub.submitted_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sub.status === 'pending_review' && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full flex items-center gap-1">
                      <AlertCircle size={14} />
                      Pending Review
                    </span>
                  )}
                  {sub.ai_grade !== null && (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
                      AI Grade: {sub.ai_grade}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
