// ==========================================
// Phase 33 — moderation hooks used by `publish-meme`.
// 33.2 ships these as FAIL-CLOSED placeholders: until a provider is wired in (33.3 images,
// 33.4 text) every verdict is 'review', so new memes land as `pending` (visible only to the
// uploader) and are NEVER auto-approved.
//
// Verdict shape: { decision: 'approve' | 'review' | 'reject', provider, reason, categories? }
// ==========================================

export async function moderateImage(/* { bytes, contentType, frames, env } */) {
  return { decision: 'review', provider: 'none', reason: 'image_moderation_not_configured' };
}

export async function moderateText(/* { texts, env } */) {
  return { decision: 'review', provider: 'none', reason: 'text_moderation_not_configured' };
}
