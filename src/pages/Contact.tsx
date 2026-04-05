import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useState, FormEvent } from 'react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value;

    // Open the user's email client with the message pre-filled
    const subject = encodeURIComponent(`UNSCRIPTX Contact: Message from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.open(`mailto:hello@UNSCRIPTXfest.com?subject=${subject}&body=${body}`, '_self');
    setSubmitted(true);
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
            GET IN <span className="text-fest-cyan">TOUCH</span>
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
                <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-fest-pink flex-shrink-0">
                  <Mail size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-display font-bold uppercase tracking-widest mb-2">Email Us</h4>
                  <p className="text-white/60">hello@UNSCRIPTXfest.com</p>
                  <p className="text-white/60">support@UNSCRIPTXfest.com</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-fest-cyan flex-shrink-0">
                  <Phone size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-display font-bold uppercase tracking-widest mb-2">Call Us</h4>
                  <p className="text-white/60">+91 9999999999</p>
                  <p className="text-white/60">+91 8660911643</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-fest-purple flex-shrink-0">
                  <MapPin size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-display font-bold uppercase tracking-widest mb-2">Visit Us</h4>
                  <p className="text-white/60">IFIM SCHOOL OF TECHNOLOGY</p>
                  <p className="text-white/60">Electronic City Phase 1, Bangalore, Karnataka - 560100</p>
                </div>
              </div>
            </div>

            <div className="glass p-10 rounded-[3rem] bg-fest-purple/5 border-fest-purple/20">
              <h4 className="text-fest-purple font-display font-bold uppercase tracking-widest mb-4">Office Hours</h4>
              <p className="text-white/60">Monday - Friday: 10:00 AM - 5:00 PM</p>
              <p className="text-white/60">Saturday: 10:00 AM - 2:00 PM</p>
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
                <div className="w-20 h-20 bg-fest-cyan/20 rounded-full flex items-center justify-center mb-8">
                  <Send size={40} className="text-fest-cyan" />
                </div>
                <h3 className="text-3xl font-display font-bold mb-4">Message Sent!</h3>
                <p className="text-white/50 mb-8">Thank you for reaching out. We'll get back to you as soon as possible.</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-10 py-4 bg-fest-purple rounded-2xl font-bold uppercase tracking-widest"
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
                      className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-cyan transition-colors peer placeholder-transparent"
                      placeholder="Name"
                      id="name"
                    />
                    <label htmlFor="name" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-cyan peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">Name</label>
                  </div>
                  <div className="relative group">
                    <input
                      type="email"
                      required
                      className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-cyan transition-colors peer placeholder-transparent"
                      placeholder="Email"
                      id="email"
                    />
                    <label htmlFor="email" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-cyan peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">Email</label>
                  </div>
                  <div className="relative group">
                    <textarea
                      required
                      className="w-full bg-transparent border-b-2 border-white/10 py-3 focus:outline-none focus:border-fest-cyan transition-colors peer placeholder-transparent min-h-[150px]"
                      placeholder="Message"
                      id="message"
                    />
                    <label htmlFor="message" className="absolute left-0 top-3 text-white/30 text-sm transition-all peer-focus:-top-4 peer-focus:text-fest-cyan peer-focus:text-xs peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-xs">Message</label>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-fest-pink text-white font-black uppercase tracking-[0.3em] text-lg rounded-2xl hover:bg-fest-cyan hover:text-fest-dark transition-all glow-pink flex items-center justify-center gap-3"
                >
                  Send Message <Send size={20} />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
