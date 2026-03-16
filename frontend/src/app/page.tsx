'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { motion } from 'framer-motion';
import { BrainCircuit, BookOpen, Layers, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, fetchUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchUser();
  }, [fetchUser]);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Dynamic Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

      <main className="relative z-10 container mx-auto px-6 pt-32 pb-20 flex flex-col items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-primary mb-8"
          >
            <BrainCircuit className="w-5 h-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">AI-Powered Learning</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight text-slate-900 mb-8 leading-tight">
            Elevate Your Education with <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 animate-gradient-x">
              Intelligent Insights
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Experience the next generation of Learning Management Systems. Powered by advanced AI to grade assignments, provide instant feedback, and accelerate your growth.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {isAuthenticated ? (
              <Button 
                onClick={() => router.push('/dashboard')} 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_20px_rgba(37,99,235,0.3)] rounded-full px-8 h-14 text-lg"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => router.push('/login')} 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_20px_rgba(37,99,235,0.3)] rounded-full px-8 h-14 text-lg"
                >
                  Sign In
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full max-w-5xl"
        >
          {[
            { icon: BrainCircuit, title: "AI Grading", desc: "Automated insights and instant feedback on your submissions." },
            { icon: BookOpen, title: "Smart Courses", desc: "Dynamic course materials tailored to your learning pace." },
            { icon: Layers, title: "Seamless UI", desc: "A frictionless, distraction-free environment for pure learning." }
          ].map((feature, i) => (
            <div key={i} className="glass p-8 rounded-2xl flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6 border border-blue-200 group-hover:bg-blue-200 transition-colors">
                <feature.icon className="w-7 h-7 text-primary primary-glow" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
