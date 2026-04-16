import { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    setLoading(true);
    try {
      await api.post('/api/auth', { 
        action: 'update-password',
        password 
      });

      setSuccess(true);
      toast.success('Password updated successfully!');

      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err: any) {
      console.error('Reset error:', err);
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="pt-32 pb-24 px-6 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass p-12 rounded-[3rem] text-center"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={40} className="text-green-400" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">Password Updated</h2>
          <p className="text-white/50">Redirecting you to login...</p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fest-primary/10 blur-[120px] -z-10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass p-8 md:p-12 rounded-[3rem] relative"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-fest-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-fest-primary/30">
            <Lock size={32} className="text-fest-primary" />
          </div>
          <h2 className="text-4xl font-display font-extrabold tracking-tighter mb-2">
            NEW PASSWORD
          </h2>
          <p className="text-white/40 text-sm uppercase tracking-widest">
            Enter your new password below
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleReset}>
          <div className="relative group">
            <Lock className="absolute left-0 top-3 text-white/20 group-focus-within:text-fest-primary transition-colors" size={18} />
            <input
              type="password"
              placeholder="New Password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/10 pl-8 py-3 focus:outline-none focus:border-fest-primary transition-colors text-white placeholder:text-white/20"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-0 top-3 text-white/20 group-focus-within:text-fest-primary transition-colors" size={18} />
            <input
              type="password"
              placeholder="Confirm Password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/10 pl-8 py-3 focus:outline-none focus:border-fest-primary transition-colors text-white placeholder:text-white/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.25em] rounded-full hover:bg-fest-primary hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-2xl"
          >
            {loading ? 'UPDATING...' : 'SET NEW PASSWORD'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
