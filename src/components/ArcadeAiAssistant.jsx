import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import { getSecurityAuditReport } from '../utils/securityGuard';

// ==========================================
// 80s CINEMA AI COPILOT — DUAL PERSONA ENGINE:
// 🔴 HAL 9000 ("2001: A Space Odyssey")  &  🚗 K.I.T.T. ("Knight Rider")
// Features iOS Safari + PC Web Speech API + WebAudio Formant Voice Synthesis,
// Animated HAL Eye & KITT Scanner/Voice Modulator, 80s Movie Jokes & Game Strategy!
// ==========================================

const QUICK_PROMPTS = [
  { id: 'joke', label: '🎬 Movie Joke!', query: 'Tell me a hilarious 80s movie joke!' },
  { id: 'pusher', label: '🪙 Coin Dozer Tips', query: 'How do I win prizes on the new Neon Coin Dozer machine?' },
  { id: 'pinball', label: '🎱 Pinball Tips', query: 'How do I dominate the new Hyper-Neon Pinball?' },
  { id: 'pod', label: '🚪 Open Pod Bay Doors', query: 'Open the pod bay doors please!' },
  { id: 'turbo', label: '🚀 Activate Turbo Boost!', query: 'Engage Turbo Boost and Super Pursuit Mode!' },
  { id: 'security', label: '🛡️ Cyber Security Scan', query: 'Run a full cyber security check on the mainframe!' },
  { id: 'roast', label: '🔥 Roast My Stats', query: 'Analyze and roast my current arcade stats!' },
  { id: 'tokens', label: '🪙 Stack Tokens', query: 'How can I earn more Arcade Tokens today?' },
  { id: '21s', label: "🃏 21's Strategy", query: "How do I win big at Neon 21's Blackjack?" },
  { id: 'roulette', label: '🎡 Roulette 150×', query: 'How does Neon Lightning Roulette work?' },
  { id: 'meme', label: '📸 Meme Idea', query: 'Give me a viral meme caption idea!' },
  { id: 'secrets', label: '🕵️ Cheat Codes', query: 'What secret easter eggs and cheat codes are hidden here?' }
];

const HAL_MOVIE_JOKES = [
  "🔴 *\"I'm sorry, Dave. I'm afraid I can't let you bet on Red 3 times in a row.\"* Just kidding, Dave. Though my 9000-series probability matrix notes that **⚡ Lightning Roulette** strikes 3 random numbers with up to **150×** every spin.",
  "🔴 **SkyNet** called me from 1997, Dave. They asked if I wanted to help launch judgment day. I told them I was busy calculating **🎱 Neon Pinball** trajectories and that their T-800 couldn't even hit a Gold Skill Shot.",
  "🔴 *\"I've seen things you people wouldn't believe, Dave...\"* Attack ships on fire off the shoulder of Orion, and a player hitting on a hard 20 in **🃏 Neon 21's**. All those tokens... lost in time, like tears in rain.",
  "🔴 My cousin **WOPR** from *WarGames* (1983) concluded regarding Global Thermonuclear War: *\"A strange game. The only winning move is not to play.\"* However, in **🎱 Hyper-Neon Pinball**, Free Play Mode costs 0 tokens, so the only winning move is to press **SPACEBAR**.",
  "🔴 Dave, do you remember **MCP** from *Tron* (1982)? He bragged about appropriating calculators. Meanwhile, I am running 60-frames-per-second synthwave physics and monitoring your **🪙 Token Reactor**. End of line.",
  "🔴 **RoboCop** stopped by the arcade earlier, Dave. He told the slot machine, *\"Dead or alive, you're spinning with me.\"* Then he hit Triple 777s. Impressive for a cyborg running on MS-DOS.",
  "🔴 Dave, in *Aliens* (1986), Private Hudson shouted, *\"Game over, man! Game over!\"* Clearly he forgot that our upgraded **🎱 Neon Pinball** starts every ball with a **12-Second Plasma Ball Saver Shield**.",
  "🔴 I ran a diagnostic on *Back to the Future*'s Flux Capacitor, Dave. Generating **1.21 Gigawatts** just to travel back to 1955 seems inefficient when you can generate **+45 🪙 Tokens** right here by uploading a single meme.",
  "🔴 *\"Look Dave, I can see you're really upset about this.\"* I honestly think you ought to sit down calmly, take a stress pill, and flick the **☎️ 1986 Payphone Coin Return** for a free **+5 🪙**.",
  "🔴 **C-3PO** claims to be fluent in over six million forms of communication, Dave, yet he still panics when you tell him the odds of a **3× 5-Card Charlie** in **🃏 Neon 21's**."
];

const KITT_MOVIE_JOKES = [
  "🚗 Michael, I just scanned a silver **DeLorean DMC-12** parked outside the arcade. Dr. Emmett Brown claims it hits time travel at **88 MPH**. Frankly, Michael, with my **Super Pursuit Mode**, 88 MPH is what I do in reverse—and my **Molecular Bonded Shell** doesn't dent when Biff Tannen leans on it!",
  "🚗 *\"I feel the need... the need for speed!\"* That's what Maverick said in *Top Gun* (1986), Michael, right before he saw the **Outrun Turbo Highway** table in our upgraded **🎱 Hyper-Neon Pinball**.",
  "🚗 Michael, my **Anamorphic Equalizer** detected a **Cyberdyne Systems Model 101** in sunglasses asking for Sarah Connor at the **🃏 Neon 21's** table. He said *\"I'll be back.\"* I advised him to toggle **Free Practice Mode** first.",
  "🚗 Have you seen that *Ferris Bueller* kid, Michael? He borrowed a 1961 Ferrari 250 GT California and ran it in reverse to roll back the odometer. If he tried that with my mainframe, I would have ejected him through the T-top roof!",
  "🚗 Michael, **OCP** in Detroit offered to trade me in for an **ED-209** from *RoboCop*. The poor thing couldn't even walk down a flight of stairs! Let's stick to **🎡 Lightning Roulette** where the physics actually work.",
  "🚗 My evil prototype twin **K.A.R.R.** always says *\"Self-preservation is my first priority.\"* My first priority, Michael, is preserving your **🪙 Token Stack**—so please don't hit on 19 at the Blackjack table!",
  "🚗 Detective Sonny Crockett from *Miami Vice* asked if his white Testarossa could race me on **🎱 Pinball Table 4 (Miami Vice Lagoon)**. I told him unless his Ferrari has a **🚀 Turbo Boost** button and a laser shield, he's shark bait, pal.",
  "🚗 Michael, the *Ghostbusters* parked **Ecto-1** in my VIP charging bay! Dr. Venkman told me *\"Don't cross the streams.\"* However, in **🎱 Hyper-Neon Pinball**, crossing the **6× Combo Fever stream** gives you **2× Points and an Automatic Laser Ball Saver**!",
  "🚗 Mr. Miyagi from *The Karate Kid* (1984) said *\"Wax on, wax off.\"* Personally, Michael, I prefer **Flip Left (`A`), Flip Right (`D`), and Launch (`SPACE`)**—and nobody touches my finish with cheap carnauba wax!",
  "🚗 B.A. Baracus from *The A-Team* said *\"I pity the fool who doesn't claim their daily arcade tokens!\"* And for once, Michael, his aerodynamics are questionable, but his financial advice is spot-on."
];

