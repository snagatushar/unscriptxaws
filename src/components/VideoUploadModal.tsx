import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, Loader2, PlayCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { QualificationStage } from '../types';
import toast from 'react-hot-toast';
import { uploadVideoToDrive } from '../lib/drive';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  registrationId: string;
  round: QualificationStage;
  roundName: string;
  eventTitle: string; // New: To find the correct bucket
  subCategory?: string; // Subcategory for Drive subfolder routing
  onSuccess: () => void;
}

export default function VideoUploadModal({ isOpen, onClose, registrationId, round, roundName, eventTitle, subCategory, onSuccess }: VideoUploadModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async () => {
    if (!file || !user) return;

    const MAX_VIDEO_SIZE = 800 * 1024 * 1024; // 800MB
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only MP4, WebM, and MOV are allowed.');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error('File too large. Maximum video size is 800MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      // Get participant name from registrations
      // Actually, we can just let the drive upload handle the name or fetch it via our user API
      const registrations = await api.get<any[]>('/api/user?resource=registrations');
      const reg = registrations.find(r => r.id === registrationId);
      const finalUserName = reg?.participant_name || user.full_name || user.email || 'Student';

      const driveUpload = await uploadVideoToDrive({
        file,
        eventTitle,
        userId: user.id,
        registrationId,
        round,
        userName: finalUserName,
        subCategory: subCategory || undefined,
        onProgress: setUploadProgress,
      });

      await api.post('/api/user', {
        resource: 'submission',
        registrationId,
        round,
        videoUrl: driveUpload.fileId,
        notes: notes || null
      });

      toast.success('Video uploaded successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
              <p className="text-white/50">Submit your entry for <span className="text-fest-primary font-bold">{roundName}</span></p>
            </header>

            <div className="space-y-8">
              <div
                className="relative rounded-3xl border-2 border-dashed border-white/20 p-10 flex flex-col items-center justify-center hover:bg-white/5 hover:border-fest-primary/50 transition-all cursor-pointer group"
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
                  <PlayCircle className="text-fest-primary mb-4 group-hover:scale-110 transition-transform" size={48} />
                ) : (
                  <UploadCloud className="text-fest-primary mb-4 group-hover:scale-110 transition-transform" size={48} />
                )}
                <p className="font-bold text-xl mb-1">{file ? 'File Selected' : 'Choose Video File'}</p>
                <p className="text-sm text-white/40">{file ? file.name : 'MP4, MOV or WebM up to 800MB'}</p>
              </div>

              <div className="relative">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes for the reviewer? (Optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-fest-primary transition-colors resize-none h-32"
                />
              </div>

              <button
                disabled={!file || uploading}
                onClick={handleUpload}
                className="w-full py-5 bg-fest-primary text-fest-dark font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-fest-primary-light transition-all glow-primary flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>SUBMIT VIDEO ENTRY</>
                )}
              </button>

              {uploading && (
                <div className="space-y-2">
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fest-primary transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/60 text-center uppercase tracking-widest">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
