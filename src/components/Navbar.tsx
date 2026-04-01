import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Menu, X, LogOut, User } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Events', path: '/events' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDashboardLink = () => {
    if (!profile) return '/dashboard';
    switch (profile.role) {
      case 'admin': return '/admin';
      case 'coordinator': return '/payments';
      case 'reviewer': return '/content';
      default: return '/dashboard';
    }
  };

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
      scrolled ? "glass py-3" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-2xl font-display font-bold tracking-tighter text-white">
          UN<span className="text-fest-gold">SCRIPTED</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="relative group text-sm font-medium uppercase tracking-widest text-white/80 hover:text-white transition-colors"
            >
              {link.name}
              <motion.span
                className="absolute -bottom-1 left-0 w-0 h-0.5 bg-fest-gold transition-all group-hover:w-full"
                initial={false}
                animate={{ w: location.pathname === link.path ? '100%' : '0%' }}
              />
            </Link>
          ))}
          
          {user ? (
            <div className="flex items-center gap-4">
              <Link
                to={getDashboardLink()}
                className="flex items-center gap-2 px-6 py-2 bg-fest-gold hover:bg-fest-gold-light text-fest-dark text-sm font-bold uppercase tracking-widest rounded-full transition-all glow-gold"
              >
                <User size={16} /> Dashboard
              </Link>
              <button
                onClick={signOut}
                className="p-2 text-white/50 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-6 py-2 bg-fest-gold hover:bg-fest-gold-light text-fest-dark text-sm font-bold uppercase tracking-widest rounded-full transition-all glow-gold"
            >
              Login/Signup
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 glass border-t-0 p-6 flex flex-col gap-6 md:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className="text-lg font-display font-medium text-white/90"
            >
              {link.name}
            </Link>
          ))}
          
          {user ? (
            <div className="flex flex-col gap-4">
              <Link
                to={getDashboardLink()}
                onClick={() => setIsOpen(false)}
                className="w-full py-3 flex justify-center items-center gap-2 bg-fest-gold text-center text-fest-dark font-bold uppercase tracking-widest rounded-xl"
              >
                <User size={18} /> Dashboard
              </Link>
              <button
                onClick={() => { signOut(); setIsOpen(false); }}
                className="w-full py-3 flex justify-center items-center gap-2 glass text-white font-bold uppercase tracking-widest rounded-xl text-sm"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="w-full py-3 bg-fest-gold text-center text-fest-dark font-bold uppercase tracking-widest rounded-xl"
            >
              Login/Signup
            </Link>
          )}
        </motion.div>
      )}
    </nav>
  );
}
