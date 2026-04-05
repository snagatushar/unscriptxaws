import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { Mail, Lock, User, ArrowRight, Chrome } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const DISPOSABLE_DOMAINS = [
  'temp-mail.org', '10minutemail.com', 'guerrillamail.com', 'mailproweb.com',
  'sharklasers.com', 'dispostable.com', 'getairmail.com', 'tempmail.com',
  'maildrop.cc', 'yopmail.com', 'mailinator.com', 'trashmail.com',
  'tempmail.net', 'temp-mail.io', 'dropmail.me', '10minutemail.net'
];

function isDisposableEmail(email: string) {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
}

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
        
        if (isDisposableEmail(email)) {
          throw new Error('Temporary or disposable emails are not allowed for this fest.');
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
            className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.25em] rounded-full hover:bg-fest-cyan hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-2xl relative overflow-hidden group"
          >
            {loading ? 'PROCESSING...' : (isLogin ? 'LOGIN' : 'SIGNUP')}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center px-2">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-black/50 px-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 backdrop-blur-sm">OR</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => void handleOAuth('google')}
            className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest rounded-full hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-yellow-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Chrome size={20} className="group-hover:rotate-12 transition-transform text-white/60 group-hover:text-white" />
            <span>Continue with Google</span>
          </button>
        </form>

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
