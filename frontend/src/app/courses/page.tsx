'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Plus, BookOpen, Users, ArrowRight, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { motion, Variants } from 'framer-motion';

interface Course {
  id: number;
  title: string;
  description: string | null;
  teacher_id: number;
  created_at: string;
  teacher: {
    id: number;
    full_name: string;
    email: string;
  } | null;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function CoursesPage() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await api.post('/courses', newCourse);
      setCourses([...courses, response.data]);
      setShowModal(false);
      setNewCourse({ title: '', description: '' });
    } catch (error) {
      console.error('Failed to create course:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 border-blue-100 bg-blue-50/50"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">Course Catalog</h1>
          </div>
          <p className="text-slate-600 max-w-xl">
            Explore your enrolled courses, discover new paths, and manage your educational journey with AI-powered insights.
          </p>
        </div>
        
        {isTeacher && (
          <Button 
            onClick={() => setShowModal(true)} 
            size="lg" 
            className="shrink-0 bg-primary hover:bg-primary/90 text-white rounded-full px-6 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Course
          </Button>
        )}
      </motion.div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="glass p-16 flex flex-col items-center justify-center text-center border-dashed border-slate-300">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-3 font-display">No courses found</h3>
            <p className="text-slate-500 max-w-md text-lg">
              {isTeacher 
                ? "You haven't created any courses yet. Get started by clicking the 'Create Course' button."
                : "There are no courses active in the system right now. Check back later."}
            </p>
          </Card>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {courses.map((course) => (
            <motion.div key={course.id} variants={itemVariants}>
              <Link href={`/courses/${course.id}`} className="block h-full">
                <Card className="glass h-full flex flex-col group hover:translate-y-[-4px] hover:shadow-[0_15px_40px_-10px_rgba(37,99,235,0.2)] hover:border-primary/40 transition-all duration-300 overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors mb-3 line-clamp-1 font-display">
                      {course.title}
                    </h3>
                    <p className="text-slate-600 mb-6 line-clamp-3 flex-1 leading-relaxed">
                      {course.description || 'No description provided for this course. Start exploring to learn more.'}
                    </p>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full group-hover:bg-blue-50 text-slate-600 transition-colors">
                        <Users className="w-4 h-4 mr-2 text-primary" />
                        {course.teacher?.full_name || 'System Admin'}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors text-slate-400">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create new course"
        description="Launch a new learning path. Provide a clear title and description."
      >
        <form onSubmit={handleCreateCourse} className="space-y-5 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Course Title</label>
            <Input
              type="text"
              value={newCourse.title}
              onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
              required
              placeholder="e.g. Advanced Machine Learning"
              className="bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              value={newCourse.description}
              onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
              rows={4}
              placeholder="What will students learn in this course?"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="text-slate-600 hidden sm:block">
              Cancel
            </Button>
            <Button type="submit" disabled={creating} className="w-full sm:w-auto bg-primary">
              {creating ? 'Creating...' : 'Launch Course'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
