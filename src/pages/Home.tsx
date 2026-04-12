import { motion } from 'motion/react';
import Hero from '../components/Hero';
import EventCard from '../components/EventCard';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Music, Zap, Palette, Loader2 } from 'lucide-react';
import { useEvents, useCommittee, useGeneralRules, useSiteContent } from '../hooks/useSupabase';

export default function Home() {
  const { events, loading: eventsLoading } = useEvents();
  const { committee, loading: committeeLoading } = useCommittee();
  const { rules, loading: rulesLoading } = useGeneralRules();
  const { content: aboutEvent } = useSiteContent('home_about_event');
  const { content: aboutCollege } = useSiteContent('home_about_college');
  const { content: aboutSchool } = useSiteContent('home_about_school');
  const { content: whyJoin } = useSiteContent('home_why_join');

  const parseTitle = (raw: string | null | undefined) => {
    const text = raw ? raw.replace(/\[|\]/g, '') : "Why wait for the future when you can create it?";
    return <span className="text-fest-accent text-glow-accent">{text}</span>;
  };

  return (
    <main>
      <Hero />



      {/* About Section */}
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-fest-accent font-display font-bold uppercase tracking-widest mb-4">About The Event</h2>
            <h3 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter mb-8">
              {aboutEvent?.title || 'UNSCRIPTX 2026:'} <br /> <span className="text-white/80">{aboutEvent?.subtitle || 'Where Talent Meets Opportunity'}</span>
            </h3>
            <p className="text-white/60 text-lg leading-relaxed">
              {aboutEvent?.body || "UNSCRIPTX is the premier annual cultural festival uniting creatives, technologists, and innovators globally. It's a three-day celebration blending technology, art, dance, and music into a single spectacular dimension. Prepare to break the norms, go UNSCRIPTX, and witness history in the making."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* About the College Section */}
      <section className="py-20 px-6 bg-black/50 border-y border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1"
          >
            <div className="w-full aspect-video rounded-[2rem] overflow-hidden border-4 border-white/10 relative">
              <div className="absolute inset-0 bg-fest-primary/20 mix-blend-overlay"></div>
              <img src={aboutCollege?.image_url || 'https://picsum.photos/seed/college/800/400'} alt="College Campus" className="w-full h-full object-cover" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1"
          >
            <h2 className="text-fest-accent font-display font-bold uppercase tracking-widest mb-4">About the College</h2>
            <h3 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter mb-6">
              {aboutCollege?.title || 'A Legacy of '}<span className="text-fest-accent italic">{aboutCollege?.subtitle || 'Excellence'}</span>
            </h3>
            <p className="text-white/60 text-lg leading-relaxed mb-6">
              {aboutCollege?.body || 'Founded on the principles of innovation and integrity, our institution has been at the forefront of quality education for decades. We believe in nurturing raw talent and providing a dynamic environment where ideas flourish.'}
            </p>
            <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-widest text-white/50">
              <div><span className="text-fest-primary text-xl md:text-2xl mr-2">{String(aboutCollege?.metadata?.highlight_one_value || 'A++')}</span> {String(aboutCollege?.metadata?.highlight_one_label || 'NAAC Grade')}</div>
              <div className="w-1 h-1 bg-white/20 rounded-full"></div>
              <div><span className="text-fest-primary text-xl md:text-2xl mr-2">{String(aboutCollege?.metadata?.highlight_two_value || 'Top 10')}</span> {String(aboutCollege?.metadata?.highlight_two_label || 'State Rank')}</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About the School of Technology Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 order-2 md:order-1"
          >
            <h2 className="text-fest-accent font-display font-bold uppercase tracking-widest mb-4">About School of Technology</h2>
            <h3 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter mb-6">
              {aboutSchool?.title}<span className="text-fest-accent italic">{aboutSchool?.subtitle}</span>
            </h3>
            <p className="text-white/60 text-lg leading-relaxed mb-6">
              {aboutSchool?.body}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 order-1 md:order-2"
          >
            <div className="w-full aspect-video rounded-[2rem] overflow-hidden border-4 border-white/10 relative">
              <div className="absolute inset-0 bg-fest-primary/20 mix-blend-overlay"></div>
              <img src={aboutSchool?.image_url || 'https://picsum.photos/seed/tech/800/400'} alt="School of Technology" className="w-full h-full object-cover" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-6">
            <div>
              <h2 className="text-fest-accent font-display font-bold uppercase tracking-widest mb-4 text-xs md:text-sm">Featured Highlights</h2>
              <h3 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter">Experience the <span className="text-white italic">Magic</span></h3>
            </div>
            <Link to="/events" className="flex items-center gap-2 text-fest-accent font-bold uppercase tracking-widest text-sm hover:gap-4 transition-all">
              View All Events <ArrowRight size={20} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {eventsLoading ? (
              <div className="col-span-full flex justify-center py-20">
                <Loader2 className="animate-spin text-fest-primary" size={48} />
              </div>
            ) : events.length > 0 ? (
              events.slice(0, 3).map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))
            ) : (
              <div className="col-span-full text-center py-10 glass rounded-3xl">
                <p className="text-white/40 font-bold uppercase tracking-widest text-sm">No events announced yet.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Universal Rules Section */}
      <section className="py-16 md:py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-[2rem] md:rounded-[3rem] p-8 md:p-20 relative overflow-hidden border border-white/5">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fest-primary to-transparent opacity-30" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
              <div className="lg:col-span-1">
                <h2 className="text-fest-accent font-display font-bold uppercase tracking-widest mb-4 text-xs md:text-sm">The Playbook</h2>
                <h3 className="text-3xl md:text-5xl font-display font-extrabold tracking-tighter mb-6 uppercase">Universal <br /><span className="text-fest-accent text-glow-accent">Guidelines</span></h3>
                <p className="text-white/40 leading-relaxed text-sm md:text-lg">
                  To ensure a fair and spectacular experience for everyone, please adhere to these core festival regulations.
                </p>
              </div>

              <div className="lg:col-span-2 space-y-4">
                {rulesLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-fest-primary/20" size={32} />
                  </div>
                ) : rules.length > 0 ? (
                  rules.map((rule, index) => (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors group"
                    >
                      <span className="text-2xl font-display font-black text-white/10 group-hover:text-fest-primary transition-colors">
                        {(index + 1).toString().padStart(2, '0')}
                      </span>
                      <p className="text-white/70 text-sm md:text-base leading-relaxed pt-1">
                        {rule.rule_text}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                    <p className="text-white/20 uppercase tracking-widest text-xs font-bold">Standard rules pending upload</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organizing Committee Section */}
      <section className="py-24 px-6 relative overflow-hidden bg-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-fest-accent font-display font-bold uppercase tracking-widest mb-4">The Architects</h2>
            <h3 className="text-4xl md:text-7xl font-display font-extrabold tracking-tighter">Organizing <span className="text-white italic">Committee</span></h3>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {committeeLoading ? (
              <div className="col-span-full flex justify-center py-20">
                <Loader2 className="animate-spin text-fest-primary" size={48} />
              </div>
            ) : committee.length > 0 ? (
              committee.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <div className="relative mb-6 mx-auto w-40 h-40 md:w-56 md:h-56">
                    <div className="absolute inset-0 bg-fest-primary/20 rounded-full blur-2xl group-hover:bg-fest-primary/40 transition-all -z-10" />
                    <div className="w-full h-full rounded-full border-2 border-white/10 p-2 group-hover:border-fest-primary/50 transition-all">
                      <img
                        src={member.image_url}
                        alt={member.name}
                        className="w-full h-full object-cover rounded-full transition-all duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <h4 className="text-xl md:text-2xl font-display font-bold text-white group-hover:text-fest-primary transition-colors">{member.name}</h4>
                  <p className="text-white/40 text-xs md:text-sm uppercase tracking-[0.2em] font-bold mt-2">{member.role}</p>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-10 glass rounded-3xl">
                <p className="text-white/40 font-bold uppercase tracking-widest text-sm">Committee list coming soon.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto glass rounded-[3rem] p-12 md:p-24 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-fest-primary/10 blur-[100px] -z-10" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 blur-[100px] -z-10" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter mb-8 leading-tight">
                {parseTitle(whyJoin?.title)}
              </h2>
              <p className="text-white/60 text-lg mb-12 leading-relaxed">
                {whyJoin?.body || "UNSCRIPTX is more than just a fest. It's a platform where creativity meets competition, and passion meets performance. Join thousands of students in the biggest celebration of talent."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { icon: Music, title: whyJoin?.metadata?.f1 || 'Musical Nights', color: 'text-fest-primary' },
                  { icon: Zap, title: whyJoin?.metadata?.f2 || 'High Energy', color: 'text-fest-accent' },
                  { icon: Sparkles, title: whyJoin?.metadata?.f3 || 'Star Guests', color: 'text-fest-primary' },
                  { icon: Palette, title: whyJoin?.metadata?.f4 || 'Artistic Souls', color: 'text-white' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl glass flex items-center justify-center ${item.color}`}>
                      <item.icon size={24} />
                    </div>
                    <span className="font-display font-bold uppercase tracking-widest text-sm">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-white/10 rounded-full"
              />
              <img
                src="https://picsum.photos/seed/crowd/800/800"
                alt="Fest Crowd"
                className="rounded-full w-full aspect-square object-cover border-8 border-white/5"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-4xl md:text-8xl font-display font-extrabold tracking-tighter mb-10 md:mb-12 uppercase">
            READY TO <span className="text-fest-primary text-glow-primary">SHINE?</span>
          </h2>
          <Link
            to="/login"
            className="inline-block px-16 py-6 bg-fest-primary text-fest-dark font-black uppercase tracking-[0.3em] text-xl rounded-full hover:bg-fest-primary-light transition-colors glow-primary"
          >
            Register Now
          </Link>
        </motion.div>
      </section>
    </main>
  );
}
