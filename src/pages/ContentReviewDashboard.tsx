import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, XCircle, Search, ExternalLink, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

type ContentReview = {
  id: string;
  user_id: string;
  event_id: string;
  participant_name: string | null;
  email: string | null;
  team_name: string | null;
  drive_view_url: string | null;
  drive_download_url: string | null;
  review_status: 'not_started' | 'selected' | 'eliminated';
  review_notes: string | null;
  submission_status: 'locked' | 'ready' | 'submitted';
  created_at: string;
  participant_user: {
    email: string;
    full_name: string | null;
  } | null;
  events: {
    title: string;
    category: string;
  };
};

function toEmbedUrl(input: string | null) {
  if (!input) return null;
  if (input.includes('/preview')) return input;

  const match = input.match(/\/d\/([^/]+)/) || input.match(/[?&]id=([^&]+)/);
  if (match?.[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }

  return input;
}

export default function ContentReviewDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [submissions, setSubmissions] = useState<ContentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSubmissions();
  }, [activeTab]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const registrationQuery = supabase
        .from('registrations')
        .select(`
          id, user_id, event_id, participant_name, email, team_name, drive_view_url, drive_download_url,
          review_status, review_notes, submission_status, created_at,
          participant_user:users!registrations_user_id_fkey ( email, full_name ),
          events ( title, category )
        `)
        .eq('submission_status', 'submitted')
        .in('review_status', activeTab === 'pending' ? ['not_started'] : ['selected', 'eliminated'])
        .order('submitted_at', { ascending: false });

      const { data, error } = await registrationQuery;
      if (error) throw error;

      const rows = (data as unknown as ContentReview[]) || [];
      setSubmissions(rows);
      setNotes(
        rows.reduce((acc, row) => {
          acc[row.id] = row.review_notes || '';
          return acc;
        }, {} as Record<string, string>)
      );
    } catch (err: any) {
      toast.error('Failed to load submissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (registrationId: string, decision: 'selected' | 'eliminated') => {
    setActionLoading(registrationId);
    try {
      const { error } = await supabase
        .from('registrations')
        .update({
          review_status: decision,
          review_notes: notes[registrationId] || null,
          content_reviewed_by: user?.id || null,
          content_reviewed_at: new Date().toISOString(),
        })
        .eq('id', registrationId);

      if (error) throw error;

      toast.success(`Participant marked ${decision}.`);
      setSubmissions((prev) => prev.filter((item) => item.id !== registrationId));
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const participant = submission.participant_name || submission.participant_user?.full_name || submission.participant_user?.email || '';
    return (
      participant.toLowerCase().includes(search.toLowerCase()) ||
      submission.events.title.toLowerCase().includes(search.toLowerCase()) ||
      (submission.email || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter">
            Content <span className="text-fest-gold">Review</span>
          </h1>
          <p className="text-white/50 text-lg mt-2">Watch event submissions inside the dashboard and decide the next round status.</p>
        </header>

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
              Reviewed
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder="Search by name or event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-fest-gold transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-fest-gold" size={48} />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="glass text-center py-20 rounded-[3rem]">
            <h3 className="text-2xl font-bold opacity-50 mb-2">No Submissions</h3>
            <p className="opacity-40 text-sm">No content is waiting here right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <AnimatePresence>
              {filteredSubmissions.map((submission) => {
                const embedUrl = toEmbedUrl(submission.drive_view_url);

                return (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass p-6 md:p-8 rounded-[2rem] flex flex-col gap-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-mono bg-white/10 px-3 py-1 rounded-full text-fest-gold">
                          {submission.events.category}
                        </span>
                        <h3 className="text-2xl font-bold mt-3 font-display">{submission.events.title}</h3>
                        <p className="text-white/60 text-sm">
                          {submission.participant_name || submission.participant_user?.full_name || submission.participant_user?.email}
                        </p>
                        {submission.team_name && <p className="text-white/40 text-xs mt-1">Team: {submission.team_name}</p>}
                      </div>
                      <Video className="text-fest-gold" />
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video">
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          title={`Submission for ${submission.events.title}`}
                          className="w-full h-full"
                          allow="autoplay"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                          Preview unavailable for this link
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {submission.drive_view_url && (
                        <a
                          href={submission.drive_view_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-2"
                        >
                          Open Link <ExternalLink size={14} />
                        </a>
                      )}
                      {submission.drive_download_url && (
                        <a
                          href={submission.drive_download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-2"
                        >
                          Download <ExternalLink size={14} />
                        </a>
                      )}
                    </div>

                    <textarea
                      value={notes[submission.id] || ''}
                      onChange={(e) => setNotes((current) => ({ ...current, [submission.id]: e.target.value }))}
                      placeholder="Reviewer note"
                      className="w-full h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-fest-gold resize-none"
                    />

                    {activeTab === 'pending' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handleDecision(submission.id, 'selected')}
                          disabled={actionLoading === submission.id}
                          className="w-full py-3 bg-fest-gold text-fest-dark rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-fest-gold-light transition-all flex items-center justify-center gap-2 glow-gold"
                        >
                          {actionLoading === submission.id ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> Select</>}
                        </button>
                        <button
                          onClick={() => handleDecision(submission.id, 'eliminated')}
                          disabled={actionLoading === submission.id}
                          className="w-full py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                        >
                          {actionLoading === submission.id ? <Loader2 className="animate-spin" size={16} /> : <><XCircle size={16} /> Eliminate</>}
                        </button>
                      </div>
                    ) : (
                      <div className={`text-center w-full uppercase tracking-widest text-xs font-bold py-3 rounded-xl ${submission.review_status === 'selected' ? 'bg-fest-gold/20 text-fest-gold' : 'bg-red-500/10 text-red-400'}`}>
                        {submission.review_status}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
