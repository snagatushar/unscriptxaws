import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Youtube, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-fest-dark border-t border-white/10 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-1 md:col-span-2">
          <Link to="/" className="text-3xl font-display font-bold tracking-tighter mb-6 block">
            UN<span className="text-fest-gold">SCRIPTED</span> 2026
          </Link>
          <p className="text-white/50 max-w-md mb-8 leading-relaxed">
            The most anticipated college cultural fest is back. Join us for three days of creativity, talent, and pure energy. Break the script and own your moment.
          </p>
          <div className="flex gap-4">
            {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-10 h-10 glass rounded-full flex items-center justify-center hover:bg-fest-gold hover:text-fest-dark transition-all"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display font-bold uppercase tracking-widest mb-6 text-fest-gold-light">Quick Links</h4>
          <ul className="flex flex-col gap-4">
            {['Home', 'About', 'Contact', 'Login'].map((link) => (
              <li key={link}>
                <Link
                  to={link === 'Home' ? '/' : `/${link.toLowerCase()}`}
                  className="text-white/60 hover:text-white transition-colors text-sm"
                >
                  {link}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display font-bold uppercase tracking-widest mb-6 text-fest-gold">Contact Us</h4>
          <ul className="flex flex-col gap-4">
            <li className="flex items-center gap-3 text-white/60 text-sm">
              <Mail size={16} className="text-fest-gold" />
              info@unscripted2026.com
            </li>
            <li className="flex items-center gap-3 text-white/60 text-sm">
              <Phone size={16} className="text-fest-gold-light" />
              +91 98765 43210
            </li>
            <li className="text-white/40 text-xs mt-4">
              College of Arts & Science,<br />
              University Road, City - 123456
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/30 text-[10px] uppercase tracking-[0.2em]">
        <p>© 2026 UNSCRIPTED Cultural Fest. All rights reserved.</p>
        <p>Designed with ❤️ for the creative souls.</p>
      </div>
    </footer>
  );
}
