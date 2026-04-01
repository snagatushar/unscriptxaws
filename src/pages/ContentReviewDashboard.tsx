import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, XCircle, Search, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';

type ContentReview = {
  id: string;
  user_id: string;
  event_id: string;
  registration_status: 'registered' | 'selected' | 'eliminated';
  submission_url: string;
  team_name: string;
  created_at: string;
  users: {
    email: string;
    full_name: string;
  };
  events: {
    title: string;
    category: string;
  };
};

export default function ContentReviewDashboard() {
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [submissions, setSubmissions] = useState<ContentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [activeTab]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          id, user_id, event_id, registration_status, submission_url, team_name, created_at,
          users ( email, full_name ),
          events ( title, category )
        `)
        .not('submission_url', 'is', null)
        .in('registration_status', activeTab === 'pending' ? ['registered'] : ['selected', 'eliminated'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data as unknown as ContentReview[] || []);
    } catch (err: any) {
      toast.error('Failed to load submissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id: string, decision: 'selected' | 'eliminated') => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ registration_status: decision })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Participant ${decision}!`);
      setSubmissions(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSubmissions = submissions.filter(s => 
    s.users.email.toLowerCase().includes(search.toLowerCase()) || 
    (s.users.full_name && s.users.full_name.toLowerCase().includes(search.toLowerCase())) ||
    s.events.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter">
            Content <span className="text-fest-gold">Review</span>
          </h1>
          <p className="text-white/50 text-lg mt-2">Evaluate participant submissions for Unscripted '26.</p>
        </header>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-6 px-1 mb-8">
          <div className="flex bg-white/5 rounded-full p-1 border border-white/10 w-fit">
             <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-fest-gold text-fest-dark glow-gold' : 'text-white/60 hover:text-white'}`}
             >
                To Review
             </button>
             <button
                onClick={() => setActiveTab('reviewed')}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'reviewed' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
             >
                Evaluated
             </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder="Search by name, event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-fest-gold transition-colors"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-fest-gold" size={48} />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="glass text-center py-20 rounded-[3rem]">
            <h3 className="text-2xl font-bold opacity-50 mb-2">No Submissions</h3>
            <p className="opacity-40 text-sm">No new video uploads to review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnimatePresence>
              {filteredSubmissions.map((sub) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row gap-6 relative"
                >
                  <div className="flex-1 space-y-4">
                     <span className="text-xs font-mono bg-white/10 px-3 py-1 rounded-full text-fest-gold">
                        {sub.events.category}
                     </span>
                     <div>
                        <h3 className="text-2xl font-bold mt-2 font-display">{sub.events.title}</h3>
                        <p className="text-white/60 text-sm">{sub.users.full_name || sub.users.email}</p>
                        {sub.team_name && <p className="text-white/40 text-xs mt-1">Team: {sub.team_name}</p>}
                     </div>

                     <div className="pt-4">
                        <video 
                           controls 
                           className="w-full max-h-48 rounded-2xl bg-black border border-white/10"
                           src={sub.submission_url} 
                           preload="none"
                           poster={`https://picsum.photos/seed/${sub.id}/600/300`}
                        />
                     </div>
                  </div>

                  <div className="flex flex-col gap-4 md:w-40 justify-end md:justify-center border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                    {activeTab === 'pending' ? (
                       <>
                         <button
                           onClick={() => handleDecision(sub.id, 'selected')}
                           disabled={actionLoading === sub.id}
                           className="w-full py-3 bg-fest-gold text-fest-dark rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-fest-gold-light transition-all flex items-center justify-center gap-2 glow-gold"
                         >
                           {actionLoading === sub.id ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> Select</>}
                         </button>
                         <button
                           onClick={() => handleDecision(sub.id, 'eliminated')}
                           disabled={actionLoading === sub.id}
                           className="w-full py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                         >
                           {actionLoading === sub.id ? <Loader2 className="animate-spin" size={16} /> : <><XCircle size={16} /> Eliminate</>}
                         </button>
                       </>
                    ) : (
                       <div className={`text-center w-full uppercase tracking-widest text-xs font-bold py-3 rounded-xl ${sub.registration_status === 'selected' ? 'bg-fest-gold/20 text-fest-gold' : 'bg-red-500/10 text-red-400'}`}>
                          {sub.registration_status}
                       </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
