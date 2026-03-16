'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import Link from 'next/link';
import { BookOpen, Users, ShieldAlert, FileText, Sparkles, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { motion, Variants } from 'framer-motion';

interface Course {
  id: number;
  title: string;
  description: string;
  teacher: { full_name: string };
}

// Framer motion variants
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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchCourses();
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold font-display text-slate-900 tracking-tight mb-2">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{user.full_name}</span>
          </h1>
          <p className="text-slate-600 text-lg">Your interactive <span className="capitalize text-primary font-medium">{user.role}</span> command center.</p>
        </div>
        <div className="glass-panel px-4 py-2 rounded-full inline-flex items-center gap-2 border-primary/20 bg-blue-50">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary tracking-wide uppercase">System Active & AI Ready</span>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <motion.div variants={itemVariants}>
          <Card className="glass relative overflow-hidden group hover:border-primary/50 transition-colors duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-200 transition-colors" />
            <div className="p-6 relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <motion.p 
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="text-4xl font-bold text-slate-900 font-display tracking-tight"
                >
                  {courses.length}
                </motion.p>
                <p className="text-sm font-medium text-slate-600 uppercase tracking-wider mt-1">Total Courses</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="glass relative overflow-hidden group hover:border-emerald-500/50 transition-colors duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-200 transition-colors" />
            <div className="p-6 relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 font-display capitalize tracking-tight mb-1">{user.role}</p>
                <p className="text-sm font-medium text-slate-600 uppercase tracking-wider">Access Level</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="glass relative overflow-hidden group hover:border-indigo-500/50 transition-colors duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-200 transition-colors" />
            <div className="p-6 relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <p className="text-2xl font-bold text-slate-900 font-display tracking-tight">Online</p>
                </div>
                <p className="text-sm font-medium text-slate-600 uppercase tracking-wider">System Status</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-wide">Available Courses</h2>
          {courses.length > 0 && (
            <div className="text-sm font-medium text-slate-500">{courses.length} / {courses.length} showing</div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : courses.length === 0 ? (
          <Card className="glass p-12 flex flex-col items-center justify-center text-center border-dashed border-slate-300">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <BookOpen className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Courses Found</h3>
            <p className="text-slate-500 max-w-sm">There are no courses active in the system right now. Check back later.</p>
          </Card>
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
                  <Card className="glass h-full p-6 group hover:translate-y-[-4px] hover:shadow-[0_10px_40px_-10px_rgba(37,99,235,0.2)] hover:border-primary/40 transition-all duration-300 flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-2 line-clamp-3 flex-1 leading-relaxed">
                        {course.description || 'No description available for this course.'}
                      </p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-200 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-500 group-hover:text-slate-700 transition-colors">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{course.teacher?.full_name || 'System Admin'}</span>
                      </div>
                      <div className="text-primary font-medium opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                        View &rarr;
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
