'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || 'Login failed');
      } else {
        setError('An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-100 via-white to-slate-200" />
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center flex flex-col items-center">
          <Image src="/logo.png" alt="Lumina Logo" width={80} height={80} className="mb-4 rounded-2xl shadow-sm" />
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 font-display">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue</p>
        </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 backdrop-blur-2xl bg-card/40 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="mb-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 border border-primary/30">
              <BrainCircuit className="w-8 h-8 text-primary primary-glow" />
            </div>
            <h1 className="text-3xl font-bold text-white font-display tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to your AI LMS account</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="bg-black/20 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/50"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="pr-12 bg-black/20 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full h-12 text-lg font-medium bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all" 
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Initiating sequence...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
