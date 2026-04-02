import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DatabaseEvent, Faculty, CommitteeMember, GeneralRule, SiteContent } from '../types';

export function useEvents() {
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*, registrations(count)');
        
        if (error) throw error;
        
        // Map to include calculated prize pool and participants count
        const formattedEvents = (data || []).map((row: any) => {
          const participantsCount = row.registrations?.[0]?.count || 0;
          return {
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
            drive_folder_id: row.drive_folder_id,
            drive_embed_hint: row.drive_embed_hint,
            is_active: row.is_active,
            participants_count: participantsCount,
          };
        });
        
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
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFaculty() {
      try {
        const { data, error } = await supabase
          .from('faculty')
          .select('*');
        
        if (error) throw error;
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
  const [committee, setCommittee] = useState<CommitteeMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCommittee() {
      try {
        const { data, error } = await supabase
          .from('committee')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (error) throw error;
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
  const [rules, setRules] = useState<GeneralRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRules() {
      try {
        const { data, error } = await supabase
          .from('general_rules')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (error) throw error;
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
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const { data, error } = await supabase
          .from('site_content')
          .select('*')
          .eq('content_key', contentKey)
          .maybeSingle();

        if (error) throw error;
        setContent((data as SiteContent | null) || null);
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
