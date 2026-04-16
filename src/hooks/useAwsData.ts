import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { DatabaseEvent, CommitteeMember, GeneralRule, SiteContent } from '../types';

// ─── Global in-memory cache with TTL ─────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const cache: Record<string, CacheEntry<any>> = {};

function getCached<T>(key: string): T | null {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null; // stale
  return entry.data;
}

function setCache<T>(key: string, data: T) {
  cache[key] = { data, fetchedAt: Date.now() };
}

// ─── Events ──────────────────────────────────────────────────────────
export function useEvents() {
  const cached = getCached<DatabaseEvent[]>('events');
  const [events, setEvents] = useState<DatabaseEvent[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (getCached<DatabaseEvent[]>('events')) {
      setEvents(getCached<DatabaseEvent[]>('events')!);
      setLoading(false);
      return;
    }

    async function fetchEvents() {
      try {
        const data = await api.get<any[]>('/api/public?resource=events');
        
        const formattedEvents = (data || []).map((row: any) => ({
          ...row,
          entry_fee: Number(row.entry_fee || 0),
          participants_count: Number(row.participants_count || 0),
        }));
        
        setCache('events', formattedEvents);
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

// ─── Committee ───────────────────────────────────────────────────────
export function useCommittee() {
  const cached = getCached<CommitteeMember[]>('committee');
  const [committee, setCommittee] = useState<CommitteeMember[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (getCached<CommitteeMember[]>('committee')) {
      setCommittee(getCached<CommitteeMember[]>('committee')!);
      setLoading(false);
      return;
    }

    async function fetchCommittee() {
      try {
        const data = await api.get<CommitteeMember[]>('/api/public?resource=committee');
        setCache('committee', data || []);
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

// ─── General Rules ───────────────────────────────────────────────────
export function useGeneralRules() {
  const cached = getCached<GeneralRule[]>('general_rules');
  const [rules, setRules] = useState<GeneralRule[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (getCached<GeneralRule[]>('general_rules')) {
      setRules(getCached<GeneralRule[]>('general_rules')!);
      setLoading(false);
      return;
    }

    async function fetchRules() {
      try {
        const data = await api.get<GeneralRule[]>('/api/public?resource=general_rules');
        setCache('general_rules', data || []);
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

