import { motion } from 'motion/react';
import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (error) throw error;

      let { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', authData.user.id)
        .maybeSingle();

      // SECURITY: Strict lookup by auth ID only — no fallback
      if (!profile || profileError) {
        await supabase.auth.signOut();
        throw new Error('Admin profile not found. Contact the system administrator.');
      }


      const adminRoles = ['admin', 'payment_reviewer', 'content_reviewer'];
      if (profileError || !adminRoles.includes(profile?.role)) {
        await supabase.auth.signOut();
        throw new Error(profileError ? `Admin profile lookup failed: ${profileError.message}` : 'Access Denied: Administrative privileges required.');
      }

      toast.success('Admin Authenticated');
      
      // Smart redirect
      if (profile.role === 'admin') navigate('/admin');
      else if (profile.role === 'payment_reviewer') navigate('/payments');
      else if (profile.role === 'content_reviewer') navigate('/content');
      
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen flex items-center justify-center relative bg-black overflow-hidden">
      {/* Admin specific background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-fest-primary/5 blur-[150px] -z-10" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass p-8 md:p-12 rounded-[3.5rem] border-fest-primary/20 shadow-2xl relative"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-fest-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-fest-primary/30">
            <ShieldCheck size={40} className="text-fest-primary" />
          </div>
          <h2 className="text-4xl font-display font-extrabold tracking-tighter mb-2 text-white">
            SYSTEM <span className="text-fest-primary">ADMIN</span>
          </h2>
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
            Restricted Access Center
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleAdminAuth}>
          <div className="relative group">
            <Mail className="absolute left-0 top-3 text-white/20 group-focus-within:text-fest-primary transition-colors" size={18} />
            <input
              type="email"
              placeholder="Admin Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/10 pl-8 py-3 focus:outline-none focus:border-fest-primary transition-colors text-white placeholder:text-white/20"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-0 top-3 text-white/20 group-focus-within:text-fest-primary transition-colors" size={18} />
            <input
              type="password"
              placeholder="System Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/10 pl-8 py-3 focus:outline-none focus:border-fest-primary transition-colors text-white placeholder:text-white/20"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-fest-primary text-fest-dark font-black uppercase tracking-[0.2em] text-lg rounded-2xl hover:bg-fest-primary-light transition-all shadow-lg glow-primary flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : 'AUTHENTICATE'} {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-white/20 uppercase tracking-widest font-medium">
           Secure Terminal Encryption Active
        </div>
      </motion.div>
    </main>
  );
}
