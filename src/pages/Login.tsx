import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { Mail, Lock, User, ArrowRight, Chrome } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

function getAuthErrorMessage(err: any) {
  const message = err?.message || '';

  if (message.toLowerCase().includes('failed to fetch')) {
    return 'Could not reach Supabase. Check your internet connection, Supabase project status, and Auth settings.';
  }

  if (message.toLowerCase().includes('network')) {
    return 'Network error while contacting Supabase.';
  }

  return message || 'Authentication failed';
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isLoading } = useAuth();
  const nextPath = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    if (isLoading || !user) return;

    navigate(nextPath || '/', { replace: true });
  }, [user, isLoading, navigate, nextPath]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Supabase environment variables are missing.');
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;

        toast.success('Successfully logged in!');
      } else {
        if (!name.trim()) {
          throw new Error('Name is required for signup');
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name }
          }
        });
        if (error) throw error;

        toast.success('Signup successful! Welcome to UNSCRIPTED.');
        setIsLogin(true);
      }
    } catch (err: any) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google') => {
    try {
      await supabase.auth.signInWithOAuth({ provider });
    } catch (err: any) {
      toast.error(getAuthErrorMessage(err));
    }
  };

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fest-purple/10 blur-[120px] -z-10" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass p-8 md:p-12 rounded-[3rem] relative"
      >
        <div className="text-center mb-10">
          <h2 className="text-4xl font-display font-extrabold tracking-tighter mb-2">
            {isLogin ? 'WELCOME BACK' : 'JOIN THE FEST'}
          </h2>
          <p className="text-white/40 text-sm uppercase tracking-widest">
            {isLogin ? 'Login to your account' : 'Create a new account'}
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleAuth}>
          {!isLogin && (
            <div className="relative group">
              <User className="absolute left-0 top-3 text-white/20 group-focus-within:text-fest-cyan transition-colors" size={18} />
              <input
                type="text"
                placeholder="Full Name"
                required={!isLogin}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b-2 border-white/10 pl-8 py-3 focus:outline-none focus:border-fest-cyan transition-colors text-white placeholder:text-white/20"
              />
            </div>
          )}
          
          <div className="relative group">
            <Mail className="absolute left-0 top-3 text-white/20 group-focus-within:text-fest-cyan transition-colors" size={18} />
            <input
              type="email"
              placeholder="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/10 pl-8 py-3 focus:outline-none focus:border-fest-cyan transition-colors text-white placeholder:text-white/20"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-0 top-3 text-white/20 group-focus-within:text-fest-cyan transition-colors" size={18} />
            <input
              type="password"
              placeholder="Password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/10 pl-8 py-3 focus:outline-none focus:border-fest-cyan transition-colors text-white placeholder:text-white/20"
            />
          </div>

          {isLogin && (
            <div className="text-right">
              <button 
                type="button" 
                onClick={() => toast('Forgot password flow coming soon', { icon: '🚧' })}
                className="text-xs text-white/40 hover:text-fest-pink transition-colors uppercase tracking-widest font-bold"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-fest-purple text-white font-black uppercase tracking-[0.3em] text-lg rounded-2xl hover:bg-fest-pink transition-all glow-purple flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'PROCESSING...' : (isLogin ? 'LOGIN' : 'SIGN UP')} {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-10">
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute w-full h-px bg-white/10" />
            <span className="relative px-4 bg-[#111] text-[10px] text-white/20 uppercase tracking-widest font-bold z-10">Or continue with</span>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={() => handleOAuth('google')}
              type="button"
              className="w-full flex items-center justify-center gap-3 py-4 glass rounded-2xl hover:bg-white/10 transition-all text-sm font-bold uppercase tracking-widest"
            >
              <Chrome size={20} className="text-fest-cyan shadow-glow-cyan" /> Continue with Google
            </button>
          </div>
        </div>

        <div className="mt-10 text-center relative z-10">
          <p className="text-white/40 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              type="button"
              className="text-fest-pink font-bold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
