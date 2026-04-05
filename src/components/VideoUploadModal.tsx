import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, Loader2, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { QualificationStage } from '../types';
import toast from 'react-hot-toast';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  registrationId: string;
  round: QualificationStage;
  roundName: string;
  eventTitle: string; // New: To find the correct bucket
  onSuccess: () => void;
}

function getBucketName(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-');
}

export default function VideoUploadModal({ isOpen, onClose, registrationId, round, roundName, eventTitle, onSuccess }: VideoUploadModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);

    const bucketName = getBucketName(eventTitle);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${registrationId}_${round}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(uploadData.path);

      const { error: dbError } = await supabase.from('submissions').insert({
        registration_id: registrationId,
        round: round,
        video_url: publicUrl,
        video_path: uploadData.path,
        notes: notes || null,
        status: 'submitted'
      });

      if (dbError) throw dbError;

      toast.success('Video uploaded successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="max-w-xl w-full glass p-8 md:p-12 rounded-[3.5rem] relative border border-white/10"
          >
            <button onClick={onClose} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
              <X size={24} />
            </button>

            <header className="mb-10">
              <h3 className="text-3xl font-display font-bold mb-2">Upload Video</h3>
              <p className="text-white/50">Submit your entry for <span className="text-fest-gold font-bold">{roundName}</span></p>
            </header>

            <div className="space-y-8">
              <div
                className="relative rounded-3xl border-2 border-dashed border-white/20 p-10 flex flex-col items-center justify-center hover:bg-white/5 hover:border-fest-gold/50 transition-all cursor-pointer group"
                onClick={() => document.getElementById('video-upload')?.click()}
              >
                <input
                  type="file"
                  id="video-upload"
                  className="hidden"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <PlayCircle className="text-fest-gold mb-4 group-hover:scale-110 transition-transform" size={48} />
                ) : (
                  <UploadCloud className="text-fest-gold mb-4 group-hover:scale-110 transition-transform" size={48} />
                )}
                <p className="font-bold text-xl mb-1">{file ? 'File Selected' : 'Choose Video File'}</p>
                <p className="text-sm text-white/40">{file ? file.name : 'MP4, MOV or WebM up to 100MB'}</p>
              </div>

              <div className="relative">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes for the reviewer? (Optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-fest-gold transition-colors resize-none h-32"
                />
              </div>

              <button
                disabled={!file || uploading}
                onClick={handleUpload}
                className="w-full py-5 bg-fest-gold text-fest-dark font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-fest-gold-light transition-all glow-gold flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>SUBMIT VIDEO ENTRY</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
