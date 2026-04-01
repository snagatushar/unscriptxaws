import { motion } from 'motion/react';
import { Mail, Linkedin, Award, Loader2 } from 'lucide-react';
import { useFaculty } from '../hooks/useSupabase';

export default function Faculty() {
  const { faculty, loading } = useFaculty();

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-display font-extrabold tracking-tighter mb-6"
          >
            OUR <span className="text-fest-gold">MENTORS</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/50 text-lg max-w-2xl mx-auto"
          >
            The visionaries behind UNSCRIPTED 2026, guiding us to create an unforgettable experience.
          </motion.p>
        </header>

        {loading ? (
          <div className="flex justify-center py-24">
             <Loader2 className="animate-spin text-fest-gold" size={48} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {faculty.length > 0 ? faculty.map((member, i) => (
              <motion.div
                key={member.id || i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden mb-8 border border-white/10 glow-gold transition-all duration-500 group-hover:scale-[1.02]">
                  <img
                    src={member.image_url || 'https://picsum.photos/seed/faculty/600/800'}
                    alt={member.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-fest-dark via-transparent to-transparent opacity-80" />
                  
                  {/* Overlay Info */}
                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="flex items-center gap-2 text-fest-gold text-[10px] font-bold uppercase tracking-widest mb-2">
                      <Award size={14} />
                      {member.designation}
                    </div>
                    <h3 className="text-3xl font-display font-bold text-white mb-1">{member.name}</h3>
                  </div>

                  {/* Social Links on Hover */}
                  <div className="absolute top-8 right-8 flex flex-col gap-3 translate-x-20 group-hover:translate-x-0 transition-transform duration-500">
                    {[Linkedin, Mail].map((Icon, j) => (
                      <button key={j} className="w-12 h-12 glass rounded-2xl flex items-center justify-center hover:bg-fest-gold hover:text-fest-dark transition-all">
                        <Icon size={20} />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full text-center py-20 glass rounded-3xl">
                <p className="text-white/40 font-bold uppercase tracking-widest text-sm">Faculty members are yet to be announced.</p>
              </div>
            )}
          </div>
        )}

        {/* Message Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-32 glass p-12 md:p-20 rounded-[4rem] text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-fest-gold/5 -z-10" />
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-8 italic">
            "Empowering the next generation of <span className="text-fest-gold">creative leaders</span>."
          </h2>
          <p className="text-white/40 max-w-2xl mx-auto leading-relaxed">
            Our faculty members are dedicated to fostering an environment where every student can explore their artistic potential and showcase their unique talents to the world.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
