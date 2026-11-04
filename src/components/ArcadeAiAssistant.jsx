import { useState, useMemo, useRef, useEffect } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';

// ==========================================
// 80s NEON AI ARCADE ASSISTANT — "CYBER-ORACLE '86"
// Context-aware Q&A chat, proactive smart suggestions, game strategy tips,
// viral meme caption generator & 1-click site navigation!
// ==========================================

const QUICK_PROMPTS = [
  { id: 'suggest', label: '💡 What should I do next?', query: 'What do you suggest I do right now?' },
  { id: 'tokens', label: '🪙 How to earn more tokens?', query: 'How can I earn more Arcade Tokens today?' },
  { id: '21s', label: "🃏 Neon 21's Strategy", query: "How do I win big at Neon 21's Blackjack?" },
  { id: 'roulette', label: '🎡 Lightning Roulette Tips', query: 'How does Neon Lightning Roulette work?' },
  { id: 'pinball', label: '🎱 Pinball High-Score Secrets', query: 'How do I trigger Fever Mode & Skill Shots in Pinball?' },
  { id: 'meme', label: '📸 Give me a Meme Idea!', query: 'Give me a hilarious viral meme caption idea!' },
  { id: 'secrets', label: '🕵️ Secret Easter Eggs', query: 'What secret easter eggs and cheat codes are hidden on the site?' }
];

