import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Users, CalendarDays, ShieldCheck, CheckSquare, ExternalLink, CheckCircle2, XCircle, Search, Download, Trash2, Pencil, ImagePlus, ArrowLeft, Phone, Mail, ChevronRight, SlidersHorizontal, Save, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppRole, CommitteeMember, DatabaseEvent, GeneralRule, HeroSlide, QualificationStage, SiteContent } from '../types';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { openPaymentScreenshot } from '../lib/storage';

type DashboardTab = 'events' | 'payment_reviews' | 'qualified_rounds' | 'users' | 'assignments' | 'registrations' | 'ui';

type AppUser = {
  id: string;
  full_name: string | null;
  email: string;
  role: AppRole;
  phone: string | null;
  college_name: string | null;
};

type ReviewerAssignment = {
  id: string;
  reviewer_id: string;
  event_id: string;
  reviewer_user: { full_name: string | null; email: string } | null;
  assigned_event: { title: string; category: string } | null;
};

type RegistrationRow = {
  id: string;
  event_id: string;
  participant_name: string | null;
  email: string | null;
  phone: string;
  college_name: string | null;
  team_name: string | null;
  payment_status: 'pending' | 'approved' | 'rejected';
  payment_screenshot_url: string;
  payment_review_notes: string | null;
  upload_enabled: boolean;
  submission_status: string;
  review_status: string;
  qualification_stage: QualificationStage;
  qualification_notes: string | null;
  participant_user: { full_name: string | null; email: string } | null;
  event: { title: string; category: string } | null;
};

const ROLE_OPTIONS: AppRole[] = ['user', 'payment_reviewer', 'content_reviewer', 'admin'];

const emptyEventForm = {
  title: '',
  category: '',
  description: '',
  entry_fee: 0,
  max_team_size: 1,
  payment_account_name: '',
  payment_account_number: '',
  payment_ifsc: '',
  payment_upi_id: '',
  drive_folder_id: '',
  image_url: '',
  rules: '',
};

