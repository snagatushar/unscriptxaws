import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Trophy, Users } from 'lucide-react';
import { DatabaseEvent } from '../types';

interface EventCardProps {
  event: DatabaseEvent;
  index: number;
  key?: string | number;
}

export default function EventCard({ event, index }: EventCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ y: -10 }}
      className="group relative bg-fest-card rounded-3xl overflow-hidden border border-white/10 hover:border-fest-gold/50 transition-all duration-500 flex flex-col"
    >
      <div className="relative h-64 overflow-hidden shrink-0">
        <motion.img
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.6 }}
          src={event.image_url || 'https://picsum.photos/seed/event/800/600'}
          alt={event.title}
          className="w-full h-full object-cover transition-all duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-fest-card via-transparent to-transparent opacity-60" />
        <div className="absolute top-4 right-4 px-3 py-1 bg-fest-gold/90 backdrop-blur-md rounded-full text-[10px] font-bold text-fest-dark uppercase tracking-widest">
          {event.category}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-2xl font-display font-bold mb-3 group-hover:text-fest-gold transition-colors">{event.title}</h3>
        <p className="text-white/60 text-sm mb-6 line-clamp-2 flex-1">{event.description}</p>

        <div className="flex flex-col gap-3 mb-8">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Trophy size={14} className="text-fest-gold" />
            <span>Entry Fee: <strong className="text-white">₹{event.entry_fee}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Users size={14} className="text-fest-cyan" />
            <span>Participants: <strong className="text-white">{event.participants_count || 0}</strong></span>
          </div>
        </div>

        <Link
          to={`/events/${event.id}`}
          className="flex items-center justify-center w-full py-3 px-6 bg-fest-gold/10 text-fest-gold rounded-2xl hover:bg-fest-gold hover:text-fest-dark transition-all duration-300 font-bold uppercase tracking-widest text-xs"
        >
          View & Register
          <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="absolute -inset-px bg-gradient-to-br from-fest-gold/20 via-transparent to-fest-gold-dark/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -z-10" />
    </motion.div>
  );
}
