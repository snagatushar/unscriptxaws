import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DatabaseEvent, Faculty, CommitteeMember, GeneralRule } from '../types';

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
            base_prize: row.base_prize,
            per_participant_bonus: row.per_participant_bonus,
            image_url: row.image_url,
            participants_count: participantsCount,
            total_prize: row.base_prize + (participantsCount * row.per_participant_bonus)
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
