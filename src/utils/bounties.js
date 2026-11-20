// ==========================================
// Workstream 1 — weekly bounty (server: public.bounties, written by the house agent and
// approved in /admin/house). Entries are normal publishes with is_bounty + bounty_id; when the
// week ends the best approved HUMAN entry wins the M$ prize (bounty_awards, claimed once).
// ==========================================
import { supabase } from '../supabaseClient';

/** Server row → the shape the Forge's bounty intent and useFeed's publish path expect. */
export function toClientBounty(row) {
  if (!row?.id) return null;
  const image = row.image_url || (row.template_id ? `/seed/${row.template_id}.webp` : null);
  return {
    id: row.id,
    tag: row.tag,
    prompt: row.prompt,
    category: row.category || 'relatable',
    defaultTop: row.default_top || '',
    defaultBottom: row.default_bottom || '',
    prizeMdollarz: Number(row.prize_mdollarz) || 0,
    endsAt: row.ends_at,
    template: row.template_id ? { id: row.template_id } : null,
    baseMeme: image
      ? { id: row.template_id, image_url: image, base_image_url: image, media_type: 'image', category: row.category }
      : null
  };
}

export async function fetchActiveBounty(client = supabase) {
  if (!client?.rpc) return { ok: false, bounty: null, myAward: null };
  try {
    const { data, error } = await client.rpc('get_active_bounty');
    if (error || !data?.ok) return { ok: false, bounty: null, myAward: null };
    return { ok: true, bounty: toClientBounty(data.bounty), myAward: data.my_award || null };
  } catch {
    return { ok: false, bounty: null, myAward: null };
  }
}

export async function claimBountyAward(bountyId, client = supabase) {
  if (!client?.rpc || !bountyId) return { ok: false, error: 'offline' };
  const { data, error } = await client.rpc('claim_bounty_award', { p_bounty_id: bountyId });
  if (error) return { ok: false, error: error.message || 'claim_failed' };
  return data || { ok: false, error: 'claim_failed' };
}

/** "3d 4h left" style countdown (never negative). */
export function bountyTimeLeft(endsAt, now = Date.now()) {
  const ms = Math.max(0, Date.parse(endsAt || '') - now);
  if (!Number.isFinite(ms) || ms <= 0) return 'ending now';
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return `${h}h ${Math.floor((ms % 3600000) / 60000)}m left`;
}
