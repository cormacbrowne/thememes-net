import { useState, useEffect, useRef, useMemo } from 'react';
import { sfx } from '../utils/soundEngine';

// ==========================================
// MEMEDAQ '86 — 80s NEON WALL STREET MEME STOCK MARKET SIMULATOR
// Spend & Gamble Real Meme Tokens Buying Low & Selling High!
// ==========================================

const MEME_COMPANIES = [
  {
    ticker: 'DOGE',
    name: 'Bork & Woof Aerospace',
    emoji: '🚀',
    sector: 'Space Doggo',
    basePrice: 14,
    minPrice: 3,
    maxPrice: 95,
    volatility: 0.085,
    color: '#facc15'
  },
  {
    ticker: 'CHAD',
    name: 'GigaChin Supplements',
    emoji: '🗿',
    sector: 'Blue-Chip',
    basePrice: 24,
    minPrice: 8,
    maxPrice: 110,
    volatility: 0.048,
    color: '#00f3ff'
  },
  {
    ticker: 'PEPE',
    name: 'Rare Swamp Collectibles',
    emoji: '🐸',
    sector: 'Dank ETF',
    basePrice: 18,
    minPrice: 4,
    maxPrice: 120,
    volatility: 0.095,
    color: '#4ade80'
  },
  {
    ticker: 'CATS',
    name: '3AM Zoomies Robotics',
    emoji: '🐱',
    sector: 'Chaos Hardware',
    basePrice: 11,
    minPrice: 3,
    maxPrice: 80,
    volatility: 0.072,
    color: '#f472b6'
  },
  {
    ticker: 'WIFI',
    name: 'LagSpike Telecom Corp.',
    emoji: '📡',
    sector: 'Utility',
    basePrice: 9,
    minPrice: 3,
    maxPrice: 48,
    volatility: 0.04,
    color: '#38bdf8'
  },
  {
    ticker: 'PIZA',
    name: 'Pineapple Crust Biotech',
    emoji: '🍕',
    sector: 'Food Tech',
    basePrice: 15,
    minPrice: 4,
    maxPrice: 85,
    volatility: 0.065,
    color: '#fb923c'
  },
  {
    ticker: 'AI',
    name: 'Hallucination Labs Inc.',
    emoji: '🤖',
    sector: 'Cyber AI',
    basePrice: 28,
    minPrice: 6,
    maxPrice: 150,
    volatility: 0.088,
    color: '#c084fc'
  },
  {
    ticker: 'MOON',
    name: 'TrustMeBro Holdings LP',
    emoji: '🌕',
    sector: 'Degen Penny',
    basePrice: 6,
    minPrice: 1.5,
    maxPrice: 140,
    volatility: 0.145,
    color: '#ef4444'
  }
];

const MARKET_NEWS_EVENTS = [
  { ticker: 'DOGE', impact: 0.24, headline: '🚀 $DOGE: Shibe astronaut catches frisbee in orbit! Shares surge!' },
  { ticker: 'DOGE', impact: -0.19, headline: '🐿️ $DOGE: Launch delayed after crew chases space squirrel!' },
  { ticker: 'CHAD', impact: 0.17, headline: '🗿 $CHAD: Quarterly jawline index beats Wall St estimates by 400%!' },
  { ticker: 'CHAD', impact: -0.15, headline: '📉 $CHAD: CEO spotted drinking lukewarm decaf tea!' },
  { ticker: 'PEPE', impact: 0.27, headline: '🐸 $PEPE: 1996 holo-foil Swamp Frog found on vintage floppy disk!' },
  { ticker: 'PEPE', impact: -0.21, headline: '📸 $PEPE: Right-click screenshot bandits flood rare frog market!' },
  { ticker: 'CATS', impact: 0.22, headline: '🐱 $CATS: 3AM Zoomies Bot breaks Mach 1 down living room hallway!' },
  { ticker: 'CATS', impact: -0.18, headline: '📦 $CATS: Entire robot fleet naps inside empty cardboard box!' },
  { ticker: 'WIFI', impact: 0.14, headline: '📡 $WIFI: Engineers unplug router & plug it back in — record speeds!' },
  { ticker: 'WIFI', impact: -0.14, headline: '🐢 $WIFI: 999ms ping spike hits right during final boss fight!' },
  { ticker: 'PIZA', impact: 0.2, headline: '🍕 $PIZA: Global treaty legalizes pineapple slices on Friday nights!' },
  { ticker: 'PIZA', impact: -0.17, headline: '🔥 $PIZA: Lab accidentally burns 4,000 trays of garlic bread!' },
  { ticker: 'AI', impact: 0.25, headline: '🤖 $AI: Neural model convinces VCs that fingers have 7 knuckles!' },
  { ticker: 'AI', impact: -0.22, headline: '🔌 $AI: Mainframe trained exclusively on 2011 rage comics!' },
  { ticker: 'MOON', impact: 0.36, headline: '🌕 $MOON: Mystery whale posts 3 rocket emojis — FOMO stampede!' },
  { ticker: 'MOON', impact: -0.34, headline: '🚨 $MOON: CFO admits corporate vault was a shoebox! RUG PULL!' }
];

