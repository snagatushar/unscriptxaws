import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useSiteContent } from '../hooks/useSupabase';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { content: info } = useSiteContent('contact_info');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value;

    try {
      const { error } = await supabase.from('contact_messages').insert({
        name,
        email,
        message,
        status: 'unread'
      });
      
      if (error) throw error;
      setSubmitted(true);
      form.reset();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-display font-extrabold tracking-tighter mb-6"
          >
            GET IN <span className="text-fest-accent text-glow-accent">TOUCH</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/50 text-lg max-w-2xl mx-auto"
          >
            Have questions? We'd love to hear from you. Reach out to the UNSCRIPTX team.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="glass p-10 rounded-[3rem] space-y-12">
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-fest-primary flex-shrink-0">
                  <Mail size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-display font-bold uppercase tracking-widest mb-2">Email Us</h4>
                  <p className="text-white/60">{info?.metadata?.email_1 || 'hello@UNSCRIPTXfest.com'}</p>
                  <p className="text-white/60">{info?.metadata?.email_2 || 'support@UNSCRIPTXfest.com'}</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-fest-accent flex-shrink-0">
                  <Phone size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-display font-bold uppercase tracking-widest mb-2">Call Us</h4>
                  <p className="text-white/60">{info?.metadata?.phone_1 || '+91 9999999999'}</p>
                  <p className="text-white/60">{info?.metadata?.phone_2 || '+91 8660911643'}</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-fest-primary flex-shrink-0">
                  <MapPin size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-display font-bold uppercase tracking-widest mb-2">Visit Us</h4>
                  <p className="text-white/60">{info?.metadata?.address_title || 'IFIM SCHOOL OF TECHNOLOGY'}</p>
                  <p className="text-white/60">{info?.metadata?.address_body || 'Electronic City Phase 1, Bangalore, Karnataka - 560100'}</p>
                </div>
              </div>
            </div>

            <div className="glass p-10 rounded-[3rem] bg-fest-primary/5 border-fest-primary/20">
              <h4 className="text-fest-primary font-display font-bold uppercase tracking-widest mb-4">Office Hours</h4>
              <p className="text-white/60">{info?.metadata?.hours_weekday || 'Monday - Friday: 10:00 AM - 5:00 PM'}</p>
              <p className="text-white/60">{info?.metadata?.hours_weekend || 'Saturday: 10:00 AM - 2:00 PM'}</p>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-10 md:p-12 rounded-[3rem]"
          >
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-20 h-20 bg-fest-accent/20 rounded-full flex items-center justify-center mb-8">
                  <Send size={40} className="text-fest-accent" />
                </div>
                <h3 className="text-3xl font-display font-bold mb-4">Message Sent!</h3>
                <p className="text-white/50 mb-8">Thank you for reaching out. We'll get back to you as soon as possible.</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-10 py-4 bg-fest-primary text-fest-dark rounded-2xl font-bold uppercase tracking-widest hover:bg-fest-primary-light transition-colors glow-primary"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-8">
                  <div className="relative group">
                    <input
                      type="text"
                      required
                      className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-accent transition-colors peer placeholder-transparent"
                      placeholder="Name"
                      id="name"
                    />
                    <label htmlFor="name" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-accent peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">Name</label>
                  </div>
                  <div className="relative group">
                    <input
                      type="email"
                      required
                      className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-accent transition-colors peer placeholder-transparent"
                      placeholder="Email"
                      id="email"
                    />
                    <label htmlFor="email" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-accent peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">Email</label>
                  </div>
                  <div className="relative group">
                    <textarea
                      required
                      className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-accent transition-colors peer placeholder-transparent min-h-[150px]"
                      placeholder="Message"
                      id="message"
                    />
                    <label htmlFor="message" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-accent peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">Message</label>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-fest-primary text-fest-dark font-black uppercase tracking-[0.3em] text-lg rounded-2xl hover:bg-fest-primary-light hover:text-fest-dark transition-all glow-primary flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-wait"
                >
                  {loading ? 'SENDING...' : 'Send Message'} <Send size={20} />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
