// ==========================================
// ENGAGEMENT BADGES — thresholds for "🔥 VIRAL SUPERNOVA" / "⚡ HEATING UP" (plan 1.1).
//
// Badges are calculated ONLY from real engagement stored in the database:
//   score     = net real votes (public.votes)
//   reactions = active real reactions (public.reactions)
//   remixes   = mutation_count (real published remixes)
// Start low (the site is young) and raise these as traffic grows. Sample memes
// (@TheMemesHQ) never get an engagement badge.
//
// When engagement is below every threshold, an honest freshness label is shown
// instead: "NEW" for the first `newHours`, "FRESH" until `freshDays`, then nothing.
// ==========================================

export const ENGAGEMENT_TIERS = {
  supernova: { minScore: 25, minReactions: 40, minRemixes: 5 },
  heating: { minScore: 5, minReactions: 8, minRemixes: 2 },
  newHours: 24,
  freshDays: 7
};
