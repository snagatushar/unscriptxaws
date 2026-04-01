import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, XCircle, Search, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

type RegistrationReview = {
  id: string;
  user_id: string;
  event_id: string;
  payment_status: 'pending' | 'approved' | 'rejected';
  payment_screenshot_url: string;
  phone: string;
  team_name: string;
  created_at: string;
  users: {
    email: string;
    full_name: string;
  };
  events: {
    title: string;
    base_prize: number;
    category: string;
  };
};

export default function PaymentReviewDashboard() {
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [registrations, setRegistrations] = useState<RegistrationReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistrations();
  }, [activeTab]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          id, user_id, event_id, payment_status, payment_screenshot_url, phone, team_name, created_at,
          users ( email, full_name ),
          events ( title, base_prize, category )
        `)
        .in('payment_status', activeTab === 'pending' ? ['pending'] : ['approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data as unknown as RegistrationReview[] || []);
    } catch (err: any) {
      toast.error('Failed to load payments: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id: string, decision: 'approved' | 'rejected') => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ payment_status: decision })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Payment ${decision}!`);
      setRegistrations(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRegistrations = registrations.filter(r => 
    r.users.email.toLowerCase().includes(search.toLowerCase()) || 
    (r.users.full_name && r.users.full_name.toLowerCase().includes(search.toLowerCase())) ||
    r.events.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter uppercase">
            Payment <span className="text-fest-gold">Review</span>
          </h1>
          <p className="text-white/50 text-sm md:text-lg mt-2">Approve or reject participant registration payments.</p>
        </header>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4 md:gap-6 px-1 mb-8">
          <div className="flex bg-white/5 rounded-2xl md:rounded-full p-1 border border-white/10 w-full md:w-fit">
             <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 md:flex-none px-6 py-2.5 md:py-2 rounded-xl md:rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-fest-gold text-fest-dark glow-gold' : 'text-white/60 hover:text-white'}`}
             >
                Pending
             </button>
             <button
                onClick={() => setActiveTab('reviewed')}
                className={`flex-1 md:flex-none px-6 py-2.5 md:py-2 rounded-xl md:rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'reviewed' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
             >
                Reviewed
             </button>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder="Search participants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 md:py-3 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-xs md:text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-fest-gold transition-colors"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-fest-gold" size={48} />
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="glass text-center py-20 rounded-[3rem]">
            <h3 className="text-2xl font-bold opacity-50 mb-2">No Records Found</h3>
            <p className="opacity-40 text-sm">You're all caught up with the queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredRegistrations.map((reg) => (
                <motion.div
                  key={reg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass rounded-3xl p-6 relative overflow-hidden flex flex-col"
                >
                  {/* Status Strip */}
                  <div className={`absolute top-0 left-0 w-full h-1 ${
                    reg.payment_status === 'pending' ? 'bg-fest-gold' :
                    reg.payment_status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                  }`} />

                  <div className="flex justify-between items-start mb-6 mt-2">
                    <div>
                      <h3 className="text-lg font-bold group-hover:text-fest-gold transition-colors block">
                        {reg.users.full_name || reg.users.email}
                      </h3>
                      <p className="text-xs text-white/40">{reg.users.email}</p>
                    </div>
                    <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white/60">
                      ₹{reg.events.base_prize}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6 flex-1 text-sm bg-black/20 p-4 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-white/40">Event</span>
                      <strong className="text-right max-w-[150px] truncate" title={reg.events.title}>{reg.events.title}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Phone</span>
                      <strong>{reg.phone}</strong>
                    </div>
                    {reg.team_name && (
                      <div className="flex justify-between">
                        <span className="text-white/40">Team Name</span>
                        <strong>{reg.team_name}</strong>
                      </div>
                    )}
                  </div>

                  <a 
                    href={reg.payment_screenshot_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex justify-center items-center gap-2 w-full py-3 border border-white/10 border-dashed rounded-xl mb-6 hover:bg-white/5 hover:border-white/30 transition-all text-xs font-bold uppercase tracking-widest text-fest-gold-light"
                  >
                    View Screenshot <ExternalLink size={14} />
                  </a>

                  {activeTab === 'pending' && (
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleDecision(reg.id, 'rejected')}
                        disabled={actionLoading === reg.id}
                        className="flex-1 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        {actionLoading === reg.id ? <Loader2 className="animate-spin" size={16} /> : <><XCircle size={16} /> Reject</>}
                      </button>
                      <button
                        onClick={() => handleDecision(reg.id, 'approved')}
                        disabled={actionLoading === reg.id}
                        className="flex-1 py-3 bg-fest-gold/10 text-fest-gold hover:bg-fest-gold hover:text-fest-dark rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        {actionLoading === reg.id ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> Approve</>}
                      </button>
                    </div>
                  )}

                  {activeTab === 'reviewed' && (
                     <div className={`text-center uppercase tracking-widest text-xs font-bold py-3 rounded-xl ${reg.payment_status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {reg.payment_status}
                     </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
