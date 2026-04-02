import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, Clock, XCircle, Trophy, Link2, Upload, FileVideo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PaymentStatus, QualificationStage, ReviewStatus, SubmissionStatus } from '../types';

type UserRegistration = {
  id: string;
  event_id: string;
  payment_status: PaymentStatus;
  upload_enabled: boolean;
  submission_status: SubmissionStatus;
  drive_view_url: string | null;
  drive_download_url: string | null;
  review_status: ReviewStatus;
  qualification_stage: QualificationStage;
  qualification_notes: string | null;
  review_notes: string | null;
  payment_review_notes: string | null;
  events: {
    id: string;
    title: string;
    category: string;
  };
};

function getReviewLabel(status: ReviewStatus) {
  switch (status) {
    case 'selected':
      return 'Selected';
    case 'eliminated':
      return 'Eliminated';
    default:
      return 'Under Review';
  }
}

function getQualificationLabel(stage: QualificationStage) {
  switch (stage) {
    case 'round_1_qualified':
      return '1st Round Qualified';
    case 'round_2_qualified':
      return '2nd Round Qualified';
    case 'semifinal':
      return 'Semifinal Qualified';
    case 'final':
      return 'Final Qualified';
    case 'eliminated':
      return 'Eliminated';
    default:
      return 'Awaiting Round Result';
  }
}

