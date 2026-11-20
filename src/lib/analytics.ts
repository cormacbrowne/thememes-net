// ==========================================
// ANALYTICS PROVIDER SWITCHBOARD — the only file that knows which providers exist.
// Every custom event in the app goes through track() here (via src/utils/analytics.js).
// To swap or add a provider, change this file only; call sites never change.
//
// Providers today:
// - Pulse   — our own first-party, cookieless stats in Supabase. Gets every event.
// - Umami   — Umami Cloud (free Hobby: 100K events/month). Gets page views automatically,
//             plus only the product events listed in UMAMI_EVENTS, under the public names.
// - Vercel Web Analytics — page views only (mounted in main.jsx). Custom events are a
//             Pro-plan feature, so we deliberately send none to Vercel on Hobby.
// ==========================================
import { pulse } from '../utils/pulse';
import { initUmami, umamiEvent } from './umami';

export type EventProps = Record<string, unknown>;
type CleanProps = Record<string, string | number | boolean>;

/**
 * In-app event name -> name shown in Umami. Pulse keeps the in-app names so its
 * server allowlist and existing reports keep working.
 */
export const UMAMI_EVENTS: Readonly<Record<string, string>> = Object.freeze({
  meme_created: 'meme_created',
  battle_entry: 'battle_entry',
  guess_the_meme_completed: 'guess_the_meme_played',
  meme_shared: 'share_clicked',
  prank_opened: 'prank_started',
  game_started: 'game_started'
});

/** Strings/numbers/booleans only, strings capped at 120 chars, no nested objects. */
export function cleanProps(props: EventProps = {}): CleanProps {
  const out: CleanProps = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 120);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else out[k] = String(v).slice(0, 120);
  }
  return out;
}

/** THE one analytics entry point: track(event, props). Never throws. */
export function track(eventName: string, props: EventProps = {}): void {
  if (!eventName || typeof window === 'undefined') return;
  try {
    const name = String(eventName);
    const clean = cleanProps(props);
    pulse(name, clean);
    const umamiName = UMAMI_EVENTS[name];
    if (umamiName) umamiEvent(umamiName, clean);
  } catch {
    // Ignore analytics transport or adblocker errors
  }
}

/** Starts third-party page-view analytics (called once, after first paint, from main.jsx). */
export function initAnalytics(): void {
  try {
    initUmami();
  } catch {
    // ignore
  }
}
