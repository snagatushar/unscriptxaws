import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const DEFAULT_SLIDES = [
  'https://picsum.photos/seed/fest1/1920/1080',
  'https://picsum.photos/seed/fest2/1920/1080',
  'https://picsum.photos/seed/fest3/1920/1080',
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<string[]>(DEFAULT_SLIDES);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase.storage.from('assets').list('hero');
        if (error) throw error;

        if (data && data.length > 0) {
          const urls = data
            .filter(file => file.name !== '.emptyFolderPlaceholder')
            .map(file => supabase.storage.from('assets').getPublicUrl(`hero/${file.name}`).data.publicUrl);

          if (urls.length > 0) {
            setSlides(urls);
          }
        }
      } catch (error) {
        console.error('Error fetching hero images:', error);
      }
    };

    fetchImages();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 2000); // Updated to 2 seconds as per requirement
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Slideshow */}
      <div className="absolute inset-0 z-0 bg-fest-dark">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentSlide}
            src={slides[currentSlide]}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.4, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-fest-dark/80 via-fest-dark/40 to-fest-dark" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <h2 className="text-fest-gold-light font-display font-medium tracking-[0.3em] uppercase mb-4 text-sm md:text-base">
            The Online Edition 2026
          </h2>
          <h1 className="text-6xl md:text-9xl font-display font-extrabold tracking-tighter mb-6 leading-none">
            UN<span className="text-fest-gold text-glow-gold">SCRIPTED</span>
          </h1>
          <p className="text-lg md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 font-light italic">
            "Break the script, own your moment"
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Link
              to="/events"
              className="px-10 py-4 bg-fest-gold text-fest-dark font-bold uppercase tracking-widest rounded-full hover:scale-105 transition-transform glow-gold"
            >
              Explore Events
            </Link>

          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40"
      >
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" />
      </motion.div>
    </section>
  );
}
