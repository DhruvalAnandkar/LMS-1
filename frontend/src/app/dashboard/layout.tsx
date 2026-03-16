'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { BookOpen, GraduationCap, LayoutDashboard, LogOut, FileText, Shield, Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout, fetchUser } = useAuthStore();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && user?.requires_password_reset) {
      router.push('/reset-password');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: BookOpen, label: 'Courses', href: '/courses' },
  ];

  if (user.role === 'teacher' || user.role === 'admin') {
    navItems.push({ icon: FileText, label: 'Assignments', href: '/assignments' });
  }

  if (user.role === 'admin') {
    navItems.push({ icon: Shield, label: 'Admin', href: '/admin/users' });
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Dynamic Background Glows for context */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />

      <nav className="sticky top-0 z-50 w-full border-b border-white bg-white/60 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-10">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Lumina Logo" width={32} height={32} className="rounded-md" />
              <h1 className="text-xl font-semibold text-slate-900 font-display hidden sm:block">Lumina</h1>
            </Link>
            <div className="hidden items-center gap-2 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="md:hidden"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              <span className="sr-only">Toggle navigation</span>
            </Button>
            <div className="hidden items-center gap-3 sm:flex">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-primary ring-2 ring-blue-200 shadow-sm">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-900">{user.full_name}</p>
                <p className="text-slate-500 capitalize">{user.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              onClick={() => {
                logout();
                router.push('/login');
              }}
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
        <div
          id="mobile-nav"
          className={`md:hidden border-t border-slate-200 bg-white ${isMobileMenuOpen ? 'block' : 'hidden'}`}
        >
          <div className="px-4 py-3 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
