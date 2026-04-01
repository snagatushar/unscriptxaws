import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Trophy, Users, ArrowLeft, Loader2, IndianRupee } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DatabaseEvent } from '../types';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<DatabaseEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*, registrations(count)')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        const participantsCount = data.registrations?.[0]?.count || 0;
        setEvent({
          id: data.id,
          title: data.title,
          category: data.category,
          description: data.description,
          base_prize: data.base_prize,
          per_participant_bonus: data.per_participant_bonus,
          image_url: data.image_url,
          rules: data.rules,
          participants_count: participantsCount,
          total_prize: data.base_prize + (participantsCount * data.per_participant_bonus)
        });
      } catch (err) {
        console.error('Failed to fetch event details', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-fest-gold" size={48} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <h1 className="text-4xl font-display font-bold">Event not found</h1>
        <Link to="/events" className="px-8 py-3 bg-fest-pink rounded-full font-bold uppercase tracking-widest">Back to Events</Link>
      </div>
    );
  }

  return (
    <main className="pt-24 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-12 uppercase tracking-widest text-xs font-bold"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-start">
          {/* Left: Image & Info */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 md:space-y-8"
          >
            <div className="relative aspect-video rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/10 glow-gold">
              <img
                src={event.image_url || 'https://picsum.photos/seed/eventdetail/1280/720'}
                alt={event.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 md:top-6 md:left-6 px-3 py-1.5 md:px-4 md:py-2 bg-fest-gold text-fest-dark rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest">
                {event.category}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              {[
                { icon: Trophy, label: 'Base Prize', value: `₹${event.base_prize}`, color: 'text-fest-gold' },
                { icon: Users, label: 'Participants', value: event.participants_count, color: 'text-fest-cyan' },
                { icon: IndianRupee, label: 'Total Prize', value: `₹${event.total_prize}`, color: 'text-fest-pink' },
              ].map((item, i) => (
                <div key={i} className="glass p-4 md:p-6 rounded-2xl text-center">
                  <item.icon size={20} className={`${item.color} mx-auto mb-2 md:mb-3`} />
                  <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-white/40 mb-1">{item.label}</div>
                  <div className="text-xs md:text-sm font-bold">{item.value}</div>
                </div>
              ))}
            </div>
            
            <div className="glass p-6 md:p-8 rounded-2xl md:rounded-3xl text-xs md:text-sm leading-relaxed text-white/70 border border-white/5">
              <strong className="text-fest-gold uppercase tracking-widest text-[10px] block mb-2">Prize Pool Formula:</strong>
              The prize pool increases dynamically! It starts at ₹{event.base_prize} and increases by ₹{event.per_participant_bonus} for every participant that successfully registers.
            </div>

          </motion.div>

          {/* Right: Details */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 md:space-y-12"
          >
            <div>
              <h1 className="text-4xl md:text-7xl font-display font-extrabold tracking-tighter mb-4 md:mb-6 uppercase">
                {event.title}
              </h1>
              <p className="text-white/60 text-base md:text-lg leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>

            {event.rules && event.rules.length > 0 && (
              <div className="space-y-4 md:space-y-6">
                <h3 className="text-xl md:text-2xl font-display font-bold text-fest-gold uppercase tracking-wider">Event Rules</h3>
                <ul className="space-y-3 md:space-y-4">
                  {event.rules.map((rule, index) => (
                    <motion.li 
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-3 md:gap-4 text-white/70 bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/5 text-sm md:text-base leading-relaxed"
                    >
                      <span className="text-fest-gold font-bold">{(index + 1).toString().padStart(2, '0')}</span>
                      <span>{rule}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            <Link
              to={user ? `/register/${event.id}` : '/login'}
              className="block w-full py-4 md:py-6 bg-fest-gold text-fest-dark text-center font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-lg md:text-xl rounded-xl md:rounded-2xl hover:scale-[1.02] transition-transform glow-gold"
            >
              {user ? 'Register' : 'Login to Register'}
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
