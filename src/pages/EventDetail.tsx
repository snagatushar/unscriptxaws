import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { EVENTS } from '../constants';
import { Calendar, MapPin, Clock, ArrowLeft, Trophy, Users, Info } from 'lucide-react';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = EVENTS.find(e => e.id === id);

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: Image & Info */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="relative aspect-video rounded-[2rem] overflow-hidden border border-white/10 glow-gold">
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-6 left-6 px-4 py-2 bg-fest-gold text-fest-dark rounded-full text-xs font-bold uppercase tracking-widest">
                {event.category}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Calendar, label: 'Date', value: event.date, color: 'text-fest-gold' },
                { icon: Clock, label: 'Time', value: event.time, color: 'text-fest-gold-light' },
                { icon: MapPin, label: 'Venue', value: event.venue, color: 'text-fest-gold-dark' },
              ].map((item, i) => (
                <div key={i} className="glass p-6 rounded-2xl text-center">
                  <item.icon size={24} className={`${item.color} mx-auto mb-3`} />
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{item.label}</div>
                  <div className="text-sm font-bold">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="glass p-8 rounded-3xl">
              <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-3">
                <Users size={20} className="text-fest-gold" /> Event Coordinators
              </h3>
              <div className="space-y-4">
                {event.coordinators.map((coord, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                    <span className="font-medium">{coord.name}</span>
                    <span className="text-fest-gold-light text-sm font-mono">{coord.contact}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Details */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-12"
          >
            <div>
              <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tighter mb-6">
                {event.title}
              </h1>
              <p className="text-white/60 text-lg leading-relaxed">
                {event.longDescription}
              </p>
            </div>

            <div className="space-y-8">
              <h3 className="text-2xl font-display font-bold flex items-center gap-3">
                <Info size={24} className="text-fest-gold" /> Rules & Regulations
              </h3>
              <div className="grid gap-4">
                {event.rules.map((rule, i) => (
                  <div key={i} className="flex gap-4 p-5 glass rounded-2xl hover:bg-white/10 transition-colors">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-fest-gold/20 flex items-center justify-center text-fest-gold font-bold text-xs">
                      {i + 1}
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-2xl font-display font-bold flex items-center gap-3">
                <Trophy size={24} className="text-fest-gold-light" /> Prizes
              </h3>
              <div className="grid gap-4">
                {event.prizes.map((prize, i) => (
                  <div key={i} className="p-5 glass rounded-2xl border-l-4 border-fest-gold font-bold text-fest-gold-light">
                    {prize}
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/login"
              className="block w-full py-6 bg-fest-gold text-fest-dark text-center font-black uppercase tracking-[0.3em] text-xl rounded-2xl hover:scale-[1.02] transition-transform glow-gold"
            >
              Register for this Event
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
