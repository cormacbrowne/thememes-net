import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ==========================================
// 1. SUPABASE CONFIGURATION & AUTO-CLIENT
// ==========================================
const SUPABASE_URL = 'https://otvvphmjojqyjaznjzyo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IcrXK6kDdGaWZo9rU0GFRg_ZxtaY-wB';

function getSupabaseClient() {
  if (typeof window !== 'undefined' && window.supabaseClient) {
    return window.supabaseClient;
  }
  if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window.supabaseClient;
  }
  return null;
}

// ==========================================
// 2. WEB AUDIO SYNTH SOUND ENGINE
// ==========================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playVote(isUp = true, combo = 1) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (isUp) {
        const baseFreq = 320 + Math.min(combo * 55, 600);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(95, now + 0.18);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.start(now);
        osc.stop(now + 0.19);
      }
    } catch (e) {
      // Ignore audio block errors before user interaction
    }
  }

  playPop(combo = 1) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      const freq = 480 + Math.min(combo * 40, 400);
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.4, now + 0.09);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  playMutate() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const freqs = [330, 493.88, 659.25, 987.77];
      freqs.forEach((f, idx) => {
        const now = this.ctx.currentTime + idx * 0.055;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      });
    } catch (e) {}
  }

  playLevelUp() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const now = this.ctx.currentTime + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      });
    } catch (e) {}
  }
}

const sfx = new SoundEngine();

