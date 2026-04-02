import { motion } from 'motion/react';
import { ShieldAlert, Info, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useGeneralRules } from '../hooks/useSupabase';

const ruleCategories = [
  {
    title: 'General Rules',
    icon: Info,
    color: 'text-fest-gold',
    rules: [
      'All participants must carry their college ID cards.',
      'Registration is mandatory for all events.',
      'Participants must report at least 30 minutes before the event start time.',
      'Decisions made by the judges and organizers will be final and binding.',
      'Any form of misconduct will lead to immediate disqualification.'
    ]
  },
  {
    title: 'Safety & Conduct',
    icon: ShieldAlert,
    color: 'text-fest-gold-light',
    rules: [
      'Smoking, alcohol, and prohibited substances are strictly banned on campus.',
      'Damage to college property will be penalized.',
      'Maintain decorum and respect towards all participants and staff.',
      'Follow all COVID-19 safety protocols if applicable.'
    ]
  },
  {
    title: 'Registration Policy',
    icon: AlertCircle,
    color: 'text-fest-gold-dark',
    rules: [
      'Registration fees are non-refundable.',
      'Spot registrations are subject to availability.',
      'Online registration closes 24 hours before the event.',
      'One participant can register for multiple non-overlapping events.'
    ]
  }
];

export default function Rules() {
  const { rules, loading } = useGeneralRules();

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-display font-extrabold tracking-tighter mb-6"
          >
            THE <span className="text-fest-gold italic">PLAYBOOK</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/50 text-lg max-w-2xl mx-auto"
          >
            Please read the following guidelines carefully to ensure a smooth and fair experience for everyone.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full flex justify-center py-24">
              <Loader2 className="animate-spin text-fest-gold" size={48} />
            </div>
          ) : (
            ruleCategories.map((category, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass p-8 rounded-[2.5rem] border-t-4 border-white/5"
              style={{ borderColor: `var(--color-fest-${category.color.split('-')[2]})` }}
            >
              <div className={`w-14 h-14 rounded-2xl glass flex items-center justify-center mb-8 ${category.color}`}>
                <category.icon size={28} />
              </div>
              <h3 className="text-2xl font-display font-bold mb-8 uppercase tracking-widest">{category.title}</h3>
              <div className="space-y-6">
                {(i === 0 && rules.length > 0 ? rules.map((rule) => rule.rule_text) : category.rules).map((rule, j) => (
                  <div key={j} className="flex gap-4 group">
                    <CheckCircle size={18} className={`${category.color} flex-shrink-0 mt-1 opacity-40 group-hover:opacity-100 transition-opacity`} />
                    <p className="text-white/60 text-sm leading-relaxed group-hover:text-white transition-colors">{rule}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            ))
          )}
        </div>

        {/* Important Note */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mt-16 p-8 glass rounded-3xl border-l-8 border-fest-gold bg-fest-gold/5"
        >
          <h4 className="text-fest-gold font-display font-bold uppercase tracking-widest mb-2">Important Note</h4>
          <p className="text-white/70 italic">
            The organizing committee reserves the right to change the rules, schedule, or venue of any event if necessary. Any such changes will be communicated via the official website and social media handles.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
