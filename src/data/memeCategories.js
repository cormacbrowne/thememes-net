// Meme categories (owner brief 17 Nov 2026, item 8).
// The live list comes from public.meme_categories, which moderators edit on /admin.
// DEFAULT_MEME_CATEGORIES is the offline fallback and the first paint, so it must match the seed
// rows in supabase/migrations/20261117000001_36_meme_categories.sql.
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';

export const DEFAULT_MEME_CATEGORIES = [
  { id: 'black-friday', label: 'Black Friday', emoji: '🛍️', sort: 1, trending: true },
  { id: 'christmas', label: 'Christmas', emoji: '🎄', sort: 2, trending: true },
  { id: 'tiktok-trends', label: 'TikTok Trends', emoji: '📱', sort: 3, trending: true },
  { id: 'dank', label: 'Dank', emoji: '😂', sort: 10, trending: false },
  { id: 'relatable', label: 'Relatable', emoji: '🫠', sort: 20, trending: false },
  { id: 'tech', label: 'Tech', emoji: '💻', sort: 30, trending: false },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', sort: 40, trending: false },
  { id: 'ai', label: 'AI', emoji: '🤖', sort: 50, trending: false },
  { id: 'work', label: 'Work & Office', emoji: '💼', sort: 60, trending: false },
  { id: 'school', label: 'School', emoji: '🎒', sort: 70, trending: false },
  { id: 'sports', label: 'Sports', emoji: '⚽', sort: 80, trending: false },
  { id: 'animals', label: 'Animals', emoji: '🐶', sort: 90, trending: false },
  { id: 'movies-tv', label: 'Movies & TV', emoji: '🎬', sort: 100, trending: false },
  { id: 'music', label: 'Music', emoji: '🎵', sort: 110, trending: false },
  { id: 'food', label: 'Food', emoji: '🍕', sort: 120, trending: false },
  { id: 'wholesome', label: 'Wholesome', emoji: '🥹', sort: 130, trending: false },
  { id: 'retro', label: 'Retro & 80s', emoji: '📼', sort: 140, trending: false }
];

const CACHE_KEY = 'tm_meme_categories_v1';
let memo = null;
let inflight = null;
const listeners = new Set();

function sortCats(list) {
  return [...list].sort((a, b) => (a.sort ?? 100) - (b.sort ?? 100) || a.label.localeCompare(b.label));
}

function readCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return Array.isArray(raw) && raw.length ? raw : null;
  } catch {
    return null;
  }
}

export function getMemeCategoriesSync() {
  return memo || readCache() || DEFAULT_MEME_CATEGORIES;
}

export function categoryLabel(id, list = getMemeCategoriesSync()) {
  const c = list.find((x) => x.id === id);
  return c ? c.label : String(id || 'meme');
}

/** Fetch active categories once per page load (moderators also see inactive ones when asked). */
export async function loadMemeCategories({ force = false, includeInactive = false } = {}) {
  if (memo && !force && !includeInactive) return memo;
  const client = getSupabaseClient();
  if (!client?.from) return getMemeCategoriesSync();
  if (inflight && !force && !includeInactive) return inflight;
  const run = (async () => {
    let q = client.from('meme_categories').select('id,label,emoji,sort,trending,active');
    if (!includeInactive) q = q.eq('active', true);
    const { data, error } = await q;
    if (error || !Array.isArray(data) || !data.length) return getMemeCategoriesSync();
    const sorted = sortCats(data);
    if (!includeInactive) {
      memo = sorted;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
      } catch {
        // ignore
      }
      listeners.forEach((fn) => fn(sorted));
    }
    return sorted;
  })();
  if (!includeInactive) inflight = run.finally(() => (inflight = null));
  return run;
}

/** React hook: categories for chips and pickers (instant fallback, live list when loaded). */
export function useMemeCategories() {
  const [cats, setCats] = useState(getMemeCategoriesSync);
  useEffect(() => {
    let alive = true;
    listeners.add(setCats);
    loadMemeCategories().then((list) => alive && setCats(list));
    return () => {
      alive = false;
      listeners.delete(setCats);
    };
  }, []);
  return cats;
}