export default function UserDashboard() {
  const { user, session } = useAuth();
  const [registrations, setRegistrations] = useState<UserRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});

  useEffect(() => {
    async function fetchRegistrations() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('registrations')
          .select(`
            id,
            event_id,
            payment_status,
            upload_enabled,
            submission_status,
            drive_view_url,
            drive_download_url,
            review_status,
            qualification_stage,
            qualification_notes,
            review_notes,
            payment_review_notes,
            events ( id, title, category )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const rows = (data as unknown as UserRegistration[]) || [];
        setRegistrations(rows);
      } catch {
        toast.error('Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    }

    fetchRegistrations();
  }, [user]);

  const handleFileUpload = async (registrationId: string) => {
    const file = selectedFiles[registrationId];
    if (!file) {
      toast.error('Choose your video file first.');
      return;
    }

    if (!session?.access_token) {
      toast.error('Your login session expired. Please sign in again.');
      return;
    }

    setSubmittingId(registrationId);
    try {
      const formData = new FormData();
      formData.append('registrationId', registrationId);
      formData.append('file', file);

      const response = await fetch('/api/drive-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => ({ message: 'Upload failed.' }));
      if (!response.ok) {
        throw new Error(payload.message || 'Upload failed.');
      }

      setRegistrations((current) =>
        current.map((registration) =>
          registration.id === registrationId
            ? {
                ...registration,
                drive_view_url: payload.driveViewUrl || registration.drive_view_url,
                drive_download_url: payload.driveDownloadUrl || registration.drive_download_url,
                submission_status: 'submitted',
              }
            : registration
        )
      );

      setSelectedFiles((current) => ({
        ...current,
        [registrationId]: null,
      }));

      toast.success('Video uploaded to Google Drive successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload video.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <Loader2 className="animate-spin text-fest-gold" size={48} />
      </div>
    );
  }

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-6xl font-display font-extrabold uppercase mb-4 tracking-tighter">
            Registered <span className="text-fest-gold">Events</span>
          </h1>
          <p className="text-white/60 mb-8 md:mb-12 text-sm md:text-lg">
            Track payment approval, upload access, and round results for each event you registered in.
          </p>
        </motion.div>

        {registrations.length === 0 ? (
          <div className="glass p-12 text-center rounded-[3rem]">
            <h3 className="text-2xl font-bold mb-4 opacity-50">No Registered Events Yet</h3>
            <p className="opacity-40 mb-6">You have not registered for any events yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {registrations.map((registration, index) => (
              <motion.div
                key={registration.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08 }}
                className="glass rounded-3xl p-8 relative overflow-hidden flex flex-col gap-6"
              >
                <div className="absolute top-0 right-0 p-4">
                  <span className="text-[10px] uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full opacity-70">
                    {registration.events.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl md:text-2xl font-display font-bold mb-2 pr-16 leading-tight">{registration.events.title}</h3>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/35">Event Registration</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl">
                    {registration.payment_status === 'approved' ? (
                      <CheckCircle className="text-green-400" size={20} />
                    ) : registration.payment_status === 'rejected' ? (
                      <XCircle className="text-red-400" size={20} />
                    ) : (
                      <Clock className="text-fest-gold-light" size={20} />
                    )}
                    <div>
                      <div className="text-[10px] uppercase text-white/40 tracking-widest">Payment Approval</div>
                      <div className="text-sm font-bold capitalize">{registration.payment_status}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl">
                    {registration.qualification_stage === 'final' ? (
                      <Trophy className="text-fest-gold" size={20} />
                    ) : registration.qualification_stage === 'eliminated' ? (
                      <XCircle className="text-red-400" size={20} />
                    ) : (
                      <CheckCircle className="text-white/60" size={20} />
                    )}
                    <div>
                      <div className="text-[10px] uppercase text-white/40 tracking-widest">Qualified To Next Round</div>
                      <div className="text-sm font-bold">{getQualificationLabel(registration.qualification_stage)}</div>
                    </div>
                  </div>
                </div>

                {registration.qualification_notes && (
                  <div className="rounded-2xl border border-fest-gold/20 bg-fest-gold/5 p-4 text-xs text-white/80">
                    Qualification note: {registration.qualification_notes}
                  </div>
                )}

                {registration.payment_review_notes && (
                  <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs text-yellow-100/80">
                    Payment note: {registration.payment_review_notes}
                  </div>
                )}

                {registration.review_notes && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/70">
                    Review note: {registration.review_notes}
                  </div>
                )}

                {registration.payment_status === 'approved' &&
                registration.upload_enabled &&
                registration.qualification_stage !== 'eliminated' ? (
                  <div className="space-y-4 rounded-2xl border border-fest-gold/20 bg-fest-gold/5 p-4">
                    <div>
                      <h4 className="font-bold text-fest-gold uppercase tracking-wider text-sm">Upload Video</h4>
                      <p className="text-[11px] text-white/55 mt-1">
                        {registration.qualification_stage === 'not_started'
                          ? 'Payment is approved for this event. Upload your first-round event video here.'
                          : 'You qualified to the next round. Upload your next-round content for this event here.'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="block rounded-xl border border-dashed border-fest-gold/30 bg-black/30 px-4 py-4 text-sm text-white/70 cursor-pointer hover:border-fest-gold transition-colors">
                        <span className="flex items-center gap-2 font-semibold text-fest-gold">
                          <FileVideo2 size={16} /> Choose video file
                        </span>
                        <span className="mt-2 block text-xs text-white/45">
                          Supported by your browser upload. The file will be sent to the event Google Drive folder.
                        </span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) =>
                            setSelectedFiles((current) => ({
                              ...current,
                              [registration.id]: e.target.files?.[0] || null,
                            }))
                          }
                        />
                      </label>

                      {selectedFiles[registration.id] && (
                        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70">
                          Selected file: {selectedFiles[registration.id]?.name}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleFileUpload(registration.id)}
                      disabled={submittingId === registration.id}
                      className="w-full py-3 bg-fest-gold text-fest-dark rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-fest-gold-light transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {submittingId === registration.id ? <Loader2 className="animate-spin" size={16} /> : <><Upload size={16} /> Upload Video</>}
                    </button>
                  </div>
                ) : registration.payment_status === 'approved' && registration.qualification_stage === 'eliminated' ? (
                  <div className="text-center text-[10px] uppercase tracking-widest text-red-300/80 p-4 border border-red-500/20 rounded-2xl bg-red-500/5">
                    You are eliminated for this event. Upload is locked.
                  </div>
                ) : registration.payment_status === 'approved' ? (
                  <div className="text-center text-[10px] uppercase tracking-widest text-fest-gold/70 p-4 border border-fest-gold/20 rounded-2xl bg-fest-gold/5">
                    Payment approved. Upload option for this event will appear here once you qualify for the next round.
                  </div>
                ) : registration.payment_status === 'rejected' ? (
                  <div className="text-center text-[10px] uppercase tracking-widest text-red-300/80 p-4 border border-red-500/20 rounded-2xl bg-red-500/5">
                    Payment rejected. Please contact the team or register again if needed.
                  </div>
                ) : (
                  <div className="text-center text-[10px] uppercase tracking-widest text-white/40 p-4 border border-white/5 rounded-2xl">
                    Registration submitted. Wait for up to 24 hours for payment approval.
                  </div>
                )}

                {registration.drive_view_url && (
                  <div className="bg-black/20 rounded-2xl p-4 border border-white/10">
                    <div className="font-bold text-sm text-fest-gold mb-2">Submitted Link</div>
                    <a
                      href={registration.drive_view_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-white/60 hover:text-white underline flex items-center gap-2"
                    >
                      <Link2 size={14} /> Open Uploaded Video
                    </a>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
