import { motion } from 'motion/react';
import { useState, FormEvent, useEffect } from 'react';
import { CheckCircle2, Send, UploadCloud, Loader2 } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseEvent } from '../types';
import toast from 'react-hot-toast';

export default function Register() {
  const { eventId } = useParams();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<DatabaseEvent | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [phone, setPhone] = useState('');
  const [teamName, setTeamName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function init() {
      if (!eventId) return;
      try {
        const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (error) throw error;
        setEvent(data as DatabaseEvent);
      } catch (err) {
        toast.error('Could not load event details.');
      } finally {
        setLoadingConfig(false);
      }
    }
    init();
  }, [eventId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('You must be logged in to register');
    if (!event) return toast.error('Event not found');
    if (!file) return toast.error('Please upload your payment screenshot');
    
    setSubmitting(true);
    try {
      // 1. Upload File 
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${event.id}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('payments')
        .getPublicUrl(uploadData.path);

      // 2. Insert Registration
      const { error: insertError } = await supabase.from('registrations').insert({
        user_id: user.id,
        event_id: event.id,
        phone,
        team_name: teamName || null,
        payment_screenshot_url: publicUrlData.publicUrl,
      });

      if (insertError) {
         if (insertError.code === '23505') {
            throw new Error('You have already registered for this event!');
         }
         throw insertError;
      }

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingConfig) {
    return (
       <div className="min-h-screen flex items-center justify-center">
         <Loader2 className="animate-spin text-fest-gold" size={48} />
       </div>
    );
  }

  if (submitted) {
    return (
      <main className="pt-32 pb-24 px-6 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass p-12 rounded-[3rem] text-center"
        >
          <div className="w-20 h-20 bg-fest-gold/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={40} className="text-fest-gold" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">Registration Sent!</h2>
          <p className="text-white/50 mb-10">Your payment is pending review. You can check your status on your dashboard.</p>
          <Link
            to="/"
            className="w-full inline-block py-4 bg-fest-gold text-fest-dark rounded-2xl font-bold uppercase tracking-widest hover:bg-fest-gold-light transition-all"
          >
            Back home
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-5xl md:text-8xl font-display font-extrabold tracking-tighter mb-8 leading-none">
            SECURE YOUR <span className="text-fest-gold">SPOT</span>
          </h1>
          <p className="text-white/60 text-xl mb-12 leading-relaxed max-w-lg">
            Registration for <strong className="text-fest-gold">{event?.title}</strong> is almost complete.
            The current entry fee is ₹{event?.base_prize}.
          </p>
          
          <div className="space-y-6 glass p-8 rounded-3xl border-l-4 border-fest-pink">
             <h3 className="font-display font-bold text-xl mb-4">Payment Instructions</h3>
             <ul className="space-y-4 text-white/80">
                <li>1. Scan the QR code or transfer to Account: <strong className="text-fest-gold tracking-widest">UNSCRIPTED-2026</strong></li>
                <li>2. Exact Amount to pay: <strong className="text-xl text-fest-gold">₹{event?.base_prize}</strong></li>
                <li>3. Take a screenshot of successful transaction</li>
                <li>4. Upload the screenshot in the form</li>
             </ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass p-8 md:p-12 rounded-[3rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-fest-gold/10 blur-[80px] -z-10" />
          
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="relative group">
              <input
                type="text"
                disabled
                value={user?.user_metadata?.full_name || user?.email || 'Logged In User'}
                className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent opacity-50 cursor-not-allowed"
                placeholder="Full Name/Email"
              />
              <label className="absolute left-0 -top-4 text-fest-gold text-xs">
                Account
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative group">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent"
                  placeholder="Phone Number"
                  id="phone"
                />
                <label
                  htmlFor="phone"
                  className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs"
                >
                  Phone Number
                </label>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent"
                  placeholder="Team Name (Optional)"
                  id="team"
                />
                <label
                  htmlFor="team"
                  className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs"
                >
                  Team Name (Optional)
                </label>
              </div>
            </div>

            <div className="relative group">
              <input
                type="text"
                disabled
                value={event?.title || ''}
                className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none transition-colors peer opacity-50 font-bold text-fest-gold cursor-not-allowed"
                placeholder="Event"
              />
              <label className="absolute left-0 -top-4 text-fest-gold text-xs">
                Selected Event
              </label>
            </div>

            <div className="relative rounded-2xl border-2 border-dashed border-white/20 p-6 flex flex-col items-center justify-center hover:bg-white/5 hover:border-fest-gold/50 transition-colors cursor-pointer"
                 onClick={() => document.getElementById('payment-upload')?.click()}>
              <input 
                type="file" 
                id="payment-upload" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <UploadCloud className="text-fest-gold mb-3" size={32} />
              <p className="font-bold mb-1">Upload Payment Screenshot</p>
              <p className="text-xs text-white/50">{file ? file.name : 'PNG, JPG up to 5MB'}</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-5 bg-fest-gold text-fest-dark font-black uppercase tracking-[0.3em] text-lg rounded-2xl hover:bg-fest-gold-light transition-all glow-gold flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? 'PROCESSING...' : 'SUBMIT REGISTRATION'} {!submitting && <Send size={20} />}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
