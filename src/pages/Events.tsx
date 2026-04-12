import { useState } from 'react';
import { motion } from 'motion/react';
import EventCard from '../components/EventCard';
import { Search, Loader2 } from 'lucide-react';
import { useEvents } from '../hooks/useSupabase';

const categories = ['All', 'Music', 'Dance', 'Drama', 'Art', 'Tech', 'Gaming']; // We can keep these static filters or derive them from data

export default function Events() {
  const { events, loading } = useEvents();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter(event => {
    const matchesCategory = activeCategory === 'All' || 
                           event.category?.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-display font-extrabold tracking-tighter mb-6"
          >
            The <span className="text-fest-primary">Event</span> Lineup
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/50 text-lg max-w-2xl mx-auto"
          >
            From high-octane musical battles to creative digital art showcases, we have something for everyone.
          </motion.p>
        </header>

        {/* Filters & Search */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-16">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                  activeCategory === cat
                    ? 'bg-fest-primary text-fest-dark glow-primary'
                    : 'glass text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3 glass rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-fest-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
           <div className="flex justify-center py-24 w-full">
            <Loader2 className="animate-spin text-fest-primary" size={48} />
           </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass rounded-3xl">
            <h3 className="text-2xl font-display font-bold text-white/40 mb-2">No events found</h3>
            <p className="text-white/20">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>
    </main>
  );
}
