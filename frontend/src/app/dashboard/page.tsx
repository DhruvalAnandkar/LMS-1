'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import Link from 'next/link';
import { BookOpen, Users, GraduationCap, FileText, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Course {
  id: number;
  title: string;
  description: string;
  teacher: { full_name: string };
}

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 font-display">
            Welcome back, {user.full_name}!
          </h1>
          <p className="text-slate-500 capitalize">{user.role} dashboard</p>
        </div>
        <Badge tone="accent" className="hidden sm:inline-flex">
          <Sparkles size={12} />
          AI Ready
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-slate-100 p-3">
              <BookOpen className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{courses.length}</p>
              <p className="text-sm text-slate-500">Total courses</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-100 p-3">
              <GraduationCap className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900 capitalize">{user.role}</p>
              <p className="text-sm text-slate-500">Your role</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-sky-100 p-3">
              <FileText className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">Active</p>
              <p className="text-sm text-slate-500">Status</p>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Available courses</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
          </div>
        ) : courses.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No courses available yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h3 className="font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                  {course.description || 'No description available'}
                </p>
                <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
                  <Users className="h-4 w-4" />
                  <span>{course.teacher?.full_name || 'Unknown'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
