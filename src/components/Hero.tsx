import { useState, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<{ image_url: string; duration_seconds: number }[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('hero_slideshow')
          .select('image_url, duration_seconds')
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        if (data && data.length > 0) {
          const validSlides = data
            .filter((slide) => Boolean(slide.image_url))
            .map((slide) => ({
              image_url: slide.image_url,
              duration_seconds: Math.max(4, Number(slide.duration_seconds || 4)),
            }));

          if (validSlides.length > 0) {
            setSlides(validSlides);
            setCurrentSlide(0);
          }
        }
      } catch (error) {
        console.error('Error fetching hero images:', error);
      }
    };

    fetchImages();
  }, []);

  // Preload the next image in the slideshow
  useEffect(() => {
    if (slides.length > 1) {
      const nextSlide = (currentSlide + 1) % slides.length;
      const img = new Image();
      img.src = slides[nextSlide].image_url;
    }
  }, [currentSlide, slides]);

  const currentDuration = useMemo(
    () => Math.max(4, slides[currentSlide]?.duration_seconds || 4),
    [slides, currentSlide]
  );

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, currentDuration * 1000);

    return () => window.clearTimeout(timer);
  }, [currentSlide, slides.length, currentDuration]);

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-fest-dark">
      {/* Background Slideshow */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence>
          {slides.length > 0 ? (
            <motion.img
              key={currentSlide}
              src={slides[currentSlide]?.image_url}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
              loading="eager"
              decoding="async"
              fetchPriority={currentSlide === 0 ? "high" : "auto"}
            />
          ) : (
             <div className="absolute inset-0 bg-fest-dark-light/20" />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-fest-dark/60 via-fest-dark/20 to-fest-dark/70 pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <h1
            className="text-5xl sm:text-6xl md:text-9xl font-blowbrush tracking-wide mb-6 leading-none"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5), 0 0 30px rgba(0,0,0,0.3)' }}
          >
            UN<span className="text-fest-primary text-glow-primary">SCRIPTX</span>
          </h1>
          <p
            className="text-sm sm:text-base md:text-2xl text-white/90 max-w-2xl mx-auto mb-10 font-light italic px-4"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 20px rgba(0,0,0,0.2)' }}
          >
            "Break the script, own your moment"
          </p>

        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 pointer-events-none"
      >
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" />
      </motion.div>
    </section>
  );
};

export default memo(Hero);
