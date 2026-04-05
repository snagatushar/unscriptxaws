import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, XCircle, Search, Video, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

import { QualificationStage, Submission } from '../types';
import { logAdminAction } from '../lib/audit';

type ContentReview = {
  id: string;
  user_id: string;
  event_id: string;
  participant_name: string | null;
  email: string | null;
  team_name: string | null;
  review_status: 'not_started' | 'selected' | 'eliminated';
  qualification_stage: QualificationStage;
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
  submissions: (Submission & { 
    internal_reviews: { score: number; judge_remarks: string }[] | null 
  })[];
};

const STAGE_ORDER: QualificationStage[] = [
  'not_started',
  'round_1_qualified',
  'round_2_qualified',
  'semifinal',
  'final',
  'winner'
];

function isRoundPast(currentStage: QualificationStage, roundToCheck: string): boolean {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const checkIndex = STAGE_ORDER.indexOf(roundToCheck as QualificationStage);
  
  if (currentIndex === -1 || checkIndex === -1) return false;
  // If the user's current stage index is strictly GREATER than the video's round index,
  // it means they have been promoted PAST that round.
  return currentIndex > checkIndex;
}

function isRoundActive(currentStage: QualificationStage, roundToCheck: string): boolean {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const checkIndex = STAGE_ORDER.indexOf(roundToCheck as QualificationStage);
  
  // A round is active if the current stage is the one IMMEDIATELY PRECEDING the round, 
  // OR if they are currently AT that stage (for 'reviewed' tab).
  return currentIndex === checkIndex || currentIndex === checkIndex - 1;
}

function getBucketName(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-');
}

function VideoPreview({ submission, eventTitle }: { submission: Submission; eventTitle: string }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUrl() {
      const bucketName = getBucketName(eventTitle);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(submission.video_path, 3600); // 1 hour access

      if (error) {
        console.error('Error creating signed URL:', error);
        setVideoUrl(null);
      } else {
        setVideoUrl(data.signedUrl);
      }
      setLoading(false);
    }
    getUrl();
  }, [submission.video_path, eventTitle]);

  if (loading) return (
    <div className="w-full aspect-video rounded-xl bg-white/5 flex items-center justify-center border border-white/10 animate-pulse">
      <Loader2 className="animate-spin text-white/20" size={24} />
    </div>
  );

  if (!videoUrl) return (
    <div className="w-full aspect-video rounded-xl bg-red-500/5 flex items-center justify-center border border-red-500/10 text-red-400 text-xs text-center p-4">
      Failed to load video. Check if the bucket '{getBucketName(eventTitle)}' exists.
    </div>
  );

  return (
    <div className="space-y-3">
      <video 
        src={videoUrl} 
        controls 
        className="w-full aspect-video rounded-xl bg-black border border-white/10 shadow-2xl"
      />
      <div className="flex gap-2">
        <a 
          href={videoUrl} 
          download 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] uppercase font-bold tracking-widest text-center transition-all border border-white/5"
        >
          Download Video
        </a>
      </div>
    </div>
  );
}

