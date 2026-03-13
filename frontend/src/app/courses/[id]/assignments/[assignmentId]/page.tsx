'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ArrowLeft, FileText, Upload, Check, X, Sparkles } from 'lucide-react';

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
  file_path: string | null;
  content: string | null;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
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

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    if (courseId && assignmentId) {
      fetchAssignmentData();
    }
  }, [courseId, assignmentId]);

  const fetchAssignmentData = async () => {
    try {
      const [assignmentRes, submissionsRes] = await Promise.all([
        api.get(`/courses/${courseId}/assignments/${assignmentId}`),
        api.get(`/courses/${courseId}/assignments/${assignmentId}/submissions`),
      ]);
      setAssignment(assignmentRes.data);
      
      if (isTeacher) {
        setSubmissions(submissionsRes.data);
      } else {
        const mySub = submissionsRes.data.find(
          (s: Submission) => s.student_id === user?.id
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

      const response = await api.post(
        `/courses/${courseId}/assignments/${assignmentId}/submissions`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

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
      await api.post(
        `/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}/grade`
      );
      fetchAssignmentData();
    } catch (error) {
      console.error('Failed to grade:', error);
    } finally {
      setGrading(null);
    }
  };

  const handleApproveGrade = async (submissionId: number) => {
    try {
      await api.put(
        `/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}`,
        { approved: true }
      );
      fetchAssignmentData();
    } catch (error) {
      console.error('Failed to approve grade:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!assignment) {
    return <div className="text-center py-12">Assignment not found</div>;
  }

  return (
    <div>
      <button
        onClick={() => router.push(`/courses/${courseId}`)}
        className="flex items-center text-gray-600 hover:text-indigo-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Course
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{assignment.title}</h1>
        {assignment.description && (
          <p className="text-gray-600 mb-4">{assignment.description}</p>
        )}
        {assignment.due_date && (
          <p className="text-sm text-gray-500">
            Due: {new Date(assignment.due_date).toLocaleDateString()}
          </p>
        )}
      </div>

      {isTeacher ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
          </div>
          {submissions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No submissions yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {submissions.map((submission) => (
                <div key={submission.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">
                        {submission.student?.full_name || `Student ${submission.student_id}`}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(submission.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  {submission.grade !== null && (
                    <div className="ml-7 mb-2">
                      <span className="font-medium text-gray-900">Grade: {submission.grade}/100</span>
                      {submission.feedback && (
                        <p className="text-sm text-gray-600 mt-1">{submission.feedback}</p>
                      )}
                    </div>
                  )}
                  <div className="ml-7 flex gap-2">
                    {submission.grade === null ? (
                      <button
                        onClick={() => handleGradeWithAI(submission.id)}
                        disabled={grading === submission.id}
                        className="flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        {grading === submission.id ? 'Grading...' : 'Grade with AI'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApproveGrade(submission.id)}
                        className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve Grade
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Submission</h2>
          
          {mySubmission ? (
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <FileText className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-gray-900">Submitted</span>
              </div>
              <p className="text-sm text-gray-500 mb-2">
                Submitted: {new Date(mySubmission.submitted_at).toLocaleDateString()}
              </p>
              {mySubmission.grade !== null && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">Grade: {mySubmission.grade}/100</p>
                  {mySubmission.feedback && (
                    <p className="text-sm text-gray-600 mt-1">{mySubmission.feedback}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Submit Your Work
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={!selectedFile || submitting}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
