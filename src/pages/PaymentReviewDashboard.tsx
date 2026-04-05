import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, XCircle, Search, ExternalLink, Unlock, ArrowLeft, Calendar, User, DollarSign, ChevronDown, Phone, Camera, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { openPaymentScreenshot } from '../lib/storage';
import { logAdminAction } from '../lib/audit';

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
    id: string;
    title: string;
    entry_fee: number;
    category: string;
  };
};

type EventSummary = {
  id: string;
  title: string;
  category: string;
  pending_count: number;
  approved_count: number;
};

export default function PaymentReviewDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [registrations, setRegistrations] = useState<RegistrationReview[]>([]);
  const [eventSummaries, setEventSummaries] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get assigned events if not admin
      let assignedEventIds: string[] = [];
      if (user?.role !== 'admin') {
        const { data: assignments } = await supabase
          .from('reviewer_event_assignments')
          .select('event_id')
          .eq('reviewer_id', user?.id)
          .eq('role_type', 'payment');
        assignedEventIds = (assignments || []).map(a => a.event_id);
        
        if (assignedEventIds.length === 0) {
          setRegistrations([]);
          setEventSummaries([]);
          setLoading(false);
          return;
        }
      }

      // 2. Fetch all relevant registrations
      let query = supabase
        .from('registrations')
        .select(`
          id, user_id, event_id, participant_name, email, phone, college_name, team_name, payment_status,
          payment_screenshot_url, payment_review_notes, upload_enabled, created_at,
          participant_user:users!registrations_user_id_fkey ( email, full_name ),
          events ( id, title, entry_fee, category )
        `);

      if (user?.role !== 'admin') {
        query = query.in('event_id', assignedEventIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data as unknown as RegistrationReview[]) || [];
      setRegistrations(rows);
      
      // 3. Generate event summaries for the drill-down view
      const eventMap = new Map<string, EventSummary>();
      rows.forEach(reg => {
        if (!eventMap.has(reg.event_id)) {
          eventMap.set(reg.event_id, {
            id: reg.event_id,
            title: reg.events.title,
            category: reg.events.category,
            pending_count: 0,
            approved_count: 0
          });
        }
        const summary = eventMap.get(reg.event_id)!;
        if (reg.payment_status === 'pending') summary.pending_count++;
        else if (reg.payment_status === 'approved') summary.approved_count++;
      });
      
      setEventSummaries(Array.from(eventMap.values()));

      setNotes(
        rows.reduce((acc, row) => {
          acc[row.id] = row.payment_review_notes || '';
          return acc;
        }, {} as Record<string, string>)
      );
    } catch (err: any) {
      toast.error('Failed to load data: ' + err.message);
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

      // Log the admin action
      const regObj = registrations.find(r => r.id === registrationId);
      if (user && regObj) {
        await logAdminAction(
          user.id,
          approve ? 'PAYMENT_APPROVE' : 'PAYMENT_REJECT',
          registrationId,
          {
            student: regObj.participant_name || regObj.participant_user?.full_name || 'Anonymous',
            event: regObj.events.title,
            notes: notes[registrationId] || 'No notes provided'
          }
        );
      }

      toast.success(approve ? 'Payment approved.' : 'Payment rejected.');
      
      // Update local state instead of refetching everything
      setRegistrations(prev => prev.map(reg => 
        reg.id === registrationId 
          ? { ...reg, payment_status: decision, upload_enabled: approve } 
          : reg
      ));

      // Update summaries
      setEventSummaries(prev => prev.map(evt => {
        const reg = registrations.find(r => r.id === registrationId);
        if (reg && evt.id === reg.event_id) {
          return {
            ...evt,
            pending_count: evt.pending_count - (reg.payment_status === 'pending' ? 1 : 0),
            approved_count: evt.approved_count + (decision === 'approved' ? 1 : 0)
          };
        }
        return evt;
      }));

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

  // Filter logic
  const filteredRegistrations = registrations.filter((reg) => {
    if (selectedEventId && reg.event_id !== selectedEventId) return false;
    if (activeTab === 'pending' && reg.payment_status !== 'pending') return false;
    if (activeTab === 'reviewed' && reg.payment_status === 'pending') return false;
    
    const participantText = reg.participant_name || reg.participant_user?.full_name || reg.participant_user?.email || '';
    return (
      participantText.toLowerCase().includes(search.toLowerCase()) ||
      (reg.email || '').toLowerCase().includes(search.toLowerCase()) ||
      reg.events.title.toLowerCase().includes(search.toLowerCase())
    );
  });

  const filteredEvents = eventSummaries.filter(evt => 
    evt.title.toLowerCase().includes(search.toLowerCase()) ||
    evt.category.toLowerCase().includes(search.toLowerCase())
  ).sort((a,b) => b.pending_count - a.pending_count);

  const selectedEvent = eventSummaries.find(e => e.id === selectedEventId);

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {!selectedEventId ? (
            <motion.div
              key="event-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <header className="mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter uppercase leading-none">
                      Payment <span className="text-fest-gold">Review</span>
                    </h1>
                    <p className="text-white/50 text-sm md:text-lg mt-4 max-w-2xl font-medium">
                      Verifying transactions. {user?.role === 'admin' ? 'Master administrator view' : `Reviewing assigned events.`}
                    </p>
                  </div>
                  <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-fest-gold transition-colors" size={20} />
                    <input
                      type="text"
                      placeholder="Search events or participants..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-[2rem] text-sm focus:outline-none focus:border-fest-gold/50 transition-all placeholder:text-white/10"
                    />
                  </div>
                </div>
              </header>

              {loading ? (
                <div className="flex justify-center py-32">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-fest-gold/20 animate-pulse" />
                    <Loader2 className="absolute top-0 left-0 animate-spin text-fest-gold" size={64} />
                  </div>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="glass text-center py-32 rounded-[3.5rem] border-white/5">
                  <div className="inline-flex w-20 h-20 bg-white/5 rounded-full items-center justify-center mb-6">
                    <DollarSign size={40} className="text-white/20" />
                  </div>
                  <h3 className="text-3xl font-display font-bold opacity-50 mb-2">No Payments to Review</h3>
                  <p className="opacity-40 text-sm tracking-widest uppercase">Everything looks clean</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((evt) => (
                    <button
                      key={evt.id}
                      onClick={() => setSelectedEventId(evt.id)}
                      className="glass text-left p-8 rounded-[2.5rem] border border-white/10 hover:border-fest-gold/30 hover:bg-white/[0.07] transition-all group relative overflow-hidden"
                    >
                      <div className={`absolute top-0 left-0 w-full h-1.5 transition-all ${evt.pending_count > 0 ? 'bg-fest-gold shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'bg-white/10'}`} />
                      
                      <div className="flex justify-between items-start mb-6">
                        <span className="text-[10px] uppercase tracking-[0.25em] font-black py-1.5 px-4 bg-white/5 rounded-full text-white/50 border border-white/5 group-hover:border-white/10 transition-colors">
                          {evt.category}
                        </span>
                        {evt.pending_count > 0 && (
                          <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fest-gold opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-fest-gold"></span>
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-2xl font-display font-bold uppercase tracking-tight group-hover:text-fest-gold transition-colors leading-tight">
                        {evt.title}
                      </h3>
                      
                      <div className="mt-10 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Pending</div>
                          <div className={`text-2xl font-display font-black ${evt.pending_count > 0 ? 'text-fest-gold' : 'text-white/20'}`}>
                            {evt.pending_count}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Total Approved</div>
                          <div className="text-2xl font-display font-black text-white/60">
                            {evt.approved_count}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-[10px] uppercase tracking-widest font-black text-white/20 group-hover:text-white/40 transition-colors">
                        <span>Review Payments</span>
                        <ExternalLink size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="drill-down"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setSelectedEventId(null)}
                    className="w-14 h-14 rounded-full glass flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <div>
                    <h2 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter leading-none">
                      {selectedEvent?.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] uppercase tracking-widest bg-fest-gold/10 text-fest-gold px-3 py-1 rounded-full font-bold border border-fest-gold/20">
                        {selectedEvent?.category}
                      </span>
                      <span className="text-xs text-white/30 font-bold uppercase tracking-widest">
                        {filteredRegistrations.length} Participants filtered
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row bg-white/5 rounded-[1.5rem] p-1 border border-white/10 w-full md:w-fit">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 sm:flex-none px-8 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-fest-gold text-fest-dark shadow-xl shadow-fest-gold/20' : 'text-white/40 hover:text-white'}`}
                  >
                    Pending ({selectedEvent?.pending_count})
                  </button>
                  <button
                    onClick={() => setActiveTab('reviewed')}
                    className={`flex-1 sm:flex-none px-8 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reviewed' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                  >
                    History ({selectedEvent?.approved_count})
                  </button>
                </div>
              </header>

              {filteredRegistrations.length === 0 ? (
                <div className="rounded-[3rem] border border-dashed border-white/10 py-32 text-center text-white/20">
                  <div className="text-sm font-bold uppercase tracking-[0.3em]">No participants in this queue</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredRegistrations.map((reg) => {
                    const isExpanded = expandedRows[reg.id];
                    return (
                      <motion.div
                        key={reg.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`glass rounded-[2rem] border overflow-hidden transition-all duration-300 ${isExpanded ? 'border-fest-gold/30 bg-white/[0.08] ring-1 ring-fest-gold/10' : 'border-white/10 hover:border-white/20'}`}
                      >
                        {/* Header: Clickable Toggle */}
                        <button
                          onClick={() => setExpandedRows(prev => ({ ...prev, [reg.id]: !prev[reg.id] }))}
                          className="w-full text-left p-6 md:p-8 flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-fest-gold text-fest-dark rotate-180' : 'bg-white/5 text-white/40 group-hover:bg-white/10'}`}>
                              <ChevronDown size={24} />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xl md:text-2xl font-bold font-display tracking-tight group-hover:text-fest-gold transition-colors">
                                {reg.participant_name || reg.participant_user?.full_name || 'Anonymous User'}
                              </h4>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="flex items-center gap-1.5 text-xs text-white/40 font-medium">
                                  <User size={12} className="opacity-50" /> {reg.college_name || 'Individual Participant'}
                                </span>
                                <span className="hidden md:block w-1 h-1 bg-white/10 rounded-full" />
                                <span className="text-xs text-fest-gold/50 font-black uppercase tracking-widest flex items-center gap-2">
                                  <Phone size={12} className="opacity-50" /> {reg.phone}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="hidden sm:block bg-black/40 px-6 py-3 rounded-2xl border border-white/5 text-right min-w-32">
                            <div className="text-[10px] uppercase tracking-widest text-white/30 font-black mb-0.5">Fee Amount</div>
                            <div className="text-xl font-display font-black text-fest-gold">₹{reg.events.entry_fee}</div>
                          </div>
                        </button>

                        {/* Expandable Body */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="p-6 md:p-8 pt-0 border-t border-white/5 mt-2 space-y-8">
                                {/* Grid of detail cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleViewScreenshot(reg.payment_screenshot_url);
                                    }}
                                    className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-[1.5rem] hover:bg-white/[0.08] transition-all group/screenshot"
                                  >
                                    <div className="text-left">
                                      <div className="text-[10px] uppercase tracking-widest text-white/30 font-black mb-1.5">Transaction</div>
                                      <div className="text-xs font-black text-fest-gold flex items-center gap-2 group-hover/screenshot:gap-3 transition-all">
                                        VIEW SCREENSHOT <ExternalLink size={14} />
                                      </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-white/40 group-hover/screenshot:text-fest-gold transition-colors">
                                      <Camera size={24} />
                                    </div>
                                  </button>
                                  
                                  <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-[1.5rem]">
                                    <div className="text-left">
                                      <div className="text-[10px] uppercase tracking-widest text-white/30 font-black mb-1.5">Submission Time</div>
                                      <div className="text-sm font-bold text-white/60">
                                        {new Date(reg.created_at).toLocaleDateString()} @ {new Date(reg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-white/40">
                                      <Clock size={24} />
                                    </div>
                                  </div>
                                </div>

                                {/* Notes Area */}
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between px-2">
                                     <label className="text-[10px] uppercase tracking-widest text-white/30 font-black">Decision Notes</label>
                                     <span className="text-[10px] text-white/10 font-bold uppercase tracking-widest italic">Internal Review Team Only</span>
                                  </div>
                                  <textarea
                                    value={notes[reg.id] || ''}
                                    onChange={(e) => setNotes((current) => ({ ...current, [reg.id]: e.target.value }))}
                                    placeholder="Internal note for approval/rejection reasons..."
                                    className="w-full h-32 rounded-3xl border border-white/10 bg-black/40 px-6 py-5 text-sm outline-none focus:border-fest-gold/40 focus:ring-1 focus:ring-fest-gold/20 resize-none transition-all placeholder:text-white/10"
                                  />
                                </div>

                                {/* Decision Row */}
                                {activeTab === 'pending' ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                      onClick={() => handleDecision(reg.id, 'rejected')}
                                      disabled={actionLoading === reg.id}
                                      className="py-5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 border border-red-500/20 shadow-lg shadow-red-500/0 hover:shadow-red-500/10"
                                    >
                                      {actionLoading === reg.id ? <Loader2 className="animate-spin" size={18} /> : <><XCircle size={18} /> Reject Payment</>}
                                    </button>
                                    <button
                                      onClick={() => handleDecision(reg.id, 'approved')}
                                      disabled={actionLoading === reg.id}
                                      className="py-5 bg-fest-gold text-fest-dark rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-fest-gold-light transition-all flex items-center justify-center gap-3 shadow-xl shadow-fest-gold/10 hover:shadow-fest-gold/20 active:scale-[0.98]"
                                    >
                                      {actionLoading === reg.id ? <Loader2 className="animate-spin text-fest-dark" size={18} /> : <><Unlock size={18} /> Approve & Unlock</>}
                                    </button>
                                  </div>
                                ) : (
                                  <div className={`py-6 rounded-[1.5rem] border text-center relative overflow-hidden group/decision ${reg.payment_status === 'approved' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                     <div className="absolute inset-0 bg-white/0 group-hover/decision:bg-white/[0.02] transition-colors" />
                                     <div className="text-[10px] uppercase tracking-[0.4em] font-black opacity-40 mb-1">Final Decision Recorded</div>
                                     <div className="text-sm font-black uppercase tracking-[0.1em]">{reg.payment_status}</div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>

              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