// ==========================================
// 3. PROCEDURAL SVG MEME GENERATOR (ZERO BROKEN IMAGES)
// ==========================================
function makeSvgMeme({ bg1, bg2, badge, topText, bottomText, emoji, accent }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" width="100%" height="100%">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.85"/>
      </filter>
    </defs>
    <rect width="600" height="520" fill="url(#g)" />
    <circle cx="300" cy="260" r="170" fill="${accent}" opacity="0.14" />
    <circle cx="300" cy="260" r="115" fill="${accent}" opacity="0.1" />
    <rect x="20" y="20" width="560" height="480" rx="18" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
    <text x="300" y="295" font-size="125" text-anchor="middle" filter="url(#shadow)">${emoji}</text>
    <rect x="230" y="18" width="140" height="28" rx="14" fill="rgba(0,0,0,0.65)" />
    <text x="300" y="37" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="${accent}" text-anchor="middle" letter-spacing="1.5">${badge}</text>
    <text x="300" y="92" font-family="Impact, Arial Black, sans-serif" font-size="34" font-weight="900" fill="#ffffff" stroke="#000000" stroke-width="2" text-anchor="middle" filter="url(#shadow)" letter-spacing="1">${topText}</text>
    <text x="300" y="458" font-family="Impact, Arial Black, sans-serif" font-size="34" font-weight="900" fill="${accent}" stroke="#000000" stroke-width="2" text-anchor="middle" filter="url(#shadow)" letter-spacing="1">${bottomText}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const STARTER_MEMES = [
  {
    id: 'seed-1',
    title: 'Production deploys on a Friday at 4:59 PM',
    category: 'tech',
    author_name: 'NullPointerGod',
    score: 1420,
    generation: 0,
    mutation_count: 0,
    parent_meme_id: null,
    root_meme_id: 'seed-1',
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    reactions: { '🔥': 84, '💀': 142, '😂': 63, '🗿': 29 },
    image_url: makeSvgMeme({
      bg1: '#1a0b2e',
      bg2: '#3b0764',
      badge: 'DEV LIFE',
      topText: 'TESTS FAILED IN STAGING?',
      bottomText: 'FORCE PUSH TO MAIN ANYWAY',
      emoji: '🔥',
      accent: '#facc15'
    }),
    comments: [
      { id: 'c1', author_name: 'SeniorDev99', body: 'Closed my laptop immediately after git push --force.' },
      { id: 'c2', author_name: 'PagerDutyBot', body: 'See you at 2:14 AM King 💀' }
    ]
  },
  {
    id: 'seed-2',
    title: 'My brain at 3 AM calculating how much sleep I get if I fall asleep right now',
    category: 'relatable',
    author_name: 'SleepDeprived',
    score: 980,
    generation: 0,
    mutation_count: 0,
    parent_meme_id: null,
    root_meme_id: 'seed-2',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    reactions: { '🔥': 41, '💀': 210, '😂': 95, '🗿': 44 },
    image_url: makeSvgMeme({
      bg1: '#0f172a',
      bg2: '#1e1b4b',
      badge: '3:47 AM',
      topText: 'ALARM SET FOR 6:30 AM',
      bottomText: 'TIME FOR A 4-HOUR DOCUMENTARY',
      emoji: '🧠',
      accent: '#38bdf8'
    }),
    comments: [
      { id: 'c3', author_name: 'InsomniaCEO', body: 'Why is Wikipedia on 14th-century siege weapons so compelling at 3am?' }
    ]
  },
  {
    id: 'seed-3',
    title: 'When the code works on the very first compile with zero warnings',
    category: 'gaming',
    author_name: 'ShaderWizard',
    score: 2150,
    generation: 0,
    mutation_count: 0,
    parent_meme_id: null,
    root_meme_id: 'seed-3',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    reactions: { '🔥': 190, '💀': 64, '😂': 120, '🗿': 310 },
    image_url: makeSvgMeme({
      bg1: '#064e3b',
      bg2: '#022c22',
      badge: 'SUSPICIOUS',
      topText: 'ZERO ERRORS ON FIRST RUN',
      bottomText: 'SOMETHING IS TERRIBLY WRONG',
      emoji: '🗿',
      accent: '#34d399'
    }),
    comments: [
      { id: 'c4', author_name: 'QA_Destroyer', body: 'Plot twist: you forgot to save the file before running build.' }
    ]
  },
  {
    id: 'seed-4',
    title: 'Me explaining to my bank account why I needed another mechanical keyboard',
    category: 'dank',
    author_name: 'ThockMaster',
    score: 765,
    generation: 0,
    mutation_count: 0,
    parent_meme_id: null,
    root_meme_id: 'seed-4',
    created_at: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
    reactions: { '🔥': 52, '💀': 88, '😂': 112, '🗿': 19 },
    image_url: makeSvgMeme({
      bg1: '#3f1d38',
      bg2: '#701a75',
      badge: 'FINANCIAL IQ',
      topText: 'RENT IS TEMPORARY',
      bottomText: 'CREAMY THOCK SWITCHES ARE FOREVER',
      emoji: '💸',
      accent: '#f472b6'
    }),
    comments: []
  },
  {
    id: 'seed-5',
    title: 'Boss: "Quick 5-minute sync?" — The sync 90 minutes later:',
    category: 'relatable',
    author_name: 'ZoomZombie',
    score: 1640,
    generation: 0,
    mutation_count: 0,
    parent_meme_id: null,
    root_meme_id: 'seed-5',
    created_at: new Date(Date.now() - 1000 * 60 * 540).toISOString(),
    reactions: { '🔥': 73, '💀': 295, '😂': 134, '🗿': 88 },
    image_url: makeSvgMeme({
      bg1: '#450a0a',
      bg2: '#7f1d1d',
      badge: 'CORPORATE CORE',
      topText: 'THIS COULD HAVE BEEN',
      bottomText: 'A TWO SENTENCE SLACK MESSAGE',
      emoji: '💀',
      accent: '#fb923c'
    }),
    comments: [
      { id: 'c5', author_name: 'MutedMic', body: '"Let’s circle back offline and touch base" -> instant psychic damage.' }
    ]
  },
  {
    id: 'seed-6',
    title: 'Skipping the 30-second tutorial and immediately getting clapped by the first mob',
    category: 'gaming',
    author_name: 'EldenL0rd',
    score: 1290,
    generation: 0,
    mutation_count: 0,
    parent_meme_id: null,
    root_meme_id: 'seed-6',
    created_at: new Date(Date.now() - 1000 * 60 * 800).toISOString(),
    reactions: { '🔥': 110, '💀': 175, '😂': 205, '🗿': 60 },
    image_url: makeSvgMeme({
      bg1: '#1e293b',
      bg2: '#0f172a',
      badge: 'PRO GAMER',
      topText: 'SKIP TUTORIAL: YES',
      bottomText: 'WHAT BUTTON OPENS PARACHUTE?!',
      emoji: '🎮',
      accent: '#a78bfa'
    }),
    comments: []
  }
];

const STUDIO_TEMPLATES = [
  { name: 'Cyber Warning', bg1: '#1a0b2e', bg2: '#3b0764', emoji: '🔥', accent: '#facc15', defaultTop: 'WHEN YOU FIX ONE BUG', defaultBottom: 'AND UNLOCK 14 NEW ONES' },
  { name: 'Giga Chad', bg1: '#064e3b', bg2: '#022c22', emoji: '🗿', accent: '#34d399', defaultTop: 'REFUSES TO ELABORATE', defaultBottom: 'LEAVES IMMEDIATELY' },
  { name: 'Skull Moment', bg1: '#450a0a', bg2: '#7f1d1d', emoji: '💀', accent: '#fb923c', defaultTop: 'BRO REALLY THOUGHT', defaultBottom: 'WE WOULDNT NOTICE' },
  { name: 'Galaxy Brain', bg1: '#0f172a', bg2: '#1e1b4b', emoji: '🧠', accent: '#38bdf8', defaultTop: 'SLEEPING 8 HOURS: NO', defaultBottom: 'SCROLLING MEMES AT 4AM: YES' },
  { name: 'Clown Protocol', bg1: '#3f1d38', bg2: '#701a75', emoji: '🤡', accent: '#f472b6', defaultTop: 'I WILL JUST CHECK ONE MEME', defaultBottom: '2 HOURS LATER...' },
  { name: 'Rocket Stonks', bg1: '#1e293b', bg2: '#090d16', emoji: '🚀', accent: '#22c55e', defaultTop: 'BUY HIGH', defaultBottom: 'PANIC SELL LOW' }
];

const VIRAL_CAPTIONS = [
  ['ME PRETENDING TO LISTEN', 'WHILE THINKING ABOUT GARLIC BREAD'],
  ['WHEN SOMEONE SAYS', '"WE NEED TO TALK" AT 9 AM'],
  ['MY LAST TWO BRAINCELLS', 'FIGHTING FOR THIRD PLACE'],
  ['DEPLOYING ON FRIDAY', 'BECAUSE I FEAR NOTHING'],
  ['SOCIETY IF EVERYONE', 'UPVOTED THE MEMES THEY LAUGHED AT'],
  ['OPENING THE FRIDGE 6 TIMES', 'EXPECTING NEW FOOD TO SPAWN']
];

const RANKS = [
  { level: 1, title: 'Lurker', minXp: 0 },
  { level: 2, title: 'Shitposter', minXp: 150 },
  { level: 3, title: 'Meme Tactician', minXp: 400 },
  { level: 4, title: 'Sauce Inspector', minXp: 800 },
  { level: 5, title: 'Chronically Online', minXp: 1400 },
  { level: 6, title: 'Meme Overlord', minXp: 2200 }
];

// ==========================================
// 4. MAIN REACT APPLICATION COMPONENT
// ==========================================
export default function App() {
  // Core Feed & Filter State
  const [memes, setMemes] = useState(STARTER_MEMES);
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'top'
  const [category, setCategory] = useState('all'); // 'all' | 'dank' | 'tech' | 'gaming' | 'relatable'
  const [viewMode, setViewMode] = useState('feed'); // 'feed' | 'swipe' | 'battle'
  const [searchQuery, setSearchQuery] = useState('');
  const [dbStatus, setDbStatus] = useState('connecting'); // 'connecting' | 'live' | 'local'

  // Fork & Mutate + Evolution Tree State
  const [mutatingParentMeme, setMutatingParentMeme] = useState(null);
  const [evolutionModalMeme, setEvolutionModalMeme] = useState(null);
  const [evolutionNodes, setEvolutionNodes] = useState([]);
  const [loadingEvolution, setLoadingEvolution] = useState(false);

  // Gamification & Combo State
  const [xp, setXp] = useState(() => Number(localStorage.getItem('tm_xp') || 60));
  const [combo, setCombo] = useState(1);
  const [comboTimer, setComboTimer] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [screenShake, setScreenShake] = useState(false);
  const [particles, setParticles] = useState([]);
  const [levelUpBanner, setLevelUpBanner] = useState(null);
  const [userVotes, setUserVotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_votes') || '{}');
    } catch {
      return {};
    }
  });

  // Modals & User Auth State
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_user') || 'null');
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // Studio Modal State
  const [showStudio, setShowStudio] = useState(false);
  const [studioTemplateIdx, setStudioTemplateIdx] = useState(0);
  const [studioTopText, setStudioTopText] = useState(STUDIO_TEMPLATES[0].defaultTop);
  const [studioBottomText, setStudioBottomText] = useState(STUDIO_TEMPLATES[0].defaultBottom);
  const [studioTitle, setStudioTitle] = useState('');
  const [studioCategory, setStudioCategory] = useState('dank');
  const [studioStickers, setStudioStickers] = useState([]);
  const [studioDeepFry, setStudioDeepFry] = useState(false);
  const [customUploadImg, setCustomUploadImg] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const studioCanvasRef = useRef(null);

  // Interactive Modes State (Comments, Swipe, 1v1 Battle)
  const [openComments, setOpenComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState('');
  const [battlePair, setBattlePair] = useState([0, 1]);
  const [battleWinner, setBattleWinner] = useState(null);
  const [battleStreak, setBattleStreak] = useState(0);

  // Calculate Rank & Level Progress
  const currentRank = useMemo(() => {
    let r = RANKS[0];
    for (const item of RANKS) {
      if (xp >= item.minXp) r = item;
    }
    return r;
  }, [xp]);

  const nextRank = useMemo(() => {
    return (
      RANKS.find((r) => r.minXp > xp) || {
        level: currentRank.level + 1,
        title: 'Immortal Memer',
        minXp: xp + 1000
      }
    );
  }, [xp, currentRank]);

  const xpProgress = useMemo(() => {
    const prevMin = currentRank.minXp;
    const needed = nextRank.minXp - prevMin;
    const current = xp - prevMin;
    return Math.min(100, Math.max(5, Math.round((current / needed) * 100)));
  }, [xp, currentRank, nextRank]);

  // Persist XP & Votes
  useEffect(() => {
    localStorage.setItem('tm_xp', String(xp));
  }, [xp]);

  useEffect(() => {
    localStorage.setItem('tm_votes', JSON.stringify(userVotes));
  }, [userVotes]);

  // ==========================================
  // 5. INITIALIZE SUPABASE & REALTIME FEED
  // ==========================================
  const fetchSupabaseMemes = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setDbStatus('local');
      return;
    }

    try {
      const { data, error } = await client
        .from('memes')
        .select('*, comments(*)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        setDbStatus('local');
        return;
      }

      setDbStatus('live');
      if (data && data.length > 0) {
        const normalized = data.map((row) => ({
          ...row,
          generation: row.generation || 0,
          mutation_count: row.mutation_count || 0,
          reactions: row.reactions || { '🔥': 0, '💀': 0, '😂': 0, '🗿': 0 },
          comments: Array.isArray(row.comments) ? row.comments : []
        }));
        const liveIds = new Set(normalized.map((m) => String(m.id)));
        const merged = [...normalized, ...STARTER_MEMES.filter((s) => !liveIds.has(String(s.id)))];
        setMemes(merged);
      }
    } catch (err) {
      setDbStatus('local');
    }
  }, []);

  useEffect(() => {
    let client = getSupabaseClient();
    if (!client && typeof document !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = () => {
        fetchSupabaseMemes();
      };
      document.head.appendChild(script);
    } else {
      fetchSupabaseMemes();
    }

    if (client && client.auth) {
      client.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
          const email = data.session.user.email || 'Memer';
          const u = {
            id: data.session.user.id,
            username: email.split('@')[0],
            email
          };
          setUser(u);
          localStorage.setItem('tm_user', JSON.stringify(u));
        }
      });
    }

    let channel = null;
    if (client && client.channel) {
      channel = client
        .channel('public:memes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'memes' }, () => {
          fetchSupabaseMemes();
        })
        .subscribe();
    }

    return () => {
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, [fetchSupabaseMemes]);

  // ==========================================
  // 6. COMBO MULTIPLIER DECAY LOOP
  // ==========================================
  useEffect(() => {
    if (comboTimer <= 0) {
      setCombo(1);
      return;
    }
    const interval = setInterval(() => {
      setComboTimer((prev) => {
        if (prev <= 4) {
          setCombo(1);
          return 0;
        }
        return prev - 4;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [comboTimer]);

  // ==========================================
  // 7. JUICE HELPERS: PARTICLES, XP & COMBO
  // ==========================================
  const spawnParticles = useCallback((x, y, label, emoji = '🔥') => {
    const idBase = Date.now() + Math.random();
    const newItems = [
      { id: idBase, x, y, text: label, isText: true, dx: (Math.random() - 0.5) * 40, dy: -70 }
    ];
    for (let i = 0; i < 6; i++) {
      newItems.push({
        id: idBase + i + 1,
        x,
        y,
        text: emoji,
        isText: false,
        dx: (Math.random() - 0.5) * 140,
        dy: -40 - Math.random() * 90
      });
    }
    setParticles((prev) => [...prev.slice(-25), ...newItems]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newItems.some((n) => n.id === p.id)));
    }, 950);
  }, []);

  const awardXpAndCombo = useCallback(
    (baseXp, event, emoji = '⚡') => {
      const nextCombo = Math.min(5, combo + 1);
      setCombo(nextCombo);
      setComboTimer(100);

      const gained = baseXp * nextCombo;
      setXp((prevXp) => {
        const updated = prevXp + gained;
        const oldRank = RANKS.slice().reverse().find((r) => prevXp >= r.minXp) || RANKS[0];
        const newRank = RANKS.slice().reverse().find((r) => updated >= r.minXp) || RANKS[0];
        if (newRank.level > oldRank.level) {
          sfx.playLevelUp();
          setLevelUpBanner(newRank);
          setTimeout(() => setLevelUpBanner(null), 3500);
        }
        return updated;
      });

      if (nextCombo >= 3) {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 260);
      }

      const clientX = event?.clientX || window.innerWidth / 2;
      const clientY = event?.clientY || window.innerHeight / 2;
      spawnParticles(
        clientX,
        clientY,
        `+${gained} XP ${nextCombo > 1 ? `(${nextCombo}x!)` : ''}`,
        emoji
      );
    },
    [combo, spawnParticles]
  );

  // ==========================================
  // 8. FORK & MUTATE HANDLERS + EVOLUTION TREE
  // ==========================================
  const handleOpenBlankStudio = () => {
    setMutatingParentMeme(null);
    setCustomUploadImg(null);
    setStudioTitle('');
    setStudioStickers([]);
    setStudioDeepFry(false);
    setStudioTopText(STUDIO_TEMPLATES[0].defaultTop);
    setStudioBottomText(STUDIO_TEMPLATES[0].defaultBottom);
    setShowStudio(true);
  };

  // Triggered when clicking [🧬 MUTATE (+150 XP)] on any feed card or Evolution Tree node
  const handleTriggerStudioMutate = useCallback((memeToMutate, event) => {
    if (event) event.stopPropagation();
    sfx.playMutate();

    setMutatingParentMeme(memeToMutate);
    setEvolutionModalMeme(null);
    setStudioTitle(`REMIX: ${memeToMutate.title || 'Untitled'}`);
    setStudioCategory(memeToMutate.category || 'dank');
    setStudioTopText('WAIT A SECOND...');
    setStudioBottomText('PLOT TWIST UNLOCKED 💀');
    setStudioStickers([]);
    setStudioDeepFry(false);

    // Load parent meme image onto an HTMLImageElement (CORS-safe for remote URLs)
    const img = new Image();
    const isDataUri = String(memeToMutate.image_url || '').startsWith('data:');
    if (!isDataUri) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      setCustomUploadImg(img);
      setShowStudio(true);
    };
    img.onerror = () => {
      // Fallback if remote host blocks CORS: open Studio with template + parent context
      setCustomUploadImg(null);
      setShowStudio(true);
    };

    if (isDataUri) {
      img.src = memeToMutate.image_url;
    } else {
      const sep = memeToMutate.image_url.includes('?') ? '&' : '?';
      img.src = `${memeToMutate.image_url}${sep}mutate_cors=${Date.now()}`;
    }
  }, []);

  // Opens the Genealogical Evolution Tree modal for a meme
  const handleOpenEvolutionTree = useCallback(
    async (meme, event) => {
      if (event) event.stopPropagation();
      sfx.playPop(combo);
      setEvolutionModalMeme(meme);
      setLoadingEvolution(true);

      const rootId = meme.root_meme_id || meme.parent_meme_id || meme.id;

      // 1. Build instant local tree from loaded memes
      const localMatches = memes
        .filter(
          (m) =>
            String(m.id) === String(rootId) ||
            String(m.root_meme_id) === String(rootId) ||
            String(m.parent_meme_id) === String(rootId) ||
            String(m.id) === String(meme.id) ||
            String(m.parent_meme_id) === String(meme.id)
        )
        .sort((a, b) => (a.generation || 0) - (b.generation || 0));

      // 2. Also query Supabase RPC if available for deep database trees
      const client = getSupabaseClient();
      if (client && !String(meme.id).startsWith('seed-') && !String(meme.id).startsWith('local-')) {
        try {
          const { data, error } = await client.rpc('get_meme_evolution_tree', {
            target_meme_id: meme.id
          });
          if (!error && Array.isArray(data) && data.length > 0) {
            setEvolutionNodes(
              data.map((row) => ({
                ...row,
                author_name: row.author_name || row.username || 'AnonMemer',
                score: row.score ?? row.upvotes ?? 1
              }))
            );
            setLoadingEvolution(false);
            return;
          }
        } catch (e) {}
      }

      setEvolutionNodes(localMatches.length > 0 ? localMatches : [meme]);
      setLoadingEvolution(false);
    },
    [memes, combo]
  );

  // ==========================================
  // 9. VOTING, REACTIONS & COMMENTS
  // ==========================================
  const handleVote = async (memeId, direction, event) => {
    const currentVote = userVotes[memeId] || 0;
    let delta = direction;
    if (currentVote === direction) {
      delta = -direction;
      setUserVotes((prev) => ({ ...prev, [memeId]: 0 }));
    } else {
      delta = direction - currentVote;
      setUserVotes((prev) => ({ ...prev, [memeId]: direction }));
    }

    const multipliedDelta = delta * (direction > 0 ? combo : 1);
    sfx.playVote(direction > 0, combo);
    awardXpAndCombo(15, event, direction > 0 ? '🔥' : '💀');

    let updatedScore = 1;
    setMemes((prev) =>
      prev.map((m) => {
        if (m.id === memeId) {
          updatedScore = (m.score || 0) + multipliedDelta;
          return { ...m, score: updatedScore };
        }
        return m;
      })
    );

    const client = getSupabaseClient();
    if (client && !String(memeId).startsWith('seed-') && !String(memeId).startsWith('local-')) {
      try {
        const { error: rpcError } = await client.rpc('increment_meme_score', {
          row_id: memeId,
          delta: multipliedDelta
        });
        if (rpcError) {
          await client.from('memes').update({ score: updatedScore }).eq('id', memeId);
        }
      } catch (e) {}
    }
  };

  const handleReaction = async (memeId, emoji, event) => {
    sfx.playPop(combo);
    awardXpAndCombo(10, event, emoji);

    let updatedReactions = null;
    setMemes((prev) =>
      prev.map((m) => {
        if (m.id === memeId) {
          const current = m.reactions || { '🔥': 0, '💀': 0, '😂': 0, '🗿': 0 };
          updatedReactions = { ...current, [emoji]: (current[emoji] || 0) + 1 };
          return { ...m, reactions: updatedReactions, score: (m.score || 0) + 1 };
        }
        return m;
      })
    );

    const client = getSupabaseClient();
    if (
      client &&
      !String(memeId).startsWith('seed-') &&
      !String(memeId).startsWith('local-') &&
      updatedReactions
    ) {
      try {
        await client.from('memes').update({ reactions: updatedReactions }).eq('id', memeId);
      } catch (e) {}
    }
  };

  const handleAddComment = async (memeId, e) => {
    e.preventDefault();
    const text = (commentInputs[memeId] || '').trim();
    if (!text) return;

    const author = user?.username || 'AnonMemer';
    const newComment = {
      id: `local-${Date.now()}`,
      meme_id: memeId,
      author_name: author,
      body: text,
      created_at: new Date().toISOString()
    };

    sfx.playPop(combo);
    awardXpAndCombo(25, e, '💬');
    setCommentInputs((prev) => ({ ...prev, [memeId]: '' }));

    setMemes((prev) =>
      prev.map((m) =>
        m.id === memeId ? { ...m, comments: [...(m.comments || []), newComment] } : m
      )
    );

    const client = getSupabaseClient();
    if (client && !String(memeId).startsWith('seed-') && !String(memeId).startsWith('local-')) {
      try {
        await client.from('comments').insert([
          {
            meme_id: memeId,
            author_name: author,
            body: text
          }
        ]);
      } catch (err) {}
    }
  };

  // ==========================================
  // 10. HTML5 CANVAS MEME STUDIO RENDERER & UPLOAD
  // ==========================================
  const drawStudioCanvas = useCallback(() => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 600;
    const H = 552; // 520px meme area + 32px 16-bit Arcade Cartridge Footer
    const memeH = 520;
    canvas.width = W;
    canvas.height = H;

    ctx.save();
    if (studioDeepFry) {
      ctx.filter = 'contrast(220%) saturate(280%) brightness(110%)';
    }

    const tpl = STUDIO_TEMPLATES[studioTemplateIdx] || STUDIO_TEMPLATES[0];

    if (customUploadImg) {
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, W, memeH);
      const scale = Math.min(W / customUploadImg.width, memeH / customUploadImg.height);
      const dw = customUploadImg.width * scale;
      const dh = customUploadImg.height * scale;
      ctx.drawImage(customUploadImg, (W - dw) / 2, (memeH - dh) / 2, dw, dh);
    } else {
      const grad = ctx.createLinearGradient(0, 0, W, memeH);
      grad.addColorStop(0, tpl.bg1);
      grad.addColorStop(1, tpl.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, memeH);

      ctx.fillStyle = tpl.accent;
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.arc(W / 2, memeH / 2, 160, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.font = '120px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tpl.emoji, W / 2, memeH / 2);
    }

    // Draw added stickers
    studioStickers.forEach((st) => {
      ctx.font = '56px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.emoji, st.x, st.y);
    });

    // Helper for Impact Meme Captions
    const drawCaption = (text, yPos, fill) => {
      if (!text) return;
      ctx.font = '900 34px Impact, "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = fill;
      const upper = text.toUpperCase();
      ctx.strokeText(upper, W / 2, yPos, W - 40);
      ctx.fillText(upper, W / 2, yPos, W - 40);
    };

    drawCaption(studioTopText, 64, '#ffffff');
    drawCaption(studioBottomText, memeH - 28, mutatingParentMeme ? '#ff00ff' : tpl.accent || '#facc15');
    ctx.restore();

    // 16-Bit Arcade Cartridge Footer Bar (Bottom 32px)
    const nextGen = mutatingParentMeme ? (mutatingParentMeme.generation || 0) + 1 : 0;
    const handle = (user?.username || 'ANON_PLAYER').toUpperCase();

    ctx.fillStyle = '#06070d';
    ctx.fillRect(0, memeH, W, 32);

    ctx.fillStyle = nextGen > 0 ? '#ec4899' : '#00f3ff';
    ctx.fillRect(0, memeH, W, 2);

    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00f3ff';
    ctx.fillText('⚡ THEMEMES.NET', 14, memeH + 17);

    ctx.textAlign = 'right';
    ctx.fillStyle = nextGen > 0 ? '#f472b6' : '#facc15';
    const rightBadge =
      nextGen > 0
        ? `🧬 GEN-${nextGen} MUTATION // BY @${handle}`
        : `🕹️ GEN-0 ORIGIN // BY @${handle}`;
    ctx.fillText(rightBadge, W - 14, memeH + 17);
  }, [
    studioTemplateIdx,
    studioTopText,
    studioBottomText,
    studioStickers,
    studioDeepFry,
    customUploadImg,
    mutatingParentMeme,
    user
  ]);

  useEffect(() => {
    if (showStudio) {
      drawStudioCanvas();
    }
  }, [showStudio, drawStudioCanvas]);

  const handleCustomImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setCustomUploadImg(img);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePublishMeme = async (e) => {
    e.preventDefault();
    const canvas = studioCanvasRef.current;
    if (!canvas) return;

    setIsPublishing(true);
    const finalTitle = studioTitle.trim() || `${studioTopText} — ${studioBottomText}`;
    const author = user?.username || 'AnonMemer';
    const nextGen = mutatingParentMeme ? (mutatingParentMeme.generation || 0) + 1 : 0;
    const parentId = mutatingParentMeme ? mutatingParentMeme.id : null;
    const rootId = mutatingParentMeme
      ? mutatingParentMeme.root_meme_id || mutatingParentMeme.id
      : null;

    let imageUrl = canvas.toDataURL('image/png', 0.92);

    const localFallbackMeme = {
      id: `local-${Date.now()}`,
      title: finalTitle,
      category: studioCategory,
      image_url: imageUrl,
      author_name: author,
      score: 1,
      generation: nextGen,
      mutation_count: 0,
      parent_meme_id: parentId,
      root_meme_id: rootId,
      created_at: new Date().toISOString(),
      reactions: { '🔥': 1, '💀': 0, '😂': 0, '🗿': 0 },
      comments: []
    };

    const client = getSupabaseClient();
    let savedToDb = false;

    if (client) {
      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        const fileName = `meme-${Date.now()}-gen${nextGen}-${Math.random().toString(36).slice(2, 7)}.png`;
        const { error: uploadErr } = await client.storage
          .from('memes')
          .upload(fileName, blob, { contentType: 'image/png' });

        if (!uploadErr) {
          const { data: pubData } = client.storage.from('memes').getPublicUrl(fileName);
          if (pubData?.publicUrl) {
            imageUrl = pubData.publicUrl;
          }
        }

        // Only pass UUID parent_meme_id to Postgres if parent was a real DB UUID
        const isParentUuid =
          parentId && !String(parentId).startsWith('seed-') && !String(parentId).startsWith('local-');

        const payload = {
          title: finalTitle,
          category: studioCategory,
          image_url: imageUrl,
          author_name: author,
          score: 1,
          reactions: { '🔥': 1, '💀': 0, '😂': 0, '🗿': 0 },
          ...(isParentUuid ? { parent_meme_id: parentId } : {})
        };

        const { data: insertedRow, error: dbErr } = await client
          .from('memes')
          .insert([payload])
          .select()
          .single();

        if (!dbErr && insertedRow) {
          savedToDb = true;
          setMemes((prev) => [
            {
              ...insertedRow,
              generation: insertedRow.generation ?? nextGen,
              mutation_count: 0,
              parent_meme_id: parentId,
              root_meme_id: rootId || insertedRow.id,
              comments: []
            },
            ...prev.map((m) =>
              m.id === parentId ? { ...m, mutation_count: (m.mutation_count || 0) + 1 } : m
            )
          ]);
        }
      } catch (err) {
        // Fallback handled below
      }
    }

    if (!savedToDb) {
      setMemes((prev) => [
        { ...localFallbackMeme, image_url: imageUrl },
        ...prev.map((m) =>
          m.id === parentId ? { ...m, mutation_count: (m.mutation_count || 0) + 1 } : m
        )
      ]);
    }

    sfx.playLevelUp();
    awardXpAndCombo(mutatingParentMeme ? 150 : 100, e, mutatingParentMeme ? '🧬' : '🚀');
    setIsPublishing(false);
    setShowStudio(false);
    setMutatingParentMeme(null);
    setStudioTitle('');
    setStudioStickers([]);
    setCustomUploadImg(null);
    setViewMode('feed');
    setSortBy('latest');
  };

  // ==========================================
  // 11. AUTH HANDLER (SUPABASE AUTH + INSTANT GUEST)
  // ==========================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthMessage('Connecting...');
    const client = getSupabaseClient();

    if (client && authEmail && authPassword) {
      try {
        if (authMode === 'signup') {
          const { data, error } = await client.auth.signUp({
            email: authEmail,
            password: authPassword
          });
          if (error) throw error;
          const handle = authUsername.trim() || authEmail.split('@')[0];
          const u = { id: data?.user?.id || Date.now(), username: handle, email: authEmail };
          setUser(u);
          localStorage.setItem('tm_user', JSON.stringify(u));
          setShowAuthModal(false);
          setAuthMessage('');
          sfx.playLevelUp();
          return;
        } else {
          const { data, error } = await client.auth.signInWithPassword({
            email: authEmail,
            password: authPassword
          });
          if (error) throw error;
          const handle = authEmail.split('@')[0];
          const u = { id: data?.user?.id || Date.now(), username: handle, email: authEmail };
          setUser(u);
          localStorage.setItem('tm_user', JSON.stringify(u));
          setShowAuthModal(false);
          setAuthMessage('');
          sfx.playLevelUp();
          return;
        }
      } catch (err) {
        setAuthMessage(err.message || 'Auth error — try Quick Arcade Guest login below!');
        return;
      }
    }
  };

  const handleQuickGuestLogin = () => {
    const cleanName = authUsername.trim() || `Memer_${Math.floor(100 + Math.random() * 899)}`;
    const u = { id: `guest-${Date.now()}`, username: cleanName };
    setUser(u);
    localStorage.setItem('tm_user', JSON.stringify(u));
    setShowAuthModal(false);
    sfx.playLevelUp();
  };

  // ==========================================
  // 12. FILTERED MEMES & SWIPE / BATTLE CONTROLS
  // ==========================================
  const filteredMemes = useMemo(() => {
    return memes
      .filter((m) => {
        if (category !== 'all' && m.category !== category) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (m.title || '').toLowerCase().includes(q) ||
            (m.author_name || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'latest') {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
        return (b.score || 0) - (a.score || 0);
      });
  }, [memes, category, searchQuery, sortBy]);

  const triggerSwipe = useCallback(
    (dir, e) => {
      const activeMeme = filteredMemes[swipeIndex % Math.max(1, filteredMemes.length)];
      if (!activeMeme) return;
      setSwipeAnim(dir === 'right' ? 'swipe-right' : dir === 'up' ? 'swipe-up' : 'swipe-left');

      if (dir === 'right' || dir === 'up') {
        handleVote(activeMeme.id, dir === 'up' ? 2 : 1, e);
      } else {
        sfx.playVote(false, 1);
      }

      setTimeout(() => {
        setSwipeAnim('');
        setSwipeIndex((prev) => (prev + 1) % Math.max(1, filteredMemes.length));
      }, 240);
    },
    [filteredMemes, swipeIndex]
  );

  useEffect(() => {
    if (viewMode !== 'swipe') return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') triggerSwipe('right', e);
      if (e.key === 'ArrowLeft') triggerSwipe('left', e);
      if (e.key === 'ArrowUp') triggerSwipe('up', e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewMode, triggerSwipe]);

  const handleBattlePick = (pickedIdx, e) => {
    const pickedMeme = memes[pickedIdx];
    if (!pickedMeme || battleWinner !== null) return;

    setBattleWinner(pickedIdx);
    setBattleStreak((s) => s + 1);
    handleVote(pickedMeme.id, 1, e);

    setTimeout(() => {
      setBattleWinner(null);
      const len = memes.length;
      if (len >= 2) {
        const first = Math.floor(Math.random() * len);
        let second = Math.floor(Math.random() * len);
        if (second === first) second = (first + 1) % len;
        setBattlePair([first, second]);
      }
    }, 950);
  };

  return (
    <div className={`tm-app ${screenShake ? 'tm-shake' : ''}`}>
      {/* SELF-CONTAINED CYBER-ARCADE CSS */}
      <style>{`
        * { box-sizing: border-box; }
        .tm-app {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 0%, #17153b 0%, #090a0f 55%);
          color: #f8fafc;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding-bottom: 90px;
          overflow-x: hidden;
        }
        @keyframes tmShake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-4px, 3px); }
          50% { transform: translate(4px, -3px); }
          75% { transform: translate(-3px, -2px); }
        }
        .tm-shake { animation: tmShake 0.25s ease-in-out; }

        .tm-combo-bar {
          position: sticky;
          top: 0;
          z-index: 60;
          height: 5px;
          background: rgba(255,255,255,0.06);
          width: 100%;
        }
        .tm-combo-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #facc15, #ec4899);
          transition: width 0.15s linear;
          box-shadow: 0 0 12px #ec4899;
        }

        .tm-nav {
          position: sticky;
          top: 5px;
          z-index: 50;
          backdrop-filter: blur(16px);
          background: rgba(12, 14, 24, 0.85);
          border-bottom: 1px solid rgba(255,255,255,0.09);
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }
        .tm-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          user-select: none;
        }
        .tm-logo-badge {
          background: linear-gradient(135deg, #facc15 0%, #f97316 50%, #ec4899 100%);
          color: #090a0f;
          font-weight: 900;
          font-size: 20px;
          padding: 6px 12px;
          border-radius: 10px;
          letter-spacing: -0.5px;
          box-shadow: 0 0 20px rgba(249, 115, 22, 0.45);
        }
        .tm-status-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 9px;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .tm-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          display: inline-block;
        }
        .tm-dot.live { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
        .tm-dot.local { background: #facc15; box-shadow: 0 0 8px #facc15; }

        .tm-hud {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .tm-xp-box {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 6px 12px;
          border-radius: 12px;
          min-width: 175px;
        }
        .tm-xp-top {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 800;
          color: #cbd5e1;
          margin-bottom: 4px;
        }
        .tm-xp-track {
          height: 6px;
          background: rgba(255,255,255,0.12);
          border-radius: 99px;
          overflow: hidden;
        }
        .tm-xp-bar {
          height: 100%;
          background: linear-gradient(90deg, #38bdf8, #a855f7, #ec4899);
          transition: width 0.3s ease;
        }
        .tm-combo-badge {
          padding: 6px 12px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 13px;
          background: rgba(250, 204, 21, 0.15);
          border: 1px solid #facc15;
          color: #facc15;
          transition: transform 0.15s ease;
        }
        .tm-combo-badge.hot {
          background: linear-gradient(135deg, #ec4899, #f97316);
          color: #fff;
          border-color: transparent;
          transform: scale(1.08);
          box-shadow: 0 0 18px rgba(236, 72, 153, 0.6);
        }

        .tm-btn {
          background: rgba(255,255,255,0.08);
          color: #f8fafc;
          border: 1px solid rgba(255,255,255,0.14);
          padding: 9px 15px;
          border-radius: 11px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.16s ease;
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .tm-btn:hover {
          background: rgba(255,255,255,0.15);
          transform: translateY(-1px);
        }
        .tm-btn-primary {
          background: linear-gradient(135deg, #facc15 0%, #f97316 100%);
          color: #090a0f;
          border: none;
          font-weight: 900;
          box-shadow: 0 4px 18px rgba(249, 115, 22, 0.4);
        }
        .tm-btn-primary:hover {
          background: linear-gradient(135deg, #fde047 0%, #fb923c 100%);
          transform: translateY(-2px) scale(1.02);
        }

        /* Mutate Action Bar & Neon Buttons */
        .tm-mutate-bar {
          padding: 10px 16px 12px;
          background: rgba(15, 10, 28, 0.75);
          border-top: 1px solid rgba(236, 72, 153, 0.22);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .tm-lineage-btn {
          background: rgba(236, 72, 153, 0.12);
          border: 1px solid rgba(236, 72, 153, 0.4);
          color: #f472b6;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          font-family: 'Courier New', monospace;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tm-lineage-btn:hover {
          background: rgba(236, 72, 153, 0.25);
          color: #fff;
        }
        .tm-mutate-btn {
          background: linear-gradient(90deg, #00f3ff 0%, #ec4899 55%, #a3e635 100%);
          color: #05060a;
          border: none;
          padding: 6px 13px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(236, 72, 153, 0.4);
          transition: all 0.15s ease;
        }
        .tm-mutate-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 22px rgba(0, 243, 255, 0.75);
        }
        .tm-gen-pill {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 10;
          background: rgba(9, 10, 15, 0.85);
          border: 1px solid #ec4899;
          color: #f472b6;
          padding: 4px 9px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 900;
          font-family: 'Courier New', monospace;
          box-shadow: 0 0 12px rgba(236, 72, 153, 0.5);
        }

        .tm-controls {
          max-width: 1260px;
          margin: 22px auto 14px;
          padding: 0 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }
        .tm-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tm-tab {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #94a3b8;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tm-tab.active {
          background: #f8fafc;
          color: #090a0f;
          border-color: #f8fafc;
          box-shadow: 0 0 14px rgba(255,255,255,0.25);
        }
        .tm-mode-switch {
          display: flex;
          background: rgba(255,255,255,0.05);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          gap: 4px;
        }
        .tm-mode-btn {
          border: none;
          background: transparent;
          color: #94a3b8;
          padding: 7px 13px;
          border-radius: 9px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
        }
        .tm-mode-btn.active {
          background: linear-gradient(135deg, #6366f1, #ec4899);
          color: #ffffff;
        }

        .tm-grid {
          max-width: 1260px;
          margin: 0 auto;
          padding: 10px 20px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 22px;
        }
        .tm-card {
          background: rgba(17, 20, 34, 0.85);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .tm-card:hover {
          transform: translateY(-4px);
          border-color: rgba(250, 204, 21, 0.4);
          box-shadow: 0 14px 32px rgba(0,0,0,0.5);
        }
        .tm-card-header {
          padding: 14px 16px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #94a3b8;
        }
        .tm-tag {
          text-transform: uppercase;
          font-weight: 800;
          font-size: 10px;
          letter-spacing: 0.8px;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
        }
        .tm-card-title {
          padding: 0 16px 12px;
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          line-height: 1.35;
          color: #f8fafc;
        }
        .tm-img-wrap {
          position: relative;
          width: 100%;
          background: #05060a;
          cursor: pointer;
          user-select: none;
          overflow: hidden;
        }
        .tm-img-wrap img {
          width: 100%;
          display: block;
          max-height: 440px;
          object-fit: cover;
        }
        .tm-dbl-hint {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(0,0,0,0.65);
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          pointer-events: none;
        }

        .tm-card-actions {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .tm-vote-pill {
          display: inline-flex;
          align-items: center;
          background: rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 3px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .tm-vote-btn {
          border: none;
          background: transparent;
          color: #cbd5e1;
          font-weight: 900;
          font-size: 15px;
          padding: 6px 11px;
          border-radius: 9px;
          cursor: pointer;
          transition: all 0.14s ease;
        }
        .tm-vote-btn.up.voted {
          background: #22c55e;
          color: #052e16;
        }
        .tm-vote-btn.down.voted {
          background: #ef4444;
          color: #fff;
        }
        .tm-score {
          font-weight: 900;
          font-size: 14px;
          padding: 0 8px;
          color: #facc15;
        }
        .tm-react-group {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }
        .tm-react-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: #e2e8f0;
          border-radius: 8px;
          padding: 5px 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.12s ease, background 0.12s ease;
        }
        .tm-react-btn:hover {
          background: rgba(255,255,255,0.14);
          transform: scale(1.1);
        }

        .tm-comments {
          padding: 12px 16px 16px;
          background: rgba(9, 10, 15, 0.65);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .tm-comment-item {
          font-size: 13px;
          margin-bottom: 8px;
          line-height: 1.4;
          color: #cbd5e1;
        }
        .tm-comment-form {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
        .tm-input {
          flex: 1;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }
        .tm-input:focus {
          border-color: #facc15;
        }

        .tm-arena {
          max-width: 560px;
          margin: 24px auto;
          padding: 0 16px;
          text-align: center;
        }
        .swipe-right { transform: translateX(180px) rotate(12deg); opacity: 0; transition: all 0.22s ease; }
        .swipe-left { transform: translateX(-180px) rotate(-12deg); opacity: 0; transition: all 0.22s ease; }
        .swipe-up { transform: translateY(-160px) scale(1.08); opacity: 0; transition: all 0.22s ease; }

        .tm-battle-grid {
          max-width: 1020px;
          margin: 20px auto;
          padding: 0 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
          gap: 24px;
          align-items: stretch;
        }
        .tm-battle-card {
          cursor: pointer;
          position: relative;
        }
        .tm-battle-card.winner {
          border-color: #22c55e;
          box-shadow: 0 0 35px rgba(34, 197, 94, 0.5);
          transform: scale(1.02);
        }

        .tm-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(4, 6, 12, 0.84);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow-y: auto;
        }
        .tm-modal {
          background: #121526;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 20px;
          max-width: 880px;
          width: 100%;
          padding: 24px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.75);
        }
        .tm-studio-layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
          gap: 22px;
          margin-top: 16px;
        }

        .tm-particle {
          position: fixed;
          pointer-events: none;
          z-index: 999;
          font-weight: 900;
          animation: tmFloat 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes tmFloat {
          0% { transform: translate(0, 0) scale(0.8); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1.25); opacity: 0; }
        }

        .tm-levelup-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 120;
          background: linear-gradient(135deg, #facc15, #f97316, #ec4899);
          color: #090a0f;
          padding: 16px 22px;
          border-radius: 16px;
          font-weight: 900;
          box-shadow: 0 12px 35px rgba(236, 72, 153, 0.55);
        }
      `}</style>

      {/* FLOATING PARTICLES OVERLAY */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="tm-particle"
          style={{
            left: p.x,
            top: p.y,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            fontSize: p.isText ? '16px' : '24px',
            color: '#facc15',
            textShadow: '0 2px 8px rgba(0,0,0,0.9)'
          }}
        >
          {p.text}
        </div>
      ))}

      {/* LEVEL UP BANNER */}
      {levelUpBanner && (
        <div className="tm-levelup-toast">
          🎉 LEVEL UP! You reached Lv.{levelUpBanner.level}: {levelUpBanner.title}!
        </div>
      )}

      {/* COMBO TIMER PROGRESS BAR */}
      <div className="tm-combo-bar">
        <div className="tm-combo-fill" style={{ width: `${comboTimer}%` }} />
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="tm-nav">
        <div
          className="tm-brand"
          onClick={() => {
            setViewMode('feed');
            setCategory('all');
          }}
        >
          <div className="tm-logo-badge">THE MEMES.net</div>
          <div className="tm-status-pill" title="Connected to Supabase project otvvphmjojqyjaznjzyo">
            <span className={`tm-dot ${dbStatus === 'live' ? 'live' : 'local'}`} />
            {dbStatus === 'live' ? 'SUPABASE LIVE' : 'ARCADE READY'}
          </div>
        </div>

        <div className="tm-hud">
          <div className={`tm-combo-badge ${combo >= 3 ? 'hot' : ''}`}>
            {combo > 1 ? `🔥 ${combo}x OVERDRIVE` : '⚡ 1x COMBO'}
          </div>

          <div className="tm-xp-box">
            <div className="tm-xp-top">
              <span>
                Lv.{currentRank.level} {currentRank.title}
              </span>
              <span style={{ color: '#facc15' }}>{xp} XP</span>
            </div>
            <div className="tm-xp-track">
              <div className="tm-xp-bar" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          <button
            className="tm-btn"
            onClick={() => {
              sfx.enabled = !soundOn;
              setSoundOn(!soundOn);
            }}
          >
            {soundOn ? '🔊 SFX' : '🔇 MUTE'}
          </button>

          <button className="tm-btn tm-btn-primary" onClick={handleOpenBlankStudio}>
            + Upload / Create
          </button>

          {user ? (
            <button
              className="tm-btn"
              onClick={() => {
                setUser(null);
                localStorage.removeItem('tm_user');
              }}
              title="Click to log out"
            >
              👾 {user.username}
            </button>
          ) : (
            <button className="tm-btn" onClick={() => setShowAuthModal(true)}>
              Log in / Sign up
            </button>
          )}
        </div>
      </header>

      {/* SUB-NAVIGATION: SORT, CATEGORIES & GAME MODES */}
      <section className="tm-controls">
        <div className="tm-tabs">
          <button
            className={`tm-tab ${sortBy === 'latest' ? 'active' : ''}`}
            onClick={() => setSortBy('latest')}
          >
            ⚡ Latest
          </button>
          <button
            className={`tm-tab ${sortBy === 'top' ? 'active' : ''}`}
            onClick={() => setSortBy('top')}
          >
            🔥 Top This Week
          </button>
          {['all', 'dank', 'tech', 'gaming', 'relatable'].map((cat) => (
            <button
              key={cat}
              className={`tm-tab ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              #{cat.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="tm-input"
            placeholder="Search memes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '170px' }}
          />
          <div className="tm-mode-switch">
            <button
              className={`tm-mode-btn ${viewMode === 'feed' ? 'active' : ''}`}
              onClick={() => setViewMode('feed')}
            >
              📱 Grid Feed
            </button>
            <button
              className={`tm-mode-btn ${viewMode === 'swipe' ? 'active' : ''}`}
              onClick={() => setViewMode('swipe')}
            >
              ⚡ Hyper-Swipe
            </button>
            <button
              className={`tm-mode-btn ${viewMode === 'battle' ? 'active' : ''}`}
              onClick={() => setViewMode('battle')}
            >
              ⚔️ 1v1 Arena
            </button>
          </div>
        </div>
      </section>

      {/* ==========================================
          MODE 1: MASONRY GRID FEED
         ========================================== */}
      {viewMode === 'feed' && (
        <main className="tm-grid">
          {filteredMemes.map((meme) => {
            const myVote = userVotes[meme.id] || 0;
            const isCommentsOpen = !!openComments[meme.id];
            const gen = meme.generation || 0;
            const remixCount = meme.mutation_count || 0;

            return (
              <article key={meme.id} className="tm-card">
                <div className="tm-card-header">
                  <span>
                    Posted by <strong>@{meme.author_name || 'Anon'}</strong>
                  </span>
                  <span className="tm-tag">{meme.category || 'meme'}</span>
                </div>

                <h2 className="tm-card-title">{meme.title}</h2>

                <div
                  className="tm-img-wrap"
                  onDoubleClick={(e) => handleVote(meme.id, 1, e)}
                  title="Double-click for instant Combo Upvote!"
                >
                  {gen > 0 && <div className="tm-gen-pill">🧬 GEN-{gen} REMIX</div>}
                  <img src={meme.image_url} alt={meme.title} loading="lazy" />
                  <span className="tm-dbl-hint">⚡ Double-tap to Upvote</span>
                </div>

                <div className="tm-card-actions">
                  {/* Upvote / Downvote Pill */}
                  <div className="tm-vote-pill">
                    <button
                      className={`tm-vote-btn up ${myVote === 1 ? 'voted' : ''}`}
                      onClick={(e) => handleVote(meme.id, 1, e)}
                    >
                      ▲
                    </button>
                    <span className="tm-score">{meme.score || 0}</span>
                    <button
                      className={`tm-vote-btn down ${myVote === -1 ? 'voted' : ''}`}
                      onClick={(e) => handleVote(meme.id, -1, e)}
                    >
                      ▼
                    </button>
                  </div>

                  {/* Emoji Reactions */}
                  <div className="tm-react-group">
                    {['🔥', '💀', '😂', '🗿'].map((emoji) => (
                      <button
                        key={emoji}
                        className="tm-react-btn"
                        onClick={(e) => handleReaction(meme.id, emoji, e)}
                      >
                        {emoji} {(meme.reactions && meme.reactions[emoji]) || 0}
                      </button>
                    ))}
                  </div>

                  {/* Comment Toggle */}
                  <button
                    className="tm-react-btn"
                    onClick={() =>
                      setOpenComments((prev) => ({ ...prev, [meme.id]: !prev[meme.id] }))
                    }
                  >
                    💬 {(meme.comments || []).length}
                  </button>
                </div>

                {/* FORK & MUTATE ACTION BAR */}
                <div className="tm-mutate-bar">
                  <button
                    type="button"
                    className="tm-lineage-btn"
                    onClick={(e) => handleOpenEvolutionTree(meme, e)}
                    title="Inspect full remix family tree"
                  >
                    🌿 GEN-{gen} {remixCount > 0 ? `• ${remixCount} REMIXES` : '• TREE'}
                  </button>

                  <button
                    type="button"
                    className="tm-mutate-btn"
                    onClick={(e) => handleTriggerStudioMutate(meme, e)}
                  >
                    🧬 MUTATE (+150 XP)
                  </button>
                </div>

                {/* Inline Comments Drawer */}
                {isCommentsOpen && (
                  <div className="tm-comments">
                    {(meme.comments || []).length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                        No comments yet — drop the first roast (+25 XP)!
                      </div>
                    ) : (
                      (meme.comments || []).map((c) => (
                        <div key={c.id} className="tm-comment-item">
                          <strong style={{ color: '#38bdf8' }}>@{c.author_name}: </strong>
                          <span>{c.body}</span>
                        </div>
                      ))
                    )}

                    <form className="tm-comment-form" onSubmit={(e) => handleAddComment(meme.id, e)}>
                      <input
                        type="text"
                        className="tm-input"
                        placeholder="Write a comment..."
                        value={commentInputs[meme.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [meme.id]: e.target.value }))
                        }
                      />
                      <button type="submit" className="tm-btn tm-btn-primary">
                        Post
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </main>
      )}

      {/* ==========================================
          MODE 2: HYPER-SWIPE DECK
         ========================================== */}
      {viewMode === 'swipe' && (
        <section className="tm-arena">
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '14px' }}>
            Use keyboard arrows <strong>[← Pass]</strong> <strong>[↑ Super Fire]</strong>{' '}
            <strong>[→ Upvote]</strong> or tap buttons below!
          </p>
          {filteredMemes.length > 0 &&
            (() => {
              const m = filteredMemes[swipeIndex % filteredMemes.length];
              return (
                <div className={`tm-card ${swipeAnim}`} style={{ textAlign: 'left' }}>
                  <div className="tm-card-header">
                    <span>@{m.author_name}</span>
                    <span className="tm-tag">SCORE: {m.score}</span>
                  </div>
                  <h2 className="tm-card-title">{m.title}</h2>
                  <div className="tm-img-wrap">
                    <img src={m.image_url} alt={m.title} />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '10px',
                      padding: '16px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <button className="tm-btn" onClick={(e) => triggerSwipe('left', e)}>
                      💀 Pass (←)
                    </button>
                    <button
                      className="tm-btn"
                      style={{ borderColor: '#38bdf8', color: '#38bdf8' }}
                      onClick={(e) => triggerSwipe('up', e)}
                    >
                      🚀 Super 2x (↑)
                    </button>
                    <button
                      className="tm-btn tm-btn-primary"
                      onClick={(e) => triggerSwipe('right', e)}
                    >
                      🔥 Based (→)
                    </button>
                    <button
                      className="tm-mutate-btn"
                      onClick={(e) => handleTriggerStudioMutate(m, e)}
                    >
                      🧬 Mutate
                    </button>
                  </div>
                </div>
              );
            })()}
        </section>
      )}

      {/* ==========================================
          MODE 3: 1v1 MEME BATTLE ARENA
         ========================================== */}
      {viewMode === 'battle' && (
        <section>
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '22px' }}>⚔️ SUDDEN DEATH MEME ARENA</h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
              Click the funnier meme to crown it & earn combo XP! Win Streak:{' '}
              <strong style={{ color: '#facc15' }}>{battleStreak}🔥</strong>
            </p>
          </div>

          <div className="tm-battle-grid">
            {battlePair.map((idx) => {
              const m = memes[idx % memes.length];
              if (!m) return null;
              const isWin = battleWinner === idx;
              return (
                <div
                  key={`${m.id}-${idx}`}
                  className={`tm-card tm-battle-card ${isWin ? 'winner' : ''}`}
                  onClick={(e) => handleBattlePick(idx, e)}
                >
                  <div className="tm-card-header">
                    <span>CONTENDER @{m.author_name}</span>
                    <span className="tm-tag">{m.score} PTS</span>
                  </div>
                  <h3 className="tm-card-title">{m.title}</h3>
                  <div className="tm-img-wrap">
                    <img src={m.image_url} alt={m.title} />
                  </div>
                  <div
                    style={{
                      padding: '14px',
                      textAlign: 'center',
                      fontWeight: 900,
                      color: isWin ? '#22c55e' : '#facc15'
                    }}
                  >
                    {isWin ? '🏆 WINNER! +XP' : '👆 VOTE THIS MEME'}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ==========================================
          MODAL 1: HTML5 CANVAS MEME STUDIO (+ FORK & MUTATE)
         ========================================== */}
      {showStudio && (
        <div className="tm-modal-backdrop" onClick={() => setShowStudio(false)}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>
                {mutatingParentMeme
                  ? `🧬 Mutating Gen-${(mutatingParentMeme.generation || 0) + 1} Remix (+150 XP)`
                  : '🎨 Meme Forge Studio (+100 XP)'}
              </h2>
              <button className="tm-btn" onClick={() => setShowStudio(false)}>
                ✕ Close
              </button>
            </div>

            {/* Active Mutation Lineage Banner */}
            {mutatingParentMeme && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(236, 72, 153, 0.14)',
                  border: '1px solid #ec4899',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  fontSize: '12px'
                }}
              >
                <span>
                  🧬 Forking <strong>{mutatingParentMeme.title}</strong> by{' '}
                  <strong style={{ color: '#00f3ff' }}>@{mutatingParentMeme.author_name}</strong> —
                  Origin creator earns <strong>+50 XP Royalty!</strong>
                </span>
                <button
                  type="button"
                  className="tm-btn"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                  onClick={handleOpenBlankStudio}
                >
                  Reset to Blank Gen-0
                </button>
              </div>
            )}

            <div className="tm-studio-layout">
              {/* Live HTML5 Canvas Preview */}
              <div>
                <canvas
                  ref={studioCanvasRef}
                  style={{
                    width: '100%',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.15)'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {['🔥', '💀', '😂', '🕶️', '🧢', '🤡', '👑'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="tm-react-btn"
                      onClick={() =>
                        setStudioStickers((prev) => [
                          ...prev,
                          { emoji, x: 120 + Math.random() * 360, y: 140 + Math.random() * 240 }
                        ])
                      }
                    >
                      + {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="tm-react-btn"
                    onClick={() => setStudioDeepFry((v) => !v)}
                    style={{ borderColor: studioDeepFry ? '#facc15' : undefined }}
                  >
                    🌶️ {studioDeepFry ? 'Deep Fried ON' : 'Deep Fry'}
                  </button>
                </div>
              </div>

              {/* Controls Form */}
              <form
                onSubmit={handlePublishMeme}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                    1. Choose Template or Upload Custom Photo
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {STUDIO_TEMPLATES.map((t, i) => (
                      <button
                        key={t.name}
                        type="button"
                        className={`tm-tab ${
                          studioTemplateIdx === i && !customUploadImg ? 'active' : ''
                        }`}
                        onClick={() => {
                          setMutatingParentMeme(null);
                          setCustomUploadImg(null);
                          setStudioTemplateIdx(i);
                          setStudioTopText(t.defaultTop);
                          setStudioBottomText(t.defaultBottom);
                        }}
                      >
                        {t.emoji} {t.name}
                      </button>
                    ))}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomImageUpload}
                    style={{ marginTop: '8px', fontSize: '12px', color: '#cbd5e1' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                      2. Captions
                    </label>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#facc15',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        const pick =
                          VIRAL_CAPTIONS[Math.floor(Math.random() * VIRAL_CAPTIONS.length)];
                        setStudioTopText(pick[0]);
                        setStudioBottomText(pick[1]);
                      }}
                    >
                      🎲 Random Viral Caption
                    </button>
                  </div>
                  <input
                    type="text"
                    className="tm-input"
                    placeholder="TOP TEXT"
                    value={studioTopText}
                    onChange={(e) => setStudioTopText(e.target.value)}
                    style={{ width: '100%', marginTop: '6px' }}
                  />
                  <input
                    type="text"
                    className="tm-input"
                    placeholder="BOTTOM TEXT"
                    value={studioBottomText}
                    onChange={(e) => setStudioBottomText(e.target.value)}
                    style={{ width: '100%', marginTop: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                    3. Post Title & Category
                  </label>
                  <input
                    type="text"
                    className="tm-input"
                    placeholder="Give your meme a spicy title..."
                    value={studioTitle}
                    onChange={(e) => setStudioTitle(e.target.value)}
                    style={{ width: '100%', marginTop: '6px' }}
                  />
                  <select
                    className="tm-input"
                    value={studioCategory}
                    onChange={(e) => setStudioCategory(e.target.value)}
                    style={{ width: '100%', marginTop: '8px', background: '#1e293b' }}
                  >
                    <option value="dank">#DANK</option>
                    <option value="tech">#TECH</option>
                    <option value="gaming">#GAMING</option>
                    <option value="relatable">#RELATABLE</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="tm-btn tm-btn-primary"
                  disabled={isPublishing}
                  style={{
                    justifyContent: 'center',
                    padding: '13px',
                    fontSize: '15px',
                    marginTop: '6px'
                  }}
                >
                  {isPublishing
                    ? 'Uploading to Supabase...'
                    : mutatingParentMeme
                    ? '🧬 Publish Mutation (+150 XP)'
                    : '🚀 Publish to Feed (+100 XP)'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: MEME EVOLUTION TREE INSPECTOR
         ========================================== */}
      {evolutionModalMeme && (
        <div className="tm-modal-backdrop" onClick={() => setEvolutionModalMeme(null)}>
          <div
            className="tm-modal"
            style={{ maxWidth: '680px', borderColor: '#ec4899' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px'
              }}
            >
              <div>
                <h2 style={{ margin: 0, color: '#f472b6' }}>🧬 Meme Evolution Tree</h2>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Origin creators earn <strong style={{ color: '#a3e635' }}>+50 XP</strong> per
                  mutation & passive royalties
                </div>
              </div>
              <button className="tm-btn" onClick={() => setEvolutionModalMeme(null)}>
                ✕ Close
              </button>
            </div>

            {loadingEvolution ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#00f3ff' }}>
                SCANNING GENETIC MEME ARCHIVES...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {evolutionNodes.map((node) => {
                  const gen = node.generation || 0;
                  const isCurrent = String(node.id) === String(evolutionModalMeme.id);
                  return (
                    <div
                      key={node.id}
                      style={{
                        marginLeft: `${Math.min(gen * 24, 120)}px`,
                        padding: '12px',
                        borderRadius: '14px',
                        background: isCurrent
                          ? 'rgba(0, 243, 255, 0.12)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isCurrent
                          ? '1px solid #00f3ff'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={node.image_url}
                          alt={node.title}
                          style={{
                            width: '64px',
                            height: '64px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}
                        />
                        <div>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 900,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              background: gen === 0 ? 'rgba(163,230,53,0.2)' : 'rgba(236,72,153,0.25)',
                              color: gen === 0 ? '#a3e635' : '#f472b6'
                            }}
                          >
                            {gen === 0 ? 'GEN-0 ORIGIN' : `GEN-${gen} MUTATION`}
                          </span>
                          <div style={{ fontWeight: 800, fontSize: '14px', marginTop: '4px' }}>
                            {node.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            by @{node.author_name || 'Anon'} • 🔥 {node.score || 0} pts
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="tm-mutate-btn"
                        onClick={(e) => handleTriggerStudioMutate(node, e)}
                      >
                        🧬 Mutate This
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: SUPABASE AUTH & INSTANT GUEST LOGIN
         ========================================== */}
      {showAuthModal && (
        <div className="tm-modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div
            className="tm-modal"
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px'
              }}
            >
              <h2 style={{ margin: 0 }}>{authMode === 'login' ? '👾 Log In' : '🚀 Sign Up'}</h2>
              <button className="tm-btn" onClick={() => setShowAuthModal(false)}>
                ✕
              </button>
            </div>

            <div
              style={{
                background: 'rgba(250, 204, 21, 0.1)',
                border: '1px solid rgba(250, 204, 21, 0.3)',
                padding: '12px',
                borderRadius: '12px',
                marginBottom: '16px'
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#facc15',
                  marginBottom: '6px'
                }}
              >
                ⚡ INSTANT ARCADE ACCESS (NO EMAIL NEEDED)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="tm-input"
                  placeholder="Pick a Memer Handle..."
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                />
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  onClick={handleQuickGuestLogin}
                >
                  Go!
                </button>
              </div>
            </div>

            <div
              style={{
                textAlign: 'center',
                fontSize: '11px',
                color: '#64748b',
                margin: '10px 0'
              }}
            >
              — OR USE SUPABASE EMAIL AUTH —
            </div>

            <form
              onSubmit={handleAuthSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <input
                type="email"
                required
                className="tm-input"
                placeholder="Email address"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <input
                type="password"
                required
                className="tm-input"
                placeholder="Password (min 6 chars)"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              {authMessage && (
                <div style={{ fontSize: '12px', color: '#facc15' }}>{authMessage}</div>
              )}
              <button
                type="submit"
                className="tm-btn tm-btn-primary"
                style={{ justifyContent: 'center', padding: '11px' }}
              >
                {authMode === 'login' ? 'Log In with Supabase' : 'Create Account'}
              </button>
            </form>

            <div
              style={{
                marginTop: '12px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#94a3b8'
              }}
            >
              {authMode === 'login' ? (
                <>
                  Need an account?{' '}
                  <span
                    style={{ color: '#facc15', cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => setAuthMode('signup')}
                  >
                    Sign up
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span
                    style={{ color: '#facc15', cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => setAuthMode('login')}
                  >
                    Log in
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}