const MEME_IDEAS_POOL = [
  {
    top: 'ME SAYING "JUST ONE MORE GAME OF 21s"',
    bot: 'THE SUN RISING OUTSIDE MY WINDOW AT 6:14 AM',
    cat: 'gaming'
  },
  {
    top: 'WHEN THE CODE COMPILES ON THE FIRST TRY',
    bot: 'SUSPICIOUS FRY SQUINT: WHAT DID I FORGET TO SAVE?',
    cat: 'tech'
  },
  {
    top: 'PUTTING 25 TOKENS ON #17 IN LIGHTNING ROULETTE',
    bot: '150× LIGHTNING STRIKES #17: I AM FINANCIALLY UNSTOPPABLE',
    cat: 'dank'
  },
  {
    top: 'MY BRAIN AT 3PM DURING A WORK MEETING: 0% CPU',
    bot: 'MY BRAIN AT 3AM CALCULATING PINBALL TRAJECTORIES: 1000% OVERCLOCK',
    cat: 'relatable'
  },
  {
    top: 'DRAWING A 5TH CARD AT 16 IN NEON 21s',
    bot: 'PULLS A 5 FOR THE 3× 5-CARD CHARLIE: CALCULATED GENIUS',
    cat: 'gaming'
  }
];

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
  const [inputVal, setInputVal] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome-1',
      sender: 'ai',
      text: "⚡ Greetings! I'm **CYBER-ORACLE '86**, your personal 80s Neon AI Copilot. Ask me anything about the games (**Neon 21's**, **Lightning Roulette**, **Pinball**, **Meme Stocks**, **Crush**, **Slots**), how to earn **🪙 Tokens**, secret cheat codes, or tap a smart suggestion below!",
      actions: [
        { label: "🃏 Play Neon 21's", mode: 'blackjack' },
        { label: '🎡 Spin Roulette', mode: 'roulette' },
        { label: '🎱 Play Pinball', mode: 'pinball' }
      ]
    }
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Build live, context-aware proactive suggestions based on player state
  const smartSuggestions = useMemo(() => {
    const list = [];

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
        sub: "You haven't flicked the Coin Return slot yet today — instant +5 🪙 & +50 XP.",
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

    if (viewMode !== 'blackjack') {
      list.push({
        id: 'sug-21s',
        icon: '🃏',
        title: "Try the NEW Neon 21's Blackjack Table!",
        sub: 'Play against Dealer Bot ’86 with Split, Double Down, 3× 5-Card Charlie & Visor AI.',
        btnLabel: "🃏 Play 21's",
        onClick: () => {
          if (onSelectViewMode) onSelectViewMode('blackjack');
          if (onToggleOpen) onToggleOpen(false);
        }
      });
    }

    if (viewMode !== 'roulette') {
      list.push({
        id: 'sug-roulette',
        icon: '🎡',
        title: "Spin the NEW Neon Lightning Roulette '86!",
        sub: '3 random numbers get struck by 50×–150× Lightning Multipliers on every spin!',
        btnLabel: '🎡 Spin Roulette',
        onClick: () => {
          if (onSelectViewMode) onSelectViewMode('roulette');
          if (onToggleOpen) onToggleOpen(false);
        }
      });
    }

    return list.slice(0, 3);
  }, [
    xpConversionState,
    payphoneClaimedToday,
    pioneerBonusAvailable,
    unclaimedRewardsCount,
    viewMode,
    onExchangeXpForTokens,
    onClaimPayphoneCoinReturn,
    triggerStudioOpen,
    onOpenRewards,
    onSelectViewMode,
    onToggleOpen
  ]);

  const generateAiResponse = (rawQuery, seqNum) => {
    const q = rawQuery.toLowerCase();
    const dailyEarned = tokenLedger?.totalToday || 0;
    const dailyRemaining = Math.max(0, ARCADE_ECONOMY_RULES.MAX_DAILY_EARNED_TOKENS - dailyEarned);
    const uploadRem = Math.max(
      0,
      ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.upload - (tokenLedger?.byCategory?.upload || 0)
    );

    // 1. Token / Economy Questions
    if (q.includes('token') || q.includes('earn') || q.includes('coin') || q.includes('money') || q.includes('broke')) {
      return {
        text: `🪙 **TOKEN WALLET REPORT:** You currently hold **${tokens} 🪙** (${xp} XP) and still have **${dailyRemaining} 🪙** earnable today!\n\nFastest ways to stack tokens right now:\n1️⃣ **Upload or Remix a Meme:** Earns **+${pioneerBonusAvailable ? '75 (First Upload Bonus!)' : '45'} 🪙** (${uploadRem} 🪙 upload cap remaining today).\n2️⃣ **XP-to-Token Reactor:** Every **100 XP** mints **+5 🪙** automatically (up to 50 🪙/day).\n3️⃣ **1986 Payphone & Dodging Piñata:** ${payphoneClaimedToday ? 'Payphone claimed today ✅' : 'Flick the Payphone Coin Return (**+5 🪙**)'} and ${pinataClaimedToday ? 'Piñata claimed today ✅' : 'whack the moving Piñata 8× (**+5 🪙**)'}.\n4️⃣ **Daily Visit Streak & Quests:** Claim in the Arcade Vault (**+10 🪙** streak + **+5 🪙** per quest)!`,
        actions: [
          { label: '📸 Upload Meme (+45 🪙)', action: 'studio' },
          { label: '🎰 Open Token Vault', action: 'vault' }
        ]
      };
    }

    // 2. Blackjack / 21's Questions
    if (q.includes('21') || q.includes('blackjack') || q.includes('card') || q.includes('dealer') || q.includes('charlie')) {
      return {
        text: `🃏 **NEON 21's PRO STRATEGY:**\n• **Natural Blackjack (21 on first 2 cards):** Pays **3:2** (2.5× total return)!\n• **⚡ 5-Card Charlie Rule:** If you draw 5 cards without busting, you automatically win **3× your stake**!\n• **💎 Pair / 21+3 Side Bet (+5 🪙):** Pays **6×–12×** if your first 2 cards are a Pair, or **4×–15×** if your 2 cards + Dealer's upcard make a 3-Card Flush, Straight, or 3-of-a-Kind!\n• **🥽 Cyber-Visor AI:** Keep the Visor toggle ON at the top of the table for real-time mathematical advice on when to Hit, Stand, Double Down, or Split!`,
        actions: [{ label: "🃏 Launch Neon 21's Now", mode: 'blackjack' }]
      };
    }

    // 3. Roulette Questions
    if (q.includes('roulette') || q.includes('wheel') || q.includes('lightning') || q.includes('red') || q.includes('black')) {
      return {
        text: `🎡 **NEON LIGHTNING ROULETTE '86 GUIDE:**\n• **37-Pocket European Wheel:** Single Green Zero (\`0\`) gives you way better odds than double-zero tables!\n• **⚡ Lightning Multipliers (50× to 150×):** Every spin, 3 random numbers are struck by high-voltage lightning. Straight-up bets on a Lightning Number pay up to **150×**!\n• **Smart Coverage Strategy:** Use the **🔥 Red Blitz** preset to cover Red + Odd + 2nd Dozen, then sprinkle 1–5 🪙 straight chips on your favorite numbers (or tap **⚡ 5 Lightning Picks**) to hunt the 150× jackpot!`,
        actions: [{ label: '🎡 Spin Lightning Roulette', mode: 'roulette' }]
      };
    }

    // 4. Pinball Questions
    if (q.includes('pinball') || q.includes('flipper') || q.includes('bumper') || q.includes('fever') || q.includes('nudge') || q.includes('skill')) {
      return {
        text: `🎱 **UPGRADED 80s CYBER-PINBALL SECRETS:**\n• **🎯 Gold Skill Shot (+1,500 pts):** Watch the oscillating meter in the right plunger lane and tap **🚀 LAUNCH** when the bar hits the **Gold Sweet Spot** for +1,500 pts, +1× Multiplier & instant Drain Shield!\n• **🌈 6× Combo Fever Overdrive:** Hit 6 bumpers/targets within 3.5s of each other to unleash **11 seconds of 2× Points + Automatic Rainbow Laser Ball Saver**!\n• **💥 Cabinet Nudge:** Tap **💥 NUDGE** (or press \`Down Arrow\` / \`N\`) to jolt a ball away from the drain—just don't spam it 3× in a row or you'll **TILT**!\n• **🏆 Table Missions:** Complete the Mission counter in the center ring for a **+3,500 pt Boss Jackpot**!`,
        actions: [{ label: '🎱 Play Upgraded Pinball', mode: 'pinball' }]
      };
    }

    // 5. Stocks / Crush / Slots Questions
    if (q.includes('stock') || q.includes('memedaq') || q.includes('trade')) {
      return {
        text: `📈 **MEMEDAQ '86 TRADING TIPS:**\n• Watch the live breaking news banner and use the **☎️ Insider Rumor Wire** to spot upcoming bull surges before they happen.\n• Buy dips when a meme stock flashes red, and sell into green breakouts!`,
        actions: [{ label: "📈 Open MEMEDAQ '86", mode: 'stocks' }]
      };
    }

    if (q.includes('crush') || q.includes('candy') || q.includes('puzzle') || q.includes('jelly')) {
      return {
        text: `🍬 **MEME CRUSH SAGA TIPS:**\n• Match 4 in a row for a **Laser Line Blaster**, 2×2 square for a **🚀 Seeking Rocket** (snipes locked cages & mixtapes!), L/T shape for a **💥 3×3 Packet Bomb**, or 5 in a line for a **🌈 Color Supernova**!`,
        actions: [{ label: '🍬 Play Meme Crush', mode: 'crush' }]
      };
    }

    // 6. Meme Caption Idea Generator
    if (q.includes('meme') || q.includes('caption') || q.includes('idea') || q.includes('funny') || q.includes('joke')) {
      const idea = MEME_IDEAS_POOL[seqNum % MEME_IDEAS_POOL.length];
      return {
        text: `📸 **VIRAL MEME IDEA (#${idea.cat.toUpperCase()}):**\n\n**TOP TEXT:** *"${idea.top}"*\n**BOTTOM TEXT:** *"${idea.bot}"*\n\nDrop any photo into **Meme Forge 3.0** and publish it to earn **+${pioneerBonusAvailable ? '75' : '45'} 🪙 Tokens & +120 XP**!`,
        actions: [{ label: '🎨 Open Meme Forge Studio', action: 'studio' }]
      };
    }

    // 7. Secret Easter Eggs & Cheat Codes
    if (q.includes('secret') || q.includes('easter') || q.includes('cheat') || q.includes('konami') || q.includes('code') || q.includes('payphone')) {
      return {
        text: `🕵️ **CLASSIFIED 1986 ARCADE SECRETS:**\n1️⃣ **Konami God Mode (+5 🪙 & +100 XP):** Type \`↑ ↑ ↓ ↓ ← → ← → B A\` on your keyboard OR **tap the top-left THE MEMES.net logo 5 times rapidly**!\n2️⃣ **1986 Payphone Hotlines:** Open the \`☎️ 1-800-MEME\` booth in the bottom corner and dial \`555-GECKO\`, \`555-PIZZA\`, \`555-RAVE\`, or \`555-UFO86\`, plus flick the **Coin Return Flap** for **+5 🪙**!\n3️⃣ **Boss Key Stealth XP:** Press \`Shift + B\` to disguise the screen as a corporate spreadsheet—clicking cells secretly earns XP!`,
        actions: [{ label: '🎰 Open Vault & Flair', action: 'vault' }]
      };
    }

    // 8. Default / "What should I do?" Smart Recommendation
    const topMeme = memes && memes.length > 0 ? memes[0] : null;
    return {
      text: `🤖 **CYBER-ORACLE RECOMMENDATION FOR LV.${currentRank.level} (${tokens} 🪙 • ${xp} XP):**\n\n${
        tokens >= 10
          ? `You have **${tokens} 🪙 Tokens** ready for action! I recommend testing your luck at the brand-new **🃏 Neon 21's Blackjack** table, spinning **🎡 Neon Lightning Roulette '86** for up to 150× multipliers, or launching the upgraded **🎱 80s Pinball** with Skill Shots & Fever Overdrive!`
          : `You're currently at **${tokens} 🪙 Tokens**. Start with **Free Practice Mode** in **🃏 Neon 21's** or **🎡 Roulette**, or **📸 Upload a Meme** to instantly bank **+${pioneerBonusAvailable ? '75' : '45'} 🪙**!`
      }${
        topMeme
          ? `\n\n🔥 **Trending in Feed:** *"${topMeme.title}"* by @${topMeme.author_name || 'Anon'}!`
          : ''
      }`,
      actions: [
        { label: "🃏 Play Neon 21's", mode: 'blackjack' },
        { label: '🎡 Spin Roulette', mode: 'roulette' },
        { label: '🎱 Upgraded Pinball', mode: 'pinball' },
        { label: '📸 Upload Meme', action: 'studio' }
      ]
    };
  };

  const handleAskQuestion = (questionText) => {
    const clean = (questionText || inputVal).trim();
    if (!clean) return;

    sfx.playAiAssistantChime?.();
    msgCounterRef.current += 1;
    const seq = msgCounterRef.current;

    const userMsg = {
      id: `u-${seq}`,
      sender: 'user',
      text: clean
    };
    const reply = generateAiResponse(clean, seq);
    const aiMsg = {
      id: `ai-${seq}`,
      sender: 'ai',
      text: reply.text,
      actions: reply.actions || []
    };

    setMessages((prev) => [...prev.slice(-14), userMsg, aiMsg]);
    setInputVal('');
  };

  const handleActionClick = (act) => {
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
    return (
      <button
        type="button"
        className="tm-ai-copilot-fab"
        onClick={() => {
          sfx.playAiAssistantChime?.();
          onToggleOpen(true);
        }}
        title="Ask Cyber-Oracle '86 AI Assistant for game strategies, token tips & smart suggestions!"
      >
        <span className="tm-ai-fab-icon">🤖</span>
        <span className="tm-ai-fab-text">Ask AI</span>
        {smartSuggestions.length > 0 && <span className="tm-ai-fab-dot" />}
      </button>
    );
  }

  return (
    <aside
      className="tm-ai-copilot-panel"
      role="dialog"
      aria-label="Cyber-Oracle '86 AI Arcade Assistant"
    >
      {/* 1. NEON HEADER */}
      <header className="tm-ai-panel-head">
        <div className="tm-ai-head-left">
          <div className="tm-ai-avatar-orb">🤖</div>
          <div>
            <div className="tm-ai-eyebrow">⚡ NEURAL ARCADE COPILOT • ONLINE</div>
            <h3 className="tm-ai-title">CYBER-ORACLE &apos;86 AI</h3>
          </div>
        </div>
        <button
          type="button"
          className="tm-dank-pet-close"
          onClick={() => {
            sfx.playToggle();
            onToggleOpen(false);
          }}
          title="Minimize AI Assistant"
        >
          ✕
        </button>
      </header>

      {/* 2. PROACTIVE SMART SUGGESTIONS FOR YOU */}
      {smartSuggestions.length > 0 && (
        <div className="tm-ai-suggestions-box">
          <div className="tm-ai-sug-header">💡 SMART SUGGESTIONS FOR YOU:</div>
          <div className="tm-ai-sug-list">
            {smartSuggestions.map((sug) => (
              <div key={sug.id} className="tm-ai-sug-card">
                <span className="tm-ai-sug-icon">{sug.icon}</span>
                <div className="tm-ai-sug-body">
                  <div className="tm-ai-sug-title">{sug.title}</div>
                  <div className="tm-ai-sug-sub">{sug.sub}</div>
                </div>
                <button
                  type="button"
                  className="tm-ai-sug-btn"
                  onClick={sug.onClick}
                >
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
              {m.actions && m.actions.length > 0 && (
                <div className="tm-ai-msg-actions">
                  {m.actions.map((act, idx) => (
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
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* 4. 1-TAP QUICK QUESTION CHIPS */}
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
          placeholder="Ask about 21's, Roulette, Pinball, Tokens, or Memes..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
        />
        <button type="submit" className="tm-ai-send-btn">
          ⚡ Ask
        </button>
      </form>
    </aside>
  );
}
