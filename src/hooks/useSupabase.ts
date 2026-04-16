import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { DatabaseEvent, Faculty, CommitteeMember, GeneralRule, SiteContent } from '../types';

// ─── Global in-memory cache with TTL ─────────────────────────────────
// Prevents redundant Supabase requests when users navigate between pages
// in a single session. Data is refetched only after the TTL expires.
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

// ─── Events (selective columns + registration count) ─────────────────
export function useEvents() {
  const cached = getCached<DatabaseEvent[]>('events');
  const [events, setEvents] = useState<DatabaseEvent[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    // Skip fetch if cache is still fresh
    if (getCached<DatabaseEvent[]>('events')) {
      setEvents(getCached<DatabaseEvent[]>('events')!);
      setLoading(false);
      return;
    }

    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, slug, category, description, entry_fee, image_url, rules, max_team_size, payment_account_name, payment_account_number, payment_ifsc, payment_upi_id, is_active, sub_categories, requires_team_details, registrations(count)');
        
        if (error) throw error;
        
        const formattedEvents = (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          slug: row.slug,
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
          sub_categories: row.sub_categories,
          requires_team_details: row.requires_team_details,
          participants_count: row.registrations?.[0]?.count || 0,
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

// ─── Faculty ─────────────────────────────────────────────────────────
export function useFaculty() {
  const cached = getCached<Faculty[]>('faculty');
  const [faculty, setFaculty] = useState<Faculty[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (getCached<Faculty[]>('faculty')) {
      setFaculty(getCached<Faculty[]>('faculty')!);
      setLoading(false);
      return;
    }

    async function fetchFaculty() {
      try {
        const { data, error } = await supabase
          .from('faculty')
          .select('id, name, designation, image_url, department');
        if (error) throw error;
        
        setCache('faculty', data || []);
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
        const { data, error } = await supabase
          .from('committee')
          .select('id, name, role, image_url, display_order')
          .order('display_order', { ascending: true });
        
        if (error) throw error;
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
        const { data, error } = await supabase
          .from('general_rules')
          .select('id, rule_text, display_order')
          .order('display_order', { ascending: true });
        
        if (error) throw error;
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

// ─── Single Site Content (kept for backward compat) ──────────────────
export function useSiteContent(contentKey: string) {
  const cacheKey = `site_content_${contentKey}`;
  const cached = getCached<SiteContent | null>(cacheKey);
  const [content, setContent] = useState<SiteContent | null>(cached);
  const [loading, setLoading] = useState(cached === null && !getCached(cacheKey));

  useEffect(() => {
    if (getCached<SiteContent | null>(cacheKey) !== null) {
      setContent(getCached<SiteContent | null>(cacheKey));
      setLoading(false);
      return;
    }

    async function fetchContent() {
      try {
        const { data, error } = await supabase
          .from('site_content')
          .select('id, content_key, title, subtitle, body, secondary_body, image_url, metadata')
          .eq('content_key', contentKey)
          .maybeSingle();

        if (error) throw error;
        const result = (data as SiteContent | null) || null;
        setCache(cacheKey, result);
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

// ─── Batched Site Content (fetches multiple keys in 1 request) ────────
// Use this on pages that need multiple content keys (Home, About)
// instead of calling useSiteContent() multiple times.
export function useSiteContentBatch(contentKeys: string[]) {
  const cacheKey = `site_content_batch_${contentKeys.sort().join(',')}`;
  const cached = getCached<Record<string, SiteContent>>(cacheKey);
  const [contentMap, setContentMap] = useState<Record<string, SiteContent>>(cached || {});
  const [loading, setLoading] = useState(!cached);

  // Use a ref to avoid re-fetching when the array reference changes but contents don't
  const keysRef = useRef(contentKeys.sort().join(','));

  useEffect(() => {
    const keysStr = contentKeys.sort().join(',');
    if (keysStr !== keysRef.current) {
      keysRef.current = keysStr;
    }

    const batchCacheKey = `site_content_batch_${keysStr}`;
    const existing = getCached<Record<string, SiteContent>>(batchCacheKey);
    if (existing) {
      setContentMap(existing);
      setLoading(false);
      return;
    }

    async function fetchBatch() {
      try {
        const { data, error } = await supabase
          .from('site_content')
          .select('id, content_key, title, subtitle, body, secondary_body, image_url, metadata')
          .in('content_key', contentKeys);

        if (error) throw error;

        const map: Record<string, SiteContent> = {};
        ((data as SiteContent[]) || []).forEach((entry) => {
          map[entry.content_key] = entry;
          // Also populate individual caches so useSiteContent() benefits
          setCache(`site_content_${entry.content_key}`, entry);
        });

        setCache(batchCacheKey, map);
        setContentMap(map);
      } catch (error) {
        console.error('Error fetching batched site content:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBatch();
  }, [contentKeys.sort().join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return { contentMap, loading };
}
