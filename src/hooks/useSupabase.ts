import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DatabaseEvent, Faculty, CommitteeMember, GeneralRule, SiteContent } from '../types';

// Simple global in-memory cache for static content
const cache: Record<string, any> = {};

export function useEvents() {
  const [events, setEvents] = useState<DatabaseEvent[]>(cache.events || []);
  const [loading, setLoading] = useState(!cache.events);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*, registrations(count)');
        
        if (error) throw error;
        
        const formattedEvents = (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          description: row.description,
          entry_fee: Number(row.entry_fee || 0),
          image_url: row.image_url,
          rules: row.rules || [],
          max_team_size: row.max_team_size,
          payment_account_name: row.payment_account_name,
          payment_account_number: row.payment_account_number,
          payment_ifsc: row.payment_ifsc,
          payment_upi_id: row.payment_upi_id,
          is_active: row.is_active,
          participants_count: row.registrations?.[0]?.count || 0,
        }));
        
        cache.events = formattedEvents;
        setEvents(formattedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  return { events, loading };
}

export function useFaculty() {
  const [faculty, setFaculty] = useState<Faculty[]>(cache.faculty || []);
  const [loading, setLoading] = useState(!cache.faculty);

  useEffect(() => {
    async function fetchFaculty() {
      try {
        const { data, error } = await supabase.from('faculty').select('*');
        if (error) throw error;
        
        cache.faculty = data || [];
        setFaculty(data || []);
      } catch (error) {
        console.error('Error fetching faculty:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchFaculty();
  }, []);

  return { faculty, loading };
}

export function useCommittee() {
  const [committee, setCommittee] = useState<CommitteeMember[]>(cache.committee || []);
  const [loading, setLoading] = useState(!cache.committee);

  useEffect(() => {
    async function fetchCommittee() {
      try {
        const { data, error } = await supabase
          .from('committee')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        cache.committee = data || [];
        setCommittee(data || []);
      } catch (error) {
        console.error('Error fetching committee:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCommittee();
  }, []);

  return { committee, loading };
}

export function useGeneralRules() {
  const [rules, setRules] = useState<GeneralRule[]>(cache.general_rules || []);
  const [loading, setLoading] = useState(!cache.general_rules);

  useEffect(() => {
    async function fetchRules() {
      try {
        const { data, error } = await supabase
          .from('general_rules')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        cache.general_rules = data || [];
        setRules(data || []);
      } catch (error) {
        console.error('Error fetching general rules:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRules();
  }, []);

  return { rules, loading };
}

export function useSiteContent(contentKey: string) {
  const cacheKey = `site_content_${contentKey}`;
  const [content, setContent] = useState<SiteContent | null>(cache[cacheKey] || null);
  const [loading, setLoading] = useState(!cache[cacheKey]);

  useEffect(() => {
    async function fetchContent() {
      try {
        const { data, error } = await supabase
          .from('site_content')
          .select('*')
          .eq('content_key', contentKey)
          .maybeSingle();

        if (error) throw error;
        const result = (data as SiteContent | null) || null;
        cache[cacheKey] = result;
        setContent(result);
      } catch (error) {
        console.error(`Error fetching site content for ${contentKey}:`, error);
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [contentKey]);

  return { content, loading };
}
