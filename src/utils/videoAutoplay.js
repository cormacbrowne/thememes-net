// ==========================================
// PHASE 26: ONE shared IntersectionObserver for feed videos.
// Autoplay muted when ≥60% visible, max 2 playing at once, pause off-screen.
// ==========================================
const MAX_PLAYING = 2;
const ratios = new Map(); // video -> intersection ratio
let observer = null;
let userGestured = false;

if (typeof window !== 'undefined') {
  const mark = () => {
    userGestured = true;
    window.removeEventListener('pointerdown', mark, true);
    window.removeEventListener('keydown', mark, true);
  };
  window.addEventListener('pointerdown', mark, true);
  window.addEventListener('keydown', mark, true);
}

export const hasUserGestured = () => userGestured;

function reconcile() {
  const ranked = [...ratios.entries()]
    .filter(([, r]) => r >= 0.6)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PLAYING)
    .map(([v]) => v);
  ratios.forEach((_, v) => {
    if (ranked.includes(v)) {
      if (v.paused) v.play().catch(() => {});
    } else if (!v.paused) {
      v.pause();
    }
  });
}

function getObserver() {
  if (observer || typeof IntersectionObserver === 'undefined') return observer;
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (ratios.has(e.target)) ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
      });
      reconcile();
    },
    { threshold: [0, 0.3, 0.6, 0.8, 1] }
  );
  return observer;
}

export function registerAutoplay(video) {
  const io = getObserver();
  if (!io || !video) return () => {};
  ratios.set(video, 0);
  io.observe(video);
  return () => {
    io.unobserve(video);
    ratios.delete(video);
    if (!video.paused) video.pause();
  };
}
