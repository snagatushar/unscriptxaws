import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, UploadCloud, CheckCircle, Clock, XCircle, Trophy, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';

type Registration = {
  id: string;
  event_id: string;
  payment_status: 'pending' | 'approved' | 'rejected';
  registration_status: 'registered' | 'eliminated' | 'selected';
  submission_url: string | null;
  events: {
    id: string;
    title: string;
    category: string;
  };
};

export default function UserDashboard() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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
            registration_status,
            submission_url,
            events ( id, title, category )
          `)
          .eq('user_id', user.id);
        
        if (error) throw error;
        setRegistrations((data as unknown as Registration[]) || []);
      } catch (err) {
        toast.error('Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    }
    fetchRegistrations();
  }, [user]);

  const handleFileUpload = async (regId: string, eventId: string, file: File) => {
    if (!user) return;
    setUploadingId(regId);
    try {
      // Find the bucket, per requirement it is named after the event id or title.
      // We will assume the bucket is named after eventId to ensure uniqueness.
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(eventId)
        .upload(fileName, file);

      if (uploadError) {
         if (uploadError.message.includes('Bucket not found')) {
             throw new Error('Event storage bucket not configured yet. Contact admin.');
         }
         throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from(eventId)
        .getPublicUrl(uploadData.path);

      const { error: updateError } = await supabase
        .from('registrations')
        .update({ submission_url: publicUrlData.publicUrl })
        .eq('id', regId);

      if (updateError) throw updateError;
      
      setRegistrations(prev => 
        prev.map(r => r.id === regId ? { ...r, submission_url: publicUrlData.publicUrl } : r)
      );

      toast.success('Video uploaded successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingId(null);
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
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-6xl font-display font-extrabold uppercase mb-4 tracking-tighter">
             My <span className="text-fest-gold">Dashboard</span>
          </h1>
          <p className="text-white/60 mb-8 md:mb-12 text-sm md:text-lg">
             Manage your event registrations and submissions.
          </p>
        </motion.div>

        {registrations.length === 0 ? (
           <div className="glass p-12 text-center rounded-[3rem]">
              <h3 className="text-2xl font-bold mb-4 opacity-50">No Registrations Yet</h3>
              <p className="opacity-40 mb-6">You haven't registered for any events.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {registrations.map((reg, i) => (
              <motion.div
                 key={reg.id}
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: i * 0.1 }}
                 className="glass rounded-3xl p-8 relative overflow-hidden flex flex-col"
              >
                  <div className="absolute top-0 right-0 p-4">
                     <span className="text-[10px] uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full opacity-60">
                        {reg.events.category}
                     </span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-display font-bold mb-6 pr-16 text-white group-hover:text-fest-gold transition-colors leading-tight">
                     {reg.events.title}
                  </h3>

                  <div className="flex flex-col gap-3 mb-6 flex-1">
                     {/* Payment Status */}
                     <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl">
                        {reg.payment_status === 'approved' ? (
                           <CheckCircle className="text-green-400" size={20} />
                        ) : reg.payment_status === 'rejected' ? (
                           <XCircle className="text-red-400" size={20} />
                        ) : (
                           <Clock className="text-fest-gold-light" size={20} />
                        )}
                        <div>
                           <div className="text-[10px] uppercase text-white/40 tracking-widest">Payment Status</div>
                           <div className="text-sm font-bold capitalize">{reg.payment_status}</div>
                        </div>
                     </div>

                     {/* Registration/Elimination Status */}
                     <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl">
                        {reg.registration_status === 'selected' ? (
                           <Trophy className="text-fest-gold" size={20} />
                        ) : reg.registration_status === 'eliminated' ? (
                           <XCircle className="text-red-400" size={20} />
                        ) : (
                           <CheckCircle className="text-white/60" size={20} />
                        )}
                        <div>
                           <div className="text-[10px] uppercase text-white/40 tracking-widest">Event Status</div>
                           <div className="text-sm font-bold capitalize">{reg.registration_status}</div>
                        </div>
                     </div>
                  </div>

                  {/* Submission Upload Section */}
                  {reg.payment_status === 'approved' && !reg.submission_url && reg.registration_status !== 'eliminated' && (
                     <div className="border border-dashed border-fest-gold/30 rounded-2xl p-4 text-center hover:bg-fest-gold/5 transition-colors cursor-pointer"
                          onClick={() => document.getElementById(`upload-${reg.id}`)?.click()}>
                        <input
                           type="file"
                           id={`upload-${reg.id}`}
                           className="hidden"
                           accept="video/mp4,video/x-m4v,video/*"
                           onChange={(e) => {
                              if (e.target.files?.[0]) handleFileUpload(reg.id, reg.event_id, e.target.files[0]);
                           }}
                        />
                        {uploadingId === reg.id ? (
                           <Loader2 className="animate-spin text-fest-gold mx-auto mb-2" size={24} />
                        ) : (
                           <UploadCloud className="text-fest-gold mx-auto mb-2" size={24} />
                        )}
                        <h4 className="font-bold text-sm text-fest-gold">Upload Submission</h4>
                        <p className="text-[10px] text-white/40 mt-1">MP4, max 50MB</p>
                     </div>
                  )}

                  {reg.submission_url && (
                     <div className="bg-fest-gold/10 rounded-2xl p-4 flex items-center gap-3 border border-fest-gold/20">
                        <PlayCircle className="text-fest-gold" size={24} />
                        <div>
                           <div className="font-bold text-sm text-fest-gold">Submission Uploaded!</div>
                           <a href={reg.submission_url} target="_blank" rel="noreferrer" className="text-[10px] text-white/50 hover:text-white underline">
                              View Video
                           </a>
                        </div>
                     </div>
                  )}

                  {reg.payment_status === 'pending' && (
                     <div className="text-center text-xs text-white/40 p-2 border border-white/5 rounded-2xl">
                        Video upload will unlock when payment is approved.
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