export default function ContentReviewDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [submissions, setSubmissions] = useState<ContentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [savingScoreId, setSavingScoreId] = useState<string | null>(null);

  const rounds: { id: QualificationStage; name: string }[] = [
    { id: 'round_1_qualified', name: 'Round 1' },
    { id: 'round_2_qualified', name: 'Round 2' },
    { id: 'semifinal', name: 'Semifinal' },
    { id: 'final', name: 'Final' },
  ];

  useEffect(() => {
    fetchSubmissions();
  }, [activeTab]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      // 1. Get assigned events if not admin
      let assignedEventIds: string[] = [];
      if (user?.role !== 'admin') {
        const { data: assignments } = await supabase
          .from('reviewer_event_assignments')
          .select('event_id')
          .eq('reviewer_id', user?.id)
          .eq('role_type', 'judge');
        assignedEventIds = (assignments || []).map(a => a.event_id);
        
        if (assignedEventIds.length === 0) {
          setSubmissions([]);
          setLoading(false);
          return;
        }
      }

      // 2. Fetch relevant registrations
      let query = supabase
        .from('registrations')
        .select(`
          *,
          events!registrations_event_id_fkey ( title, category ),
          submissions (*, internal_reviews(score, judge_remarks))
        `)
        .eq('payment_status', 'approved');

      if (user?.role !== 'admin') {
        query = query.in('event_id', assignedEventIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data as unknown as ContentReview[]) || [];
      setSubmissions(rows);
      
      // Pre-fill notes and scores from DB
      const existingNotes: Record<string, string> = {};
      const existingScores: Record<string, number> = {};
      rows.forEach((reg: any) => {
        reg.submissions?.forEach((s: any) => {
          if (s.internal_reviews && s.internal_reviews[0]) {
            existingScores[s.id] = s.internal_reviews[0].score || 0;
            existingNotes[s.id] = s.internal_reviews[0].judge_remarks || '';
          }
        });
      });
      setNotes(existingNotes);
      setScores(existingScores);
    } catch (err: any) {
      toast.error('Failed to load submissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveReviewData = async (submissionId: string) => {
    setSavingScoreId(submissionId);
    try {
      const { error } = await supabase
        .from('internal_reviews')
        .upsert({
          submission_id: submissionId,
          score: scores[submissionId] || 0,
          judge_remarks: notes[submissionId] || '',
          updated_at: new Date().toISOString()
        }, { onConflict: 'submission_id' });

      if (error) throw error;
      
      // Log the judge action
      if (user) {
        const reg = submissions.find(r => r.submissions.some(s => s.id === submissionId));
        if (reg) {
          await logAdminAction(user.id, 'SITE_CONTENT_UPDATE', submissionId, {
            student: reg.participant_name || reg.participant_user?.full_name || 'Anonymous',
            event: reg.events.title,
            score: scores[submissionId] || 0,
            notes: 'Saved internal score/remarks'
          });
        }
      }

      toast.success('Internal review saved.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save review.');
    } finally {
      setSavingScoreId(null);
    }
  };

  const handleDecision = async (registrationId: string, currentRoundId: QualificationStage, decision: 'selected' | 'eliminated') => {
    setActionLoading(registrationId);
    try {
      const updatePayload: any = {
        content_reviewed_by: user?.id || null,
        content_reviewed_at: new Date().toISOString(),
      };

      if (decision === 'selected') {
        updatePayload.qualification_stage = currentRoundId;
        updatePayload.review_status = 'selected';
      } else {
        updatePayload.qualification_stage = 'eliminated';
        updatePayload.review_status = 'eliminated';
      }

      const { error } = await supabase
        .from('registrations')
        .update(updatePayload)
        .eq('id', registrationId);

      if (error) throw error;

      // Log the judge decision
      if (user) {
        const reg = submissions.find(r => r.id === registrationId);
        if (reg) {
          await logAdminAction(
            user.id, 
            decision === 'selected' ? 'JUDGE_PROMOTE' : 'JUDGE_ELIMINATE', 
            registrationId, 
            {
              student: reg.participant_name || reg.participant_user?.full_name || 'Anonymous',
              event: reg.events.title,
              round: currentRoundId,
              decision: decision
            }
          );
        }
      }

      toast.success(`Participant ${decision === 'selected' ? 'promoted' : 'eliminated'}.`);
      fetchSubmissions();
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Group submissions by event for the "Main Page"
  const eventGroups = submissions.reduce((acc, reg) => {
    const eid = reg.event_id;
    if (!acc[eid]) {
      acc[eid] = {
        id: eid,
        title: reg.events.title,
        category: reg.events.category,
        count: 0,
        pending: 0
      };
    }
    acc[eid].count++;
    
    // Check if it's pending for currently selected review logic
    const isPending = reg.qualification_stage !== 'eliminated' && reg.qualification_stage !== 'winner' && 
             reg.submissions.some(s => {
               if (s.round === 'round_1_qualified' && reg.qualification_stage === 'not_started') return true;
               if (s.round === 'round_2_qualified' && reg.qualification_stage === 'round_1_qualified') return true;
               if (s.round === 'semifinal' && reg.qualification_stage === 'round_2_qualified') return true;
               if (s.round === 'final' && reg.qualification_stage === 'semifinal') return true;
               return false;
             });
    
    if (isPending) acc[eid].pending++;
    return acc;
  }, {} as Record<string, { id: string, title: string, category: string, count: number, pending: number }>);

  const eventList = Object.values(eventGroups).filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const selectedEvent = selectedEventId ? eventGroups[selectedEventId] : null;

  const currentEventSubmissions = submissions.filter(s => s.event_id === selectedEventId).filter((reg) => {
    const participant = reg.participant_name || reg.participant_user?.full_name || reg.participant_user?.email || '';
    const matchesSearch = participant.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'pending') {
      return reg.qualification_stage !== 'eliminated' && reg.qualification_stage !== 'winner' && 
             reg.submissions.some(s => {
               if (s.round === 'round_1_qualified' && reg.qualification_stage === 'not_started') return true;
               if (s.round === 'round_2_qualified' && reg.qualification_stage === 'round_1_qualified') return true;
               if (s.round === 'semifinal' && reg.qualification_stage === 'round_2_qualified') return true;
               if (s.round === 'final' && reg.qualification_stage === 'semifinal') return true;
               return false;
             });
    } else {
      return reg.qualification_stage === 'eliminated' || reg.qualification_stage === 'winner' || 
             (reg.qualification_stage !== 'not_started');
    }
  });

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter">
              {selectedEvent ? selectedEvent.title : 'Content'} <span className="text-fest-gold">Review</span>
            </h1>
            <p className="text-white/50 text-lg mt-2">
              {selectedEvent ? `Reviewing submissions for ${selectedEvent.title}` : 'Manage event submissions and decide round status.'}
            </p>
          </div>
          
          {selectedEventId && (
            <button 
              onClick={() => setSelectedEventId(null)}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-sm font-bold transition-all flex items-center gap-2"
            >
              ← Back to Events
            </button>
          )}
        </header>

        <div className="flex flex-col md:flex-row justify-between gap-6 px-1 mb-8">
          {selectedEventId ? (
            <div className="flex bg-white/5 rounded-full p-1 border border-white/10 w-fit">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-fest-gold text-fest-dark glow-gold' : 'text-white/60 hover:text-white'}`}
              >
                Needs Review
              </button>
              <button
                onClick={() => setActiveTab('reviewed')}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'reviewed' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
              >
                Processed
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest font-bold">
              <div className="w-2 h-2 rounded-full bg-fest-gold animate-pulse" />
              {eventList.length} Active Events
            </div>
          )}

          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder={selectedEventId ? "Search participants..." : "Search events..."}
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
        ) : !selectedEventId ? (
          /* EVENT GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {eventList.map((evt) => (
              <motion.div
                key={evt.id}
                whileHover={{ scale: 1.02, y: -5 }}
                onClick={() => setSelectedEventId(evt.id)}
                className="glass p-8 rounded-[2.5rem] cursor-pointer group border border-white/5 hover:border-fest-gold/30 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-fest-gold/5 blur-3xl -z-10 group-hover:bg-fest-gold/10 transition-colors" />
                <span className="text-[10px] uppercase tracking-widest text-fest-gold bg-fest-gold/10 px-3 py-1 rounded-full mb-4 inline-block font-bold">
                  {evt.category}
                </span>
                <h3 className="text-2xl font-bold font-display mb-6 group-hover:text-fest-gold transition-colors">{evt.title}</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-black">{evt.count}</div>
                    <div className="text-[10px] uppercase text-white/30 tracking-widest mt-1">Total Registrations</div>
                  </div>
                  {evt.pending > 0 && (
                    <div className="text-right">
                      <div className="text-3xl font-black text-fest-gold">{evt.pending}</div>
                      <div className="text-[10px] uppercase text-fest-gold/50 tracking-widest mt-1">To Review</div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : currentEventSubmissions.length === 0 ? (
          <div className="glass text-center py-24 rounded-[3rem] border border-white/5">
            <Video className="mx-auto text-white/10 mb-6" size={64} />
            <h3 className="text-2xl font-bold opacity-50 mb-2 font-display uppercase tracking-tight">Empty Bucket</h3>
            <p className="opacity-30 text-sm max-w-xs mx-auto text-balance">
              No submissions match your current filters for this event.
            </p>
          </div>
        ) : (
          /* DRILL DOWN VIEW (PARTICIPANTS) */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <AnimatePresence mode="popLayout">
              {currentEventSubmissions.map((submission) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass p-6 md:p-8 rounded-[2rem] flex flex-col gap-6 border border-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono bg-white/10 px-3 py-1 rounded-full text-fest-gold">
                        {submission.events.category}
                      </span>
                      <h3 className="text-2xl font-bold mt-4 font-display leading-tight">{submission.events.title}</h3>
                      <p className="text-white/60 text-sm font-medium">
                        {submission.participant_name || submission.participant_user?.full_name || submission.participant_user?.email}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] uppercase tracking-widest bg-fest-gold/10 text-fest-gold px-2 py-0.5 rounded border border-fest-gold/20 font-bold">
                          Stage: {submission.qualification_stage.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <Video className="text-fest-gold" size={24} />
                  </div>

                  <div className="space-y-4">
                    {submission.submissions.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(s => (
                      <div key={s.id} className="glass bg-black/40 p-5 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-fest-gold uppercase tracking-widest">{s.round.replace(/_/g, ' ').replace('qualified','')} Entry</span>
                          <span className="text-[10px] text-white/30 font-mono">{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                        <VideoPreview submission={s} eventTitle={submission.events.title} />
                        
                        {/* ONLY SHOW SCORING AND DECISIONS FOR THE ACTIVE ROUND */}
                        {!isRoundPast(submission.qualification_stage, s.round) && (
                          <>
                            <div className="mt-6 pt-6 border-t border-white/5 space-y-4 bg-white/2 rounded-2xl p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black block mb-2">Manual Score (0-10)</label>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="number"
                                      min="0"
                                      max="10"
                                      value={scores[s.id] || 0}
                                      onChange={(e) => setScores(p => ({ ...p, [s.id]: Number(e.target.value) }))}
                                      className="w-20 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-fest-gold font-black text-center focus:border-fest-gold transition-all"
                                    />
                                    <span className="text-white/20 font-display font-medium">/ 10</span>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => saveReviewData(s.id)}
                                  disabled={savingScoreId === s.id}
                                  className="px-6 py-3 bg-fest-gold/10 text-fest-gold hover:bg-fest-gold hover:text-fest-dark rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all border border-fest-gold/20 flex items-center gap-2"
                                >
                                   {savingScoreId === s.id ? <Loader2 className="animate-spin" size={14} /> : <><Save size={14} /> Save Points</>}
                                </button>
                              </div>
                              
                              <textarea
                                value={notes[s.id] || ''}
                                onChange={(e) => setNotes((current) => ({ ...current, [s.id]: e.target.value }))}
                                placeholder="Add private judge notes for this entry..."
                                className="w-full h-20 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-fest-gold resize-none transition-colors"
                              />
                            </div>
                            
                                 {/* DECISION BUTTONS ONLY FOR ACTIVE ROUND */}
                                 {activeTab === 'pending' && !isRoundPast(submission.qualification_stage, s.round) && (
                                   <div className="grid grid-cols-2 gap-4 mt-8 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                     <div className="col-span-2 text-center text-[10px] uppercase tracking-widest text-white/30 mb-2 font-bold select-none">Action for this round entry</div>
                                     <button
                                  onClick={() => handleDecision(submission.id, s.round, 'selected')}
                                  disabled={actionLoading === submission.id}
                                  className="py-4 bg-fest-gold text-fest-dark rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-fest-gold-light transition-all flex items-center justify-center gap-2 glow-gold shadow-lg"
                                >
                                  {actionLoading === submission.id ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> Promote Candidate</>}
                                </button>
                                <button
                                  onClick={() => handleDecision(submission.id, s.round, 'eliminated')}
                                  disabled={actionLoading === submission.id}
                                  className="py-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 border border-red-500/20"
                                >
                                  {actionLoading === submission.id ? <Loader2 className="animate-spin" size={16} /> : <><XCircle size={16} /> Eliminate User</>}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* READ-ONLY SCORE DISPLAY FOR PREVIOUS ROUNDS IN HISTORY */}
                        {isRoundPast(submission.qualification_stage, s.round) && (
                          <div className="mt-4 px-4 py-4 bg-fest-gold/5 border border-fest-gold/10 rounded-2xl flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <div className="text-[10px] text-fest-gold uppercase tracking-[0.2em] font-black mb-1">Final Result (History)</div>
                                <div className="text-[10px] font-bold text-white/60">Stage Successfully Completed</div>
                              </div>
                              <div className="flex items-center gap-2 bg-fest-gold/10 px-4 py-2 rounded-xl border border-fest-gold/20">
                                <span className="text-2xl font-display font-black text-fest-gold">{scores[s.id] || 0}</span>
                                <span className="text-[10px] text-fest-gold/40 font-bold uppercase tracking-widest pt-1">/ 10 PTS</span>
                              </div>
                            </div>
                            
                            {notes[s.id] && (
                              <div className="border-t border-fest-gold/5 pt-3">
                                <div className="text-[8px] text-white/30 uppercase tracking-widest font-bold mb-1">Judge Remarks</div>
                                <p className="text-xs text-white/70 italic leading-relaxed">"{notes[s.id]}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {activeTab === 'reviewed' && (
                    <div className={`text-center w-full uppercase tracking-widest text-[10px] font-black py-4 rounded-xl ${submission.qualification_stage === 'eliminated' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-fest-gold/20 text-fest-gold border border-fest-gold/20'}`}>
                      STAGE STATUS: {submission.qualification_stage === 'eliminated' ? 'Eliminated' : 'Promoted'}
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
