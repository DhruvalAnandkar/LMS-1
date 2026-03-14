'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  ArrowLeft,
  Plus,
  BookOpen,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

interface Module {
  id: number;
  title: string;
  description: string | null;
  order: number;
  created_at: string;
  lessons: Lesson[];
}

interface Lesson {
  id: number;
  title: string;
  content: string | null;
  order: number;
  created_at: string;
}

interface Assignment {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
}

interface Course {
  id: number;
  title: string;
  description: string | null;
  teacher_id: number;
  created_at: string;
  teacher: {
    id: number;
    full_name: string;
  } | null;
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id;
  const { user } = useAuthStore();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [newModule, setNewModule] = useState({ title: '', description: '', order: 0 });
  const [newLesson, setNewLesson] = useState({ title: '', content: '', order: 0 });
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  const isOwner = course?.teacher_id === user?.id || user?.role === 'admin';

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const [courseRes, modulesRes, assignmentsRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/courses/${courseId}/modules`),
        api.get(`/courses/${courseId}/assignments`),
      ]);
      setCourse(courseRes.data);
      setModules(modulesRes.data);
      setAssignments(assignmentsRes.data);
    } catch (error) {
      console.error('Failed to fetch course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.post(`/courses/${courseId}/modules`, newModule);
      setModules([...modules, response.data]);
      setShowModuleModal(false);
      setNewModule({ title: '', description: '', order: 0 });
    } catch (error) {
      console.error('Failed to create module:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId) return;
    setSaving(true);
    try {
      const response = await api.post(`/modules/${selectedModuleId}/lessons`, newLesson);
      setModules(modules.map(m => 
        m.id === selectedModuleId ? { ...m, lessons: [...m.lessons, response.data] } : m
      ));
      setShowLessonModal(false);
      setNewLesson({ title: '', content: '', order: 0 });
      setSelectedModuleId(null);
    } catch (error) {
      console.error('Failed to create lesson:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: newAssignment.title,
        description: newAssignment.description,
        due_date: newAssignment.due_date || null,
      };
      const response = await api.post(`/courses/${courseId}/assignments`, payload);
      setAssignments([...assignments, response.data]);
      setShowAssignmentModal(false);
      setNewAssignment({ title: '', description: '', due_date: '' });
    } catch (error) {
      console.error('Failed to create assignment:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-12">Course not found</div>;
  }

  return (
    <div>
      <Button variant="ghost" onClick={() => router.push('/courses')} className="mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to courses
      </Button>

      <Card className="p-6 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 font-display mb-2">
              {course.title}
            </h1>
            {course.description && <p className="text-slate-600">{course.description}</p>}
            <p className="text-sm text-slate-500 mt-3">
              Instructor: {course.teacher?.full_name || 'Unknown'}
            </p>
          </div>
          <Link
            href={`/courses/${courseId}/chat`}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <MessageSquare className="w-4 h-4" />
            AI Assistant
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Modules & Lessons</h2>
            {isOwner && (
              <Button size="sm" onClick={() => setShowModuleModal(true)}>
                <Plus className="w-4 h-4" />
                Add module
              </Button>
            )}
          </div>

          {modules.length === 0 ? (
            <Card className="p-6 text-center text-slate-500">No modules yet</Card>
          ) : (
            <div className="space-y-3">
              {modules.map((module) => (
                <Card key={module.id} className="overflow-hidden">
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                  >
                    <div className="flex items-center">
                      {expandedModules.has(module.id) ? (
                        <ChevronDown className="w-5 h-5 text-slate-400 mr-2" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400 mr-2" />
                      )}
                      <span className="font-medium text-slate-900">{module.title}</span>
                    </div>
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModuleId(module.id);
                          setShowLessonModal(true);
                        }}
                        className="p-1 text-slate-700 hover:bg-slate-100 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </button>
                  {expandedModules.has(module.id) && module.lessons.length > 0 && (
                    <div className="border-t border-slate-100 px-4 py-2 pb-4">
                      {module.lessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-center py-2 text-sm text-slate-600">
                          <BookOpen className="w-4 h-4 mr-2" />
                          {lesson.title}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Assignments</h2>
            {isOwner && (
              <Button size="sm" onClick={() => setShowAssignmentModal(true)}>
                <Plus className="w-4 h-4" />
                Add assignment
              </Button>
            )}
          </div>

          {assignments.length === 0 ? (
            <Card className="p-6 text-center text-slate-500">No assignments yet</Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <Link key={assignment.id} href={`/courses/${courseId}/assignments/${assignment.id}`}>
                  <Card className="p-4 transition hover:-translate-y-1 hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-slate-400 mr-2" />
                        <span className="font-medium text-slate-900">{assignment.title}</span>
                      </div>
                    </div>
                    {assignment.description && (
                      <p className="text-sm text-slate-600 mt-2 ml-7">{assignment.description}</p>
                    )}
                    {assignment.due_date && (
                      <p className="text-sm text-slate-500 mt-2 ml-7">
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        title="Add module"
        description="Create a new module for this course."
      >
        <form onSubmit={handleCreateModule} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
            <Input
              type="text"
              value={newModule.title}
              onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowModuleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add module'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showLessonModal}
        onClose={() => {
          setShowLessonModal(false);
          setSelectedModuleId(null);
        }}
        title="Add lesson"
        description="Create a new lesson for this module."
      >
        <form onSubmit={handleCreateLesson} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
            <Input
              type="text"
              value={newLesson.title}
              onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
            <textarea
              value={newLesson.content}
              onChange={(e) => setNewLesson({ ...newLesson, content: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowLessonModal(false);
                setSelectedModuleId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add lesson'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        title="Add assignment"
        description="Create a new assignment for this course."
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
            <Input
              type="text"
              value={newAssignment.title}
              onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              value={newAssignment.description}
              onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Due date</label>
            <Input
              type="date"
              value={newAssignment.due_date}
              onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowAssignmentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add assignment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
