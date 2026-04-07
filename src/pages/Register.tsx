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
  const { user, profile } = useAuth();

  const [event, setEvent] = useState<DatabaseEvent | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [collegeName, setCollegeName] = useState(profile?.college_name || '');
  const [department, setDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamSize, setTeamSize] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  useEffect(() => {
    async function init() {
      if (!eventId) return;

      try {
        const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (error) throw error;
        setEvent(data as DatabaseEvent);
        setTeamSize(Math.max(1, data.max_team_size || 1));
      } catch {
        toast.error('Could not load event details.');
      } finally {
        setLoadingConfig(false);
      }
    }

    init();
  }, [eventId]);

  useEffect(() => {
    setPhone(profile?.phone || '');
    setCollegeName(profile?.college_name || '');
  }, [profile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('You must be logged in to register');
    if (!event) return toast.error('Event not found');
    if (!paymentFile) return toast.error('Please upload your payment screenshot');
    if (!idCardFile) return toast.error('Please upload your Student ID Card');
    
    // Size limit: 50KB
    const MAX_FILE_SIZE = 50 * 1024;
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (paymentFile.size > MAX_FILE_SIZE) {
      return toast.error('Payment screenshot must be under 50KB. Please compress the image.');
    }
    if (!allowedImageTypes.includes(paymentFile.type)) {
      return toast.error('Only JPG, PNG, or WebP images are allowed for payment proof.');
    }

    if (idCardFile.size > MAX_FILE_SIZE) {
      return toast.error('ID Card must be under 50KB. Please compress the image.');
    }
    if (!allowedImageTypes.includes(idCardFile.type)) {
      return toast.error('Only JPG, PNG, or WebP images are allowed for ID Card.');
    }

    // BUG-05 FIX: Phone number validation
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      return toast.error('Please enter a valid phone number (10-13 digits).');
    }

    setSubmitting(true);
    try {
      // 1. Upload Payment Screenshot
      const payExt = paymentFile.name.split('.').pop();
      const payFileName = `pay_${user.id}_${event.id}_${Date.now()}.${payExt}`;
      const { data: payData, error: payError } = await supabase.storage.from('payments').upload(payFileName, paymentFile);
      if (payError) throw payError;

      // 2. Upload ID Card
      const idExt = idCardFile.name.split('.').pop();
      const idFileName = `id_${user.id}_${event.id}_${Date.now()}.${idExt}`;
      const { data: idData, error: idError } = await supabase.storage.from('payments').upload(idFileName, idCardFile);
      if (idError) throw idError;

      const payload = {
        user_id: user.id,
        event_id: event.id,
        participant_name: fullName,
        email: user.email,
        phone: phoneDigits,
        college_name: collegeName || null,
        department: department || null,
        year_of_study: yearOfStudy || null,
        team_name: teamName || null,
        team_size: teamSize,
        payment_screenshot_url: payData.path,
        id_card_url: idData.path,
      };

      const { error: insertError } = await supabase.from('registrations').insert(payload);
      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('You have already registered for this event.');
        }
        throw new Error('Registration failed. Please try again or contact support.');
      }

      if (profile && (phone !== profile.phone || collegeName !== profile.college_name || fullName !== profile.full_name)) {
        await supabase.from('users').update({ 
          phone: phoneDigits, 
          college_name: collegeName || null,
          full_name: fullName || profile.full_name
        }).eq('id', user.id);
      }

      toast.success('Registration successful. Wait up to 24 hours for payment approval.');
      setSubmitted(true);
    } catch (err: any) {
      // BUG-09 FIX: Don't leak raw Supabase error details
      const msg = err.message || 'Failed to submit registration';
      toast.error(msg);
      if (err.code) console.error('Registration error:', err);
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
          <h2 className="text-3xl font-display font-bold mb-4">Registration Successful</h2>
          <p className="text-white/50 mb-10">
            Wait for 24 hours for the payment approval. Once the payment is approved, you will get the option to upload the video for your respective event.
          </p>
          <Link
            to="/dashboard"
            className="w-full inline-block py-4 bg-fest-gold text-fest-dark rounded-2xl font-bold uppercase tracking-widest hover:bg-fest-gold-light transition-all"
          >
            Open Registered Events
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="sticky top-32">
          <h1 className="text-5xl md:text-8xl font-display font-extrabold tracking-tighter mb-8 leading-none">
            SECURE YOUR <span className="text-fest-gold">SPOT</span>
          </h1>
          <p className="text-white/60 text-xl mb-12 leading-relaxed max-w-lg">
            Registration for <strong className="text-fest-gold">{event?.title}</strong> is almost complete. Entry fee is
            {' '}₹{event?.entry_fee}.
          </p>

          <div className="space-y-6 glass p-8 rounded-3xl border-l-4 border-fest-pink">
            <h3 className="font-display font-bold text-xl mb-4">Payment Instructions</h3>
            <ul className="space-y-4 text-white/80">
              {event?.payment_account_name && <li>Account Name: <strong className="text-fest-gold">{event.payment_account_name}</strong></li>}
              {event?.payment_account_number && <li>Account Number: <strong className="text-fest-gold">{event.payment_account_number}</strong></li>}
              {event?.payment_ifsc && <li>IFSC: <strong className="text-fest-gold">{event.payment_ifsc}</strong></li>}
              {event?.payment_upi_id && <li>UPI ID: <strong className="text-fest-gold">{event.payment_upi_id}</strong></li>}
              <li>Exact Amount: <strong className="text-xl text-fest-gold">₹{event?.entry_fee}</strong></li>
              <li>Upload a clear screenshot of the successful payment.</li>
              <li>Upload a clear photo/scan of your <strong>Student ID Card</strong>.</li>
              <li>Maximum file size for each: <strong className="text-fest-gold">50KB</strong>.</li>
            </ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass p-8 md:p-12 rounded-[3rem] relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-fest-gold/10 blur-[80px] -z-10" />

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="relative group">
              <input
                type="text"
                required
                autoComplete="off"
                name="user_custom_participant_name_random"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent"
                placeholder="Participant Full Name"
                id="participant-full-name-v6"
              />
              <label htmlFor="participant-full-name-v6" className="absolute left-0 top-3 text-white/30 text-sm transition-all pointer-events-none peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">
                Participant Full Name
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
                <label htmlFor="phone" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">
                  Phone Number
                </label>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  required
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent"
                  placeholder="College"
                  id="college"
                />
                <label htmlFor="college" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">
                  College Name
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative group">
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent"
                  placeholder="Department"
                  id="department"
                />
                <label htmlFor="department" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">
                  Department
                </label>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent"
                  placeholder="Year"
                  id="year"
                />
                <label htmlFor="year" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">
                  Year Of Study
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative group">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent"
                  placeholder="Team Name"
                  id="team"
                />
                <label htmlFor="team" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">
                  Team Name
                </label>
              </div>
              <div className="relative group">
                <input
                  type="number"
                  min={1}
                  max={event?.max_team_size || 1}
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-gold transition-colors peer placeholder-transparent"
                  placeholder="Team Size"
                  id="team-size"
                />
                <label htmlFor="team-size" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-gold peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">
                  Team Size
                </label>
              </div>
            </div>

            <div className="relative group">
              <input
                type="text"
                disabled
                value={event?.title || ''}
                className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none transition-colors opacity-50 font-bold text-fest-gold cursor-not-allowed"
              />
              <label className="absolute left-0 -top-4 text-fest-gold text-xs">Selected Event</label>
            </div>

            <div className="space-y-5 mt-4">
              <div
                className="relative rounded-3xl border-2 border-dashed border-fest-pink/40 bg-fest-pink/5 p-6 flex flex-col md:flex-row items-center md:items-start gap-4 hover:bg-fest-pink/10 hover:border-fest-pink transition-all cursor-pointer group"
                onClick={() => document.getElementById('payment-upload')?.click()}
              >
                <input
                  type="file"
                  id="payment-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                />
                <div className={`p-4 rounded-full flex-shrink-0 transition-transform group-hover:scale-110 ${paymentFile ? 'bg-green-500/20 text-green-500' : 'bg-fest-pink/20 text-fest-pink'}`}>
                  <UploadCloud size={28} />
                </div>
                <div className="text-center md:text-left flex-1">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-white mb-1">1. Payment Proof</h4>
                  <p className="text-xs text-white/50">{paymentFile ? paymentFile.name : 'Upload Screenshot / Max 50KB (.jpg, .png)'}</p>
                </div>
                {paymentFile && <CheckCircle2 className="text-green-500 hidden md:block" size={24} />}
              </div>

              <div
                className="relative rounded-3xl border-2 border-dashed border-fest-gold/40 bg-fest-gold/5 p-6 flex flex-col md:flex-row items-center md:items-start gap-4 hover:bg-fest-gold/10 hover:border-fest-gold transition-all cursor-pointer group"
                onClick={() => document.getElementById('id-upload')?.click()}
              >
                <input
                  type="file"
                  id="id-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => setIdCardFile(e.target.files?.[0] || null)}
                />
                <div className={`p-4 rounded-full flex-shrink-0 transition-transform group-hover:scale-110 ${idCardFile ? 'bg-green-500/20 text-green-500' : 'bg-fest-gold/20 text-fest-gold'}`}>
                  <UploadCloud size={28} />
                </div>
                <div className="text-center md:text-left flex-1">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-white mb-1">2. Student ID Card</h4>
                  <p className="text-xs text-white/50">{idCardFile ? idCardFile.name : 'Upload ID Photo / Max 50KB (.jpg, .png)'}</p>
                </div>
                {idCardFile && <CheckCircle2 className="text-green-500 hidden md:block" size={24} />}
              </div>
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
