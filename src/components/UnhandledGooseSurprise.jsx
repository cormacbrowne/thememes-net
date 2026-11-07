import { useState, useEffect, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';

// ==========================================
// PHASE 27.2: EXPERIMENTAL COMEDY SURPRISE ENGINE —
// "🪿 HONK.EXE: THE KLEPTOMANIAC CYBER-GOOSE & 3AM INTERDIMENSIONAL CABLE"
// 4 Ridiculous, Interactive Comedy Hijacks:
// 1. 🪿 HONK.EXE — Roaming Sunglasses Cyber-Goose that steals UI items & demands sourdough
// 2. 📺 3:00 AM VHS Shopping Channel ("Billy Memes Live!") selling Tactical Pocket Bacon & Dehydrated Water
// 3. 🕵️‍♂️ Ministry of Meme Revenue — Emergency Chuckle Tax Audit (with 80s Dance-Off & Uno Reverse)
// 4. 🔮 1986 Casio Quantum Mind-Reader & Posture Scanner
// ==========================================

const STOLEN_CONTRABAND = [
  '🪪 Stolen: The CEO’s Netflix Password ("hunter2")',
  '🧀 Stolen: 4.2kg of Unsupervised Warm Cathedral City Cheddar',
  '🖱️ Stolen: The W3C CSS Flexbox Centering Specification',
  '🧦 Stolen: Your Missing Left Sock from November 2019',
  '📈 Stolen: The Entire FTSE 100 & Three Greggs Sausage Rolls',
  '🔑 Stolen: Windows 95 OEM Product Key (0420-OEM-0069)',
  '🥪 Stolen: Dave’s Clearly Labelled Fridge Sandwich',
  '🛸 Stolen: Area 51 Wi-Fi Router ("FBI_Surveillance_Van_4")'
];

const GOOSE_TAUNTS = [
  '🪿 HONK!! ("PEACE WAS NEVER IN THE PRODUCT ROADMAP!")',
  '🪿 HONK HONK!! ("I HAVE EATEN YOUR COOKIES AND THEY WERE DELICIOUS!")',
  '🪿 AGGRESSIVE FLAPPING!! ("YOUR CURSOR NOW BELONGS TO THE POND!")',
  '🪿 MAXIMUM HONK!! ("DROP ONE LOAF OF GARLIC BREAD AND NOBODY GETS PECKED!")',
  '🪿 DIPLOMATIC HONK!! ("I AM LEGALLY REGISTERED AS A TAX SHELTER IN GUERNSEY!")'
];

const INFOMERCIAL_PRODUCTS = [
  {
    id: 'bacon',
    icon: '🥓',
    name: 'TACTICAL POCKET BACON™ (MIL-SPEC MK-IV)',
    tagline: 'Aerospace-Grade Emergency Cured Pork in a Kevlar Belt Holster!',
    price: '$0.00 (OR 3 EASY PAYMENTS OF $0.00!)',
    pitch:
      'Stuck in a boring Zoom meeting? Cornered by a swan? Simply deploy Tactical Pocket Bacon™ at 140 FPS! Approved by 0 out of 10 cardiologists and 10 out of 10 blokes named Gary.',
    review:
      '⭐⭐⭐⭐⭐ "My wife took the house, the dog, and the air fryer, but she couldn’t take my Tactical Pocket Bacon™." — Dave, 44, Wolverhampton',
    bonus: 'WAIT! Order in the next 14 seconds and receive a FREE Left-Handed Spatula & 400 Rubber Chickens!'
  },
  {
    id: 'brick',
    icon: '🧱',
    name: 'THE EMOTIONAL SUPPORT BRICK 2000™ (PRO MAX)',
    tagline: 'Zero Battery Life! Zero Notifications! Weighs a Reassuring 4.8 Pounds!',
    price: '$0.00 + FREE GRAVITY!',
    pitch:
      'Tired of smart devices judging your screen time? The Emotional Support Brick 2000™ sits loyally on your desk, never asks "u up?" at 2:14 AM, and comes with a genuine hologram sticker that says "AI INSIDE".',
    review:
      '⭐⭐⭐⭐⭐ "I brought my Emotional Support Brick to a performance review and got promoted to Vice President of Masonry." — Sarah, Bristol',
    bonus: 'DOUBLE THE OFFER! We’ll throw in a second artisanal clay brick AND a certificate of clay authenticity!'
  },
  {
    id: 'water',
    icon: '💧',
    name: 'ARTISANAL DEHYDRATED WATER™ (ORGANIC TIN)',
    tagline: '100% Vacuum-Sealed Quantum Emptiness — Just Add Water & Stir!',
    price: '$0.00 (ULTRA-LIGHTWEIGHT SHIPPING!)',
    pitch:
      'Why lug heavy wet water around when you can carry 500 gallons of our triple-filtered Dehydrated Water™ in your shirt pocket?! Simply add ordinary tap water and boom: instant wet water!',
    review:
      '⭐⭐⭐⭐⭐ "I spilled an entire tin of Dehydrated Water on my laptop and nothing happened! Science has gone too far!" — Callum, Edinburgh',
    bonus: 'CALL NOW and receive our bestselling recipe book: "How to Boil Ice in 47 Easy Steps"!'
  },
  {
    id: 'wifi',
    icon: '📡',
    name: 'GOLD-PLATED LEFT-HANDED WI-FI CABLES™',
    tagline: ' catch Stray Memes in Mid-Air with 24-Karat Oxygen-Free Invisible Wire!',
    price: '$0.00 (PRE-TANGLED AT THE FACTORY!)',
    pitch:
      'Are your memes loading with right-handed polarity? Our Left-Handed Wi-Fi Cables™ arrive pre-knotted in an impossible 4D Klein bottle tangle so even your cat can’t unplug the router!',
    review:
      '⭐⭐⭐⭐⭐ "Ever since I installed this invisible cable, I can hear next door’s baby monitor on my toaster." — Big Trev, Leeds',
    bonus: 'INCLUDES FREE Tub of Elbow Grease & a Tin of Tartan Paint!'
  }
];

const QUANTUM_READINGS = [
  {
    posture: '71° " Croissant Slouch " with slight head tilt',
    tabs: '19 open browser tabs (7 of which you opened 4 days ago "to read later")',
    craving: 'A dangerously hot toasted cheese sandwich or a packet of salt & vinegar crisps',
    aura: 'Chaotic Good 1986 Synthwave Wizard',
    verdict: '99.4% Certified Legend (0.6% Goblin Energy)'
  },
  {
    posture: '84° " Tactical Gamer Lean " (1 elbow doing 90% of the structural work)',
    tabs: '12 open tabs + 1 spreadsheet you are actively pretending doesn’t exist',
    craving: 'Cold pizza or an unreasonably large mug of tea',
    aura: 'Knight Industries Turbo-Charged Mainframe',
    verdict: '100% Immune to Boring Websites'
  },
  {
    posture: '62° " Sofa Banana Mode " (Phone held 8 inches from nose)',
    tabs: '34 open tabs (Browser RAM is quietly weeping in the corner)',
    craving: 'Garlic bread. Always garlic bread.',
    aura: 'Interdimensional Coin Dozer High-Roller',
    verdict: 'Supreme Commander of Late-Night Procrastination'
  }
];

export default function UnhandledGooseSurprise({ isOpen, onClose, onOpenMode }) {
  const [activeTab, setActiveTab] = useState('goose'); // 'goose' | 'infomercial' | 'audit' | 'mindreader'
  const [goosePos, setGoosePos] = useState({ x: 52, y: 42, flip: false, spinning: false });
  const [gooseBoops, setGooseBoops] = useState(0);
  const [gooseTaunt, setGooseTaunt] = useState(GOOSE_TAUNTS[0]);
  const [stolenList, setStolenList] = useState([STOLEN_CONTRABAND[0], STOLEN_CONTRABAND[1]]);
  const [footprints, setFootprints] = useState([
    { id: 1, x: 24, y: 65, rot: 25 },
    { id: 2, x: 38, y: 54, rot: -15 },
    { id: 3, x: 52, y: 42, rot: 18 }
  ]);

  const [prodIdx, setProdIdx] = useState(0);
  const [boughtStamp, setBoughtStamp] = useState('');
  const [stockLeft, setStockLeft] = useState(999998);

  const [auditResolution, setAuditResolution] = useState(null);
  const [discoParty, setDiscoParty] = useState(false);

  const [readingIdx, setReadingIdx] = useState(0);

  // Move the rogue goose around when on the Goose tab!
  useEffect(() => {
    if (!isOpen || activeTab !== 'goose' || gooseBoops >= 3) return undefined;
    const iv = setInterval(() => {
      setGoosePos((prev) => {
        const nx = 14 + Math.random() * 72;
        const ny = 18 + Math.random() * 62;
        setFootprints((fps) => [
          ...fps.slice(-9),
          {
            id: Date.now() + Math.random(),
            x: prev.x,
            y: prev.y,
            rot: Math.round((Math.random() - 0.5) * 90)
          }
        ]);
        return {
          x: nx,
          y: ny,
          flip: nx < prev.x,
          spinning: false
        };
      });
    }, 1150);
    return () => clearInterval(iv);
  }, [isOpen, activeTab, gooseBoops]);

  // Tick down the ridiculous infomercial stock counter
  useEffect(() => {
    if (!isOpen || activeTab !== 'infomercial') return undefined;
    const iv = setInterval(() => {
      setStockLeft((s) => (s > 2 ? s - Math.floor(Math.random() * 7 + 1) : 999999));
    }, 900);
    return () => clearInterval(iv);
  }, [isOpen, activeTab]);

  // Apply hilarious temporary disco tilt to body when Dance-Off is active!
  useEffect(() => {
    if (!discoParty) {
      document.body.classList.remove('tm-surprise-disco-groove');
      return undefined;
    }
    document.body.classList.add('tm-surprise-disco-groove');
    const t = setTimeout(() => {
      setDiscoParty(false);
      document.body.classList.remove('tm-surprise-disco-groove');
    }, 5500);
    return () => {
      clearTimeout(t);
      document.body.classList.remove('tm-surprise-disco-groove');
    };
  }, [discoParty]);

  const handleBoopGoose = useCallback(() => {
    sfx.playGooseHonk?.();
    const nextBoops = gooseBoops + 1;
    setGooseBoops(nextBoops);
    setGooseTaunt(GOOSE_TAUNTS[nextBoops % GOOSE_TAUNTS.length]);
    setStolenList((prev) => [
      STOLEN_CONTRABAND[(prev.length + nextBoops) % STOLEN_CONTRABAND.length],
      ...prev.slice(0, 3)
    ]);
    setGoosePos((prev) => ({
      x: 15 + Math.random() * 70,
      y: 18 + Math.random() * 60,
      flip: !prev.flip,
      spinning: true
    }));
    if (nextBoops >= 3) {
      sfx.playJackpot?.();
    }
  }, [gooseBoops]);

  if (!isOpen) return null;

  const activeProduct = INFOMERCIAL_PRODUCTS[prodIdx % INFOMERCIAL_PRODUCTS.length];
  const activeReading = QUANTUM_READINGS[readingIdx % QUANTUM_READINGS.length];

  return (
    <div
      className="tm-surprise-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Experimental Absurdity & Cyber-Goose Hijack"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="tm-surprise-window">
        {/* TOP HEADER */}
        <header className="tm-surprise-header">
          <div className="tm-surprise-title-row">
            <span className="tm-surprise- siren-pill">🚨 EXPERIMENTAL WTF?! LAB</span>
            <h2 className="tm-surprise-title">
              🪿 INTERDIMENSIONAL CHAOS &amp; GOOSE PROTOCOL
            </h2>
          </div>
          <button
            type="button"
            className="tm-surprise-close-btn"
            onClick={onClose}
            title="Close Surprise Lab (Esc)"
          >
            ✕ ESCAPE
          </button>
        </header>

        {/* 4 ABSURD EXPERIMENT SWITCHER TABS */}
        <div className="tm-surprise-tabs">
          <button
            type="button"
            className={`tm-surprise-tab ${activeTab === 'goose' ? 'active' : ''}`}
            onClick={() => {
              sfx.playGooseHonk?.();
              setActiveTab('goose');
            }}
          >
            🪿 1. HONK.EXE (Goose Heist)
          </button>
          <button
            type="button"
            className={`tm-surprise-tab ${activeTab === 'infomercial' ? 'active' : ''}`}
            onClick={() => {
              sfx.playSlotLeverPull?.();
              setActiveTab('infomercial');
              setBoughtStamp('');
            }}
          >
            📺 2. 3AM Shopping TV
          </button>
          <button
            type="button"
            className={`tm-surprise-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => {
              sfx.playPoliceSiren?.();
              setActiveTab('audit');
              setAuditResolution(null);
            }}
          >
            🕵️‍♂️ 3. Meme Tax Audit
          </button>
          <button
            type="button"
            className={`tm-surprise-tab ${activeTab === 'mindreader' ? 'active' : ''}`}
            onClick={() => {
              sfx.playKittScanner?.();
              setActiveTab('mindreader');
            }}
          >
            🔮 4. 1986 Mind-Reader
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="tm-surprise-body">
          {/* ==========================================
              TAB 1: 🪿 HONK.EXE — KLEPTOMANIAC CYBER-GOOSE
              ========================================== */}
          {activeTab === 'goose' && (
            <div className="tm-goose-arena">
              <div className="tm-goose-hud">
                <div>
                  <div className="tm-goose-alert-tag">
                    ⚠️ WARNING: UNAUTHORIZED WATERFOWL IN THE MAINFRAME
                  </div>
                  <div className="tm-goose-taunt">{gooseTaunt}</div>
                </div>
                <div className="tm-goose-score-pill">
                  🎯 GOOSE BOOPS: <strong>{gooseBoops} / 3</strong>
                </div>
              </div>

              {/* Interactive Goose Chase Stage */}
              <div className="tm-goose-stage">
                {footprints.map((fp) => (
                  <span
                    key={fp.id}
                    className="tm-goose-footprint"
                    style={{
                      left: `${fp.x}%`,
                      top: `${fp.y}%`,
                      transform: `translate(-50%, -50%) rotate(${fp.rot}deg)`
                    }}
                  >
                    🐾
                  </span>
                ))}

                <button
                  type="button"
                  className={`tm-goose-sprite-btn ${goosePos.spinning ? 'spin' : ''}`}
                  style={{
                    left: `${goosePos.x}%`,
                    top: `${goosePos.y}%`,
                    transform: `translate(-50%, -50%) scaleX(${goosePos.flip ? -1 : 1})`
                  }}
                  onClick={handleBoopGoose}
                  title="Click/Tap to Boop the Rogue Cyber-Goose!"
                >
                  <span className="tm-goose-emoji">🪿</span>
                  <span className="tm-goose-shades">🕶️</span>
                  <span className="tm-goose-loot-tag">
                    {gooseBoops >= 3 ? '🏳️ SURRENDERED!' : '🥖 CLICK TO BOOP!'}
                  </span>
                </button>

                {gooseBoops >= 3 && (
                  <div className="tm-goose-victory-banner">
                    🎉 <strong>THE GOOSE HAS RESPECTED YOUR AUTHORITY!</strong> He returned the
                    CEO&apos;s toupee, left you a sacred Golden Croissant 🥐, and waddled back to
                    the Coin Dozer!
                  </div>
                )}
              </div>

              {/* Stolen Contraband Police Blotter & Action Buttons */}
              <div className="tm-goose-footer">
                <div className="tm-goose-contraband-box">
                  <div className="tm-goose-contraband-title">
                    📋 LIVE EVIDENCE LOCKER (ITEMS STOLEN BY GOOSE):
                  </div>
                  <ul>
                    {stolenList.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="tm-goose-btn-col">
                  <button
                    type="button"
                    className="tm-surprise-cta-btn gold"
                    onClick={() => {
                      sfx.playGooseHonk?.();
                      handleBoopGoose();
                    }}
                  >
                    📢 HONK BACK AGGRESSIVELY!
                  </button>
                  <button
                    type="button"
                    className="tm-surprise-cta-btn cyan"
                    onClick={() => {
                      sfx.playPowerUpCollect?.();
                      setGooseBoops(3);
                      setGooseTaunt(
                        '🪿 *HAPPY HONK* ("ARTISANAL SOURDOUGH ACCEPTED. YOU MAY CONTINUE MEMEING.")'
                      );
                    }}
                  >
                    🥖 Bribe Goose with Warm Garlic Bread
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 2: 📺 3:00 AM INTERDIMENSIONAL SHOPPING CHANNEL
              ========================================== */}
          {activeTab === 'infomercial' && (
            <div className="tm-infomercial-card">
              <div className="tm-infomercial-top-ticker">
                <span>🔴 LIVE CH. 86 SHOPPING NETWORK</span>
                <span>☎️ CALL 0800-BRAINROT NOW!</span>
                <span className="blink">🔥 ONLY {stockLeft.toLocaleString()} LEFT IN STOCK!</span>
              </div>

              <div className="tm-infomercial-main">
                <div className="tm-infomercial-showcase">
                  <div className="tm-infomercial-big-icon">{activeProduct.icon}</div>
                  <div className="tm-infomercial-price-burst">{activeProduct.price}</div>
                </div>

                <div className="tm-infomercial-copy">
                  <div className="tm-infomercial-host">
                    🎙️ BILLY MEMES HERE FOR INTERDIMENSIONAL IMPORTS LTD:
                  </div>
                  <h3 className="tm-infomercial-prod-title">{activeProduct.name}</h3>
                  <div className="tm-infomercial-tagline">{activeProduct.tagline}</div>
                  <p className="tm-infomercial-pitch">{activeProduct.pitch}</p>
                  <div className="tm-infomercial-review">{activeProduct.review}</div>
                  <div className="tm-infomercial-bonus">🎁 {activeProduct.bonus}</div>
                </div>
              </div>

              {boughtStamp && <div className="tm-infomercial-stamp">{boughtStamp}</div>}

              <div className="tm-infomercial-actions">
                <button
                  type="button"
                  className="tm-surprise-cta-btn gold"
                  onClick={() => {
                    sfx.playJackpot?.();
                    setBoughtStamp(
                      `✅ ORDER CONFIRMED! 1× ${activeProduct.name} + 400 FREE RUBBER CHICKENS DISPATCHED VIA TREBUCHET!`
                    );
                  }}
                >
                  🛒 SMASH TO PANIC-BUY FOR $0.00!
                </button>
                <button
                  type="button"
                  className="tm-surprise-cta-btn cyan"
                  onClick={() => {
                    sfx.playToggle?.();
                    setProdIdx((i) => i + 1);
                    setBoughtStamp('');
                  }}
                >
                  📺 NEXT ABSURD INVENTION ▶
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 3: 🕵️‍♂️ MINISTRY OF MEME REVENUE — CHUCKLE TAX AUDIT
              ========================================== */}
          {activeTab === 'audit' && (
            <div className="tm-audit-card">
              <div className="tm-audit-seal-row">
                <span className="tm-audit-seal">🏛️🎩</span>
                <div>
                  <div className="tm-audit-eyebrow">
                    H.M. MINISTRY OF SILLY CLICKS &amp; CHUCKLE REVENUE (FORM 420-69B)
                  </div>
                  <h3 className="tm-audit-heading">
                    OFFICIAL NOTICE OF UNLICENSED GIGGLING &amp; VIBES SURPLUS
                  </h3>
                </div>
              </div>

              <div className="tm-audit-letter">
                <p>
                  <strong>Dear Sovereign Citizen of THEMEMES.NET,</strong>
                </p>
                <p>
                  Our orbital vibe satellites detected an <strong>Unregistered Chuckle</strong> and{' '}
                  <strong>Excessive Arcade Swagger</strong> originating from your screen without a
                  stamped <em>Class-4 Banter Permit</em>.
                </p>
                <ul className="tm-audit-charges">
                  <li>📜 Charge 1: Operating a Neon Coin Dozer with reckless optimism.</li>
                  <li>📜 Charge 2: Possessing 100% Certified Grade-A Procrastination Energy.</li>
                  <li>📜 Charge 3: Failing to declare a cheeky afternoon cuppa to the Inspector.</li>
                </ul>
              </div>

              {auditResolution && (
                <div className="tm-audit-verdict-box">{auditResolution}</div>
              )}

              <div className="tm-audit-actions">
                <button
                  type="button"
                  className="tm-surprise-cta-btn gold"
                  onClick={() => {
                    sfx.playNyanRiff?.();
                    setDiscoParty(true);
                    setAuditResolution(
                      '🕺 14/10 DISCO FOOTWORK! Chief Inspector Wifflebottom is weeping tears of joy! All Chuckle Taxes are officially FORGIVEN!'
                    );
                  }}
                >
                  🕺 Settle Audit via Aggressive 80s Dance-Off
                </button>
                <button
                  type="button"
                  className="tm-surprise-cta-btn pink"
                  onClick={() => {
                    sfx.playAirhorn?.();
                    setAuditResolution(
                      '🃏 UNO REVERSE ACCEPTED! The Ministry of Meme Revenue now owes YOU 1 Imperial Tonne of Jaffa Cakes and Diplomatic Meme Immunity!'
                    );
                  }}
                >
                  🃏 Play Holographic &quot;Uno Reverse&quot; Card
                </button>
                <button
                  type="button"
                  className="tm-surprise-cta-btn cyan"
                  onClick={() => {
                    sfx.playGooseHonk?.();
                    setAuditResolution(
                      '🪿 HONK!! You unleashed the Cyber-Goose! The Tax Inspector dropped his briefcase and is currently sprinting toward Milton Keynes!'
                    );
                  }}
                >
                  🪿 Unleash The Cyber-Goose on the Auditor
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 4: 🔮 1986 CASIO QUANTUM MIND-READER
              ========================================== */}
          {activeTab === 'mindreader' && (
            <div className="tm-mindreader-card">
              <div className="tm-mindreader-head">
                📡 1986 CASIO CALCULATOR BIO-TELEMETRY &amp; AURA SCANNER (100% SCIENTIFIC*)
              </div>
              <div className="tm-mindreader-grid">
                <div className="tm-mindreader-row">
                  <span>🪑 DETECTED SITTING POSTURE:</span>
                  <strong>{activeReading.posture}</strong>
                </div>
                <div className="tm-mindreader-row">
                  <span>🗂️ BROWSER TAB TELEMETRY:</span>
                  <strong>{activeReading.tabs}</strong>
                </div>
                <div className="tm-mindreader-row">
                  <span>🥪 SUBCONSCIOUS SNACK CRAVING:</span>
                  <strong>{activeReading.craving}</strong>
                </div>
                <div className="tm-mindreader-row">
                  <span>✨ 1986 SYNTHWAVE AURA:</span>
                  <strong>{activeReading.aura}</strong>
                </div>
                <div className="tm-mindreader-row highlight">
                  <span>🏆 OFFICIAL MAINFRAME VERDICT:</span>
                  <strong>{activeReading.verdict}</strong>
                </div>
              </div>

              <div className="tm-infomercial-actions">
                <button
                  type="button"
                  className="tm-surprise-cta-btn gold"
                  onClick={() => {
                    sfx.playKittScanner?.();
                    setReadingIdx((i) => i + 1);
                  }}
                >
                  🔮 Re-Calibrate Quantum Mind Scanner
                </button>
                {onOpenMode && (
                  <button
                    type="button"
                    className="tm-surprise-cta-btn cyan"
                    onClick={() => {
                      onClose?.();
                      onOpenMode('pusher');
                    }}
                  >
                    🪙 Take This Lucky Aura to Coin Dozer!
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
