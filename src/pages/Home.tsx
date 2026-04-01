import { motion } from 'motion/react';
import Hero from '../components/Hero';
import EventCard from '../components/EventCard';
import { EVENTS } from '../constants';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Music, Zap, Palette } from 'lucide-react';

export default function Home() {
  return (
    <main>
      <Hero />

      {/* Stats Section */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Events', value: '25+' },
            { label: 'Colleges', value: '50+' },
            { label: 'Participants', value: '5000+' },
            { label: 'Prizes', value: '₹5L+' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="text-center p-8 glass rounded-3xl"
            >
              <div className="text-4xl md:text-5xl font-display font-extrabold text-fest-gold mb-2">{stat.value}</div>
              <div className="text-xs uppercase tracking-widest text-white/40">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-fest-gold font-display font-bold uppercase tracking-widest mb-4">Featured Highlights</h2>
              <h3 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter">Experience the <span className="text-fest-gold-light italic">Magic</span></h3>
            </div>
            <Link to="/events" className="flex items-center gap-2 text-fest-gold-light font-bold uppercase tracking-widest text-sm hover:gap-4 transition-all">
              View All Events <ArrowRight size={20} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {EVENTS.slice(0, 3).map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto glass rounded-[3rem] p-12 md:p-24 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-fest-gold/10 blur-[100px] -z-10" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 blur-[100px] -z-10" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter mb-8 leading-tight">
                Why wait for the <span className="text-fest-gold">future</span> when you can create it?
              </h2>
              <p className="text-white/60 text-lg mb-12 leading-relaxed">
                UNSCRIPTED is more than just a fest. It's a platform where creativity meets competition, and passion meets performance. Join thousands of students in the biggest celebration of talent.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { icon: Music, title: 'Musical Nights', color: 'text-fest-gold' },
                  { icon: Zap, title: 'High Energy', color: 'text-fest-gold-light' },
                  { icon: Sparkles, title: 'Star Guests', color: 'text-fest-gold' },
                  { icon: Palette, title: 'Artistic Souls', color: 'text-white' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl glass flex items-center justify-center ${item.color}`}>
                      <item.icon size={24} />
                    </div>
                    <span className="font-display font-bold uppercase tracking-widest text-sm">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-white/10 rounded-full"
              />
              <img 
                src="https://picsum.photos/seed/crowd/800/800" 
                alt="Fest Crowd" 
                className="rounded-full w-full aspect-square object-cover border-8 border-white/5"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-5xl md:text-8xl font-display font-extrabold tracking-tighter mb-12">
            READY TO <span className="text-fest-gold text-glow-gold">SHINE?</span>
          </h2>
          <Link
            to="/login"
            className="inline-block px-16 py-6 bg-fest-gold text-fest-dark font-black uppercase tracking-[0.3em] text-xl rounded-full hover:bg-fest-gold-light transition-colors glow-gold"
          >
            Register Now
          </Link>
        </motion.div>
      </section>
    </main>
  );
}
