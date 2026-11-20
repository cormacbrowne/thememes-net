import process from 'node:process';
import { getLevelForXp } from '../src/config/progression.js';
import { renderProfileOgPng } from './_pngCard.js';

const DEFAULT_SUPABASE_URL = 'https://otvvphmjojqyjaznjzyo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_IcrXK6kDdGaWZo9rU0GFRg_ZxtaY-wB';

async function fetchCreatorSummary(handle) {
  const supabaseUrl = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ).replace(/\/+$/, '');
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_creator_profile`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ p_handle: handle.toLowerCase() }),
      signal: controller.signal
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ok ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  const rawHandle = String(req.query?.handle || '').trim().replace(/^@+/, '');
  const cleanHandle = /^[a-zA-Z0-9_-]{2,32}$/.test(rawHandle) ? rawHandle : 'Creator';
  const live = cleanHandle !== 'Creator' ? await fetchCreatorSummary(cleanHandle) : null;

  const memesCount = Number(live?.stats?.memes_count || 0);
  const totalScore = Number(live?.stats?.total_score || 0);
  const totalRemixes = Number(live?.stats?.total_remixes || 0);
  const fallbackXp = Math.round(totalScore * 0.65) + totalRemixes * 50 + memesCount * 100;
  const xp = Math.max(Number(live?.xp || 0), fallbackXp);
  const levelInfo = getLevelForXp(xp);

  const png = renderProfileOgPng({
    handle: live?.handle || cleanHandle,
    level: levelInfo.level,
    levelTitle: levelInfo.title,
    battleWins: Number(live?.caption_wins || 0),
    streakDays: Number(live?.streak_days || 0),
    avatarId: live?.avatar_id || null
  });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(png);
}
