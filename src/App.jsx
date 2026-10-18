import React, { useState, useEffect, useRef } from 'react';
import { supabase, uploadMemeToStorage } from './supabaseClient';
import {
  Flame,
  Clock,
  Trophy,
  Plus,
  Search,
  ArrowBigUp,
  ArrowBigDown,
  Share2,
  Download,
  Upload,
  Sparkles,
  Image as ImageIcon,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';

const CATEGORIES = ['All', 'Trending', 'Dank', 'Tech', 'Gaming', 'Wholesome', 'Classic'];

const PRESET_TEMPLATES = [
  {
    name: 'Coding at 3 AM',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    defaultTop: 'WHEN THE CODE COMPILES',
    defaultBottom: 'ON THE FIRST TRY',
  },
  {
    name: 'Surprised Cat',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    defaultTop: 'ME WATCHING PRODUCTION',
    defaultBottom: 'DEPLOY ON A FRIDAY',
  },
  {
    name: 'Doge Vibe',
    url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
    defaultTop: 'MUCH SUPABASE',
    defaultBottom: 'VERY REALTIME WOW',
  },
  {
    name: 'Retro Setup',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    defaultTop: 'HACKING THE MAINFRAME',
    defaultBottom: 'WITH HTML5 CANVAS',
  },
];

const SAMPLE_SEED_MEMES = [
  {
    title: 'When Supabase Realtime syncs across tabs instantly',
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    top_text: 'OPEN TWO BROWSER TABS',
    bottom_text: 'UPVOTE SYNCS INSTANTLY',
    category: 'Tech',
    author: 'Cormac',
    upvotes: 42,
  },
  {
    title: 'Friday afternoon deployments be like',
    image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    top_text: 'IT WORKED ON LOCALHOST',
    bottom_text: 'SHIP IT TO PRODUCTION',
    category: 'Trending',
    author: 'MemeLord',
    upvotes: 28,
  },
  {
    title: 'Welcome to thememes.net',
    image_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
    top_text: 'WELCOME TO THEMEMES.NET',
    bottom_text: 'FRESH MEMES DAILY',
    category: 'Wholesome',
    author: 'Admin',
    upvotes: 64,
  },
];

export default function App() {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING');

  // Filter & Sort State
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('hot'); // 'hot' | 'new' | 'top'
  const [searchQuery, setSearchQuery] = useState('');

  // Local tracking of user votes in browser storage
  const [userVotes, setUserVotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('thememes_votes') || '{}');
    } catch {
      return {};
    }
  });
  const [copiedId, setCopiedId] = useState(null);

  // Meme Generator Modal State
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [topText, setTopText] = useState('TOP TEXT');
  const [bottomText, setBottomText] = useState('BOTTOM TEXT');
  const [category, setCategory] = useState('Trending');
  const [author, setAuthor] = useState('');
  const [fontSize, setFontSize] = useState(42);
  const [selectedImageSrc, setSelectedImageSrc] = useState(PRESET_TEMPLATES[0].url);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const canvasRef = useRef(null);
  const loadedImageRef = useRef(null);

  // 1. Fetch Memes & Subscribe to Supabase Realtime Changes
  useEffect(() => {
    fetchMemes();

    const channel = supabase
      .channel('public:memes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMemes((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMemes((prev) =>
              prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            );
          } else if (payload.eventType === 'DELETE') {
            setMemes((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        setRealtimeStatus(status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchMemes() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('memes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemes(data || []);
    } catch (err) {
      console.error('Error fetching memes:', err);
      setErrorMsg(err.message || 'Could not connect to Supabase memes table.');
    } finally {
      setLoading(false);
    }
  }

  // 2. HTML5 Canvas Meme Renderer
  useEffect(() => {
    if (!isCreatorOpen) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      drawCanvas();
    };
    img.src = selectedImageSrc;
  }, [selectedImageSrc, isCreatorOpen]);

  useEffect(() => {
    if (isCreatorOpen && loadedImageRef.current) {
      drawCanvas();
    }
  }, [topText, bottomText, fontSize, isCreatorOpen]);

  function drawCanvas() {
    const canvas = canvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    const maxWidth = 640;
    const scale = maxWidth / img.width;
    canvas.width = maxWidth;
    canvas.height = Math.round(img.height * scale);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Configure classic Impact meme typography
    ctx.font = `900 ${fontSize}px Impact, "Arial Black", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(4, Math.floor(fontSize / 8));
    ctx.lineJoin = 'round';
    ctx.textAlign = 'center';

    // Draw Top Text
    if (topText) {
      ctx.textBaseline = 'top';
      const upperTop = topText.toUpperCase();
      ctx.strokeText(upperTop, canvas.width / 2, 20, canvas.width - 32);
      ctx.fillText(upperTop, canvas.width / 2, 20, canvas.width - 32);
    }

    // Draw Bottom Text
    if (bottomText) {
      ctx.textBaseline = 'bottom';
      const upperBottom = bottomText.toUpperCase();
      ctx.strokeText(upperBottom, canvas.width / 2, canvas.height - 20, canvas.width - 32);
      ctx.fillText(upperBottom, canvas.width / 2, canvas.height - 20, canvas.width - 32);
    }
  }

  // Handle Custom Image Upload from Computer
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImageSrc(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  // Download Canvas Locally as PNG
  function handleDownloadCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `thememes-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // 3. Publish Meme to Supabase Storage & Database
  async function handlePublishMeme(e) {
    e.preventDefault();
    if (!canvasRef.current) return;

    setIsPublishing(true);
    setErrorMsg(null);

    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      let publicImageUrl = dataUrl;

      // Upload rendered PNG to Supabase Storage bucket 'meme-images'
      try {
        publicImageUrl = await uploadMemeToStorage(dataUrl);
      } catch (storageErr) {
        console.warn('Storage bucket upload failed, falling back to inline image:', storageErr);
      }

      const newMemePayload = {
        title: title.trim() || topText.trim() || 'Untitled Meme',
        image_url: publicImageUrl,
        top_text: topText.trim(),
        bottom_text: bottomText.trim(),
        category: category || 'Trending',
        author: author.trim() || 'Anon',
        upvotes: 1,
      };

      const { data, error } = await supabase
        .from('memes')
        .insert([newMemePayload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMemes((prev) => [data, ...prev.filter((m) => m.id !== data.id)]);
      }

      // Reset & close modal
      setTitle('');
      setIsCreatorOpen(false);
    } catch (err) {
      console.error('Failed to publish meme:', err);
      alert(`Failed to publish meme: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  }

  // 4. Upvote / Downvote Handler with Optimistic UI & Supabase Sync
  async function handleVote(meme, direction) {
    const currentVote = userVotes[meme.id] || 0;
    let delta = direction;

    if (currentVote === direction) {
      // Undo vote if clicking the same button
      delta = -direction;
    } else if (currentVote !== 0) {
      // Switching from upvote to downvote or vice versa
      delta = direction * 2;
    }

    const newUpvotes = Math.max(0, (meme.upvotes || 0) + delta);
    const nextVoteState = currentVote === direction ? 0 : direction;

    // Save vote state locally
    const updatedVotes = { ...userVotes, [meme.id]: nextVoteState };
    setUserVotes(updatedVotes);
    localStorage.setItem('thememes_votes', JSON.stringify(updatedVotes));

    // Optimistic UI update
    setMemes((prev) =>
      prev.map((m) => (m.id === meme.id ? { ...m, upvotes: newUpvotes } : m))
    );

    // Update Supabase
    const { error } = await supabase
      .from('memes')
      .update({ upvotes: newUpvotes })
      .eq('id', meme.id);

    if (error) {
      console.error('Failed to update vote:', error);
      fetchMemes(); // Rollback on failure
    }
  }

  // Seed starter memes if table is empty
  async function handleSeedStarterMemes() {
    setIsSeeding(true);
    try {
      const { data, error } = await supabase
        .from('memes')
        .insert(SAMPLE_SEED_MEMES)
        .select();

      if (error) throw error;
      if (data) setMemes(data);
    } catch (err) {
      alert(`Error seeding memes: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  }

  function handleShare(meme) {
    navigator.clipboard.writeText(window.location.href);
    setCopiedId(meme.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Filter and sort memes
  const filteredMemes = memes
    .filter((m) => {
      const matchesCat =
        selectedCategory === 'All' ||
        (m.category && m.category.toLowerCase() === selectedCategory.toLowerCase());
      const matchesSearch =
        !searchQuery.trim() ||
        m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.top_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.bottom_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.author?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'new') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return (b.upvotes || 0) - (a.upvotes || 0);
    });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-violet-200 to-fuchsia-400 bg-clip-text text-transparent">
                  thememes.net
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    realtimeStatus === 'SUBSCRIBED'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {realtimeStatus === 'SUBSCRIBED' ? 'Live Sync' : 'Supabase'}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Community Meme Generator & Real-Time Feed
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memes, templates, or creators..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMemes}
              title="Refresh Feed"
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsCreatorOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Meme</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center Feed (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Sort & Category Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800/80 p-3 rounded-2xl">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSortBy('hot')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sortBy === 'hot'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Hot
              </button>
              <button
                onClick={() => setSortBy('new')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sortBy === 'new'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Newest
              </button>
              <button
                onClick={() => setSortBy('top')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sortBy === 'top'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Top All-Time
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-800 text-violet-300 border border-violet-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner if table isn't created yet */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-semibold text-rose-300">Supabase Connection Notice</p>
                <p className="text-rose-200/90">{errorMsg}</p>
                <p className="text-xs text-rose-300/70">
                  Make sure your <code className="bg-rose-900/60 px-1.5 py-0.5 rounded">memes</code> table exists in your Supabase SQL Editor and your <code className="bg-rose-900/60 px-1.5 py-0.5 rounded">.env.local</code> keys are saved.
                </p>
              </div>
            </div>
          )}

          {/* Feed States */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-4"
                >
                  <div className="h-5 bg-slate-800 rounded w-2/3" />
                  <div className="h-80 bg-slate-800 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredMemes.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No memes in the feed yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Your Supabase database is connected and ready! Create your first custom meme or seed starter memes to test live voting.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsCreatorOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition cursor-pointer"
                >
                  Create First Meme
                </button>
                <button
                  onClick={handleSeedStarterMemes}
                  disabled={isSeeding}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSeeding ? 'Seeding...' : 'Seed 3 Sample Memes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredMemes.map((meme) => {
                const userVote = userVotes[meme.id] || 0;
                const imgUrl = meme.image_url || meme.imageUrl || meme.url;

                return (
                  <article
                    key={meme.id}
                    className="bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl overflow-hidden shadow-xl transition"
                  >
                    {/* Post Header */}
                    <div className="p-4 flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 font-semibold border border-violet-500/20">
                            {meme.category || 'Trending'}
                          </span>
                          <span>•</span>
                          <span>Posted by @{meme.author || 'Anon'}</span>
                        </div>
                        <h2 className="text-lg font-bold text-white leading-snug">
                          {meme.title}
                        </h2>
                      </div>
                    </div>

                    {/* Meme Image Container */}
                    <div className="bg-black flex items-center justify-center max-h-[600px] overflow-hidden border-y border-slate-800/80">
                      <img
                        src={imgUrl}
                        alt={meme.title}
                        className="max-h-[580px] w-auto object-contain"
                        loading="lazy"
                      />
                    </div>

                    {/* Post Footer / Actions */}
                    <div className="p-3.5 px-4 flex items-center justify-between bg-slate-900/90">
                      {/* Upvote / Downvote Pill */}
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                        <button
                          onClick={() => handleVote(meme, 1)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm transition cursor-pointer ${
                            userVote === 1
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <ArrowBigUp
                            className={`w-5 h-5 ${userVote === 1 ? 'fill-orange-400' : ''}`}
                          />
                          <span>{meme.upvotes || 0}</span>
                        </button>
                        <div className="w-px h-5 bg-slate-800 mx-0.5" />
                        <button
                          onClick={() => handleVote(meme, -1)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            userVote === -1
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <ArrowBigDown
                            className={`w-5 h-5 ${userVote === -1 ? 'fill-indigo-400' : ''}`}
                          />
                        </button>
                      </div>

                      {/* Share & Download */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleShare(meme)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition cursor-pointer"
                        >
                          {copiedId === meme.id ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-400">Copied Link</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4" />
                              <span>Share</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar (4 cols) */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Call to Action Card */}
          <div className="bg-gradient-to-br from-violet-900/40 via-slate-900 to-fuchsia-950/40 border border-violet-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-violet-300 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>HTML5 Meme Studio</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Generate custom memes right in your browser using our built-in templates or upload your own photos. Hosted directly on Supabase Storage.
            </p>
            <button
              onClick={() => setIsCreatorOpen(true)}
              className="w-full py-2.5 rounded-xl bg-white text-slate-950 hover:bg-violet-100 font-bold text-xs tracking-wide uppercase transition cursor-pointer"
            >
              Launch Meme Generator
            </button>
          </div>

          {/* Top Leaderboard */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-white">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Hall of Fame</span>
            </div>
            <div className="space-y-3">
              {[...memes]
                .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
                .slice(0, 5)
                .map((m, idx) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 text-xs border-b border-slate-800/60 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-slate-200 font-medium truncate">{m.title}</span>
                    </div>
                    <span className="text-orange-400 font-bold shrink-0">
                      ▲ {m.upvotes || 0}
                    </span>
                  </div>
                ))}
              {memes.length === 0 && (
                <p className="text-xs text-slate-500">No memes ranked yet.</p>
              )}
            </div>
          </div>

          {/* AdSense Ready Slot */}
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Sponsored Slot
            </span>
            <p className="text-xs text-slate-400">thememes.net AdSense Container</p>
          </div>
        </aside>
      </main>

      {/* HTML5 Canvas Meme Generator Modal */}
      {isCreatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-lg text-white">Create & Publish Meme</h3>
              </div>
              <button
                onClick={() => setIsCreatorOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handlePublishMeme} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left: Live HTML5 Canvas Preview (7 cols) */}
              <div className="md:col-span-7 flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[420px] w-auto rounded-lg shadow-lg"
                />
                <div className="flex items-center gap-3 w-full justify-between pt-2 border-t border-slate-900 text-xs text-slate-400">
                  <span>Live HTML5 Canvas Preview</span>
                  <button
                    type="button"
                    onClick={handleDownloadCanvas}
                    className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </button>
                </div>
              </div>

              {/* Right: Controls (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                {/* Template Picker & Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    1. Choose Template or Upload Photo
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_TEMPLATES.map((tpl) => (
                      <button
                        type="button"
                        key={tpl.name}
                        onClick={() => {
                          setSelectedImageSrc(tpl.url);
                          setTopText(tpl.defaultTop);
                          setBottomText(tpl.defaultBottom);
                        }}
                        className={`h-14 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                          selectedImageSrc === tpl.url
                            ? 'border-violet-500 scale-105'
                            : 'border-slate-800 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={tpl.url}
                          alt={tpl.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  <label className="mt-2 flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-violet-400" />
                    <span>Upload Custom Image from Device</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Caption Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Post Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your meme a catchy title..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Top Text
                      </label>
                      <input
                        type="text"
                        value={topText}
                        onChange={(e) => setTopText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Bottom Text
                      </label>
                      <input
                        type="text"
                        value={bottomText}
                        onChange={(e) => setBottomText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  {/* Font Size Slider */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Impact Font Size</span>
                      <span>{fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="24"
                      max="72"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                      >
                        {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Creator Handle
                      </label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="Anon"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Publish Button */}
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition cursor-pointer disabled:opacity-50"
                >
                  {isPublishing ? 'Uploading to Supabase...' : 'Publish to thememes.net'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}