import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Loader2, Download, Search, Users, CalendarDays, Edit, Trash2, Plus, UserPlus, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { DatabaseEvent, CommitteeMember, GeneralRule } from '../types';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'events' | 'users' | 'committee' | 'rules'>('events');
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [committee, setCommittee] = useState<CommitteeMember[]>([]);
  const [rules, setRules] = useState<GeneralRule[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);

  // Form states
  const [newMember, setNewMember] = useState({ name: '', role: '', image_url: '', display_order: 0 });
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    category: '', 
    description: '', 
    base_prize: 0, 
    per_participant_bonus: 0, 
    image_url: '',
    rules: '' 
  });
  const [newRule, setNewRule] = useState({ rule_text: '', display_order: 0 });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'events') {
        const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setEvents(data || []);
      } else if (activeTab === 'users') {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setUsers(data || []);
      } else if (activeTab === 'committee') {
        const { data, error } = await supabase.from('committee').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        setCommittee(data || []);
      } else if (activeTab === 'rules') {
        const { data, error } = await supabase.from('general_rules').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        setRules(data || []);
      }
    } catch (err: any) {
      toast.error('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rulesArray = newEvent.rules.split('\n').filter(r => r.trim() !== '');
      const { error } = await supabase.from('events').insert([{
        ...newEvent,
        rules: rulesArray
      }]);
      if (error) throw error;
      toast.success('Event created!');
      setShowAddEvent(false);
      setNewEvent({ title: '', category: '', description: '', base_prize: 0, per_participant_bonus: 0, image_url: '', rules: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('committee').insert([newMember]);
      if (error) throw error;
      toast.success('Member added!');
      setShowAddMember(false);
      setNewMember({ name: '', role: '', image_url: '', display_order: 0 });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('general_rules').insert([newRule]);
      if (error) throw error;
      toast.success('Rule added!');
      setShowAddRule(false);
      setNewRule({ rule_text: '', display_order: 0 });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      const { error } = await supabase.from('general_rules').delete().eq('id', id);
      if (error) throw error;
      toast.success('Rule deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const exportToExcel = () => {
    let dataToExport;
    let fileName;
    
    if (activeTab === 'events') { dataToExport = events; fileName = 'events_export.xlsx'; }
    else if (activeTab === 'users') { dataToExport = users; fileName = 'users_export.xlsx'; }
    else if (activeTab === 'committee') { dataToExport = committee; fileName = 'committee_export.xlsx'; }
    else { dataToExport = rules; fileName = 'general_rules_export.xlsx'; }
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, fileName);
    toast.success('Export downloaded!');
  };

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter"
            >
              System <span className="text-fest-gold">Admin</span>
            </motion.h1>
          </div>
          
          <div className="flex gap-4">
            {activeTab === 'events' && (
              <button onClick={() => setShowAddEvent(true)} className="flex items-center gap-2 px-6 py-3 bg-fest-gold text-fest-dark rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-fest-gold-light transition-all shadow-lg glow-gold">
                <Plus size={18} /> Add Event
              </button>
            )}
            {activeTab === 'committee' && (
              <button onClick={() => setShowAddMember(true)} className="flex items-center gap-2 px-6 py-3 bg-fest-gold text-fest-dark rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-fest-gold-light transition-all shadow-lg glow-gold">
                <Plus size={18} /> Add Member
              </button>
            )}
            {activeTab === 'rules' && (
              <button onClick={() => setShowAddRule(true)} className="flex items-center gap-2 px-6 py-3 bg-fest-gold text-fest-dark rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-fest-gold-light transition-all shadow-lg glow-gold">
                <Plus size={18} /> Add Rule
              </button>
            )}
            <button onClick={exportToExcel} className="flex items-center gap-2 px-6 py-3 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white rounded-xl font-bold uppercase tracking-widest text-sm transition-all border border-white/10">
              <Download size={18} /> Export
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10 mb-8 pb-4 overflow-x-auto whitespace-nowrap">
          {[
            { id: 'events', label: 'Events', icon: CalendarDays },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'committee', label: 'Committee', icon: UserPlus },
            { id: 'rules', label: 'General Rules', icon: ShieldCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold uppercase tracking-widest text-sm transition-all ${
                activeTab === tab.id 
                  ? 'border-b-2 border-fest-gold text-fest-gold bg-white/5' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="glass rounded-3xl p-6 md:p-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-fest-gold" size={48} />
            </div>
          ) : activeTab === 'events' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase tracking-widest text-xs">
                    <th className="pb-4 font-bold">Event Title</th>
                    <th className="pb-4 font-bold">Category</th>
                    <th className="pb-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 font-bold">{event.title}</td>
                      <td className="py-4 text-white/60 text-sm">{event.category}</td>
                      <td className="py-4 text-right flex justify-end gap-3">
                         <button className="text-white/40 hover:text-red-400 transition-colors" title="Delete"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'users' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase tracking-widest text-xs">
                    <th className="pb-4 font-bold">Full Name</th>
                    <th className="pb-4 font-bold">Email</th>
                    <th className="pb-4 font-bold">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 font-bold">{u.full_name || 'N/A'}</td>
                      <td className="py-4 text-white/60 text-sm">{u.email}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                          u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                          u.role === 'coordinator' ? 'bg-fest-cyan/20 text-fest-cyan' :
                          'bg-white/10 text-white/60'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'committee' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase tracking-widest text-xs">
                    <th className="pb-4 font-bold">Member</th>
                    <th className="pb-4 font-bold">Role</th>
                    <th className="pb-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {committee.map(m => (
                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="py-4 flex items-center gap-4">
                        <img src={m.image_url} className="w-10 h-10 rounded-full object-cover" />
                        <span className="font-bold">{m.name}</span>
                      </td>
                      <td className="py-4 text-white/60 text-sm">{m.role}</td>
                      <td className="py-4 text-right flex justify-end">
                        <button onClick={() => handleDeleteRule(m.id)} className="text-white/40 hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase tracking-widest text-xs">
                    <th className="pb-4 font-bold">Rule Text</th>
                    <th className="pb-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr><td colSpan={2} className="py-8 text-center text-white/40 font-bold uppercase tracking-widest text-xs">No general rules added</td></tr>
                  ) : rules.map(rule => (
                    <tr key={rule.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="py-6 text-white/80 pr-8">{rule.rule_text}</td>
                      <td className="py-6 text-right flex justify-end">
                        <button onClick={() => handleDeleteRule(rule.id)} className="text-white/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Logic for Add Modals (simplified) */}
      {showAddRule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div onClick={() => setShowAddRule(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-lg glass p-8 rounded-[2rem]">
            <h2 className="text-2xl font-display font-bold mb-6">Add Universal Rule</h2>
            <form onSubmit={handleAddRule} className="space-y-4">
              <textarea placeholder="The Rule..." required className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold"
                value={newRule.rule_text} onChange={e => setNewRule({...newRule, rule_text: e.target.value})} />
              <input type="number" placeholder="Order" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold"
                value={newRule.display_order} onChange={e => setNewRule({...newRule, display_order: parseInt(e.target.value)})} />
              <button type="submit" className="w-full py-4 bg-fest-gold text-fest-dark font-bold uppercase rounded-xl">Save Rule</button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Note: Members and Events modals existing elsewhere in file or needing similar fix... */}
      {showAddEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div onClick={() => setShowAddEvent(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-2xl glass p-8 rounded-[2rem] max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-display font-bold mb-6">Create New Event</h2>
            <form onSubmit={handleAddEvent} className="space-y-4 text-sm font-bold uppercase tracking-widest cursor-default">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Title" required className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                <input placeholder="Category" required className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold" value={newEvent.category} onChange={e => setNewEvent({...newEvent, category: e.target.value})} />
              </div>
              <textarea placeholder="Description" required className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold resize-none" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Base Prize" required className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold" value={newEvent.base_prize} onChange={e => setNewEvent({...newEvent, base_prize: parseInt(e.target.value)})} />
                <input type="number" placeholder="Bonus" required className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold" value={newEvent.per_participant_bonus} onChange={e => setNewEvent({...newEvent, per_participant_bonus: parseInt(e.target.value)})} />
              </div>
              <input placeholder="Image URL" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold" value={newEvent.image_url} onChange={e => setNewEvent({...newEvent, image_url: e.target.value})} />
              <textarea placeholder="Specific Rules (One per line)" className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold resize-none" value={newEvent.rules} onChange={e => setNewEvent({...newEvent, rules: e.target.value})} />
              <button type="submit" className="w-full py-4 bg-fest-gold text-fest-dark rounded-xl">Create Event</button>
            </form>
          </motion.div>
        </div>
      )}

      {showAddMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div onClick={() => setShowAddMember(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-lg glass p-8 rounded-[2rem]">
            <h2 className="text-2xl font-display font-bold mb-6">Add Member</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <input placeholder="Name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
              <input placeholder="Role" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} />
              <input placeholder="Image URL" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-fest-gold" value={newMember.image_url} onChange={e => setNewMember({...newMember, image_url: e.target.value})} />
              <button type="submit" className="w-full py-4 bg-fest-gold text-fest-dark rounded-xl">Save</button>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
}