const PORTFOLIO_STORAGE_KEY = 'tm_stock_portfolio_v1';
const MARKET_STATE_KEY = 'tm_stock_prices_v1';
const HISTORY_LEN = 30;
const FEE_RATE = 0.01; // 1% commission spread

function buildInitialMarketState() {
  try {
    const saved = JSON.parse(localStorage.getItem(MARKET_STATE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      const valid = MEME_COMPANIES.every(
        (c) => Array.isArray(saved[c.ticker]?.history) && saved[c.ticker].history.length >= 10
      );
      if (valid) return saved;
    }
  } catch {
    // Fall back to fresh market
  }

  const state = {};
  MEME_COMPANIES.forEach((c) => {
    let p = c.basePrice;
    const history = [];
    for (let i = 0; i < HISTORY_LEN; i++) {
      const drift = (c.basePrice - p) * 0.08;
      const shock = (Math.random() - 0.5) * 2 * c.volatility * p;
      p = Math.max(c.minPrice, Math.min(c.maxPrice, Number((p + drift + shock).toFixed(2))));
      history.push(p);
    }
    state[c.ticker] = {
      price: p,
      openPrice: history[0],
      history,
      lastDeltaPct: Number((((p - history[history.length - 2]) / history[history.length - 2]) * 100).toFixed(1)),
      rumorBias: 0
    };
  });
  return state;
}

function loadPortfolio() {
  try {
    const raw = JSON.parse(localStorage.getItem(PORTFOLIO_STORAGE_KEY) || 'null');
    if (raw && typeof raw === 'object') return raw;
  } catch {
    // Ignore parse error
  }
  return {};
}

export default function MemeStockMarketGame({
  tokens = 0,
  onSpendTokens,
  onPayoutTokens,
  onRecordHighScore,
  onOpenUpload,
  onBackToFeed
}) {
  const [market, setMarket] = useState(buildInitialMarketState);
  const [portfolio, setPortfolio] = useState(loadPortfolio); // { [ticker]: { shares, totalCostTokens } }
  const [selectedTicker, setSelectedTicker] = useState('DOGE');
  const [newsFlash, setNewsFlash] = useState(
    "📟 MEMEDAQ '86 FLOOR OPEN: Buy meme dips with 🪙 Tokens & sell rallies for profit!"
  );
  const [tradeFeedback, setTradeFeedback] = useState('');
  const [hotlineCooldown, setHotlineCooldown] = useState(0);
  const [paused, setPaused] = useState(false);

  const tickCountRef = useRef(0);

  // Persist portfolio cleanly
  useEffect(() => {
    try {
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolio));
    } catch {
      // Ignore quota
    }
  }, [portfolio]);

  // Hotline cooldown ticker (only runs while > 0)
  useEffect(() => {
    if (hotlineCooldown <= 0) return undefined;
    const t = setInterval(() => {
      setHotlineCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [hotlineCooldown]);

  // Live 1.8s Market Simulation Engine (auto-pauses when tab is hidden for older iPad battery/CPU!)
  useEffect(() => {
    if (paused) return undefined;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      tickCountRef.current += 1;

      // Trigger a funny breaking news flash every 5 ticks
      let activeEvent = null;
      if (tickCountRef.current % 5 === 0) {
        activeEvent = MARKET_NEWS_EVENTS[Math.floor(Math.random() * MARKET_NEWS_EVENTS.length)];
        setNewsFlash(activeEvent.headline);
      }

      setMarket((prev) => {
        const next = {};
        MEME_COMPANIES.forEach((c) => {
          const curr = prev[c.ticker];
          const oldPrice = curr.price;

          // Mean reversion toward basePrice so stocks never stay permanently dead or infinite
          const meanPull = ((c.basePrice - oldPrice) / c.basePrice) * 0.035;
          const randomMove = (Math.random() - 0.492) * 2 * c.volatility;
          const newsMove = activeEvent && activeEvent.ticker === c.ticker ? activeEvent.impact : 0;
          const rumorMove = curr.rumorBias || 0;

          const pctChange = meanPull + randomMove + newsMove + rumorMove;
          const rawNext = oldPrice * (1 + pctChange);
          const clamped = Math.max(
            c.minPrice,
            Math.min(c.maxPrice, Number(rawNext.toFixed(2)))
          );

          const nextHistory = [...curr.history.slice(-(HISTORY_LEN - 1)), clamped];
          const deltaPct =
            oldPrice > 0 ? Number((((clamped - oldPrice) / oldPrice) * 100).toFixed(1)) : 0;

          next[c.ticker] = {
            price: clamped,
            openPrice: nextHistory[0],
            history: nextHistory,
            lastDeltaPct: deltaPct,
            rumorBias: curr.rumorBias ? Number((curr.rumorBias * 0.5).toFixed(4)) : 0
          };
        });

        try {
          localStorage.setItem(MARKET_STATE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota
        }
        return next;
      });
    }, 1850);

    return () => clearInterval(interval);
  }, [paused]);

  const activeCompany =
    MEME_COMPANIES.find((c) => c.ticker === selectedTicker) || MEME_COMPANIES[0];
  const activeQuote = market[activeCompany.ticker] || market.DOGE;
  const activeHolding = useMemo(
    () => portfolio[activeCompany.ticker] || { shares: 0, totalCostTokens: 0 },
    [portfolio, activeCompany.ticker]
  );

  // Compute Portfolio Valuation & Net Worth
  const portfolioStats = useMemo(() => {
    let holdingsLiquidationValue = 0;
    let totalInvestedCost = 0;
    let totalSharesCount = 0;

    MEME_COMPANIES.forEach((c) => {
      const pos = portfolio[c.ticker];
      if (pos && pos.shares > 0) {
        const p = market[c.ticker]?.price || c.basePrice;
        holdingsLiquidationValue += Math.floor(pos.shares * p * (1 - FEE_RATE));
        totalInvestedCost += pos.totalCostTokens;
        totalSharesCount += pos.shares;
      }
    });

    const netWorth = tokens + holdingsLiquidationValue;
    const unrealizedPnl = holdingsLiquidationValue - totalInvestedCost;
    return {
      holdingsLiquidationValue,
      totalInvestedCost,
      totalSharesCount,
      netWorth,
      unrealizedPnl
    };
  }, [portfolio, market, tokens]);

  // Track Peak Net Worth High Score
  useEffect(() => {
    const prevPeak = Number(localStorage.getItem('tm_stocks_highscore') || 0);
    if (portfolioStats.netWorth > prevPeak && portfolioStats.totalSharesCount > 0) {
      localStorage.setItem('tm_stocks_highscore', String(portfolioStats.netWorth));
      if (onRecordHighScore) onRecordHighScore('stocks', portfolioStats.netWorth);
    }
  }, [portfolioStats.netWorth, portfolioStats.totalSharesCount, onRecordHighScore]);

  // Calculate exact Buy cost (rounded UP with 1% fee) & max affordable shares
  const calcBuyCost = (qty, price) => Math.max(1, Math.ceil(qty * price * (1 + FEE_RATE)));
  const calcSellProceeds = (qty, price) => Math.max(0, Math.floor(qty * price * (1 - FEE_RATE)));

  const maxAffordableShares = useMemo(() => {
    const unitApprox = activeQuote.price * (1 + FEE_RATE);
    if (tokens <= 0 || unitApprox <= 0) return 0;
    let guess = Math.floor(tokens / unitApprox);
    while (guess > 0 && calcBuyCost(guess, activeQuote.price) > tokens) {
      guess -= 1;
    }
    return Math.max(0, guess);
  }, [tokens, activeQuote.price]);

  const handleBuyShares = (qty) => {
    const cleanQty = Math.floor(Number(qty) || 0);
    if (cleanQty <= 0) return;

    const costTokens = calcBuyCost(cleanQty, activeQuote.price);
    if (tokens < costTokens) {
      sfx.playClownHonk();
      setTradeFeedback(
        `⚠️ Need ${costTokens} 🪙 to buy ${cleanQty} $${activeCompany.ticker}! Upload a meme (+45 🪙) to raise capital!`
      );
      return;
    }

    if (onSpendTokens) {
      const ok = onSpendTokens(costTokens, `Buy ${cleanQty} $${activeCompany.ticker}`);
      if (!ok) return;
    }

    sfx.playCoinInsert();
    setPortfolio((prev) => {
      const oldPos = prev[activeCompany.ticker] || { shares: 0, totalCostTokens: 0 };
      return {
        ...prev,
        [activeCompany.ticker]: {
          shares: oldPos.shares + cleanQty,
          totalCostTokens: oldPos.totalCostTokens + costTokens
        }
      };
    });
    setTradeFeedback(
      `✅ BOUGHT ${cleanQty} sh of $${activeCompany.ticker} for ${costTokens} 🪙 (incl. 1% broker fee)`
    );
  };

  const handleSellShares = (qty) => {
    const owned = activeHolding.shares || 0;
    const cleanQty = Math.min(owned, Math.floor(Number(qty) || 0));
    if (cleanQty <= 0) return;

    const proceedsTokens = calcSellProceeds(cleanQty, activeQuote.price);
    const proportionalCostBasis = Math.max(
      1,
      Math.round((activeHolding.totalCostTokens * cleanQty) / owned)
    );
    const tradeProfit = proceedsTokens - proportionalCostBasis;

    sfx.playStockBell(tradeProfit >= 0);

    setPortfolio((prev) => {
      const oldPos = prev[activeCompany.ticker] || { shares: 0, totalCostTokens: 0 };
      const remShares = Math.max(0, oldPos.shares - cleanQty);
      const remCost =
        remShares === 0 ? 0 : Math.max(0, oldPos.totalCostTokens - proportionalCostBasis);
      return {
        ...prev,
        [activeCompany.ticker]: {
          shares: remShares,
          totalCostTokens: remCost
        }
      };
    });

    if (proceedsTokens > 0 && onPayoutTokens) {
      onPayoutTokens(proceedsTokens, {
        stakedTokens: proportionalCostBasis,
        xp: tradeProfit > 0 ? 25 : 5,
        label:
          tradeProfit >= 0
            ? `📈 SOLD ${cleanQty} $${activeCompany.ticker} (+${tradeProfit} 🪙 PROFIT!)`
            : `📉 SOLD ${cleanQty} $${activeCompany.ticker} (${proceedsTokens} 🪙 RETURNED)`,
        emoji: tradeProfit >= 0 ? '📈' : '📉'
      });
    }

    setTradeFeedback(
      `🔔 SOLD ${cleanQty} sh of $${activeCompany.ticker} for ${proceedsTokens} 🪙 (${
        tradeProfit >= 0 ? `+${tradeProfit}` : tradeProfit
      } 🪙 P&L)`
    );
  };

  // Fun 80s Wall Street Extra: Gordon Gecko-Frog Insider Rumor Phone!
  const handleCallInsiderHotline = () => {
    if (hotlineCooldown > 0) return;
    sfx.playToggle();
    setHotlineCooldown(35);

    const pick = MEME_COMPANIES[Math.floor(Math.random() * MEME_COMPANIES.length)];
    const bullishWhisper = Math.random() < 0.65;
    // 70% chance rumor is legit, 30% chance Wall Street fake-out!
    const actualSign = Math.random() < 0.7 ? (bullishWhisper ? 1 : -1) : bullishWhisper ? -1 : 1;

    setMarket((prev) => ({
      ...prev,
      [pick.ticker]: {
        ...prev[pick.ticker],
        rumorBias: actualSign * 0.055
      }
    }));

    setSelectedTicker(pick.ticker);
    setNewsFlash(
      bullishWhisper
        ? `☎️ GECKO-FROG HOTLINE: "Floor whisper says $${pick.ticker} whales are accumulating! (Not financial advice!)"`
        : `☎️ GECKO-FROG HOTLINE: "Careful! Rumor says $${pick.ticker} insiders look nervous today!"`
    );
  };

  // Build crisp 80s Neon SVG Area & Price Line Chart
  const chartData = useMemo(() => {
    const pts = activeQuote.history || [activeCompany.basePrice];
    const minP = Math.min(...pts) * 0.94;
    const maxP = Math.max(...pts) * 1.06;
    const span = Math.max(0.5, maxP - minP);
    const w = 360;
    const h = 128;

    const coords = pts.map((val, idx) => {
      const x = Number(((idx / Math.max(1, pts.length - 1)) * w).toFixed(1));
      const y = Number((h - ((val - minP) / span) * (h - 16) - 8).toFixed(1));
      return { x, y, val };
    });

    const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');
    const areaPath = `M 0,${h} L ${coords.map((c) => `${c.x},${c.y}`).join(' L ')} L ${w},${h} Z`;

    const avgEntryPrice =
      activeHolding.shares > 0 ? activeHolding.totalCostTokens / activeHolding.shares : null;
    const avgEntryY =
      avgEntryPrice !== null && avgEntryPrice >= minP && avgEntryPrice <= maxP
        ? Number((h - ((avgEntryPrice - minP) / span) * (h - 16) - 8).toFixed(1))
        : null;

    const isUpSession = pts[pts.length - 1] >= pts[0];
    const sessionPct =
      pts[0] > 0 ? Number((((pts[pts.length - 1] - pts[0]) / pts[0]) * 100).toFixed(1)) : 0;

    return {
      w,
      h,
      coords,
      polyline,
      areaPath,
      avgEntryPrice,
      avgEntryY,
      isUpSession,
      sessionPct
    };
  }, [activeQuote.history, activeCompany.basePrice, activeHolding]);

  const activeAvgCost =
    activeHolding.shares > 0
      ? (activeHolding.totalCostTokens / activeHolding.shares).toFixed(2)
      : null;
  const activePosLiquidation =
    activeHolding.shares > 0 ? calcSellProceeds(activeHolding.shares, activeQuote.price) : 0;
  const activePosPnl = activePosLiquidation - activeHolding.totalCostTokens;

  return (
    <section className="tm-stocks-stage" aria-label="MEMEDAQ 86 Meme Stock Market Simulator">
      <div className="tm-stocks-terminal">
        {/* TOP PORTFOLIO & WALL STREET HUD */}
        <header className="tm-stocks-header">
          <div className="tm-stocks-brand">
            {onBackToFeed && (
              <button type="button" className="tm-bandit-back-btn" onClick={onBackToFeed}>
                ← Memes
              </button>
            )}
            <div>
              <div className="tm-stocks-eyebrow">📟 WALL ST. CYBER-TERMINAL • 1% BROKER SPREAD</div>
              <h2 className="tm-stocks-title">MEMEDAQ &apos;86 STOCK EXCHANGE</h2>
            </div>
          </div>

          <div className="tm-stocks-kpis">
            <div className="tm-stocks-kpi">
              <span>CASH WALLET</span>
              <strong>🪙 {tokens.toLocaleString()}</strong>
            </div>
            <div className="tm-stocks-kpi">
              <span>HOLDINGS</span>
              <strong style={{ color: '#00f3ff' }}>
                🪙 {portfolioStats.holdingsLiquidationValue.toLocaleString()}
              </strong>
            </div>
            <div className="tm-stocks-kpi">
              <span>NET WORTH</span>
              <strong style={{ color: '#facc15' }}>
                🪙 {portfolioStats.netWorth.toLocaleString()}
              </strong>
            </div>
            <div className="tm-stocks-kpi">
              <span>OPEN P&amp;L</span>
              <strong
                style={{
                  color:
                    portfolioStats.unrealizedPnl > 0
                      ? '#4ade80'
                      : portfolioStats.unrealizedPnl < 0
                      ? '#f43f5e'
                      : '#94a3b8'
                }}
              >
                {portfolioStats.unrealizedPnl >= 0
                  ? `+${portfolioStats.unrealizedPnl}`
                  : portfolioStats.unrealizedPnl}{' '}
                🪙
              </strong>
            </div>
          </div>
        </header>

        {/* LIVE BREAKING MEME NEWS WIRE + INSIDER HOTLINE */}
        <div className="tm-stocks-newswire" role="status">
          <span className="tm-stocks-news-text">{newsFlash}</span>
          <div className="tm-stocks-news-btns">
            <button
              type="button"
              className="tm-stocks-wire-btn"
              disabled={hotlineCooldown > 0}
              onClick={handleCallInsiderHotline}
              title="Call Gordon Gecko-Frog for a 1986 floor rumor!"
            >
              {hotlineCooldown > 0 ? `☎️ Rumor (${hotlineCooldown}s)` : '☎️ Insider Tip'}
            </button>
            <button
              type="button"
              className="tm-stocks-wire-btn"
              onClick={() => setPaused((p) => !p)}
              title="Pause or resume market ticker"
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </div>
        </div>

        {/* MAIN 2-PANE TRADING FLOOR (FITS FIXED VIEWPORT ON IPAD & IPHONE) */}
        <div className="tm-stocks-grid">
          {/* LEFT / TOP: 8 MEME COMPANY TICKER BOARD */}
          <div className="tm-stocks-list" role="listbox" aria-label="Meme Stock Tickers">
            {MEME_COMPANIES.map((c) => {
              const q = market[c.ticker];
              const owned = portfolio[c.ticker]?.shares || 0;
              const isSelected = c.ticker === activeCompany.ticker;
              const up = q.lastDeltaPct >= 0;

              return (
                <button
                  key={c.ticker}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`tm-stock-row ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    sfx.playFlipperClick();
                    setSelectedTicker(c.ticker);
                    setTradeFeedback('');
                  }}
                >
                  <div className="tm-stock-row-left">
                    <span className="tm-stock-emoji">{c.emoji}</span>
                    <div>
                      <div className="tm-stock-ticker">
                        ${c.ticker}
                        {owned > 0 && <span className="tm-stock-owned-pill">{owned} sh</span>}
                      </div>
                      <div className="tm-stock-name">{c.name}</div>
                    </div>
                  </div>
                  <div className="tm-stock-row-right">
                    <div className="tm-stock-price">🪙 {q.price.toFixed(2)}</div>
                    <div className={`tm-stock-delta ${up ? 'up' : 'down'}`}>
                      {up ? '▲' : '▼'} {Math.abs(q.lastDeltaPct).toFixed(1)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* RIGHT / BOTTOM: NEON CRT CHART + BUY / SELL ORDER DESK */}
          <div className="tm-stocks-desk">
            <div className="tm-stocks-chart-card">
              <div className="tm-stocks-chart-head">
                <div>
                  <span className="tm-stocks-active-sym" style={{ color: activeCompany.color }}>
                    {activeCompany.emoji} ${activeCompany.ticker}
                  </span>
                  <span className="tm-stocks-active-company">{activeCompany.name}</span>
                </div>
                <div className="tm-stocks-active-quote">
                  <strong>🪙 {activeQuote.price.toFixed(2)}</strong>
                  <span className={chartData.isUpSession ? 'up' : 'down'}>
                    {chartData.isUpSession ? '+' : ''}
                    {chartData.sessionPct}% (30t)
                  </span>
                </div>
              </div>

              {/* 80s Neon CRT SVG Chart */}
              <div className="tm-stocks-svg-wrap">
                <svg
                  viewBox={`0 0 ${chartData.w} ${chartData.h}`}
                  preserveAspectRatio="none"
                  className="tm-stocks-svg"
                >
                  <defs>
                    <linearGradient id="tmStockAreaBull" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity="0.38" />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="tmStockAreaBear" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.38" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Synth Grid Lines */}
                  {[24, 56, 88, 116].map((gy) => (
                    <line
                      key={gy}
                      x1="0"
                      y1={gy}
                      x2={chartData.w}
                      y2={gy}
                      stroke="rgba(148, 163, 184, 0.14)"
                      strokeDasharray="3 3"
                    />
                  ))}

                  {/* Average Entry Cost Line */}
                  {chartData.avgEntryY !== null && (
                    <line
                      x1="0"
                      y1={chartData.avgEntryY}
                      x2={chartData.w}
                      y2={chartData.avgEntryY}
                      stroke="#facc15"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                    />
                  )}

                  <path
                    d={chartData.areaPath}
                    fill={chartData.isUpSession ? 'url(#tmStockAreaBull)' : 'url(#tmStockAreaBear)'}
                  />
                  <polyline
                    fill="none"
                    stroke={chartData.isUpSession ? '#4ade80' : '#f43f5e'}
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={chartData.polyline}
                  />
                  {chartData.coords.length > 0 && (
                    <circle
                      cx={chartData.coords[chartData.coords.length - 1].x}
                      cy={chartData.coords[chartData.coords.length - 1].y}
                      r="4.2"
                      fill={chartData.isUpSession ? '#4ade80' : '#f43f5e'}
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                  )}
                </svg>
              </div>

              {/* Position Readout */}
              <div className="tm-stocks-pos-strip">
                <span>
                  OWNED: <strong>{activeHolding.shares} sh</strong>
                </span>
                <span>
                  AVG COST: <strong>{activeAvgCost ? `${activeAvgCost} 🪙` : '—'}</strong>
                </span>
                <span>
                  SELL VALUE: <strong>{activePosLiquidation} 🪙</strong>
                </span>
                <span
                  style={{
                    color:
                      activeHolding.shares === 0
                        ? '#94a3b8'
                        : activePosPnl >= 0
                        ? '#4ade80'
                        : '#f43f5e'
                  }}
                >
                  P&amp;L:{' '}
                  <strong>
                    {activeHolding.shares === 0
                      ? '—'
                      : `${activePosPnl >= 0 ? '+' : ''}${activePosPnl} 🪙`}
                  </strong>
                </span>
              </div>
            </div>

            {/* BUY & SELL ORDER EXECUTION BUTTONS */}
            <div className="tm-stocks-order-grid">
              <div className="tm-stocks-order-box buy">
                <div className="tm-stocks-order-label">
                  🟢 BUY ${activeCompany.ticker} (MAX {maxAffordableShares} SH)
                </div>
                <div className="tm-stocks-order-btns">
                  <button
                    type="button"
                    className="tm-stock-trade-btn buy"
                    disabled={maxAffordableShares < 1}
                    onClick={() => handleBuyShares(1)}
                  >
                    BUY 1 ({calcBuyCost(1, activeQuote.price)} 🪙)
                  </button>
                  <button
                    type="button"
                    className="tm-stock-trade-btn buy"
                    disabled={maxAffordableShares < 5}
                    onClick={() => handleBuyShares(5)}
                  >
                    BUY 5 ({calcBuyCost(5, activeQuote.price)} 🪙)
                  </button>
                  <button
                    type="button"
                    className="tm-stock-trade-btn buy"
                    disabled={maxAffordableShares < 1}
                    onClick={() => handleBuyShares(maxAffordableShares)}
                  >
                    MAX ({maxAffordableShares})
                  </button>
                </div>
              </div>

              <div className="tm-stocks-order-box sell">
                <div className="tm-stocks-order-label">
                  🔴 SELL ${activeCompany.ticker} ({activeHolding.shares} OWNED)
                </div>
                <div className="tm-stocks-order-btns">
                  <button
                    type="button"
                    className="tm-stock-trade-btn sell"
                    disabled={activeHolding.shares < 1}
                    onClick={() => handleSellShares(1)}
                  >
                    SELL 1 (+{calcSellProceeds(1, activeQuote.price)} 🪙)
                  </button>
                  <button
                    type="button"
                    className="tm-stock-trade-btn sell"
                    disabled={activeHolding.shares < 2}
                    onClick={() => handleSellShares(Math.max(1, Math.floor(activeHolding.shares / 2)))}
                  >
                    SELL 50%
                  </button>
                  <button
                    type="button"
                    className="tm-stock-trade-btn sell"
                    disabled={activeHolding.shares < 1}
                    onClick={() => handleSellShares(activeHolding.shares)}
                  >
                    SELL ALL (+{activePosLiquidation} 🪙)
                  </button>
                </div>
              </div>
            </div>

            {tradeFeedback && <div className="tm-stocks-feedback">{tradeFeedback}</div>}

            {tokens < Math.ceil(activeQuote.price * 1.02) && activeHolding.shares === 0 && (
              <div className="tm-stocks-broke-bar">
                <span>📸 Need trading capital? Upload a meme (+45 to +75 🪙) to fund your portfolio!</span>
                {onOpenUpload && (
                  <button type="button" className="tm-btn tm-btn-primary" onClick={onOpenUpload}>
                    📸 Upload Meme
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
