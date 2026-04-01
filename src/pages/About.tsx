import { motion } from 'motion/react';
import { Sparkles, Target, Users } from 'lucide-react';

export default function About() {
  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-display font-extrabold tracking-tighter mb-6"
          >
            ABOUT <span className="text-fest-pink">UNSCRIPTED</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/50 text-lg max-w-2xl mx-auto"
          >
            We are more than just a festival; we are a movement of creative expression and unbridled talent.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {[
            { icon: Target, title: 'Our Mission', text: 'To provide a platform for students to showcase their unique talents and break free from traditional scripts.', color: 'text-fest-cyan' },
            { icon: Users, title: 'Our Community', text: 'A diverse group of artists, performers, and tech enthusiasts coming together to celebrate creativity.', color: 'text-fest-purple' },
            { icon: Sparkles, title: 'Our Vision', text: 'To become the benchmark for college cultural festivals, fostering innovation and artistic growth.', color: 'text-fest-pink' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass p-10 rounded-[3rem] text-center"
            >
              <div className={`w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-8 ${item.color}`}>
                <item.icon size={32} />
              </div>
              <h3 className="text-2xl font-display font-bold mb-4 uppercase tracking-widest">{item.title}</h3>
              <p className="text-white/60 leading-relaxed">{item.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="glass p-12 md:p-20 rounded-[4rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-fest-purple/10 blur-[100px] -z-10" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter mb-8">The Story Behind The <span className="text-fest-cyan italic">Script</span></h2>
              <p className="text-white/60 text-lg mb-6 leading-relaxed">
                Founded in 2018, UNSCRIPTED began as a small gathering of passionate students who wanted something different. They wanted a space where the unexpected was celebrated and where every voice could be heard.
              </p>
              <p className="text-white/60 text-lg leading-relaxed">
                Today, it has grown into one of the most anticipated events in the academic calendar, attracting thousands of participants from across the region.
              </p>
            </div>
            <div className="rounded-[2rem] overflow-hidden border border-white/10 glow-pink">
              <img src="https://picsum.photos/seed/history/800/600" alt="Fest History" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
