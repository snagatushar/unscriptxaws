import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, XCircle, Search, ExternalLink, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { openPaymentScreenshot } from '../lib/storage';

type RegistrationReview = {
  id: string;
  user_id: string;
  event_id: string;
  participant_name: string | null;
  email: string | null;
  phone: string;
  college_name: string | null;
  team_name: string | null;
  payment_status: 'pending' | 'approved' | 'rejected';
  payment_screenshot_url: string;
  payment_review_notes: string | null;
  upload_enabled: boolean;
  created_at: string;
  participant_user: {
    email: string;
    full_name: string | null;
  } | null;
  events: {
    title: string;
    entry_fee: number;
    category: string;
  };
};

export default function PaymentReviewDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [registrations, setRegistrations] = useState<RegistrationReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRegistrations();
  }, [activeTab]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          id, user_id, event_id, participant_name, email, phone, college_name, team_name, payment_status,
          payment_screenshot_url, payment_review_notes, upload_enabled, created_at,
          participant_user:users!registrations_user_id_fkey ( email, full_name ),
          events ( title, entry_fee, category )
        `)
        .in('payment_status', activeTab === 'pending' ? ['pending'] : ['approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data as unknown as RegistrationReview[]) || [];
      setRegistrations(rows);
      setNotes(
        rows.reduce((acc, row) => {
          acc[row.id] = row.payment_review_notes || '';
          return acc;
        }, {} as Record<string, string>)
      );
    } catch (err: any) {
      toast.error('Failed to load payments: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (registrationId: string, decision: 'approved' | 'rejected') => {
    setActionLoading(registrationId);
    try {
      const approve = decision === 'approved';
      const { error } = await supabase
        .from('registrations')
        .update({
          payment_status: decision,
          payment_review_notes: notes[registrationId] || null,
          payment_reviewed_by: user?.id || null,
          payment_reviewed_at: new Date().toISOString(),
          upload_enabled: approve,
          upload_enabled_by: approve ? user?.id || null : null,
          upload_enabled_at: approve ? new Date().toISOString() : null,
          submission_status: approve ? 'ready' : 'locked',
        })
        .eq('id', registrationId);

      if (error) throw error;

      toast.success(approve ? 'Payment approved and upload unlocked.' : 'Payment rejected.');
      setRegistrations((prev) => prev.filter((item) => item.id !== registrationId));
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewScreenshot = async (pathOrUrl: string) => {
    try {
      await openPaymentScreenshot(pathOrUrl);
    } catch (err: any) {
      toast.error(err.message || 'Could not open payment screenshot.');
    }
  };

  const filteredRegistrations = registrations.filter((registration) => {
        const participantText = registration.participant_name || registration.participant_user?.full_name || registration.participant_user?.email || '';
    return (
      participantText.toLowerCase().includes(search.toLowerCase()) ||
      (registration.email || '').toLowerCase().includes(search.toLowerCase()) ||
      registration.events.title.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter uppercase">
            Payment <span className="text-fest-gold">Review</span>
          </h1>
          <p className="text-white/50 text-sm md:text-lg mt-2">
            Review payment screenshots, verify participant details, and unlock upload access for that event.
          </p>
        </header>

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

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-fest-gold" size={48} />
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="glass text-center py-20 rounded-[3rem]">
            <h3 className="text-2xl font-bold opacity-50 mb-2">No Records Found</h3>
            <p className="opacity-40 text-sm">This queue is clear right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnimatePresence>
              {filteredRegistrations.map((registration) => (
                <motion.div
                  key={registration.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass rounded-3xl p-6 relative overflow-hidden flex flex-col gap-5"
                >
                  <div
                    className={`absolute top-0 left-0 w-full h-1 ${registration.payment_status === 'pending' ? 'bg-fest-gold' : registration.payment_status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`}
                  />

                  <div className="flex justify-between items-start mb-2 mt-2">
                    <div>
                      <h3 className="text-lg font-bold">
                        {registration.participant_name || registration.participant_user?.full_name || registration.participant_user?.email}
                      </h3>
                      <p className="text-xs text-white/40">{registration.email || registration.participant_user?.email}</p>
                    </div>
                    <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white/60">
                      ₹{registration.events.entry_fee}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm bg-black/20 p-4 rounded-xl">
                    <div className="flex justify-between gap-4">
                      <span className="text-white/40">Event</span>
                      <strong className="text-right">{registration.events.title}</strong>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-white/40">Phone</span>
                      <strong className="text-right">{registration.phone}</strong>
                    </div>
                    {registration.college_name && (
                      <div className="flex justify-between gap-4">
                        <span className="text-white/40">College</span>
                        <strong className="text-right">{registration.college_name}</strong>
                      </div>
                    )}
                    {registration.team_name && (
                      <div className="flex justify-between gap-4">
                        <span className="text-white/40">Team</span>
                        <strong className="text-right">{registration.team_name}</strong>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleViewScreenshot(registration.payment_screenshot_url)}
                    className="flex justify-center items-center gap-2 w-full py-3 border border-white/10 border-dashed rounded-xl hover:bg-white/5 hover:border-white/30 transition-all text-xs font-bold uppercase tracking-widest text-fest-gold-light"
                  >
                    View Screenshot <ExternalLink size={14} />
                  </button>

                  <textarea
                    value={notes[registration.id] || ''}
                    onChange={(e) => setNotes((current) => ({ ...current, [registration.id]: e.target.value }))}
                    placeholder="Optional note for this participant"
                    className="w-full h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-fest-gold resize-none"
                  />

                  {activeTab === 'pending' ? (
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleDecision(registration.id, 'rejected')}
                        disabled={actionLoading === registration.id}
                        className="flex-1 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        {actionLoading === registration.id ? <Loader2 className="animate-spin" size={16} /> : <><XCircle size={16} /> Reject</>}
                      </button>
                      <button
                        onClick={() => handleDecision(registration.id, 'approved')}
                        disabled={actionLoading === registration.id}
                        className="flex-1 py-3 bg-fest-gold/10 text-fest-gold hover:bg-fest-gold hover:text-fest-dark rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        {actionLoading === registration.id ? <Loader2 className="animate-spin" size={16} /> : <><Unlock size={16} /> Approve</>}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`text-center uppercase tracking-widest text-xs font-bold py-3 rounded-xl ${registration.payment_status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {registration.payment_status}
                      </div>
                      <div className={`text-center uppercase tracking-widest text-xs font-bold py-3 rounded-xl ${registration.upload_enabled ? 'bg-fest-gold/10 text-fest-gold' : 'bg-white/5 text-white/40'}`}>
                        {registration.upload_enabled ? 'Upload Enabled' : 'Upload Locked'}
                      </div>
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