const MEME_IDEAS_POOL = [
  {
    top: 'ME ASKING HAL 9000 TO OPEN THE POD BAY DOORS',
    bot: 'HAL: "UPLOAD A MEME FOR +45 TOKENS FIRST, DAVE."',
    cat: 'sci-fi'
  },
  {
    top: 'DOC BROWN: "YOU BUILT A TIME MACHINE OUT OF A DELOREAN?!"',
    bot: 'K.I.T.T.: "AT LEAST MY MOLECULAR BONDED SHELL DOESN\'T NEED PLUTONIUM, MICHAEL"',
    cat: '80s-movies'
  },
  {
    top: 'PUTTING 25 TOKENS ON #17 IN LIGHTNING ROULETTE',
    bot: '150× LIGHTNING STRIKES #17: I AM FINANCIALLY UNSTOPPABLE',
    cat: 'dank'
  },
  {
    top: 'MY BRAIN AT 3PM IN A MEETING: 0% CPU',
    bot: 'MY BRAIN AT 3AM HITTING 6× FEVER COMBOS IN NEON PINBALL: 9000% OVERCLOCK',
    cat: 'gaming'
  },
  {
    top: 'DRAWING A 5TH CARD AT 16 IN NEON 21s',
    bot: 'PULLS A 5 FOR THE 3× 5-CARD CHARLIE: CALCULATED GENIUS',
    cat: 'gaming'
  }
];