const defaultSiteContent = (contentKey: string): SiteContent => ({
  content_key: contentKey,
  title: '',
  subtitle: '',
  body: '',
  secondary_body: '',
  image_url: '',
  metadata: {},
});

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('events');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activePaymentSection, setActivePaymentSection] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [assignments, setAssignments] = useState<ReviewerAssignment[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [siteContent, setSiteContent] = useState<Record<string, SiteContent>>({
    home_about_event: defaultSiteContent('home_about_event'),
    home_about_college: defaultSiteContent('home_about_college'),
  });
  const [committeeEntries, setCommitteeEntries] = useState<CommitteeMember[]>([]);
  const [guidelineEntries, setGuidelineEntries] = useState<GeneralRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistrationEventId, setSelectedRegistrationEventId] = useState('');
  const [selectedPaymentEventId, setSelectedPaymentEventId] = useState('');
  const [selectedQualifiedEventId, setSelectedQualifiedEventId] = useState('');
  const [registrationSearch, setRegistrationSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [qualificationSearch, setQualificationSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [qualificationNotes, setQualificationNotes] = useState<Record<string, string>>({});

  const [newEvent, setNewEvent] = useState(emptyEventForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventImageUploading, setEventImageUploading] = useState(false);
  const [uiSaving, setUiSaving] = useState(false);
  const [newSlideDuration, setNewSlideDuration] = useState(2);
  const [committeeForm, setCommitteeForm] = useState({ name: '', role: '', image_url: '', display_order: 0 });
  const [editingGuidelineId, setEditingGuidelineId] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState({ rule_text: '', display_order: 0 });
  const [reviewerId, setReviewerId] = useState('');
  const [assignmentEventId, setAssignmentEventId] = useState('');
  const [activeQualifiedStage, setActiveQualifiedStage] = useState<'all' | QualificationStage>('all');

  useEffect(() => {
    void fetchData();
  }, [activeTab]);

  useEffect(() => {
    setActivePaymentSection('pending');
    setPaymentSearch('');
  }, [selectedPaymentEventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'events') {
        const [{ data: eventsData, error: eventsError }, { data: registrationsData, error: registrationsError }] = await Promise.all([
          supabase.from('events').select('*').order('created_at', { ascending: false }),
          supabase.from('registrations').select('id, event_id'),
        ]);
        if (eventsError) throw eventsError;
        if (registrationsError) throw registrationsError;
        setEvents(((eventsData || []) as any[]).map((event) => ({ ...event, entry_fee: Number(event.entry_fee || 0) })));
        setRegistrations((registrationsData as RegistrationRow[]) || []);
      }

      if (activeTab === 'registrations' || activeTab === 'payment_reviews' || activeTab === 'qualified_rounds') {
        const [{ data: eventsData, error: eventsError }, { data: registrationsData, error: registrationsError }] = await Promise.all([
          supabase.from('events').select('*').order('created_at', { ascending: false }),
          supabase
            .from('registrations')
            .select(`
              id,
              event_id,
              participant_name,
              email,
              phone,
              college_name,
              team_name,
              payment_status,
              payment_screenshot_url,
              payment_review_notes,
              upload_enabled,
              submission_status,
              review_status,
              qualification_stage,
              qualification_notes,
              participant_user:users!registrations_user_id_fkey ( full_name, email ),
              event:events!registrations_event_id_fkey ( title, category )
            `)
            .order('created_at', { ascending: false }),
        ]);

        if (eventsError) throw eventsError;
        if (registrationsError) throw registrationsError;

        const mappedEvents = ((eventsData || []) as any[]).map((event) => ({
          ...event,
          entry_fee: Number(event.entry_fee || 0),
        }));
        const mappedRegistrations = (registrationsData as unknown as RegistrationRow[]) || [];

        setEvents(mappedEvents);
        setRegistrations(mappedRegistrations);
        setPaymentNotes(
          mappedRegistrations.reduce((acc, registration) => {
            acc[registration.id] = registration.payment_review_notes || '';
            return acc;
          }, {} as Record<string, string>)
        );
        setQualificationNotes(
          mappedRegistrations.reduce((acc, registration) => {
            acc[registration.id] = registration.qualification_notes || '';
            return acc;
          }, {} as Record<string, string>)
        );

        if (!selectedRegistrationEventId && mappedEvents[0]?.id) setSelectedRegistrationEventId(mappedEvents[0].id);
        if (!selectedPaymentEventId && mappedEvents[0]?.id) setSelectedPaymentEventId(mappedEvents[0].id);
        if (!selectedQualifiedEventId && mappedEvents[0]?.id) setSelectedQualifiedEventId(mappedEvents[0].id);
        if (selectedRegistrationEventId && !mappedEvents.some((event) => event.id === selectedRegistrationEventId)) setSelectedRegistrationEventId(mappedEvents[0]?.id || '');
        if (selectedPaymentEventId && !mappedEvents.some((event) => event.id === selectedPaymentEventId)) setSelectedPaymentEventId(mappedEvents[0]?.id || '');
        if (selectedQualifiedEventId && !mappedEvents.some((event) => event.id === selectedQualifiedEventId)) setSelectedQualifiedEventId(mappedEvents[0]?.id || '');
      } else {
        setRegistrations([]);
      }

      if (activeTab === 'users') {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setUsers((data as AppUser[]) || []);
      }

      if (activeTab === 'assignments') {
        const { data, error } = await supabase
          .from('reviewer_event_assignments')
          .select(`
            id,
            reviewer_id,
            event_id,
            reviewer_user:users!reviewer_event_assignments_reviewer_id_fkey ( full_name, email ),
            assigned_event:events!reviewer_event_assignments_event_id_fkey ( title, category )
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setAssignments((data as unknown as ReviewerAssignment[]) || []);

        const { data: eventData } = await supabase.from('events').select('*').order('title');
        if (eventData) setEvents(((eventData || []) as any[]).map((event) => ({ ...event, entry_fee: Number(event.entry_fee || 0) })));

        const { data: userData } = await supabase.from('users').select('*').eq('role', 'content_reviewer').order('full_name');
        if (userData) setUsers(userData as AppUser[]);
      }

      if (activeTab === 'ui') {
        const [
          { data: slideData, error: slideError },
          { data: contentData, error: contentError },
          { data: committeeData, error: committeeError },
          { data: rulesData, error: rulesError },
        ] = await Promise.all([
          supabase.from('hero_slideshow').select('*').order('display_order', { ascending: true }),
          supabase.from('site_content').select('*').in('content_key', ['home_about_event', 'home_about_college']),
          supabase.from('committee').select('*').order('display_order', { ascending: true }),
          supabase.from('general_rules').select('*').order('display_order', { ascending: true }),
        ]);

        if (slideError) throw slideError;
        if (contentError) throw contentError;
        if (committeeError) throw committeeError;
        if (rulesError) throw rulesError;

        setHeroSlides((slideData as HeroSlide[]) || []);
        setCommitteeEntries((committeeData as CommitteeMember[]) || []);
        setGuidelineEntries((rulesData as GeneralRule[]) || []);

        const contentMap = {
          home_about_event: defaultSiteContent('home_about_event'),
          home_about_college: defaultSiteContent('home_about_college'),
        } as Record<string, SiteContent>;

        ((contentData as SiteContent[]) || []).forEach((entry) => {
          contentMap[entry.content_key] = {
            ...defaultSiteContent(entry.content_key),
            ...entry,
            metadata: entry.metadata || {},
          };
        });

        setSiteContent(contentMap);
      }

    } catch (err: any) {
      toast.error(err.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const selectedRegistrationEventRows = useMemo(() => {
    const filteredByEvent = registrations.filter((registration) => registration.event_id === selectedRegistrationEventId);
    if (!registrationSearch.trim()) return filteredByEvent;

    const term = registrationSearch.toLowerCase();
    return filteredByEvent.filter((registration) => {
      const participant = registration.participant_name || registration.participant_user?.full_name || registration.participant_user?.email || '';
      return (
        participant.toLowerCase().includes(term) ||
        (registration.email || '').toLowerCase().includes(term) ||
        registration.phone.toLowerCase().includes(term) ||
        (registration.team_name || '').toLowerCase().includes(term)
      );
    });
  }, [registrations, selectedRegistrationEventId, registrationSearch]);

  const selectedPaymentEventRows = useMemo(() => {
    const filteredByEvent = registrations.filter((registration) => registration.event_id === selectedPaymentEventId);
    if (!paymentSearch.trim()) return filteredByEvent;

    const term = paymentSearch.toLowerCase();
    return filteredByEvent.filter((registration) => {
      const participant = registration.participant_name || registration.participant_user?.full_name || registration.participant_user?.email || '';
      return (
        participant.toLowerCase().includes(term) ||
        (registration.email || '').toLowerCase().includes(term) ||
        registration.phone.toLowerCase().includes(term) ||
        (registration.team_name || '').toLowerCase().includes(term)
      );
    });
  }, [registrations, selectedPaymentEventId, paymentSearch]);

  const selectedPaymentEventSummary = useMemo(() => {
    const rows = registrations.filter((registration) => registration.event_id === selectedPaymentEventId);
    return {
      total: rows.length,
      pending: rows.filter((registration) => registration.payment_status === 'pending').length,
      approved: rows.filter((registration) => registration.payment_status === 'approved').length,
      rejected: rows.filter((registration) => registration.payment_status === 'rejected').length,
      uploadEnabled: rows.filter((registration) => registration.upload_enabled).length,
    };
  }, [registrations, selectedPaymentEventId]);

  const selectedQualifiedEventRows = useMemo(() => {
    const filteredByEvent = registrations.filter((registration) => registration.event_id === selectedQualifiedEventId);
    const filteredBySearch = qualificationSearch.trim()
      ? filteredByEvent.filter((registration) => {
          const participant = registration.participant_name || registration.participant_user?.full_name || registration.participant_user?.email || '';
          const term = qualificationSearch.toLowerCase();
          return (
            participant.toLowerCase().includes(term) ||
            (registration.email || '').toLowerCase().includes(term) ||
            registration.phone.toLowerCase().includes(term) ||
            (registration.team_name || '').toLowerCase().includes(term)
          );
        })
      : filteredByEvent;

    if (activeQualifiedStage === 'all') return filteredBySearch;
    return filteredBySearch.filter((registration) => registration.qualification_stage === activeQualifiedStage);
  }, [registrations, selectedQualifiedEventId, qualificationSearch, activeQualifiedStage]);

  const selectedRegistrationEvent = events.find((event) => event.id === selectedRegistrationEventId) || null;
  const selectedPaymentEvent = events.find((event) => event.id === selectedPaymentEventId) || null;
  const selectedQualifiedEvent = events.find((event) => event.id === selectedQualifiedEventId) || null;

  const resetEventForm = () => {
    setNewEvent(emptyEventForm);
    setEditingEventId(null);
  };

  const startEditingEvent = (event: DatabaseEvent) => {
    setEditingEventId(event.id);
    setNewEvent({
      title: event.title || '',
      category: event.category || '',
      description: event.description || '',
      entry_fee: Number(event.entry_fee || 0),
      max_team_size: Number(event.max_team_size || 1),
      payment_account_name: event.payment_account_name || '',
      payment_account_number: event.payment_account_number || '',
      payment_ifsc: event.payment_ifsc || '',
      payment_upi_id: event.payment_upi_id || '',
      drive_folder_id: event.drive_folder_id || '',
      image_url: event.image_url || '',
      rules: (event.rules || []).join('\n'),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const uploadAsset = async (file: File, folder: string) => {
    const safeName = `${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, '-');
    const filePath = `${folder}/${safeName}`;

    const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
    if (!data.publicUrl) throw new Error('Could not generate image URL.');
    return data.publicUrl;
  };

  const handleEventImageUpload = async (file: File) => {
    setEventImageUploading(true);
    try {
      const imageUrl = await uploadAsset(file, 'events');
      setNewEvent((current) => ({ ...current, image_url: imageUrl }));
      toast.success('Front image uploaded.');
    } catch (err: any) {
      toast.error(err.message || 'Could not upload event image.');
    } finally {
      setEventImageUploading(false);
    }
  };

  const saveSiteContent = async (contentKey: string) => {
    setUiSaving(true);
    try {
      const entry = siteContent[contentKey];
      const payload = {
        content_key: contentKey,
        title: entry.title || null,
        subtitle: entry.subtitle || null,
        body: entry.body || null,
        secondary_body: entry.secondary_body || null,
        image_url: entry.image_url || null,
        metadata: entry.metadata || {},
      };

      const { error } = await supabase.from('site_content').upsert(payload, { onConflict: 'content_key' });
      if (error) throw error;
      toast.success('Content updated.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not save content.');
    } finally {
      setUiSaving(false);
    }
  };

  const handleSlideUpload = async (file: File) => {
    setUiSaving(true);
    try {
      const imageUrl = await uploadAsset(file, 'slideshow');
      const { error } = await supabase.from('hero_slideshow').insert({
        image_url: imageUrl,
        duration_seconds: Math.max(1, newSlideDuration),
        display_order: heroSlides.length,
      });
      if (error) throw error;
      toast.success('Slide added.');
      setNewSlideDuration(2);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not add slide.');
    } finally {
      setUiSaving(false);
    }
  };

  const handleDeleteSlide = async (id: string) => {
    try {
      const { error } = await supabase.from('hero_slideshow').delete().eq('id', id);
      if (error) throw error;
      toast.success('Slide removed.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not delete slide.');
    }
  };

  const handleAddCommitteeMember = async () => {
    if (!committeeForm.name || !committeeForm.role || !committeeForm.image_url) {
      toast.error('Add name, designation and image first.');
      return;
    }

    try {
      const { error } = await supabase.from('committee').insert({
        name: committeeForm.name,
        role: committeeForm.role,
        image_url: committeeForm.image_url,
        display_order: committeeForm.display_order,
      });
      if (error) throw error;
      toast.success('Committee member added.');
      setCommitteeForm({ name: '', role: '', image_url: '', display_order: 0 });
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not add committee member.');
    }
  };

  const handleDeleteCommitteeMember = async (id: string) => {
    try {
      const { error } = await supabase.from('committee').delete().eq('id', id);
      if (error) throw error;
      toast.success('Committee member removed.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not remove committee member.');
    }
  };

  const handleAddGuideline = async () => {
    if (!ruleForm.rule_text.trim()) {
      toast.error('Enter a guideline first.');
      return;
    }

    try {
      const payload = {
        rule_text: ruleForm.rule_text.trim(),
        display_order: ruleForm.display_order,
      };

      const { error } = editingGuidelineId
        ? await supabase.from('general_rules').update(payload).eq('id', editingGuidelineId)
        : await supabase.from('general_rules').insert(payload);
      if (error) throw error;
      toast.success(editingGuidelineId ? 'Guideline updated.' : 'Guideline added.');
      setEditingGuidelineId(null);
      setRuleForm({ rule_text: '', display_order: 0 });
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || (editingGuidelineId ? 'Could not update guideline.' : 'Could not add guideline.'));
    }
  };

  const handleDeleteGuideline = async (id: string) => {
    try {
      const { error } = await supabase.from('general_rules').delete().eq('id', id);
      if (error) throw error;
      toast.success('Guideline removed.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not remove guideline.');
    }
  };

  const startEditingGuideline = (rule: GeneralRule) => {
    setEditingGuidelineId(rule.id);
    setRuleForm({
      rule_text: rule.rule_text,
      display_order: rule.display_order,
    });
  };

  const handleEventCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const rulesArray = newEvent.rules.split('\n').map((rule) => rule.trim()).filter(Boolean);
      const payload = {
        ...newEvent,
        slug: newEvent.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        image_url: newEvent.image_url || null,
        rules: rulesArray,
      };

      const { error } = editingEventId
        ? await supabase.from('events').update(payload).eq('id', editingEventId)
        : await supabase.from('events').insert(payload);
      if (error) throw error;

      toast.success(editingEventId ? 'Event updated.' : 'Event created.');
      resetEventForm();
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || (editingEventId ? 'Could not update event.' : 'Could not create event.'));
    }
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (!window.confirm(`Delete "${eventTitle}"?\n\nThis will also remove registrations and event assignments linked to it.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;

      toast.success('Event deleted.');

      if (selectedRegistrationEventId === eventId) setSelectedRegistrationEventId('');
      if (selectedPaymentEventId === eventId) setSelectedPaymentEventId('');
      if (selectedQualifiedEventId === eventId) setSelectedQualifiedEventId('');
      if (assignmentEventId === eventId) setAssignmentEventId('');
      if (editingEventId === eventId) resetEventForm();

      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not delete event.');
    }
  };

  const handleRoleChange = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase.from('users').update({ role }).eq('id', userId);
      if (error) throw error;
      toast.success('Role updated.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Role update failed.');
    }
  };

  const handleAssignmentCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewerId || !assignmentEventId) {
      toast.error('Select both reviewer and event.');
      return;
    }

    try {
      const { error } = await supabase.from('reviewer_event_assignments').insert({ reviewer_id: reviewerId, event_id: assignmentEventId });
      if (error) throw error;
      toast.success('Reviewer assigned to event.');
      setReviewerId('');
      setAssignmentEventId('');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Assignment failed.');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase.from('reviewer_event_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
      toast.success('Assignment removed.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed.');
    }
  };

  const handlePaymentDecision = async (registrationId: string, decision: 'approved' | 'rejected') => {
    setActionLoadingId(registrationId);
    try {
      const approve = decision === 'approved';
      const { error } = await supabase
        .from('registrations')
        .update({
          payment_status: decision,
          payment_review_notes: paymentNotes[registrationId] || null,
          payment_reviewed_by: user?.id || null,
          payment_reviewed_at: new Date().toISOString(),
          upload_enabled: approve,
          upload_enabled_by: approve ? user?.id || null : null,
          upload_enabled_at: approve ? new Date().toISOString() : null,
          submission_status: approve ? 'ready' : 'locked',
        })
        .eq('id', registrationId);
      if (error) throw error;
      toast.success(approve ? 'Payment approved and upload opened.' : 'Payment rejected.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const exportRegistrationsForEvent = (event: DatabaseEvent, eventRows: RegistrationRow[]) => {
    if (!event) {
      toast.error('Select an event first.');
      return;
    }

    const rows = eventRows.map((registration) => ({
      participant_name: registration.participant_name || registration.participant_user?.full_name || '',
      email: registration.email || registration.participant_user?.email || '',
      phone: registration.phone,
      college_name: registration.college_name || '',
      team_name: registration.team_name || '',
      payment_status: registration.payment_status,
      upload_enabled: registration.upload_enabled ? 'Yes' : 'No',
      submission_status: registration.submission_status,
      review_status: registration.review_status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
    const safeName = event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(workbook, `${safeName}_registrations_export.xlsx`);
    toast.success('Excel exported.');
  };

  const handleDeleteRegistration = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete registration for ${name}?`)) return;

    try {
      const { error } = await supabase.from('registrations').delete().eq('id', id);
      if (error) throw error;
      toast.success('Registration deleted.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not delete registration.');
    }
  };

  const handleViewScreenshot = async (pathOrUrl: string) => {
    try {
      await openPaymentScreenshot(pathOrUrl);
    } catch (err: any) {
      toast.error(err.message || 'Could not open payment screenshot.');
    }
  };

  const handleQualificationStage = async (registration: RegistrationRow, stage: QualificationStage) => {
    setActionLoadingId(registration.id);
    try {
      const shouldKeepUploadOpen =
        registration.payment_status === 'approved' && stage !== 'eliminated';

      const { error } = await supabase
        .from('registrations')
        .update({
          qualification_stage: stage,
          qualification_notes: qualificationNotes[registration.id] || null,
          upload_enabled: shouldKeepUploadOpen,
          upload_enabled_by: shouldKeepUploadOpen ? user?.id || null : null,
          upload_enabled_at: shouldKeepUploadOpen ? new Date().toISOString() : null,
        })
        .eq('id', registration.id);

      if (error) throw error;

      toast.success('Qualification stage updated.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not update qualification stage.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderPaymentCards = (rows: RegistrationRow[], section: 'pending' | 'approved' | 'rejected') => {
    if (rows.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-white/10 py-12 text-center text-white/35">
          No {section} registrations in this section.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-w-5xl">
        {rows.map((registration) => (
          <div key={registration.id} className="rounded-3xl border border-white/10 bg-black/20 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold">
                  {registration.participant_name || registration.participant_user?.full_name || registration.participant_user?.email}
                </h4>
                <p className="text-xs text-white/40 mt-1">{registration.email || registration.participant_user?.email}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                registration.payment_status === 'approved'
                  ? 'bg-green-500/10 text-green-400'
                  : registration.payment_status === 'rejected'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-fest-gold/10 text-fest-gold'
              }`}>
                {registration.payment_status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/5 p-3.5">
                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Phone</div>
                <div className="font-semibold">{registration.phone}</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5">
                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Team</div>
                <div className="font-semibold">{registration.team_name || 'Solo'}</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5">
                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">College</div>
                <div className="font-semibold">{registration.college_name || 'Not provided'}</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5">
                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Upload</div>
                <div className="font-semibold">{registration.upload_enabled ? 'Enabled' : 'Locked'}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleViewScreenshot(registration.payment_screenshot_url)}
              className="flex justify-center items-center gap-2 w-full py-3 border border-white/10 border-dashed rounded-xl hover:bg-white/5 hover:border-white/30 transition-all text-xs font-bold uppercase tracking-widest text-fest-gold-light"
            >
              View Payment Screenshot <ExternalLink size={14} />
            </button>

            <textarea
              value={paymentNotes[registration.id] || ''}
              onChange={(e) => setPaymentNotes((current) => ({ ...current, [registration.id]: e.target.value }))}
              placeholder="Optional admin note for this registration"
              className="w-full h-20 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-fest-gold resize-none"
            />

            {section === 'pending' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => void handlePaymentDecision(registration.id, 'rejected')}
                  disabled={actionLoadingId === registration.id}
                  className="w-full py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {actionLoadingId === registration.id ? <Loader2 className="animate-spin" size={16} /> : <><XCircle size={16} /> Decline</>}
                </button>
                <button
                  onClick={() => void handlePaymentDecision(registration.id, 'approved')}
                  disabled={actionLoadingId === registration.id}
                  className="w-full py-2.5 bg-fest-gold/10 text-fest-gold hover:bg-fest-gold hover:text-fest-dark rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {actionLoadingId === registration.id ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> Approve</>}
                </button>
              </div>
            ) : (
              <div className={`rounded-2xl p-3 text-center text-[10px] font-bold uppercase tracking-widest ${
                section === 'approved'
                  ? 'border border-green-500/20 bg-green-500/5 text-green-400'
                  : 'border border-red-500/20 bg-red-500/5 text-red-400'
              }`}>
                Moved to {section === 'approved' ? 'approved' : 'declined'} section
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="pt-32 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter">
              System <span className="text-fest-gold">Admin</span>
            </motion.h1>
            <p className="text-white/50 mt-3">Create events, manage roles, assign reviewers, and handle registrations event by event.</p>
          </div>
        </header>

        <div className="flex gap-4 border-b border-white/10 mb-8 pb-4 overflow-x-auto whitespace-nowrap">
          {[
            { id: 'events', label: 'Events', icon: CalendarDays },
            { id: 'payment_reviews', label: 'Payment Reviews', icon: ShieldCheck },
            { id: 'qualified_rounds', label: 'Qualified', icon: CheckCircle2 },
            { id: 'ui', label: 'UI', icon: SlidersHorizontal },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'assignments', label: 'Reviewer Access', icon: ShieldCheck },
            { id: 'registrations', label: 'All Registrations', icon: CheckSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DashboardTab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold uppercase tracking-widest text-sm transition-all ${
                activeTab === tab.id ? 'border-b-2 border-fest-gold text-fest-gold bg-white/5' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="glass rounded-3xl p-6 md:p-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-fest-gold" size={48} />
            </div>
          ) : activeTab === 'events' ? (
            <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-8">
              <form onSubmit={handleEventCreate} className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-fest-gold font-bold uppercase tracking-widest text-sm">
                    {editingEventId ? <Pencil size={16} /> : <Plus size={16} />}
                    {editingEventId ? 'Edit Event' : 'Create Event'}
                  </div>
                  {editingEventId ? (
                    <button
                      type="button"
                      onClick={resetEventForm}
                      className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest text-white/70 hover:bg-white/5"
                    >
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
                <input placeholder="Title" required className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} />
                <input placeholder="Category" required className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold" value={newEvent.category} onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })} />
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-widest">
                    <ImagePlus size={16} /> Event Front Image
                  </div>
                  <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-6 text-center cursor-pointer hover:border-fest-gold/60 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleEventImageUpload(file);
                        e.currentTarget.value = '';
                      }}
                    />
                    {eventImageUploading ? (
                      <div className="flex items-center gap-2 text-fest-gold text-sm font-semibold">
                        <Loader2 className="animate-spin" size={16} /> Uploading image...
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-semibold">Upload event cover image</div>
                        <div className="text-xs text-white/45">This image will be used as the front image for the event card and event page.</div>
                      </>
                    )}
                  </label>
                  {newEvent.image_url ? (
                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                      <img src={newEvent.image_url} alt={newEvent.title || 'Event preview'} className="w-full h-48 object-cover" />
                    </div>
                  ) : null}
                </div>
                <textarea placeholder="Description" required className="w-full h-24 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold resize-none" value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" min={0} placeholder="Entry Fee" className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold" value={newEvent.entry_fee} onChange={(e) => setNewEvent({ ...newEvent, entry_fee: Number(e.target.value) })} />
                  <input type="number" min={1} placeholder="Team Limit" className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold" value={newEvent.max_team_size} onChange={(e) => setNewEvent({ ...newEvent, max_team_size: Number(e.target.value) })} />
                </div>
                <input placeholder="Payment Account Name" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold" value={newEvent.payment_account_name} onChange={(e) => setNewEvent({ ...newEvent, payment_account_name: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Account Number" className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold" value={newEvent.payment_account_number} onChange={(e) => setNewEvent({ ...newEvent, payment_account_number: e.target.value })} />
                  <input placeholder="IFSC" className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold" value={newEvent.payment_ifsc} onChange={(e) => setNewEvent({ ...newEvent, payment_ifsc: e.target.value })} />
                </div>
                <input placeholder="UPI ID" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold" value={newEvent.payment_upi_id} onChange={(e) => setNewEvent({ ...newEvent, payment_upi_id: e.target.value })} />
                <input placeholder="Google Drive Folder ID" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold" value={newEvent.drive_folder_id} onChange={(e) => setNewEvent({ ...newEvent, drive_folder_id: e.target.value })} />
                <textarea placeholder="Rules, one per line" className="w-full h-28 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold resize-none" value={newEvent.rules} onChange={(e) => setNewEvent({ ...newEvent, rules: e.target.value })} />
                <button type="submit" className="w-full py-4 bg-fest-gold text-fest-dark font-black uppercase tracking-widest rounded-xl hover:bg-fest-gold-light transition-all shadow-lg glow-gold">
                  {editingEventId ? 'Update Event' : 'Create Event'}
                </button>
              </form>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold">Created Events</h3>
                    <p className="text-white/45 text-sm mt-1">Each event has its own front image. You can edit or delete any event here.</p>
                  </div>
                </div>

                {events.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-white/35">
                    No events created yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => {
                      const eventRegistrationCount = registrations.filter((registration) => registration.event_id === event.id).length;
                      return (
                        <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 bg-black/20 shrink-0">
                              {event.image_url ? (
                                <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/25 text-[10px] uppercase tracking-widest">
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-lg">{event.title}</div>
                            <div className="text-sm text-white/55 mt-1">{event.category} • ₹{event.entry_fee}</div>
                            <div className="text-xs text-white/35 mt-2">{eventRegistrationCount} registrations</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => startEditingEvent(event)}
                            className="px-4 py-3 rounded-2xl bg-fest-gold/10 text-fest-gold hover:bg-fest-gold hover:text-fest-dark transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Pencil size={16} /> Edit Event
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteEvent(event.id, event.title)}
                            className="px-4 py-3 rounded-2xl bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Trash2 size={16} /> Delete Event
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'payment_reviews' ? (
            <div className="space-y-8">
              {!selectedPaymentEventId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {events.map((event) => {
                    const eventRows = registrations.filter((registration) => registration.event_id === event.id);
                    const pending = eventRows.filter((registration) => registration.payment_status === 'pending').length;
                    const approved = eventRows.filter((registration) => registration.payment_status === 'approved').length;

                    return (
                      <motion.button
                        key={event.id}
                        onClick={() => setSelectedPaymentEventId(event.id)}
                        whileHover={{ y: -5 }}
                        className="glass p-8 rounded-[3rem] text-left group hover:border-fest-gold/40 transition-all flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start mb-8">
                          <div className="w-14 h-14 rounded-2xl bg-fest-gold/10 flex items-center justify-center text-fest-gold">
                            <ShieldCheck size={28} />
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-white/30 uppercase tracking-[0.25em] mb-1">Pending</div>
                            <div className="text-sm font-bold text-fest-gold uppercase tracking-tighter">{pending}</div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-2xl font-display font-extrabold uppercase tracking-tighter mb-4 group-hover:text-fest-gold transition-colors">
                            {event.title}
                          </h3>
                          <div className="text-sm text-white/45 mb-6">{event.category}</div>
                          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/5 text-xs uppercase tracking-widest">
                            <div>
                              <div className="text-white/25">Total</div>
                              <div className="text-white mt-2 font-bold">{eventRows.length}</div>
                            </div>
                            <div>
                              <div className="text-white/25">Approved</div>
                              <div className="text-green-400 mt-2 font-bold">{approved}</div>
                            </div>
                            <div className="flex items-end justify-end">
                              <ChevronRight className="text-white/20 group-hover:text-fest-gold transition-all" size={20} />
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}

                  {events.length === 0 && (
                    <div className="col-span-full py-20 text-center text-white/20 font-bold uppercase tracking-widest text-xs border border-dashed border-white/10 rounded-[3rem]">
                      No events created yet
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => setSelectedPaymentEventId('')}
                        className="w-12 h-12 rounded-full glass flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <ArrowLeft size={24} />
                      </button>
                      <div>
                        <h3 className="text-3xl md:text-4xl font-display font-extrabold uppercase tracking-tighter">
                          {selectedPaymentEvent?.title}
                        </h3>
                        <p className="text-fest-gold-light text-xs font-bold uppercase tracking-widest mt-1 opacity-60">
                          {selectedPaymentEvent?.category} | {selectedPaymentEventSummary.total} Registrations
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                      <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={16} />
                        <input
                          type="text"
                          value={paymentSearch}
                          onChange={(e) => setPaymentSearch(e.target.value)}
                          placeholder="Search participants"
                          className="w-full rounded-2xl bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm outline-none focus:border-fest-gold"
                        />
                      </div>
                      {selectedPaymentEvent && (
                        <button
                          type="button"
                          onClick={() => exportRegistrationsForEvent(selectedPaymentEvent, selectedPaymentEventRows)}
                          className="w-full sm:w-auto px-6 py-3 bg-fest-gold text-fest-dark rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-fest-gold-light transition-all shadow-lg glow-gold"
                        >
                          <Download size={16} /> Export Excel
                        </button>
                      )}
                    </div>
                  </header>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: 'Total', value: selectedPaymentEventSummary.total },
                      { label: 'Pending', value: selectedPaymentEventSummary.pending },
                      { label: 'Approved', value: selectedPaymentEventSummary.approved },
                      { label: 'Rejected', value: selectedPaymentEventSummary.rejected },
                      { label: 'Upload Open', value: selectedPaymentEventSummary.uploadEnabled },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-[10px] uppercase tracking-widest text-white/40">{item.label}</div>
                        <div className="text-2xl font-bold mt-2">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {selectedPaymentEventRows.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center text-white/35">
                      No registrations found for this event yet.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          {
                            id: 'pending' as const,
                            label: 'Pending Container',
                            tone: 'text-fest-gold',
                            count: selectedPaymentEventRows.filter((registration) => registration.payment_status === 'pending').length,
                          },
                          {
                            id: 'approved' as const,
                            label: 'Approved Container',
                            tone: 'text-green-400',
                            count: selectedPaymentEventRows.filter((registration) => registration.payment_status === 'approved').length,
                          },
                          {
                            id: 'rejected' as const,
                            label: 'Declined Container',
                            tone: 'text-red-400',
                            count: selectedPaymentEventRows.filter((registration) => registration.payment_status === 'rejected').length,
                          },
                        ].map((section) => (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => setActivePaymentSection(section.id)}
                            className={`rounded-3xl border p-5 text-left transition-all ${
                              activePaymentSection === section.id
                                ? 'border-fest-gold bg-fest-gold/10'
                                : 'border-white/10 bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            <div className={`text-sm font-bold uppercase tracking-widest ${section.tone}`}>{section.label}</div>
                            <div className="text-3xl font-black mt-3">{section.count}</div>
                            <div className="text-[10px] uppercase tracking-widest text-white/30 mt-2">Click to view</div>
                          </button>
                        ))}
                      </div>

                      <section className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <h4 className={`text-lg font-bold uppercase tracking-widest ${
                            activePaymentSection === 'approved'
                              ? 'text-green-400'
                              : activePaymentSection === 'rejected'
                                ? 'text-red-400'
                                : 'text-fest-gold'
                          }`}>
                            {activePaymentSection === 'approved'
                              ? 'Approved Section'
                              : activePaymentSection === 'rejected'
                                ? 'Declined Section'
                                : 'Pending Review'}
                          </h4>
                          <div className="text-xs text-white/35 uppercase tracking-widest">
                            {selectedPaymentEventRows.filter((registration) => registration.payment_status === activePaymentSection).length} participants
                          </div>
                        </div>
                        {renderPaymentCards(
                          selectedPaymentEventRows.filter((registration) => registration.payment_status === activePaymentSection),
                          activePaymentSection
                        )}
                      </section>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'qualified_rounds' ? (
            <div className="space-y-8">
              {!selectedQualifiedEventId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {events.map((event) => {
                    const eventRows = registrations.filter((registration) => registration.event_id === event.id);
                    const qualifiedCount = eventRows.filter((registration) => registration.qualification_stage !== 'not_started' && registration.qualification_stage !== 'eliminated').length;
                    const eliminatedCount = eventRows.filter((registration) => registration.qualification_stage === 'eliminated').length;

                    return (
                      <motion.button
                        key={event.id}
                        onClick={() => setSelectedQualifiedEventId(event.id)}
                        whileHover={{ y: -5 }}
                        className="glass p-8 rounded-[3rem] text-left group hover:border-fest-gold/40 transition-all flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start mb-8">
                          <div className="w-14 h-14 rounded-2xl bg-fest-gold/10 flex items-center justify-center text-fest-gold">
                            <CheckCircle2 size={28} />
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-white/30 uppercase tracking-[0.25em] mb-1">Qualified</div>
                            <div className="text-sm font-bold text-fest-gold uppercase tracking-tighter">{qualifiedCount}</div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-2xl font-display font-extrabold uppercase tracking-tighter mb-4 group-hover:text-fest-gold transition-colors">
                            {event.title}
                          </h3>
                          <div className="text-sm text-white/45 mb-6">{event.category}</div>
                          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/5 text-xs uppercase tracking-widest">
                            <div>
                              <div className="text-white/25">Total</div>
                              <div className="text-white mt-2 font-bold">{eventRows.length}</div>
                            </div>
                            <div>
                              <div className="text-white/25">Out</div>
                              <div className="text-red-400 mt-2 font-bold">{eliminatedCount}</div>
                            </div>
                            <div className="flex items-end justify-end">
                              <ChevronRight className="text-white/20 group-hover:text-fest-gold transition-all" size={20} />
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-8">
                  <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => setSelectedQualifiedEventId('')}
                        className="w-12 h-12 rounded-full glass flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <ArrowLeft size={24} />
                      </button>
                      <div>
                        <h3 className="text-3xl md:text-4xl font-display font-extrabold uppercase tracking-tighter">
                          {selectedQualifiedEvent?.title}
                        </h3>
                        <p className="text-fest-gold-light text-xs font-bold uppercase tracking-widest mt-1 opacity-60">
                          {selectedQualifiedEvent?.category} | {registrations.filter((registration) => registration.event_id === selectedQualifiedEventId).length} Registered
                        </p>
                      </div>
                    </div>
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={16} />
                      <input
                        type="text"
                        value={qualificationSearch}
                        onChange={(e) => setQualificationSearch(e.target.value)}
                        placeholder="Search participants"
                        className="w-full rounded-2xl bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm outline-none focus:border-fest-gold"
                      />
                    </div>
                  </header>

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[
                      { id: 'all' as const, label: 'All', tone: 'text-white' },
                      { id: 'round_1_qualified' as const, label: '1st Round', tone: 'text-fest-gold' },
                      { id: 'round_2_qualified' as const, label: '2nd Round', tone: 'text-fest-gold' },
                      { id: 'semifinal' as const, label: 'Semifinal', tone: 'text-fest-gold' },
                      { id: 'final' as const, label: 'Final', tone: 'text-green-400' },
                      { id: 'eliminated' as const, label: 'Eliminated', tone: 'text-red-400' },
                    ].map((stage) => (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setActiveQualifiedStage(stage.id)}
                        className={`rounded-3xl border p-4 text-left transition-all ${
                          activeQualifiedStage === stage.id
                            ? 'border-fest-gold bg-fest-gold/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className={`text-sm font-bold uppercase tracking-widest ${stage.tone}`}>{stage.label}</div>
                        <div className="text-[10px] uppercase tracking-widest text-white/30 mt-2">Open list</div>
                      </button>
                    ))}
                  </div>

                  {selectedQualifiedEventRows.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center text-white/35">
                      No participants found in this stage.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {selectedQualifiedEventRows.map((registration) => {
                        const participantName = registration.participant_name || registration.participant_user?.full_name || registration.participant_user?.email || 'Participant';
                        return (
                          <div key={registration.id} className="rounded-3xl border border-white/10 bg-black/20 p-6 space-y-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="text-lg font-bold">{participantName}</h4>
                                <p className="text-xs text-white/40 mt-1">{registration.email || registration.participant_user?.email}</p>
                              </div>
                              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white/75">
                                {registration.qualification_stage.replaceAll('_', ' ')}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="rounded-2xl bg-white/5 p-4">
                                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Phone</div>
                                <div className="font-semibold">{registration.phone}</div>
                              </div>
                              <div className="rounded-2xl bg-white/5 p-4">
                                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Team</div>
                                <div className="font-semibold">{registration.team_name || 'Solo'}</div>
                              </div>
                            </div>

                            <textarea
                              value={qualificationNotes[registration.id] || ''}
                              onChange={(e) => setQualificationNotes((current) => ({ ...current, [registration.id]: e.target.value }))}
                              placeholder="Qualification note"
                              className="w-full h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-fest-gold resize-none"
                            />

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {[
                                { id: 'round_1_qualified', label: '1st Round' },
                                { id: 'round_2_qualified', label: '2nd Round' },
                                { id: 'semifinal', label: 'Semifinal' },
                                { id: 'final', label: 'Final' },
                                { id: 'eliminated', label: 'Eliminate' },
                              ].map((stage) => (
                                <button
                                  key={stage.id}
                                  type="button"
                                  onClick={() => void handleQualificationStage(registration, stage.id as QualificationStage)}
                                  disabled={actionLoadingId === registration.id}
                                  className={`py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors ${
                                    stage.id === 'eliminated'
                                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'
                                      : 'bg-fest-gold/10 text-fest-gold hover:bg-fest-gold hover:text-fest-dark'
                                  } disabled:opacity-60`}
                                >
                                  {stage.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'ui' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-6 space-y-5">
                  <div>
                    <h3 className="text-xl font-bold">Landing Page Slideshow</h3>
                    <p className="text-white/45 text-sm mt-1">Add slideshow images and control how many seconds each image stays on screen.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                    <div className="w-full sm:w-40">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-2">Duration Sec</label>
                      <input
                        type="number"
                        min={1}
                        value={newSlideDuration}
                        onChange={(e) => setNewSlideDuration(Number(e.target.value))}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                      />
                    </div>
                    <label className="px-5 py-3 rounded-2xl bg-fest-gold text-fest-dark font-bold uppercase tracking-widest text-xs cursor-pointer hover:bg-fest-gold-light transition-all flex items-center gap-2">
                      <ImagePlus size={16} /> Add Slide
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleSlideUpload(file);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    {heroSlides.map((slide) => (
                      <div key={slide.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col md:flex-row md:items-center gap-4">
                        <img src={slide.image_url} alt="Slide" className="w-full md:w-40 h-24 object-cover rounded-xl border border-white/10" />
                        <div className="flex-1">
                          <div className="text-sm font-bold">Slide #{slide.display_order + 1}</div>
                          <div className="text-xs text-white/45 mt-1">Shows for {slide.duration_seconds} seconds</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSlide(slide.id)}
                          className="px-4 py-2 rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                    {heroSlides.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-white/30 text-sm">
                        No slideshow images added yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-6 space-y-5">
                  <div>
                    <h3 className="text-xl font-bold">About The Event</h3>
                    <p className="text-white/45 text-sm mt-1">Control the landing page event introduction dynamically.</p>
                  </div>

                  <input
                    placeholder="Main title"
                    value={siteContent.home_about_event.title || ''}
                    onChange={(e) => setSiteContent((current) => ({
                      ...current,
                      home_about_event: { ...current.home_about_event, title: e.target.value },
                    }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                  />
                  <input
                    placeholder="Highlighted subtitle"
                    value={siteContent.home_about_event.subtitle || ''}
                    onChange={(e) => setSiteContent((current) => ({
                      ...current,
                      home_about_event: { ...current.home_about_event, subtitle: e.target.value },
                    }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                  />
                  <textarea
                    placeholder="About the event description"
                    value={siteContent.home_about_event.body || ''}
                    onChange={(e) => setSiteContent((current) => ({
                      ...current,
                      home_about_event: { ...current.home_about_event, body: e.target.value },
                    }))}
                    className="w-full h-36 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => void saveSiteContent('home_about_event')}
                    disabled={uiSaving}
                    className="px-5 py-3 rounded-2xl bg-fest-gold text-fest-dark font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-fest-gold-light transition-all"
                  >
                    <Save size={16} /> Save Event Content
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-6 space-y-5">
                  <div>
                    <h3 className="text-xl font-bold">About The College</h3>
                    <p className="text-white/45 text-sm mt-1">Control the college section text, image and highlights.</p>
                  </div>

                  <input
                    placeholder="Title"
                    value={siteContent.home_about_college.title || ''}
                    onChange={(e) => setSiteContent((current) => ({
                      ...current,
                      home_about_college: { ...current.home_about_college, title: e.target.value },
                    }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                  />
                  <input
                    placeholder="Highlighted word"
                    value={siteContent.home_about_college.subtitle || ''}
                    onChange={(e) => setSiteContent((current) => ({
                      ...current,
                      home_about_college: { ...current.home_about_college, subtitle: e.target.value },
                    }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                  />
                  <textarea
                    placeholder="College description"
                    value={siteContent.home_about_college.body || ''}
                    onChange={(e) => setSiteContent((current) => ({
                      ...current,
                      home_about_college: { ...current.home_about_college, body: e.target.value },
                    }))}
                    className="w-full h-36 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold resize-none"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      placeholder="Highlight 1 value"
                      value={String(siteContent.home_about_college.metadata?.highlight_one_value || '')}
                      onChange={(e) => setSiteContent((current) => ({
                        ...current,
                        home_about_college: {
                          ...current.home_about_college,
                          metadata: { ...current.home_about_college.metadata, highlight_one_value: e.target.value },
                        },
                      }))}
                      className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                    />
                    <input
                      placeholder="Highlight 1 label"
                      value={String(siteContent.home_about_college.metadata?.highlight_one_label || '')}
                      onChange={(e) => setSiteContent((current) => ({
                        ...current,
                        home_about_college: {
                          ...current.home_about_college,
                          metadata: { ...current.home_about_college.metadata, highlight_one_label: e.target.value },
                        },
                      }))}
                      className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                    />
                    <input
                      placeholder="Highlight 2 value"
                      value={String(siteContent.home_about_college.metadata?.highlight_two_value || '')}
                      onChange={(e) => setSiteContent((current) => ({
                        ...current,
                        home_about_college: {
                          ...current.home_about_college,
                          metadata: { ...current.home_about_college.metadata, highlight_two_value: e.target.value },
                        },
                      }))}
                      className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                    />
                    <input
                      placeholder="Highlight 2 label"
                      value={String(siteContent.home_about_college.metadata?.highlight_two_label || '')}
                      onChange={(e) => setSiteContent((current) => ({
                        ...current,
                        home_about_college: {
                          ...current.home_about_college,
                          metadata: { ...current.home_about_college.metadata, highlight_two_label: e.target.value },
                        },
                      }))}
                      className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors text-sm font-medium">
                      <ImageIcon size={16} /> Upload College Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const imageUrl = await uploadAsset(file, 'college');
                            setSiteContent((current) => ({
                              ...current,
                              home_about_college: { ...current.home_about_college, image_url: imageUrl },
                            }));
                            toast.success('College image uploaded.');
                          } catch (err: any) {
                            toast.error(err.message || 'Could not upload college image.');
                          }
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                    {siteContent.home_about_college.image_url ? (
                      <img src={siteContent.home_about_college.image_url || ''} alt="College preview" className="w-full h-40 object-cover rounded-2xl border border-white/10" />
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveSiteContent('home_about_college')}
                    disabled={uiSaving}
                    className="px-5 py-3 rounded-2xl bg-fest-gold text-fest-dark font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-fest-gold-light transition-all"
                  >
                    <Save size={16} /> Save College Content
                  </button>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-6 space-y-5">
                  <div>
                    <h3 className="text-xl font-bold">Universal Guidelines</h3>
                    <p className="text-white/45 text-sm mt-1">Add and remove the guidelines shown on the landing page and rules page.</p>
                  </div>
                  <textarea
                    placeholder="Add a universal guideline"
                    value={ruleForm.rule_text}
                    onChange={(e) => setRuleForm((current) => ({ ...current, rule_text: e.target.value }))}
                    className="w-full h-24 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold resize-none"
                  />
                  <div className="flex gap-4 items-end">
                    <div className="w-40">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-2">Display Order</label>
                      <input
                        type="number"
                        value={ruleForm.display_order}
                        onChange={(e) => setRuleForm((current) => ({ ...current, display_order: Number(e.target.value) }))}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAddGuideline()}
                      className="px-5 py-3 rounded-2xl bg-fest-gold text-fest-dark font-bold uppercase tracking-widest text-xs hover:bg-fest-gold-light transition-all"
                    >
                      {editingGuidelineId ? 'Update Guideline' : 'Add Guideline'}
                    </button>
                    {editingGuidelineId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGuidelineId(null);
                          setRuleForm({ rule_text: '', display_order: 0 });
                        }}
                        className="px-5 py-3 rounded-2xl border border-white/10 text-white/70 font-bold uppercase tracking-widest text-xs hover:bg-white/5 transition-all"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    {guidelineEntries.map((rule) => (
                      <div key={rule.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start justify-between gap-4">
                        <div className="text-sm text-white/75">{rule.rule_text}</div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingGuideline(rule)}
                            className="px-3 py-2 rounded-xl bg-fest-gold/10 text-fest-gold hover:bg-fest-gold hover:text-fest-dark transition-colors text-xs font-bold uppercase tracking-widest"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteGuideline(rule.id)}
                            className="px-3 py-2 rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {guidelineEntries.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-white/30 text-sm">
                        No guidelines added yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-6 space-y-5">
                <div>
                  <h3 className="text-xl font-bold">Organizing Committee</h3>
                  <p className="text-white/45 text-sm mt-1">Add committee photos, names, and designations dynamically from the backend.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <input
                    placeholder="Name"
                    value={committeeForm.name}
                    onChange={(e) => setCommitteeForm((current) => ({ ...current, name: e.target.value }))}
                    className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                  />
                  <input
                    placeholder="Designation"
                    value={committeeForm.role}
                    onChange={(e) => setCommitteeForm((current) => ({ ...current, role: e.target.value }))}
                    className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                  />
                  <input
                    type="number"
                    placeholder="Display Order"
                    value={committeeForm.display_order}
                    onChange={(e) => setCommitteeForm((current) => ({ ...current, display_order: Number(e.target.value) }))}
                    className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold"
                  />
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors text-sm font-medium">
                    <ImageIcon size={16} /> Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const imageUrl = await uploadAsset(file, 'committee');
                          setCommitteeForm((current) => ({ ...current, image_url: imageUrl }));
                          toast.success('Committee photo uploaded.');
                        } catch (err: any) {
                          toast.error(err.message || 'Could not upload committee photo.');
                        }
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddCommitteeMember()}
                  className="px-5 py-3 rounded-2xl bg-fest-gold text-fest-dark font-bold uppercase tracking-widest text-xs hover:bg-fest-gold-light transition-all"
                >
                  Add Committee Member
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {committeeEntries.map((member) => (
                    <div key={member.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <img src={member.image_url} alt={member.name} className="w-full h-40 object-cover rounded-2xl border border-white/10 mb-4" />
                      <div className="font-bold text-lg">{member.name}</div>
                      <div className="text-sm text-white/50 mt-1">{member.role}</div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteCommitteeMember(member.id)}
                        className="mt-4 px-4 py-2 rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {committeeEntries.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-12 text-center text-white/30 text-sm">
                      No committee members added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'users' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase tracking-widest text-xs">
                    <th className="pb-4 font-bold">Name</th>
                    <th className="pb-4 font-bold">Email</th>
                    <th className="pb-4 font-bold">Phone</th>
                    <th className="pb-4 font-bold">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((entry) => (
                    <tr key={entry.id} className="border-b border-white/5">
                      <td className="py-4 font-bold">{entry.full_name || 'No name'}</td>
                      <td className="py-4 text-white/60 text-sm">{entry.email}</td>
                      <td className="py-4 text-white/60 text-sm">{entry.phone || '-'}</td>
                      <td className="py-4">
                        <select
                          value={entry.role}
                          onChange={(e) => void handleRoleChange(entry.id, e.target.value as AppRole)}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest text-fest-gold outline-none focus:border-fest-gold"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'assignments' ? (
            <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-8">
              <form onSubmit={handleAssignmentCreate} className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-6">
                <div className="text-fest-gold font-bold uppercase tracking-widest text-sm">Assign Reviewer To Event</div>
                <select value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold">
                  <option value="">Select reviewer</option>
                  {users.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.full_name || entry.email}</option>
                  ))}
                </select>
                <select value={assignmentEventId} onChange={(e) => setAssignmentEventId(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-fest-gold">
                  <option value="">Select event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
                <button type="submit" className="w-full py-4 bg-fest-gold text-fest-dark font-black uppercase tracking-widest rounded-xl hover:bg-fest-gold-light transition-all shadow-lg glow-gold">
                  Save Assignment
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 uppercase tracking-widest text-xs">
                      <th className="pb-4 font-bold">Reviewer</th>
                      <th className="pb-4 font-bold">Event</th>
                      <th className="pb-4 font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="border-b border-white/5">
                        <td className="py-4 font-bold">{assignment.reviewer_user?.full_name || assignment.reviewer_user?.email}</td>
                        <td className="py-4 text-white/60 text-sm">{assignment.assigned_event?.title}</td>
                        <td className="py-4">
                          <button onClick={() => void handleDeleteAssignment(assignment.id)} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/20">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {!selectedEventId ? (
                // --- EVENT LIST VIEW ---
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {events.map((event) => {
                    const eventRows = registrations.filter((r) => r.event_id === event.id);
                    return (
                      <motion.button
                        key={event.id}
                        onClick={() => setSelectedEventId(event.id)}
                        whileHover={{ y: -5 }}
                        className="glass p-8 rounded-[3rem] text-left group hover:border-fest-gold/40 transition-all flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start mb-8">
                          <div className="w-14 h-14 rounded-2xl bg-fest-gold/10 flex items-center justify-center text-fest-gold">
                            <CalendarDays size={28} />
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-white/30 uppercase tracking-[0.25em] mb-1">Type</div>
                            <div className="text-sm font-bold text-fest-gold uppercase tracking-tighter">{event.category}</div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-2xl font-display font-extrabold uppercase tracking-tighter mb-6 group-hover:text-fest-gold transition-colors">
                            {event.title}
                          </h3>
                          <div className="flex items-center justify-between pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 text-fest-gold-light">
                              <Users size={18} />
                              <span className="font-bold text-sm tracking-widest">{eventRows.length} Students</span>
                            </div>
                            <ChevronRight className="text-white/20 group-hover:text-fest-gold transition-all" size={20} />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                  {events.length === 0 && (
                    <div className="col-span-full py-20 text-center text-white/20 font-bold uppercase tracking-widest text-xs border border-dashed border-white/10 rounded-[3rem]">
                      No events created yet
                    </div>
                  )}
                </div>
              ) : (
                // --- REGISTRATION DETAIL VIEW ---
                <div className="space-y-8">
                  <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => setSelectedEventId(null)}
                        className="w-12 h-12 rounded-full glass flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <ArrowLeft size={24} />
                      </button>
                      <div>
                        <h3 className="text-3xl md:text-4xl font-display font-extrabold uppercase tracking-tighter">
                          {events.find((e) => e.id === selectedEventId)?.title}
                        </h3>
                        <p className="text-fest-gold-light text-xs font-bold uppercase tracking-widest mt-1 opacity-60">
                          {events.find((e) => e.id === selectedEventId)?.category} — {registrations.filter((r) => r.event_id === selectedEventId).length} Participants
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const event = events.find((e) => e.id === selectedEventId);
                        const rows = registrations.filter((r) => r.event_id === selectedEventId);
                        if (event) exportRegistrationsForEvent(event, rows);
                      }}
                      className="px-8 py-4 bg-fest-gold text-fest-dark rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-fest-dark transition-all flex items-center justify-center gap-2 shadow-lg glow-gold"
                    >
                      <Download size={16} /> Export Excel
                    </button>
                  </header>

                  <div className="overflow-x-auto glass rounded-[3rem] border border-white/10">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="border-b border-white/5 text-white/30 uppercase tracking-widest text-[10px]">
                          <th className="px-10 py-8 font-bold">Full Name</th>
                          <th className="px-10 py-8 font-bold">College / Dept</th>
                          <th className="px-10 py-8 font-bold">Contact Details</th>
                          <th className="px-10 py-8 font-bold">Status</th>
                          <th className="px-10 py-8 font-bold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.filter((r) => r.event_id === selectedEventId).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-24 text-center text-white/20 font-bold uppercase tracking-widest text-xs">
                              No participants registered for this event yet
                            </td>
                          </tr>
                        ) : (
                          registrations
                            .filter((r) => r.event_id === selectedEventId)
                            .map((reg) => (
                              <tr key={reg.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                <td className="px-10 py-8">
                                  <div className="font-bold text-white text-lg tracking-tight">
                                    {reg.participant_name || reg.participant_user?.full_name || 'N/A'}
                                  </div>
                                </td>
                                <td className="px-10 py-8 text-white/50 text-sm">
                                  <div className="font-medium text-white/70">{reg.college_name}</div>
                                  <div className="text-xs uppercase tracking-widest mt-1 opacity-40">{reg.team_name || 'Solo'}</div>
                                </td>
                                <td className="px-10 py-8">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-white/60 text-xs">
                                      <Mail size={12} className="text-fest-gold/60" /> {reg.email || reg.participant_user?.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-white/60 text-xs">
                                      <Phone size={12} className="text-fest-gold/60" /> {reg.phone}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-10 py-8">
                                  <div className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                    reg.payment_status === 'approved' 
                                      ? 'border-green-500/20 bg-green-500/10 text-green-400' 
                                      : 'border-white/10 bg-white/5 text-white/40'
                                  }`}>
                                    {reg.payment_status}
                                  </div>
                                </td>
                                <td className="px-10 py-8 text-right">
                                  <button 
                                    onClick={() => {
                                      const name = reg.participant_name || reg.participant_user?.full_name || reg.participant_user?.email || 'N/A';
                                      void handleDeleteRegistration(reg.id, name);
                                    }} 
                                    className="p-3 text-white/20 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
