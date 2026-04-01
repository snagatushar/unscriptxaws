import { motion } from 'motion/react';
import { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Github, Chrome } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);

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

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {!isLogin && (
            <div className="relative group">
              <User className="absolute left-0 top-3 text-white/20 group-focus-within:text-fest-cyan transition-colors" size={18} />
              <input
                type="text"
                placeholder="Full Name"
                className="w-full bg-transparent border-b-2 border-white/10 pl-8 py-3 focus:outline-none focus:border-fest-cyan transition-colors text-white placeholder:text-white/20"
              />
            </div>
          )}
          
          <div className="relative group">
            <Mail className="absolute left-0 top-3 text-white/20 group-focus-within:text-fest-cyan transition-colors" size={18} />
            <input
              type="email"
              placeholder="Email Address"
              className="w-full bg-transparent border-b-2 border-white/10 pl-8 py-3 focus:outline-none focus:border-fest-cyan transition-colors text-white placeholder:text-white/20"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-0 top-3 text-white/20 group-focus-within:text-fest-cyan transition-colors" size={18} />
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-transparent border-b-2 border-white/10 pl-8 py-3 focus:outline-none focus:border-fest-cyan transition-colors text-white placeholder:text-white/20"
            />
          </div>

          {isLogin && (
            <div className="text-right">
              <button className="text-xs text-white/40 hover:text-fest-pink transition-colors uppercase tracking-widest font-bold">
                Forgot Password?
              </button>
            </div>
          )}

          <button className="w-full py-5 bg-fest-purple text-white font-black uppercase tracking-[0.3em] text-lg rounded-2xl hover:bg-fest-pink transition-all glow-purple flex items-center justify-center gap-3">
            {isLogin ? 'LOGIN' : 'SIGN UP'} <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-10">
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute w-full h-px bg-white/10" />
            <span className="relative px-4 bg-fest-dark/50 text-[10px] text-white/20 uppercase tracking-widest font-bold">Or continue with</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-3 py-3 glass rounded-xl hover:bg-white/10 transition-all text-sm font-bold">
              <Chrome size={18} className="text-fest-cyan" /> Google
            </button>
            <button className="flex items-center justify-center gap-3 py-3 glass rounded-xl hover:bg-white/10 transition-all text-sm font-bold">
              <Github size={18} className="text-fest-purple" /> GitHub
            </button>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-white/40 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
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
