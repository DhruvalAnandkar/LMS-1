'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Clock, FileText, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Assignment {
  id: number;
  title: string;
  description: string;
  rubric: string;
  due_date: string;
  course_id: number;
}

interface Submission {
  id: number;
  content: string;
  ai_grade: number | null;
  ai_feedback: string | null;
  final_grade: number | null;
  status: string;
  submitted_at: string;
  student: { id: number; full_name: string; email: string };
}

export default function AssignmentDetailPage() {
  const { courseId, assignmentId } = useParams();
  const { user } = useAuthStore();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [grading, setGrading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignmentRes] = await Promise.all([
          api.get(`/courses/${courseId}/assignments/${assignmentId}`),
        ]);
        setAssignment(assignmentRes.data);

        if (user?.role === 'student') {
          try {
            const subsRes = await api.get(`/submissions/my`);
            const mySub = subsRes.data.find((s: Submission) => s.assignment_id === Number(assignmentId));
            setSubmission(mySub || null);
          } catch {}
        } else if (user?.role === 'teacher' || user?.role === 'admin') {
          const subsRes = await api.get(`/courses/${courseId}/assignments/${assignmentId}/submissions`);
          setSubmissions(subsRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId, assignmentId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post(`/courses/${courseId}/assignments/${assignmentId}/submit`, {
        content,
      });
      setSubmission(res.data);
      setContent('');
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrade = async (submissionId: number) => {
    setGrading(true);
    try {
      await api.post(`/assignments/${assignmentId}/grade/ai`);
      const res = await api.get(`/courses/${courseId}/assignments/${assignmentId}/submissions`);
      setSubmissions(res.data);
    } catch (error) {
      console.error('Failed to grade:', error);
    } finally {
      setGrading(false);
    }
  };

  const handleApproveGrade = async (submissionId: number) => {
    try {
      await api.post(`/submissions/${submissionId}/approve-grade`);
      const res = await api.get(`/courses/${courseId}/assignments/${assignmentId}/submissions`);
      setSubmissions(res.data);
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!assignment) {
    return <div className="text-center py-8">Assignment not found</div>;
  }

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      <Link href={`/courses/${courseId}`} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
        <ArrowLeft size={16} /> Back to Course
      </Link>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
        {assignment.description && (
          <p className="text-gray-600 mt-2">{assignment.description}</p>
        )}
        {assignment.due_date && (
          <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
            <Clock size={16} />
            Due: {new Date(assignment.due_date).toLocaleString()}
          </div>
        )}
        {assignment.rubric && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Rubric</h3>
            <p className="text-sm text-gray-600">{assignment.rubric}</p>
          </div>
        )}
      </div>

      {user?.role === 'student' && !submission && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Your Work</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your submission here..."
            />
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Submit Assignment
            </button>
          </form>
        </div>
      )}

      {user?.role === 'student' && submission && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Submission</h2>
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <p className="whitespace-pre-wrap">{submission.content}</p>
          </div>
          {submission.status === 'pending_review' && (
            <div className="flex items-center gap-2 text-yellow-600">
              <Clock size={18} />
              <span>Pending review</span>
            </div>
          )}
          {submission.ai_grade !== null && (
            <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
              <h3 className="font-semibold text-indigo-900 mb-2">AI Grade: {submission.ai_grade}/100</h3>
              <p className="text-indigo-800 text-sm">{submission.ai_feedback}</p>
            </div>
          )}
          {submission.final_grade !== null && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              <div>
                <p className="font-semibold text-green-900">Final Grade: {submission.final_grade}/100</p>
                <p className="text-sm text-green-700">Graded on {new Date(submission.graded_at!).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {isTeacher && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submissions</h2>
          {submissions.length === 0 ? (
            <p className="text-gray-500">No submissions yet</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{sub.student.full_name}</p>
                      <p className="text-sm text-gray-500">{sub.student.email}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      sub.status === 'approved' ? 'bg-green-100 text-green-800' :
                      sub.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">
                    {sub.content}
                  </div>
                  {sub.ai_grade !== null && (
                    <div className="mt-3 p-3 bg-indigo-50 rounded">
                      <p className="font-medium text-indigo-900">AI Grade: {sub.ai_grade}/100</p>
                      <p className="text-sm text-indigo-800 mt-1">{sub.ai_feedback}</p>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    {sub.status === 'pending_review' && (
                      <>
                        <button
                          onClick={() => handleGrade(sub.id)}
                          disabled={grading}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {grading ? 'Grading...' : 'Grade with AI'}
                        </button>
                        <button
                          onClick={() => handleApproveGrade(sub.id)}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Approve Grade
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
