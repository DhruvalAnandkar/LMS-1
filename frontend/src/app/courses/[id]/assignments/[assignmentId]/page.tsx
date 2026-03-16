'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ArrowLeft, FileText, Upload, Check, Sparkles, DownloadCloud } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Assignment {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
}

interface Submission {
  id: number;
  student_id: number;
  assignment_id: number;
  file_name: string;
  file_url?: string | null;
  content: string | null;
  submitted_at: string;
  ai_grade: number | null;
  ai_feedback: string | null;
  final_grade: number | null;
  status: string;
  graded_at: string | null;
  student?: {
    id: number;
    full_name: string;
  };
}

export default function AssignmentDetailPage() {
  const params = useParams();
  const courseId = params.id;
  const assignmentId = params.assignmentId;
  const router = useRouter();
  const { user } = useAuthStore();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [grading, setGrading] = useState<number | null>(null);
  const [isBatchGrading, setIsBatchGrading] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    if (courseId && assignmentId) {
      fetchAssignmentData();
    }
  }, [courseId, assignmentId]);

  const fetchAssignmentData = async () => {
    try {
      const assignmentRes = await api.get(
        `/courses/${courseId}/assignments/${assignmentId}`
      );
      setAssignment(assignmentRes.data);

      if (isTeacher) {
        const submissionsRes = await api.get(
          `/courses/${courseId}/assignments/${assignmentId}/submissions`
        );
        setSubmissions(submissionsRes.data);
      } else {
        const mySubsRes = await api.get('/submissions');
        const mySub = mySubsRes.data.find(
          (s: Submission) => s.assignment_id === Number(assignmentId)
        );
        setMySubmission(mySub || null);
      }
    } catch (error) {
      console.error('Failed to fetch assignment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.post(`/assignments/${assignmentId}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMySubmission(response.data);
      setSelectedFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradeWithAI = async (submissionId: number) => {
    setGrading(submissionId);
    try {
      await api.post(`/submissions/${submissionId}/grade/ai`);
      fetchAssignmentData();
    } catch (error) {
      console.error('Failed to grade:', error);
    } finally {
      setGrading(null);
    }
  };

  const handleBatchGrade = async () => {
    setIsBatchGrading(true);
    try {
      await api.post(`/assignments/${assignmentId}/grade/ai`);
      fetchAssignmentData();
    } catch (error) {
      console.error('Failed to batch grade:', error);
    } finally {
      setIsBatchGrading(false);
    }
  };

  const handleApproveGrade = async (submissionId: number) => {
    try {
      await api.post(`/submissions/${submissionId}/approve-grade`);
      fetchAssignmentData();
    } catch (error) {
      console.error('Failed to approve grade:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  if (!assignment) {
    return <div className="text-center py-12">Assignment not found</div>;
  }

  return (
    <div>
      <Button variant="ghost" onClick={() => router.push(`/courses/${courseId}`)} className="mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to course
      </Button>

      <Card className="p-6 mb-6">
        <h1 className="text-3xl font-semibold text-slate-900 font-display mb-2">
          {assignment.title}
        </h1>
        {assignment.description && <p className="text-slate-600 mb-4">{assignment.description}</p>}
        {assignment.due_date && (
          <p className="text-sm text-slate-500">
            Due: {new Date(assignment.due_date).toLocaleDateString()}
          </p>
        )}
      </Card>

      {isTeacher ? (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Submissions</h2>
            <Button variant="secondary" onClick={handleBatchGrade} disabled={isBatchGrading}>
              <Sparkles className="w-4 h-4" />
              {isBatchGrading ? 'Grading...' : 'Grade all with AI'}
            </Button>
          </div>
          {submissions.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No submissions yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {submissions.map((submission) => (
                <div key={submission.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-slate-400 mr-2" />
                      <span className="font-medium text-slate-900">
                        {submission.student?.full_name || `Student ${submission.student_id}`}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500">
                      {new Date(submission.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  {submission.final_grade !== null ? (
                    <div className="ml-7 mb-2">
                      <span className="font-medium text-slate-900">
                        Final grade: {submission.final_grade}/100
                      </span>
                      {submission.ai_feedback && (
                        <p className="text-sm text-slate-600 mt-1">{submission.ai_feedback}</p>
                      )}
                    </div>
                  ) : submission.ai_grade !== null ? (
                    <div className="ml-7 mb-2">
                      <span className="font-medium text-slate-900">
                        AI grade: {submission.ai_grade}/100
                      </span>
                      {submission.ai_feedback && (
                        <p className="text-sm text-slate-600 mt-1">{submission.ai_feedback}</p>
                      )}
                    </div>
                  ) : null}
                  <div className="ml-7 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleGradeWithAI(submission.id)}
                      disabled={grading === submission.id}
                    >
                      <Sparkles className="w-4 h-4" />
                      {grading === submission.id ? 'Grading...' : 'Grade with AI'}
                    </Button>
                    {submission.ai_grade !== null && submission.final_grade == null && (
                      <Button size="sm" variant="secondary" onClick={() => handleApproveGrade(submission.id)}>
                        <Check className="w-4 h-4" />
                        Approve grade
                      </Button>
                    )}
                    {submission.file_url && (
                      <a
                        href={submission.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <DownloadCloud className="w-4 h-4" />
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your submission</h2>

          {mySubmission ? (
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <FileText className="w-5 h-5 text-slate-400 mr-2" />
                <span className="text-slate-900">{mySubmission.file_name}</span>
              </div>
              <p className="text-sm text-slate-500 mb-2">
                Submitted: {new Date(mySubmission.submitted_at).toLocaleDateString()}
              </p>
              {mySubmission.final_grade !== null ? (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-900">Grade: {mySubmission.final_grade}/100</p>
                  {mySubmission.ai_feedback && (
                    <p className="text-sm text-slate-600 mt-1">{mySubmission.ai_feedback}</p>
                  )}
                </div>
              ) : mySubmission.ai_grade !== null ? (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-900">AI grade pending approval</p>
                  <p className="text-sm text-slate-600 mt-1">{mySubmission.ai_grade}/100</p>
                </div>
              ) : null}
              {mySubmission.file_url && (
                <a
                  href={mySubmission.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 mt-4"
                >
                  <DownloadCloud className="w-4 h-4" />
                  Download submission
                </a>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Submit your work
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <Button type="submit" disabled={!selectedFile || submitting}>
                <Upload className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
