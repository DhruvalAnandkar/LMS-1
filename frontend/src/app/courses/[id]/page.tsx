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
  GraduationCap,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence, Variants } from 'framer-motion';

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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-12 text-slate-500 font-medium">Course not found</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <Button variant="ghost" onClick={() => router.push('/courses')} className="mb-2 text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to courses
      </Button>

      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-70 pointer-events-none" />
        <div className="p-8 md:p-12 relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-6">
              <GraduationCap className="w-4 h-4" />
              Course Overview
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 font-display tracking-tight mb-4">
              {course.title}
            </h1>
            {course.description && <p className="text-lg text-slate-600 leading-relaxed mb-6">{course.description}</p>}
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                {course.teacher?.full_name.charAt(0).toUpperCase() || 'T'}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{course.teacher?.full_name || 'Unknown Instructor'}</p>
                <p className="text-xs text-slate-500">Lead Instructor</p>
              </div>
            </div>
          </div>
          
          <Link
            href={`/courses/${courseId}/chat`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-base font-medium text-white shadow-xl shadow-slate-900/20 hover:scale-105 hover:bg-slate-800 transition-all focus:outline-none focus:ring-4 focus:ring-slate-900/10"
          >
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Launch AI Assistant
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Modules */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="flex justify-between items-end border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display">Syllabus</h2>
              <p className="text-sm text-slate-500 mt-1">Modules & Lessons</p>
            </div>
            {isOwner && (
              <Button size="sm" onClick={() => setShowModuleModal(true)} className="bg-primary/10 text-primary hover:bg-primary/20 shadow-none">
                <Plus className="w-4 h-4 mr-2" />
                Add module
              </Button>
            )}
          </div>

          {modules.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-600">No modules yet</p>
              <p className="text-sm text-slate-500 mt-1">Check back later for course content.</p>
            </Card>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
              {modules.map((module, index) => (
                <motion.div key={module.id} variants={itemVariants}>
                  <Card className="overflow-hidden border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center text-left">
                        <div className="w-8 flex justify-center shrink-0">
                          {expandedModules.has(module.id) ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Module {index + 1}</p>
                          <span className="font-semibold text-slate-900 text-lg">{module.title}</span>
                          {module.description && <p className="text-sm text-slate-500 mt-1">{module.description}</p>}
                        </div>
                      </div>
                      {isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedModuleId(module.id);
                            setShowLessonModal(true);
                          }}
                          className="shrink-0 p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors ml-4"
                          title="Add Lesson"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {expandedModules.has(module.id) && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-100 bg-slate-50/50"
                        >
                          {module.lessons.length === 0 ? (
                            <div className="px-12 py-6 text-sm text-slate-500 italic">No lessons in this module.</div>
                          ) : (
                            <div className="py-2">
                              {module.lessons.map((lesson, j) => (
                                <div key={lesson.id} className="group flex items-center px-10 py-3 text-sm text-slate-600 hover:bg-white hover:text-slate-900 transition-colors border-l-2 border-transparent hover:border-primary">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-medium mr-4 group-hover:bg-blue-100 group-hover:text-primary group-hover:border-blue-200 transition-colors">
                                    {j + 1}
                                  </div>
                                  <div>
                                    <span className="font-medium">{lesson.title}</span>
                                    {lesson.content && <p className="text-xs text-slate-500 mt-0.5 max-w-xl truncate">{lesson.content}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Right Column: Assignments */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="flex justify-between items-end border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display">Assessments</h2>
              <p className="text-sm text-slate-500 mt-1">Tasks & Assignments</p>
            </div>
            {isOwner && (
              <Button size="sm" onClick={() => setShowAssignmentModal(true)} className="bg-primary/10 text-primary hover:bg-primary/20 shadow-none">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            )}
          </div>

          {assignments.length === 0 ? (
            <Card className="p-10 text-center border-dashed border-2 border-slate-200 bg-slate-50">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-600 text-sm">No assignments yet</p>
            </Card>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
              {assignments.map((assignment) => (
                <motion.div key={assignment.id} variants={itemVariants}>
                  <Link href={`/courses/${courseId}/assignments/${assignment.id}`}>
                    <Card className="p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 border-slate-200 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-primary transition-colors" />
                      <div className="pl-3">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">{assignment.title}</h3>
                        </div>
                        {assignment.description && (
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{assignment.description}</p>
                        )}
                        <div className="flex items-center text-xs font-medium text-slate-500 bg-slate-100 w-max px-2.5 py-1 rounded-md">
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />
                          {assignment.due_date ? `Due: ${new Date(assignment.due_date).toLocaleDateString()}` : 'No due date'}
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal
        open={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        title="Add Course Module"
        description="Organize your course into easily digestible chunks."
      >
        <form onSubmit={handleCreateModule} className="space-y-5 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Module Title</label>
            <Input
              type="text"
              value={newModule.title}
              onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
              required
              className="bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Short Description</label>
            <textarea
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowModuleModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-primary">{saving ? 'Saving...' : 'Create module'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showLessonModal}
        onClose={() => {
          setShowLessonModal(false);
          setSelectedModuleId(null);
        }}
        title="Add Lesson"
        description="Create educational content within the selected module."
      >
        <form onSubmit={handleCreateLesson} className="space-y-5 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Lesson Title</label>
            <Input
              type="text"
              value={newLesson.title}
              onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
              required
              className="bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
            <textarea
              value={newLesson.content}
              onChange={(e) => setNewLesson({ ...newLesson, content: e.target.value })}
              rows={5}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
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
            <Button type="submit" disabled={saving} className="bg-primary">{saving ? 'Saving...' : 'Add lesson'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        title="Add Assessment"
        description="Give students a task to evaluate their learning."
      >
        <form onSubmit={handleCreateAssignment} className="space-y-5 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Task Title</label>
            <Input
              type="text"
              value={newAssignment.title}
              onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
              required
              className="bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Instructions / Description</label>
            <textarea
              value={newAssignment.description}
              onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Due date</label>
            <Input
              type="date"
              value={newAssignment.due_date}
              onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
              className="bg-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAssignmentModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-primary">{saving ? 'Saving...' : 'Add assignment'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
