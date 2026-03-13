'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Users, BookOpen, MessageCircle, FileText, Plus, Clock } from 'lucide-react';

interface Course {
  id: number;
  title: string;
  description: string;
  teacher: { id: number; full_name: string };
}

interface Module {
  id: number;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: number;
  title: string;
  content: string;
  order: number;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  due_date: string;
}

export default function CourseDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, modulesRes, assignmentsRes] = await Promise.all([
          api.get(`/courses/${id}`),
          api.get(`/courses/${id}/modules`),
          api.get(`/courses/${id}/assignments`),
        ]);
        setCourse(courseRes.data);
        setModules(modulesRes.data);
        setAssignments(assignmentsRes.data);
      } catch (error) {
        console.error('Failed to fetch course:', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleEnroll = async () => {
    try {
      await api.post(`/courses/${id}/enroll`);
      setIsEnrolled(true);
    } catch (error) {
      console.error('Failed to enroll:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-8">Course not found</div>;
  }

  const isTeacher = user?.id === course.teacher.id || user?.role === 'admin';

  return (
    <div className="space-y-6">
      <Link href="/courses" className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
        <ArrowLeft size={16} /> Back to Courses
      </Link>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <p className="text-gray-500 mt-1">{course.description || 'No description'}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users size={16} />
                {course.teacher.full_name}
              </div>
            </div>
          </div>
          {!isTeacher && !isEnrolled && (
            <button
              onClick={handleEnroll}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Enroll Now
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {modules.length > 0 ? (
            modules.map((module) => (
              <div key={module.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">{module.title}</h3>
                  {module.description && (
                    <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {module.lessons.map((lesson) => (
                    <div key={lesson.id} className="px-6 py-4 flex items-center gap-3">
                      <BookOpen size={18} className="text-gray-400" />
                      <span className="text-gray-700">{lesson.title}</span>
                    </div>
                  ))}
                  {module.lessons.length === 0 && (
                    <div className="px-6 py-4 text-gray-400 text-sm">No lessons yet</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No modules yet</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Assignments</h3>
              {isTeacher && (
                <Link
                  href={`/courses/${id}/assignments/new`}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  <Plus size={20} />
                </Link>
              )}
            </div>
            {assignments.length > 0 ? (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/courses/${id}/assignments/${assignment.id}`}
                    className="block p-3 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors"
                  >
                    <p className="font-medium text-gray-900">{assignment.title}</p>
                    {assignment.due_date && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Clock size={12} />
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No assignments yet</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/courses/${id}/chat`}
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors text-gray-700"
              >
                <MessageCircle size={18} className="text-indigo-600" />
                <span>AI Chat Assistant</span>
              </Link>
              {isTeacher && (
                <Link
                  href={`/courses/${id}/documents`}
                  className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors text-gray-700"
                >
                  <FileText size={18} className="text-indigo-600" />
                  <span>Upload Documents</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