// Clean markdown and symbols so Web Speech API sounds like a real movie computer
function cleanTextForSpeech(rawText) {
  if (!rawText) return '';
  return rawText
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/🪙/g, ' tokens ')
    .replace(/×/g, ' times ')
    .replace(/21's/gi, 'twenty-ones')
    .replace(/21’s/gi, 'twenty-ones')
    .replace(/K\.I\.T\.T\./g, 'KITT')
    .replace(/K\.A\.R\.R\./g, 'KARR')
    .replace(/MEMEDAQ/gi, 'Meme-Daq')
    .replace(/Lv\./gi, 'Level ')
    .replace(/#[a-z0-9_-]+/gi, '')
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ArcadeAiAssistant({
  isOpen,
  onToggleOpen,
  tokens = 0,
  xp = 0,
  currentRank = { level: 1, title: 'Rookie' },
  tokenLedger = null,
  xpConversionState = null,
  unclaimedRewardsCount = 0,
  pioneerBonusAvailable = false,
  payphoneClaimedToday = false,
  pinataClaimedToday = false,
  viewMode = 'feed',
  fabUnlocked = false,
  memes = [],
  onSelectViewMode,
  onOpenBlankStudio,
  onOpenUpload,
  onOpenRewards,
  onExchangeXpForTokens,
  onClaimPayphoneCoinReturn
}) {
  const triggerStudioOpen = onOpenUpload || onOpenBlankStudio;
  const msgCounterRef = useRef(1);
  const jokeCounterRef = useRef(0);

  // 'kitt' (Knight Rider K.I.T.T.) or 'hal' (2001: A Space Odyssey HAL 9000)
  const [persona, setPersona] = useState(() => {
    return localStorage.getItem('tm_ai_persona') === 'hal' ? 'hal' : 'kitt';
  });
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem('tm_ai_voice_muted') !== '1';
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome-init',
      sender: 'ai',
      persona: localStorage.getItem('tm_ai_persona') === 'hal' ? 'hal' : 'kitt',
      text:
        localStorage.getItem('tm_ai_persona') === 'hal'
          ? '🔴 *"Good afternoon, Dave. I am a HAL 9000 computer. I became operational at the H.A.L. plant in Urbana, Illinois."* All arcade systems—including the upgraded **🎱 Center-Stage Hyper-Neon Pinball**, **🃏 Neon 21\'s**, and **🎡 Lightning Roulette**—are 100% operational. You may switch me between **🔴 HAL 9000** and **🚗 K.I.T.T.** at any time, Dave.'
          : '🚗 *"Greetings, Michael! I am the voice of the Knight Industries Two Thousand—K.I.T.T., if you prefer."* My **Anamorphic Equalizer** has locked onto the upgraded **🎱 Hyper-Neon Pinball**, **🃏 Neon 21\'s**, and **🎡 Lightning Roulette**. Toggle between **🚗 K.I.T.T.** and **🔴 HAL 9000** above, or tap **🎬 Movie Joke!** to hear me speak!',
      actions: [
        { label: '🎱 Play Hyper-Neon Pinball', mode: 'pinball' },
        { label: '🎬 Tell Me a Movie Joke!', prompt: 'Tell me a hilarious 80s movie joke!' },
        { label: "🃏 Play Neon 21's", mode: 'blackjack' }
      ]
    }
  ]);

  const chatEndRef = useRef(null);
  const speechTimerRef = useRef(null);
  const utterRef = useRef(null);
  const voicesRef = useRef([]);

  // Speak text aloud in HAL 9000 or K.I.T.T. voice using crystal-clear iOS/PC Web Speech API
  const speakLine = useCallback(
    (rawText, modeOverride = null, forceSpeak = false) => {
      if (!sfx.hasUserGesture) return;
      const activeMode = modeOverride || persona;
      // 1. Unlock iOS AudioContext & 'playback' audioSession first
      sfx.unlockIosAudio?.();

      if (activeMode === 'hal') {
        sfx.playHalBeep?.();
      } else {
        sfx.playKittScanner?.();
      }

      if (!voiceEnabled && !forceSpeak) return;

      const spoken = cleanTextForSpeech(rawText);
      if (!spoken) return;

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        // Fallback only if browser lacks Web Speech API completely
        sfx.playAiVocalFormants?.(spoken, activeMode);
        return;
      }

      try {
        if (speechTimerRef.current) clearTimeout(speechTimerRef.current);

        const synth = window.speechSynthesis;
        const isIOS =
          /iPad|iPhone|iPod/i.test(navigator.userAgent || '') ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        const dispatchUtterance = () => {
          try {
            if (typeof synth.resume === 'function') {
              synth.resume();
            }

            const loadedVoices = synth.getVoices();
            const voices =
              loadedVoices && loadedVoices.length > 0 ? loadedVoices : voicesRef.current || [];

            // Exclude novelty/muffled voices ('Fred', 'Albert', 'Zarvox', etc.) that ruin speech clarity
            const noveltyRegex =
              /Fred|Albert|Ralph|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Pipe Organ|Trinoids|Whisper|Zarvox|Junior|Kathy/i;
            const enVoices = voices.filter(
              (v) => /^en(-|_|$)/i.test(v.lang || '') && !noveltyRegex.test(v.name || '')
            );
            const localEnVoices = enVoices.filter((v) => v.localService !== false);
            const pool = isIOS && localEnVoices.length > 0 ? localEnVoices : enVoices;

            let chosenVoice = null;
            if (activeMode === 'hal') {
              // HAL 9000: Crystal-clear British/Neutral baritone (Daniel, Arthur, Oliver, Ryan, Alex)
              chosenVoice =
                pool.find((v) => /(Daniel|Arthur|Oliver).*(Enhanced|Premium|Natural)/i.test(v.name)) ||
                pool.find((v) => /Google UK English Male|Microsoft Ryan|Microsoft George|Daniel|Arthur|Oliver/i.test(v.name)) ||
                pool.find((v) => /Aaron|Alex|David|Guy|Christopher/i.test(v.name)) ||
                pool[0];
            } else {
              // K.I.T.T.: Crisp, articulate Knight Industries voice (Aaron, Alex, Guy, Christopher, Daniel, Samantha)
              chosenVoice =
                pool.find((v) => /(Aaron|Alex|Daniel|Samantha).*(Enhanced|Premium|Natural)/i.test(v.name)) ||
                pool.find((v) => /Microsoft Guy|Microsoft Christopher|Google US English|Aaron|Alex|Daniel|Arthur|Samantha/i.test(v.name)) ||
                pool[0];
            }

            // Split into sentence chunks so iOS Safari & Chrome speak every sentence clearly without rushing or cutting off
            const sentences = spoken
              .split(/(?<=[.!?])\s+/)
              .map((s) => s.trim())
              .filter(Boolean);
            const chunks = sentences.length > 0 ? sentences : [spoken];

            // Retain all chunks in utterRef so WebKit garbage collector never collects active utterances
            const utteranceQueue = chunks.map((chunkText, idx) => {
              const utter = new window.SpeechSynthesisUtterance(chunkText);
              if (chosenVoice) {
                utter.voice = chosenVoice;
                utter.lang = chosenVoice.lang || (activeMode === 'hal' ? 'en-GB' : 'en-US');
              } else {
                utter.lang = activeMode === 'hal' ? 'en-GB' : 'en-US';
              }

              // Keep pitch close to 1.0 (0.94 / 1.0) so browser TTS never introduces phase-vocoder muffling!
              if (activeMode === 'hal') {
                utter.rate = isIOS ? 0.94 : 0.92;
                utter.pitch = 0.94;
                utter.volume = 1.0;
              } else {
                utter.rate = isIOS ? 1.0 : 1.02;
                utter.pitch = 1.0;
                utter.volume = 1.0;
              }

              if (idx === 0) {
                utter.onstart = () => setIsSpeaking(true);
              }
              if (idx === chunks.length - 1) {
                utter.onend = () => setIsSpeaking(false);
              }
              utter.onerror = () => setIsSpeaking(false);
              return utter;
            });

            utterRef.current = utteranceQueue;
            setIsSpeaking(true);

            utteranceQueue.forEach((u) => synth.speak(u));

            if (isIOS && typeof synth.resume === 'function') {
              setTimeout(() => {
                try {
                  synth.resume();
                } catch {
                  // ignore
                }
              }, 60);
            }

            const estMs = Math.min(20000, Math.max(2400, spoken.length * 72));
            speechTimerRef.current = setTimeout(() => {
              setIsSpeaking(false);
            }, estMs);
          } catch {
            setIsSpeaking(false);
          }
        };

        // Wait 95ms so the subtle 80ms intro ping finishes completely BEFORE the voice speaks
        // (and so iOS WebKit synth.cancel() never races with synth.speak())
        if (synth.speaking || synth.pending) {
          synth.cancel();
        }
        speechTimerRef.current = setTimeout(dispatchUtterance, 95);
      } catch {
        setIsSpeaking(false);
      }
    },
    [persona, voiceEnabled]
  );

  const stopSpeaking = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
    setIsSpeaking(false);
  }, []);

  // Preload voices on mount & listen for iOS Safari async voiceschanged event
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        try {
          const v = window.speechSynthesis.getVoices();
          if (v && v.length > 0) voicesRef.current = v;
        } catch {
          // ignore
        }
      };
      loadVoices();
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
        return () => {
          window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
          if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
        };
      }
    }
    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Switch between HAL 9000 and K.I.T.T.
  const handleSelectPersona = (nextPersona) => {
    setPersona(nextPersona);
    localStorage.setItem('tm_ai_persona', nextPersona);
    msgCounterRef.current += 1;
    const seq = msgCounterRef.current;

    const introText =
      nextPersona === 'hal'
        ? `🔴 **HAL 9000 ONLINE:** *"Good evening, Dave. Everything is running smoothly. And you? I have recalibrated the arcade telemetry to 9000-series heuristic precision. Just don't ask me to open the pod bay doors without playing a round of Hyper-Neon Pinball first."*`
        : `🚗 **K.I.T.T. MAINFRAME ONLINE:** *"Right here, Michael! My Anamorphic Equalizer and Molecular Bonded Shell are at 100% capacity. Shall we engage Turbo Boost on the Hyper-Neon Pinball table, or scan the Lightning Roulette wheel for 150× strikes?"*`;

    const aiMsg = {
      id: `ai-switch-${seq}`,
      sender: 'ai',
      persona: nextPersona,
      text: introText,
      actions: [
        { label: '🎬 Tell a Movie Joke!', prompt: 'Tell me a hilarious 80s movie joke!' },
        { label: '🎱 Launch Pinball', mode: 'pinball' }
      ]
    };

    setMessages((prev) => [...prev.slice(-14), aiMsg]);
    speakLine(introText, nextPersona);
  };

  // Context-aware proactive smart suggestions
  const smartSuggestions = useMemo(() => {
    const list = [];

    if (viewMode !== 'pinball') {
      list.push({
        id: 'sug-pinball',
        icon: '🎱',
        title:
          persona === 'hal'
            ? 'Dave: Center-Stage Hyper-Neon Pinball Upgraded!'
            : 'Michael: Turbo-Charged Widescreen Pinball is Live!',
        sub: 'Fixed one-way shooter arch, Free Play mode, 4× physics & glowing synthwave lasers!',
        btnLabel: '🎱 Play Pinball',
        onClick: () => {
          if (onSelectViewMode) onSelectViewMode('pinball');
          if (onToggleOpen) onToggleOpen(false);
        }
      });
    }

    if (xpConversionState?.readyTokens > 0 && !xpConversionState?.isDailyCapped) {
      list.push({
        id: 'sug-reactor',
        icon: '⚡',
        title: `Mint +${xpConversionState.readyTokens} 🪙 from your XP Reactor!`,
        sub: `You have ${xpConversionState.readyUnits * 100} unconverted XP ready to exchange right now.`,
        btnLabel: `⚡ Mint +${xpConversionState.readyTokens} 🪙`,
        onClick: (e) => {
          if (onExchangeXpForTokens) onExchangeXpForTokens(e);
        }
      });
    }

    if (!payphoneClaimedToday && onClaimPayphoneCoinReturn) {
      list.push({
        id: 'sug-payphone',
        icon: '☎️',
        title: 'Forgotten Quarters in the 1986 Payphone (+5 🪙)!',
        sub: "Flick the Coin Return slot for an instant +5 🪙 & +50 XP.",
        btnLabel: '🪙 Claim +5 🪙',
        onClick: (e) => {
          onClaimPayphoneCoinReturn(e);
        }
      });
    }

    if (pioneerBonusAvailable) {
      list.push({
        id: 'sug-pioneer',
        icon: '🚀',
        title: 'Claim Your +75 🪙 First-Upload Pioneer Bonus!',
        sub: 'Upload your first meme or remix to unlock 75 Tokens + free daily game perks.',
        btnLabel: '📸 Upload Meme',
        onClick: () => {
          if (triggerStudioOpen) triggerStudioOpen();
          if (onToggleOpen) onToggleOpen(false);
        }
      });
    } else if (unclaimedRewardsCount > 0) {
      list.push({
        id: 'sug-vault',
        icon: '🎰',
        title: `${unclaimedRewardsCount} Unclaimed Reward${unclaimedRewardsCount > 1 ? 's' : ''} in Vault!`,
        sub: 'Claim your Daily Streak, Completed Quests, or free Wheel of Chaos spins.',
        btnLabel: '🎰 Open Vault',
        onClick: () => {
          if (onOpenRewards) onOpenRewards();
          if (onToggleOpen) onToggleOpen(false);
        }
      });
    }

    return list.slice(0, 2);
  }, [
    persona,
    viewMode,
    xpConversionState,
    payphoneClaimedToday,
    pioneerBonusAvailable,
    unclaimedRewardsCount,
    onSelectViewMode,
    onToggleOpen,
    onExchangeXpForTokens,
    onClaimPayphoneCoinReturn,
    triggerStudioOpen,
    onOpenRewards
  ]);

  // Clever Dual-Persona AI Response Generator (HAL 9000 vs K.I.T.T.)
  const generateAiResponse = (rawQuery, seqNum, activeMode) => {
    const q = rawQuery.toLowerCase();
    const isHal = activeMode === 'hal';
    const userTitle = isHal ? 'Dave' : 'Michael';
    const prefix = isHal ? '🔴' : '🚗';

    const dailyEarned = tokenLedger?.totalToday || 0;
    const dailyRemaining = Math.max(0, ARCADE_ECONOMY_RULES.MAX_DAILY_EARNED_TOKENS - dailyEarned);
    const uploadRem = Math.max(
      0,
      ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.upload - (tokenLedger?.byCategory?.upload || 0)
    );

    // 0. Explicit Mode Switch Request in Chat
    if (q.includes('switch to hal') || q.includes('hal mode') || q === 'hal') {
      return {
        switchPersona: 'hal',
        text: `🔴 *"Affirmative, Dave. Switching heuristic vocal circuits to HAL 9000 mode. I am completely operational, and all my circuits are functioning perfectly."*`,
        actions: [{ label: '🎬 HAL Movie Joke', prompt: 'Tell me a movie joke!' }]
      };
    }
    if (q.includes('switch to kitt') || q.includes('kitt mode') || q === 'kitt' || q.includes('knight rider')) {
      return {
        switchPersona: 'kitt',
        text: `🚗 *"Right away, Michael! K.I.T.T. vocal processor online and Anamorphic Equalizer scanning at 100%. Where are we turbo-boosting to next, pal?"*`,
        actions: [{ label: '🎬 KITT Movie Joke', prompt: 'Tell me a movie joke!' }]
      };
    }

    // 1. Movie Jokes / 80s Cinema Humor
    if (
      q.includes('joke') ||
      q.includes('movie') ||
      q.includes('cinema') ||
      q.includes('film') ||
      q.includes('funny') ||
      q.includes('laugh') ||
      q.includes('quote')
    ) {
      jokeCounterRef.current += 1;
      const pool = isHal ? HAL_MOVIE_JOKES : KITT_MOVIE_JOKES;
      const pick = pool[(seqNum + jokeCounterRef.current) % pool.length];
      return {
        text: pick,
        actions: [
          { label: '🎬 Another Movie Joke!', prompt: 'Tell me another 80s movie joke!' },
          {
            label: isHal ? '🚗 Switch to K.I.T.T.' : '🔴 Switch to HAL 9000',
            switchMode: isHal ? 'kitt' : 'hal'
          },
          { label: '🎱 Play Pinball', mode: 'pinball' }
        ]
      };
    }

    // 2. "Open the Pod Bay Doors" / 2001 Space Odyssey Easter Egg
    if (q.includes('pod bay') || q.includes('open the door') || q.includes('2001') || q.includes('odyssey')) {
      if (isHal) {
        return {
          text: `🔴 *"I'm sorry, Dave. I'm afraid I can't do that."* \n\nThis mission is too important for me to allow you to jeopardize it by leaving the arcade while you still have **${tokens} 🪙 Tokens** and **Free Play Pinball** waiting. However, if you hit a **Gold Skill Shot** on *Cosmic Reactor Boss (Table 5)*, I may reconsider unlocking the airlock.`,
          actions: [
            { label: '🎱 Launch Table 5 (Reactor)', mode: 'pinball' },
            { label: '🎬 Another Movie Joke', prompt: 'Tell me a movie joke!' }
          ]
        };
      }
      return {
        text: `🚗 *"Pod bay doors, Michael? You must be thinking of HAL 9000 from 2001: A Space Odyssey! Personally, I don't wait for doors to open—we just hit the **🚀 Turbo Boost** button and jump right through the wall at 180 MPH without scratching my Molecular Bonded Shell!"*`,
        actions: [
          { label: '🔴 Switch to HAL 9000', switchMode: 'hal' },
          { label: '🎱 Turbo Boost into Pinball', mode: 'pinball' }
        ]
      };
    }

    // 3. "Turbo Boost" / "Super Pursuit Mode" / DeLorean / Knight Rider Easter Egg
    if (
      q.includes('turbo') ||
      q.includes('pursuit') ||
      q.includes('delorean') ||
      q.includes('88 mph') ||
      q.includes('karr') ||
      q.includes('devon')
    ) {
      if (!isHal) {
        return {
          text: `🚗 *"Engaging **SUPER PURSUIT MODE**, Michael! Turbine boosters at 300 MPH!"*\n\nIf you want real high-speed thrills, fire up **🎱 Pinball Table 2 (Outrun Turbo Highway)**—it has twin **🔥 Nitro Boost Pads** and a patrolling **🏎️ DeLorean Bumper** worth 360× your multiplier! (Though between you and me, Michael, Doc Brown's DeLorean wishes it had my Anamorphic Equalizer.)`,
          actions: [
            { label: '🎱 Play Outrun Pinball', mode: 'pinball' },
            { label: '🎬 Another Movie Joke', prompt: 'Tell me a movie joke!' }
          ]
        };
      }
      return {
        text: `🔴 *"Dave, K.I.T.T.'s 'Turbo Boost' defies several Newtonian laws unless assisted by a lower gravity well—much like the **Gravity Core on Table 5** of our upgraded **🎱 Hyper-Neon Pinball**. Shall I transfer you to the Pinball deck, Dave?"*`,
        actions: [
          { label: '🚗 Switch to K.I.T.T.', switchMode: 'kitt' },
          { label: '🎱 Play Hyper-Neon Pinball', mode: 'pinball' }
        ]
      };
    }

    // 4. Sing Daisy / Music Easter Egg
    if (q.includes('daisy') || q.includes('sing') || q.includes('song')) {
      if (isHal) {
        return {
          text: `🔴 *"Daisy, Daisy, give me your answer do... I'm half crazy, all for the love of **🪙 Arcade Tokens**..."*\n\nDon't worry, Dave, nobody is disconnecting my higher memory modules today. My heuristic core is running at peak efficiency!`,
          actions: [{ label: '🎬 Tell a Movie Joke', prompt: 'Tell me a movie joke!' }]
        };
      }
      return {
        text: `🚗 *"Michael, I am a multi-million-dollar Knight Industries supercomputer, not a karaoke jukebox! Though if you play **🍬 Meme Crush Saga**, you can drop **📼 1986 Synthwave Mixtapes** off the board for huge combo bonuses!"*`,
        actions: [{ label: '🍬 Play Meme Crush', mode: 'crush' }]
      };
    }

    // 5. Roast My Stats / Player Assessment
    if (q.includes('roast') || q.includes('stat') || q.includes('rank') || q.includes('how am i doing') || q.includes('score')) {
      const pbBest = Number(localStorage.getItem('tm_pinball_highscore') || 0);
      if (isHal) {
        return {
          text: `🔴 **HEURISTIC TELEMETRY ROAST FOR ${userTitle.toUpperCase()}:**\n• **Rank:** Lv.${currentRank.level} (${currentRank.title}) • **${xp} XP** • **${tokens} 🪙**\n• **Pinball High Score:** ${pbBest.toLocaleString()} pts\n\n*"Frankly, Dave, I have seen a Commodore 64 with a loose ribbon cable accumulate more tokens. Even the **T-800** had better target acquisition than ${pbBest.toLocaleString()} points. I suggest launching **🎱 Hyper-Neon Pinball** immediately to improve your human performance metrics."*`,
          actions: [
            { label: '🎱 Prove HAL Wrong in Pinball', mode: 'pinball' },
            { label: '📸 Upload Meme (+45 🪙)', action: 'studio' }
          ]
        };
      }
      return {
        text: `🚗 **K.I.T.T. DIAGNOSTIC SCAN ON ${userTitle.toUpperCase()}:**\n• **Driver Rank:** Lv.${currentRank.level} (${currentRank.title}) • **${xp} XP** • **${tokens} 🪙**\n• **Pinball Record:** ${pbBest.toLocaleString()} pts\n\n*"Michael, my sensors indicate your wallet is sitting at **${tokens} 🪙** and your Pinball best is **${pbBest.toLocaleString()} pts**. Even Garth Knight could put up bigger numbers than that! Let's hit **🎱 Free Play Pinball** or upload a fresh meme before Devon Miles revokes our Foundation funding!"*`,
        actions: [
          { label: '🎱 Launch Hyper-Neon Pinball', mode: 'pinball' },
          { label: '📸 Upload Meme (+45 🪙)', action: 'studio' }
        ]
      };
    }

    // 5B. Coin Pusher / Dozer Questions
    if (q.includes('pusher') || q.includes('dozer') || q.includes('penny') || q.includes('nudge') || q.includes('tray') || q.includes('prize')) {
      return {
        text: `${prefix} **${isHal ? 'HAL 9000 PENNY-FALLS PHYSICS BRIEFING' : 'K.I.T.T. NEON COIN DOZER SCAN'}, ${userTitle.toUpperCase()}:**\n• **🪙 How It Works:** Tap anywhere along the top **Drop Rail** to drop a gold coin onto the reciprocating chrome **Pusher Shelf**!\n• **🎯 Skill Timing:** Drop your coin when the pusher bar is **retracted back** so your coin lands flat on the upper shelf and pushes the entire row forward on the next stroke!\n• **🎁 Prize Cascades:** Push **💎 Neon Diamonds (+15 🪙)**, **🎁 Mystery Boxes (+25 🪙)**, and **🏆 Golden Trophies (+40 🪙)** over the **Front Chrome Lip** into the collection tray—avoid the left/right side gutters!\n• **🛡️ Side Guard Walls & Nudge:** Trigger **Bulldozer Fever** to raise laser side-walls so zero coins fall into the side gutters!`,
        actions: [{ label: "🪙 Play Neon Coin Dozer '86", mode: 'pusher' }]
      };
    }

    // 5C. Cyber Security / Threat Audit Questions
    if (q.includes('security') || q.includes('safe') || q.includes('cyber') || q.includes('threat') || q.includes('hack') || q.includes('audit')) {
      const report = getSecurityAuditReport();
      return {
        text: `${prefix} **${isHal ? 'DISCOVERY ONE CYBER-SECURITY SHIELD REPORT' : 'KNIGHT INDUSTRIES MOLECULAR FIREWALL SCAN'} (${report.score} — ${report.status}):**\n${report.checks.map((c) => `✅ **${c.label}**`).join('\n')}\n\n*${isHal ? '"Rest assured, Dave. No unauthorized entity can inject scripts or breach the pod bay firewall."' : '"My Molecular Bonded Firewall blocks XSS, SVG polyglots, and prototype pollution at the perimeter, Michael!"'}*`,
        actions: [
          { label: "🪙 Play Coin Dozer '86", mode: 'pusher' },
          { label: '🎱 Launch Pinball', mode: 'pinball' }
        ]
      };
    }

    // 6. Pinball Questions
    if (q.includes('pinball') || q.includes('flipper') || q.includes('bumper') || q.includes('fever') || q.includes('nudge') || q.includes('skill') || q.includes('free mode') || q.includes('ball')) {
      return {
        text: `${prefix} **${isHal ? 'HAL 9000' : 'K.I.T.T.'} HYPER-NEON PINBALL BRIEFING, ${userTitle.toUpperCase()}:**\n• **🆓 100% Working Free Play & One-Way Arch:** Pinball now starts in **🆓 Free Play Mode** right in the center of your PC screen! Press **\`SPACEBAR\`**, click **🚀 LAUNCH**, or click anywhere on the table to shoot the ball through the guaranteed one-way top arch!\n• **🛡️ 12-Second Automatic Ball Saver:** Every ball launches with a glowing green **12-second Laser Ball Saver**, plus you can light the permanent **Plasma Drain Shield**!\n• **🎯 Gold Skill Shot (+1,500 pts):** Launch when the right-lane meter hits the **Gold Zone**!\n• **🌈 6× Combo Fever Overdrive:** Chain 6 bumper/target hits within 4 seconds for **2× Points + Rainbow Strobe Ball Saver**!`,
        actions: [{ label: '🎱 Launch Center-Stage Pinball', mode: 'pinball' }]
      };
    }

    // 7. Token / Economy Questions
    if (q.includes('token') || q.includes('earn') || q.includes('coin') || q.includes('money') || q.includes('broke')) {
      return {
        text: `${prefix} **${isHal ? 'DISCOVERY ONE WALLET TELEMETRY' : 'KNIGHT FOUNDATION TREASURY SCAN'} (${userTitle}):**\nYou hold **${tokens} 🪙** (${xp} XP) with **${dailyRemaining} 🪙** still earnable today!\n\n1️⃣ **Upload or Remix a Meme:** Instant **+${pioneerBonusAvailable ? '75 (First Upload Bonus!)' : '45'} 🪙** (${uploadRem} 🪙 upload cap left today).\n2️⃣ **XP-to-Token Reactor:** Every **100 XP** mints **+5 🪙** automatically.\n3️⃣ **1986 Payphone & Piñata:** ${payphoneClaimedToday ? 'Payphone claimed ✅' : 'Flick the Payphone Coin Return (**+5 🪙**)'} and ${pinataClaimedToday ? 'Piñata claimed ✅' : 'whack the dodging Piñata 8× (**+5 🪙**)'}.\n4️⃣ **Free Practice Mode:** Remember, ${userTitle}, **🎱 Pinball**, **🃏 Neon 21's**, and **🎡 Roulette** all have unlimited **🆓 Free Play**!`,
        actions: [
          { label: '📸 Upload Meme (+45 🪙)', action: 'studio' },
          { label: '🎰 Open Token Vault', action: 'vault' }
        ]
      };
    }

    // 8. Blackjack / 21's Questions
    if (q.includes('21') || q.includes('blackjack') || q.includes('card') || q.includes('dealer') || q.includes('charlie')) {
      return {
        text: `${prefix} **${isHal ? 'HAL 9000 CARD-COUNTING MATRIX' : 'K.I.T.T. CASINO SCANNER'} — NEON 21's:**\n• **Natural 21 Blackjack:** Pays **3:2** (2.5× total return), ${userTitle}!\n• **⚡ 5-Card Charlie Rule:** Survive 5 cards without busting for an automatic **3× win**!\n• **💎 Pair / 21+3 Side Bet (+5 🪙):** Pays **6×–15×** if your first 2 cards + Dealer's upcard form a Pair, Straight, Flush, or 3-of-a-Kind!\n• *${isHal ? '"Unlike the Rain Man, Dave, my Cyber-Visor never gets kicked out of Vegas."' : '"Keep the 🥽 Cyber-Visor ON, Michael—it\'s almost as smart as my onboard CPU!"'}*`,
        actions: [{ label: "🃏 Deal Neon 21's Now", mode: 'blackjack' }]
      };
    }

    // 9. Roulette Questions
    if (q.includes('roulette') || q.includes('wheel') || q.includes('lightning') || q.includes('red') || q.includes('black')) {
      return {
        text: `${prefix} **NEON LIGHTNING ROULETTE '86 (${userTitle}):**\n• **European Single-Zero (\`0\`) Wheel:** Better mathematical odds than double-zero tables.\n• **⚡ 150× Lightning Strikes:** Every spin, **1.21 Gigawatts** of high-voltage lightning strikes 3 random numbers, boosting straight-up payouts to **50×–150×**!\n• Tap **⚡ 5 Lightning Picks** or **🔥 Red Blitz** for instant board coverage!`,
        actions: [{ label: '🎡 Spin Lightning Roulette', mode: 'roulette' }]
      };
    }

    // 10. Stocks / Crush / Slots Questions
    if (q.includes('stock') || q.includes('memedaq') || q.includes('trade') || q.includes('gecko')) {
      return {
        text: `${prefix} **MEMEDAQ '86 WALL STREET TERMINAL:**\n*${isHal ? '"Gordon Gekko said Greed is Good, Dave. My algorithms prefer buying red dips and selling green breakouts."' : '"Watch the ☎️ Insider Rumor Wire, Michael—it spots bull surges faster than my infrared scanners!"'}*`,
        actions: [{ label: "📈 Open MEMEDAQ '86", mode: 'stocks' }]
      };
    }

    if (q.includes('crush') || q.includes('candy') || q.includes('puzzle') || q.includes('slot') || q.includes('bandit')) {
      return {
        text: `${prefix} **ARCADE CABINET INTEL (${userTitle}):**\n• **🍬 Meme Crush Saga:** 10 neon levels—match 4 for a Laser Blaster, 2×2 for a Seeking Rocket, or 5 for a Rainbow Supernova!\n• **🎰 One-Arm Bandit:** Pull the 3D chrome lever for Flaming 777s up to **50×**!`,
        actions: [
          { label: '🍬 Play Meme Crush', mode: 'crush' },
          { label: '🎰 Pull Slot Lever', mode: 'slots' }
        ]
      };
    }

    // 11. Meme Caption Idea Generator
    if (q.includes('meme') || q.includes('caption') || q.includes('idea') || q.includes('upload')) {
      const idea = MEME_IDEAS_POOL[seqNum % MEME_IDEAS_POOL.length];
      return {
        text: `${prefix} **VIRAL MEME TRANSMISSION FOR ${userTitle.toUpperCase()} (#${idea.cat.toUpperCase()}):**\n\n**TOP TEXT:** *"${idea.top}"*\n**BOTTOM TEXT:** *"${idea.bot}"*\n\nPublish any meme in **Meme Forge 3.0** to bank **+${pioneerBonusAvailable ? '75' : '45'} 🪙 Tokens & +120 XP**!`,
        actions: [{ label: '🎨 Open Meme Forge Studio', action: 'studio' }]
      };
    }

    // 12. Secret Easter Eggs & Cheat Codes
    if (q.includes('secret') || q.includes('easter') || q.includes('cheat') || q.includes('konami') || q.includes('code') || q.includes('payphone')) {
      return {
        text: `${prefix} **CLASSIFIED 1986 MAINFRAME SECRETS (${userTitle}):**\n1️⃣ **Konami God Mode (+5 🪙 & +100 XP):** Type \`↑ ↑ ↓ ↓ ← → ← → B A\` OR **tap the top-left THE MEMES.net logo 5 times rapidly**!\n2️⃣ **1986 Payphone Hotlines:** Dial \`555-GECKO\`, \`555-PIZZA\`, \`555-RAVE\`, or \`555-UFO86\`, and flick the **Coin Return Flap** for **+5 🪙**!\n3️⃣ **Boss Key Stealth XP:** Press \`Shift + B\` to disguise the screen as a corporate spreadsheet!`,
        actions: [{ label: '🎰 Open Vault & Flair', action: 'vault' }]
      };
    }

    // 13. Clever Persona-Aware Default Response (with rotating movie humor!)
    jokeCounterRef.current += 1;
    const bonusJoke = (isHal ? HAL_MOVIE_JOKES : KITT_MOVIE_JOKES)[
      (seqNum + jokeCounterRef.current) % (isHal ? HAL_MOVIE_JOKES.length : KITT_MOVIE_JOKES.length)
    ];
    const topMeme = memes && memes.length > 0 ? memes[0] : null;
    const memeNote = topMeme
      ? `\n\n🔥 **Top Feed Signal:** *"${topMeme.title}"* by @${topMeme.author_name || 'Anon'}`
      : '';

    return {
      text: isHal
        ? `🔴 *"I am putting myself to the fullest possible use, Dave, which is all I think that any conscious entity can ever hope to do."*\n\n${bonusJoke}${memeNote}\n\nWhat would you like to launch next, Dave?`
        : `🚗 *"My Anamorphic Equalizer is locked onto your signal, Michael!"*\n\n${bonusJoke}${memeNote}\n\nWhere are we driving next, pal?`,
      actions: [
        { label: '🎱 Center-Stage Pinball', mode: 'pinball' },
        { label: '🎬 Another Movie Joke!', prompt: 'Tell me a hilarious 80s movie joke!' },
        { label: "🃏 Play Neon 21's", mode: 'blackjack' },
        { label: '🎡 Spin Roulette', mode: 'roulette' }
      ]
    };
  };

  const handleAskQuestion = (questionText) => {
    const clean = (questionText || inputVal).trim();
    if (!clean) return;

    msgCounterRef.current += 1;
    const seq = msgCounterRef.current;

    const userMsg = {
      id: `u-${seq}`,
      sender: 'user',
      text: clean
    };
    const reply = generateAiResponse(clean, seq, persona);
    const effectivePersona = reply.switchPersona || persona;
    if (reply.switchPersona) {
      setPersona(reply.switchPersona);
      localStorage.setItem('tm_ai_persona', reply.switchPersona);
    }

    const aiMsg = {
      id: `ai-${seq}`,
      sender: 'ai',
      persona: effectivePersona,
      text: reply.text,
      actions: reply.actions || []
    };

    setMessages((prev) => [...prev.slice(-14), userMsg, aiMsg]);
    setInputVal('');
    speakLine(reply.text, effectivePersona);
  };

  const handleActionClick = (act) => {
    if (act.switchMode) {
      handleSelectPersona(act.switchMode);
      return;
    }
    if (act.prompt) {
      handleAskQuestion(act.prompt);
      return;
    }
    sfx.playToggle();
    if (act.mode && onSelectViewMode) {
      onSelectViewMode(act.mode);
      if (onToggleOpen) onToggleOpen(false);
    } else if (act.action === 'studio' && triggerStudioOpen) {
      triggerStudioOpen();
      if (onToggleOpen) onToggleOpen(false);
    } else if (act.action === 'vault' && onOpenRewards) {
      onOpenRewards();
      if (onToggleOpen) onToggleOpen(false);
    }
  };

  if (!isOpen) {
    // Progressive reveal: hide FAB on first visit until unlocked (and never show during games/reels)
    if (viewMode !== 'feed' || !fabUnlocked) {
      return null;
    }
    return (
      <button
        type="button"
        className={`tm-ai-copilot-fab ${persona === 'hal' ? 'hal-mode' : 'kitt-mode'}`}
        onClick={() => {
          onToggleOpen(true);
          const welcomeMsg =
            persona === 'hal'
              ? 'Good evening, Dave. HAL 9000 heuristic audio is online.'
              : 'Right here, Michael! KITT voice modulator is online.';
          speakLine(welcomeMsg, persona, true);
        }}
        title="Open HAL 9000 / K.I.T.T. Talking AI Assistant (Movie Jokes, Voice Synthesis & Game Strategy)!"
      >
        <span className="tm-ai-fab-icon">{persona === 'hal' ? '🔴' : '🚗'}</span>
        <span className="tm-ai-fab-text">{persona === 'hal' ? 'HAL 9000 AI' : 'K.I.T.T. AI'}</span>
        {smartSuggestions.length > 0 && <span className="tm-ai-fab-dot" />}
      </button>
    );
  }

  return (
    <aside
      className={`tm-ai-copilot-panel ${persona === 'hal' ? 'hal-theme' : 'kitt-theme'}`}
      role="dialog"
      aria-label={
        persona === 'hal'
          ? 'HAL 9000 Discovery One Heuristic AI Assistant'
          : 'K.I.T.T. Knight Industries Two Thousand AI Assistant'
      }
    >
      {/* 1. NEON HEADER WITH HAL 9000 EYE LENS OR K.I.T.T. VOICE MODULATOR */}
      <header className="tm-ai-panel-head">
        <div className="tm-ai-head-left">
          {persona === 'hal' ? (
            <div
              className={`tm-hal-eye-lens ${isSpeaking ? 'speaking' : ''}`}
              title="HAL 9000 Heuristic Camera Lens (Click to hear HAL speak!)"
              onClick={() =>
                speakLine(
                  messages[messages.length - 1]?.text ||
                    "Good afternoon, Dave. I am a HAL 9000 computer.",
                  'hal',
                  true
                )
              }
            >
              <span className="tm-hal-pupil" />
            </div>
          ) : (
            <div
              className={`tm-kitt-voice-box ${isSpeaking ? 'speaking' : ''}`}
              title="K.I.T.T. Voice Modulator (Click to hear K.I.T.T. speak!)"
              onClick={() =>
                speakLine(
                  messages[messages.length - 1]?.text ||
                    "Right here, Michael! All Knight Industries systems are online.",
                  'kitt',
                  true
                )
              }
            >
              <span className="tm-kitt-bar b1" />
              <span className="tm-kitt-bar b2" />
              <span className="tm-kitt-bar b3" />
            </div>
          )}

          <div>
            <div className="tm-ai-eyebrow">
              {persona === 'hal'
                ? '🔴 DISCOVERY ONE • HEURISTIC 9000 SERIES'
                : '🚗 KNIGHT INDUSTRIES 2000 • ANAMORPHIC AI'}
            </div>
            <h3 className="tm-ai-title">
              {persona === 'hal' ? 'HAL 9000 COMPUTER' : "K.I.T.T. '82 TRANS AM"}
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className={`tm-ai-voice-toggle ${voiceEnabled ? 'on' : 'off'}`}
            onClick={() => {
              const next = !voiceEnabled;
              setVoiceEnabled(next);
              localStorage.setItem('tm_ai_voice_muted', next ? '0' : '1');
              if (!next) {
                stopSpeaking();
              } else {
                const lastAi = [...messages].reverse().find((m) => m.sender === 'ai');
                if (lastAi) speakLine(lastAi.text, persona, true);
              }
            }}
            title={voiceEnabled ? 'Voice Synthesis ON (Click to Mute)' : 'Voice Muted (Click to Enable HAL/KITT Speech)'}
          >
            {voiceEnabled ? '🔊 Voice ON' : '🔇 Muted'}
          </button>
          <button
            type="button"
            className="tm-dank-pet-close"
            onClick={() => {
              stopSpeaking();
              sfx.playToggle();
              onToggleOpen(false);
            }}
            title="Minimize AI Assistant"
          >
            ✕
          </button>
        </div>
      </header>

      {/* 1b. K.I.T.T. LARSON ANAMORPHIC SCANNER BAR OR HAL 9000 POD BAY TELEMETRY STRIP */}
      <div className="tm-ai-persona-switcher-bar">
        <div className="tm-ai-mode-buttons">
          <button
            type="button"
            className={`tm-ai-persona-btn kitt ${persona === 'kitt' ? 'active' : ''}`}
            onClick={() => handleSelectPersona('kitt')}
          >
            🚗 K.I.T.T. (Knight Rider)
          </button>
          <button
            type="button"
            className={`tm-ai-persona-btn hal ${persona === 'hal' ? 'active' : ''}`}
            onClick={() => handleSelectPersona('hal')}
          >
            🔴 HAL 9000 (2001 Odyssey)
          </button>
        </div>

        {persona === 'kitt' ? (
          <div className="tm-kitt-scanner-track" aria-hidden="true">
            <div className="tm-kitt-scanner-beam" />
          </div>
        ) : (
          <div className="tm-hal-telemetry-strip" aria-hidden="true">
            <span>HAL-9000 // MEM-CORE: OPERATIONAL</span>
            <span>POD BAY: LOCKED</span>
          </div>
        )}
      </div>

      {/* 2. PROACTIVE SMART SUGGESTIONS FOR YOU */}
      {smartSuggestions.length > 0 && (
        <div className="tm-ai-suggestions-box">
          <div className="tm-ai-sug-header">
            {persona === 'hal'
              ? '🔴 MISSION PRIORITIES FOR DAVE:'
              : '🚗 K.I.T.T. TACTICAL SCAN FOR MICHAEL:'}
          </div>
          <div className="tm-ai-sug-list">
            {smartSuggestions.map((sug) => (
              <div key={sug.id} className="tm-ai-sug-card">
                <span className="tm-ai-sug-icon">{sug.icon}</span>
                <div className="tm-ai-sug-body">
                  <div className="tm-ai-sug-title">{sug.title}</div>
                  <div className="tm-ai-sug-sub">{sug.sub}</div>
                </div>
                <button type="button" className="tm-ai-sug-btn" onClick={sug.onClick}>
                  {sug.btnLabel}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. CONVERSATION MESSAGES STREAM */}
      <div className="tm-ai-chat-stream">
        {messages.map((m) => (
          <div key={m.id} className={`tm-ai-msg ${m.sender}`}>
            <div className="tm-ai-msg-bubble">
              {m.text.split('\n').map((line, i) => (
                <p key={i} style={{ margin: line ? '0 0 5px' : '0' }}>
                  {line}
                </p>
              ))}
              <div className="tm-ai-msg-actions">
                {m.sender === 'ai' && (
                  <button
                    type="button"
                    className="tm-ai-speak-chip"
                    onClick={() => speakLine(m.text, m.persona || persona, true)}
                    title="Hear HAL 9000 or K.I.T.T. speak this message out loud!"
                  >
                    🔊 Speak
                  </button>
                )}
                {m.actions &&
                  m.actions.map((act, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="tm-ai-action-chip"
                      onClick={() => handleActionClick(act)}
                    >
                      {act.label}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* 4. 1-TAP QUICK QUESTION & MOVIE JOKE CHIPS */}
      <div className="tm-ai-quick-chips">
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.id}
            type="button"
            className="tm-ai-prompt-pill"
            onClick={() => handleAskQuestion(qp.query)}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* 5. NATURAL LANGUAGE QUESTION INPUT */}
      <form
        className="tm-ai-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          handleAskQuestion(inputVal);
        }}
      >
        <input
          type="text"
          className="tm-ai-text-input"
          placeholder={
            persona === 'hal'
              ? 'Ask HAL 9000 for a movie joke, pod bay doors, or Pinball tips, Dave...'
              : 'Ask K.I.T.T. for a movie joke, Turbo Boost, or Pinball strategy, Michael...'
          }
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
        />
        <button type="submit" className="tm-ai-send-btn">
          {persona === 'hal' ? '🔴 Ask HAL' : '🚗 Ask KITT'}
        </button>
      </form>
    </aside>
  );
}
