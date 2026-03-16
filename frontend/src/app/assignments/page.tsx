'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import Link from 'next/link';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

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
        const coursesRes = await api.get('/courses');
        const courses: { id: number }[] = coursesRes.data;
        const pendingResults = await Promise.all(
          courses.map((course) => api.get(`/submissions/course/${course.id}/pending`))
        );
        const pending = pendingResults.flatMap((res) => res.data);
        setSubmissions(pending);
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
        <p className="text-gray-500">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-slate-900 font-display">Pending grades</h1>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
        </div>
      ) : submissions.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
          <p className="text-slate-500">No pending submissions to review.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <Link
              key={sub.id}
              href={`/courses/${sub.assignment.course_id}/assignments/${sub.assignment.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{sub.assignment.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Submitted by {sub.student.full_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                    <Clock size={14} />
                    {new Date(sub.submitted_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sub.status === 'pending_review' && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm rounded-full flex items-center gap-1">
                      <AlertCircle size={14} />
                      Pending Review
                    </span>
                  )}
                  {sub.ai_grade !== null && (
                    <span className="px-3 py-1 bg-sky-100 text-sky-800 text-sm rounded-full">
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
