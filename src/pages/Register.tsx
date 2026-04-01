import { motion } from 'motion/react';
import { useState, FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';

export default function Register() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="pt-32 pb-24 px-6 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass p-12 rounded-[3rem] text-center"
        >
          <div className="w-20 h-20 bg-fest-gold/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={40} className="text-fest-gold" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">Registration Successful!</h2>
          <p className="text-white/50 mb-10">We've received your application. Our team will contact you shortly with further details.</p>
          <button
            onClick={() => setSubmitted(false)}
            className="w-full py-4 bg-fest-gold text-fest-dark rounded-2xl font-bold uppercase tracking-widest hover:bg-fest-gold-light transition-all"
          >
            Register Another
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-5xl md:text-8xl font-display font-extrabold tracking-tighter mb-8 leading-none">
            JOIN THE <span className="text-fest-gold">SQUAD</span>
          </h1>
          <p className="text-white/60 text-xl mb-12 leading-relaxed max-w-lg">
            Ready to break the script? Fill out the form and secure your spot in the most epic cultural fest of 2026.
          </p>
          
          <div className="space-y-6">
            {[
              'Early bird registrations get exclusive merch',
              'Participation certificates for everyone',
              'Access to all workshops and seminars',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-4 text-white/80 font-medium">
                <div className="w-6 h-6 rounded-full bg-fest-gold/20 flex items-center justify-center text-fest-gold">
                  <CheckCircle2 size={16} />
                </div>
                {text}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass p-8 md:p-12 rounded-[3rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-fest-gold/10 blur-[80px] -z-10" />
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative group">
                <input
                  type="text"
                  required
                  className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent"
                  placeholder="Full Name"
                  id="name"
                />
                <label
                  htmlFor="name"
                  className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs"
                >
                  Full Name
                </label>
              </div>
              <div className="relative group">
                <input
                  type="email"
                  required
                  className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent"
                  placeholder="Email Address"
                  id="email"
                />
                <label
                  htmlFor="email"
                  className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs"
                >
                  Email Address
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative group">
                <input
                  type="text"
                  required
                  className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent"
                  placeholder="College Name"
                  id="college"
                />
                <label
                  htmlFor="college"
                  className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs"
                >
                  College Name
                </label>
              </div>
              <div className="relative group">
                <select
                  required
                  className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors text-white/60"
                >
                  <option value="" disabled selected className="bg-fest-dark">Select Event</option>
                  <option value="music" className="bg-fest-dark">Battle of Bands</option>
                  <option value="dance" className="bg-fest-dark">Rhythm Rush</option>
                  <option value="tech" className="bg-fest-dark">Code Chaos</option>
                  <option value="art" className="bg-fest-dark">Pixel Perfect</option>
                </select>
              </div>
            </div>

            <div className="relative group">
              <textarea
                className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent min-h-[100px]"
                placeholder="Message (Optional)"
                id="message"
              />
              <label
                htmlFor="message"
                className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs"
              >
                Message (Optional)
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-fest-gold text-fest-dark font-black uppercase tracking-[0.3em] text-lg rounded-2xl hover:bg-fest-gold-light transition-all glow-gold flex items-center justify-center gap-3"
            >
              Submit Registration <Send size={20} />
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
