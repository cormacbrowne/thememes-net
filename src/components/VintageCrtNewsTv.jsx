import { memo, useEffect, useRef, useState } from 'react';
import { useDraggableFloating } from '../hooks/useDraggableFloating';
import { speakWithPersona } from '../utils/aiSpeech';
import { getSettings } from '../utils/settingsStore';
import { sfx } from '../utils/soundEngine';
import './VintageCrtNewsTv.css';

const EIGHTIES_NEWS_CHANNELS = [
  {
    ch: '02',
    network: 'MTV CABLE 81',
    date: 'AUG 01, 1981',
    tag: 'BREAKING',
    headline: 'MUSIC TELEVISION LAUNCHES AT 12:01 AM',
    summary:
      'Moon-landing bumper rolls nationwide as The Buggles blast Video Killed the Radio Star on live cable TV.',
    ticker: 'BREAKING 1981: FIRST 24-HOUR MUSIC VIDEO NETWORK GOES LIVE • VJs BROADCAST FROM FORT LEE • STEREO FM SIMULCAST READY',
    palette: { sky: '#1e1b4b', accent: '#f472b6', glow: '#22d3ee' },
    scene: 'mtv'
  },
  {
    ch: '03',
    network: 'CAPE NEWS 4',
    date: 'APR 12, 1981',
    tag: 'SPACE',
    headline: 'SPACE SHUTTLE COLUMBIA LIFTS OFF',
    summary:
      'Twin solid rocket boosters ignite at Kennedy Space Center, launching the first winged reusable orbiter.',
    ticker: 'FLASH: COLUMBIA CLEARS TOWER AT PAD 39A • JOHN YOUNG & ROBERT CRIPPEN IN ORBIT • HEAT TILES VERIFIED NOMINAL',
    palette: { sky: '#082f49', accent: '#fb923c', glow: '#38bdf8' },
    scene: 'shuttle'
  },
  {
    ch: '04',
    network: 'NIGHTLINE 82',
    date: 'NOV 30, 1982',
    tag: 'POP WIRE',
    headline: 'THRILLER LP TRIGGERS NEON DANCE FEVER',
    summary:
      'Record shops deploy extra velvet ropes as red zipper jackets and cassette boomboxes sell out from coast to coast.',
    ticker: 'ENTERTAINMENT ALERT: THRILLER HITS STEREO STORES • MAXELL CHROME TAPES ON BACKORDER • SKATE RINKS ADD EXTRA NEON STROBES',
    palette: { sky: '#3b0764', accent: '#ef4444', glow: '#facc15' },
    scene: 'boombox'
  },
  {
    ch: '05',
    network: 'VALLEY TECH',
    date: 'JAN 24, 1984',
    tag: 'TECH WIRE',
    headline: 'MACINTOSH SAYS HELLO FROM A BEIGE BOX',
    summary:
      'Apple unveils 128K all-in-one personal computer with crisp 9-inch CRT, floppy slot, and robotic demo speech.',
    ticker: 'SILICON VALLEY: 3.5-INCH FLOPPY DRIVES REPLACE 5.25" • 128 KILOBYTES OF RAM STUNS CROWD • MOUSE CURSOR DEBUTS TO APPLAUSE',
    palette: { sky: '#0f172a', accent: '#4ade80', glow: '#a3e635' },
    scene: 'mac'
  },
  {
    ch: '06',
    network: 'KVLY HILL VLY',
    date: 'OCT 26, 1985',
    tag: 'SPECIAL',
    headline: 'FLASHING LIGHTS AT TWIN PINES MALL LOT',
    summary:
      'Mall security baffled after gleaming stainless steel gull-wing coupe leaves dual fire trails before vanishing at 88 MPH.',
    ticker: 'HILL VALLEY UPDATE: CLOCK TOWER LIGHTNING ADVISORY CONTINUES • RADIOSHACK CAPACITORS SOLD OUT • 1.21 GIGAWATT SPIKE LOGGED',
    palette: { sky: '#172554', accent: '#38bdf8', glow: '#f97316' },
    scene: 'delorean'
  },
  {
    ch: '07',
    network: 'SAT-FEED 85',
    date: 'JUL 13, 1985',
    tag: 'LIVE FEED',
    headline: 'LIVE AID UNITES WEMBLEY & PHILADELPHIA',
    summary:
      'Sixteen hours of non-stop satellite music reach over 1.5 billion viewers across 13 orbiting transponders.',
    ticker: 'GLOBAL SATELLITE LINK: WEMBLEY STADIUM SOUNDCHECK COMPLETE • JFK PHILADELPHIA GATES PACKED • CONCORDE STANDING BY',
    palette: { sky: '#1e1b4b', accent: '#facc15', glow: '#ec4899' },
    scene: 'satellite'
  },
  {
    ch: '08',
    network: 'ARCADE 8',
    date: 'OCT 18, 1985',
    tag: 'GAMING',
    headline: '8-BIT HOME CONSOLE WOWS TEST MARKETS',
    summary:
      'Light-gun Zappers and two-button grey controllers fly off New York shelves ahead of nationwide mall rollout.',
    ticker: 'TOY AISLE BULLETIN: 8-BIT CARTRIDGE BLOWING TECHNIQUE DISCOVERED • ARCADE QUARTERS REMAIN LEGAL TENDER • CRT TV SETS ON SALE',
    palette: { sky: '#1c1917', accent: '#ef4444', glow: '#e2e8f0' },
    scene: 'nes'
  },
  {
    ch: '09',
    network: 'MALL WEATHER',
    date: 'JUN 14, 1986',
    tag: 'WEATHER',
    headline: '100% CHANCE OF BIG HAIR & SYNTH POP',
    summary:
      'High-pressure Aquanet front meets warm neon mist along Ocean Drive; ideal conditions for Ferris day-offs.',
    ticker: 'RADAR FORECAST: LEG WARMERS OPTIONAL ABOVE 75°F • FOOD COURT ORANGE JULIUS AT PEAK CHILL • DRIVE-IN CLEAR TONIGHT',
    palette: { sky: '#083344', accent: '#22d3ee', glow: '#f472b6' },
    scene: 'palm'
  },
  {
    ch: '10',
    network: 'WALL ST 87',
    date: 'NOV 09, 1987',
    tag: 'MARKETS',
    headline: 'BRICK CELLPHONES RING ACROSS TRADING FLOOR',
    summary:
      'Two-pound portable phones and red power suspenders dominate Lower Manhattan while CRT tickers race.',
    ticker: 'MARKET TAPE: MOTOROLA DYNATAC BATTERY GOOD FOR 30 MINUTES • NEON ARCADE TOKENS HOLD STEADY AT 25 CENTS EACH',
    palette: { sky: '#052e16', accent: '#4ade80', glow: '#fde047' },
    scene: 'stocks'
  },
  {
    ch: '11',
    network: 'WORLDWIDE 89',
    date: 'NOV 09, 1989',
    tag: 'HISTORIC',
    headline: 'BERLIN WALL OPENS AS CROWDS CELEBRATE',
    summary:
      'Historic evening broadcast shows families reuniting atop concrete checkpoints under television floodlights worldwide.',
    ticker: 'SPECIAL REPORT: BORDERS OPEN IN BERLIN • CROWDS CHEER AT BRANDENBURG GATE • HISTORIC BROADCAST BEAMED COAST TO COAST',
    palette: { sky: '#1e293b', accent: '#fde047', glow: '#38bdf8' },
    scene: 'wall'
  }
];

function NewsChannelSceneSvg({ scene, palette }) {
  return (
    <svg
      viewBox="0 0 64 36"
      className="tm-crt-scene-svg"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect width="64" height="36" fill={palette.sky} />
      {/* Distant scan horizon */}
      <rect x="0" y="25" width="64" height="11" fill="#090d1a" />
      <rect x="0" y="25" width="64" height="1" fill={palette.glow} opacity="0.65" />

      {scene === 'mtv' && (
        <>
          <rect x="10" y="6" width="14" height="15" fill={palette.accent} />
          <rect x="13" y="9" width="8" height="9" fill="#090d1a" />
          <rect x="27" y="9" width="8" height="12" fill="#facc15" />
          <rect x="38" y="9" width="12" height="12" fill={palette.glow} />
          <rect x="42" y="12" width="4" height="9" fill="#090d1a" />
        </>
      )}

      {scene === 'shuttle' && (
        <>
          <rect x="28" y="4" width="6" height="15" fill="#f8fafc" />
          <rect x="25" y="13" width="3" height="8" fill="#cbd5e1" />
          <rect x="34" y="13" width="3" height="8" fill="#cbd5e1" />
          <rect x="29" y="19" width="4" height="6" fill="#f97316" />
          <rect x="27" y="22" width="8" height="5" fill="#fde047" />
        </>
      )}

      {scene === 'boombox' && (
        <>
          <rect x="14" y="10" width="36" height="14" fill="#334155" />
          <rect x="24" y="7" width="16" height="3" fill="#94a3b8" />
          <rect x="17" y="13" width="8" height="8" fill="#0f172a" />
          <rect x="39" y="13" width="8" height="8" fill="#0f172a" />
          <rect x="27" y="14" width="10" height="5" fill={palette.accent} />
        </>
      )}

      {scene === 'mac' && (
        <>
          <rect x="21" y="5" width="22" height="20" fill="#e7e5e4" />
          <rect x="24" y="8" width="16" height="10" fill="#0f172a" />
          <rect x="28" y="11" width="2" height="2" fill={palette.accent} />
          <rect x="34" y="11" width="2" height="2" fill={palette.accent} />
          <rect x="29" y="15" width="6" height="1" fill={palette.accent} />
          <rect x="31" y="21" width="8" height="2" fill="#44403c" />
        </>
      )}

      {scene === 'delorean' && (
        <>
          <rect x="14" y="14" width="36" height="7" fill="#cbd5e1" />
          <rect x="20" y="10" width="22" height="4" fill="#94a3b8" />
          <rect x="17" y="19" width="5" height="5" fill="#020617" />
          <rect x="42" y="19" width="5" height="5" fill="#020617" />
          <rect x="4" y="23" width="56" height="2" fill="#f97316" />
          <rect x="10" y="21" width="44" height="1" fill="#38bdf8" />
        </>
      )}

      {scene === 'satellite' && (
        <>
          <circle cx="32" cy="14" r="7" fill="none" stroke={palette.glow} strokeWidth="2" />
          <rect x="21" y="13" width="8" height="3" fill="#38bdf8" />
          <rect x="35" y="13" width="8" height="3" fill="#38bdf8" />
          <rect x="31" y="6" width="2" height="16" fill="#fde047" />
        </>
      )}

      {scene === 'nes' && (
        <>
          <rect x="14" y="11" width="36" height="12" fill="#d4d4d8" />
          <rect x="16" y="13" width="32" height="8" fill="#27272a" />
          <rect x="20" y="15" width="2" height="4" fill="#09090b" />
          <rect x="19" y="16" width="4" height="2" fill="#09090b" />
          <rect x="39" y="16" width="3" height="3" fill="#ef4444" />
          <rect x="44" y="16" width="3" height="3" fill="#ef4444" />
        </>
      )}

      {scene === 'palm' && (
        <>
          <circle cx="44" cy="11" r="6" fill="#ec4899" />
          <rect x="18" y="12" width="3" height="13" fill="#78350f" />
          <rect x="11" y="9" width="16" height="3" fill="#22d3ee" />
          <rect x="14" y="6" width="10" height="3" fill="#4ade80" />
        </>
      )}

      {scene === 'stocks' && (
        <>
          <rect x="10" y="19" width="6" height="6" fill="#4ade80" />
          <rect x="19" y="15" width="6" height="10" fill="#4ade80" />
          <rect x="28" y="17" width="6" height="8" fill="#ef4444" />
          <rect x="37" y="10" width="6" height="15" fill="#4ade80" />
          <rect x="46" y="6" width="6" height="19" fill="#fde047" />
        </>
      )}

      {scene === 'wall' && (
        <>
          <rect x="6" y="15" width="20" height="10" fill="#64748b" />
          <rect x="38" y="15" width="20" height="10" fill="#64748b" />
          <rect x="28" y="10" width="8" height="15" fill="#fde047" opacity="0.25" />
          <rect x="26" y="21" width="12" height="4" fill="#f97316" />
        </>
      )}
    </svg>
  );
}

const VintageCrtNewsTv = memo(function VintageCrtNewsTv({ compact = false }) {
  const [channelIdx, setChannelIdx] = useState(0);
  const [staticBurst, setStaticBurst] = useState(false);
  const [autoCycle, setAutoCycle] = useState(true);
  const [poppedOut, setPoppedOut] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const staticTimerRef = useRef(null);

  const dragTv = useDraggableFloating('tm_drag_crt_tv_v1', { x: 0, y: 0 });
  const bulletin = EIGHTIES_NEWS_CHANNELS[channelIdx] || EIGHTIES_NEWS_CHANNELS[0];

  useEffect(() => {
    if (!autoCycle) return undefined;
    const id = window.setInterval(() => {
      setStaticBurst(true);
      window.clearTimeout(staticTimerRef.current);
      staticTimerRef.current = window.setTimeout(() => setStaticBurst(false), 180);
      setChannelIdx((prev) => (prev + 1) % EIGHTIES_NEWS_CHANNELS.length);
    }, 15000);
    return () => window.clearInterval(id);
  }, [autoCycle]);

  useEffect(() => {
    return () => {
      window.clearTimeout(staticTimerRef.current);
    };
  }, []);

  const switchChannel = (delta) => {
    sfx.playPop?.(delta > 0 ? 2 : 1);
    setStaticBurst(true);
    window.clearTimeout(staticTimerRef.current);
    staticTimerRef.current = window.setTimeout(() => setStaticBurst(false), 180);
    setChannelIdx((prev) => {
      const next = (prev + delta + EIGHTIES_NEWS_CHANNELS.length) % EIGHTIES_NEWS_CHANNELS.length;
      return next;
    });
  };

  const handleReadNews = () => {
    const s = getSettings?.() || {};
    const voiceUri = s.aiVoiceValkyrie || 'auto';
    const script = `${bulletin.date}. Breaking news on ${bulletin.network}. ${bulletin.headline}. ${bulletin.summary}`;
    speakWithPersona(script, {
      mode: 'valkyrie',
      voiceUri,
      fromGesture: true,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false)
    });
  };

  const togglePopOut = () => {
    sfx.playToggle?.();
    setPoppedOut((p) => !p);
  };

  const tvCabinet = (
    <aside
      ref={poppedOut ? dragTv.boxRef : undefined}
      style={poppedOut ? dragTv.containerStyle : undefined}
      className={`tm-crt-tv-shell ${compact ? 'is-compact' : ''} ${poppedOut ? 'is-popped-out' : ''} ${dragTv.isDragging ? 'is-dragging' : ''}`}
      aria-label="1980s Vintage CRT Breaking News Television"
    >
      {/* Classic V rabbit ears on top */}
      <div className="tm-crt-antennas" aria-hidden="true">
        <span className="tm-crt-antenna is-left" />
        <span className="tm-crt-antenna-base" />
        <span className="tm-crt-antenna is-right" />
      </div>

      {/* Top bezel / drag handle when popped out */}
      <div
        className={`tm-crt-tv-topbar ${poppedOut ? 'is-drag-handle' : ''}`}
        {...(poppedOut ? dragTv.dragHandleProps : {})}
      >
        <div className="tm-crt-brand">
          <span className="tm-crt-rec-dot" />
          <span>TRINITRON &apos;86 • 80s NEWS DESK</span>
        </div>
        <div className="tm-crt-top-actions">
          <button
            type="button"
            className={`tm-crt-mini-btn ${autoCycle ? 'is-on' : ''}`}
            onClick={() => {
              sfx.playToggle?.();
              setAutoCycle((a) => !a);
            }}
            title="Auto-switch 80s news channels every 15s"
          >
            {autoCycle ? '⏯ Auto ON' : '⏸ Paused'}
          </button>
          <button
            type="button"
            className={`tm-crt-mini-btn ${poppedOut ? 'is-pinned' : ''}`}
            onClick={togglePopOut}
            title={poppedOut ? 'Dock TV back next to 80s Crew' : 'Pop out as a moveable TV'}
          >
            {poppedOut ? '📥 Dock TV' : '📌 Moveable TV'}
          </button>
          {poppedOut && (dragTv.offset.x !== 0 || dragTv.offset.y !== 0) && (
            <button
              type="button"
              className="tm-crt-mini-btn"
              onClick={dragTv.resetPosition}
              title="Reset floated TV position"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      <div className="tm-crt-cabinet-body">
        {/* Glass picture tube */}
        <div className={`tm-crt-glass ${staticBurst ? 'is-static' : ''}`}>
          <NewsChannelSceneSvg scene={bulletin.scene} palette={bulletin.palette} />

          <div className="tm-crt-scanlines" aria-hidden="true" />
          <div className="tm-crt-vignette" aria-hidden="true" />
          {staticBurst && <div className="tm-crt-static-snow" aria-hidden="true" />}

          {/* Green phosphor OSD top line */}
          <div className="tm-crt-osd-row">
            <span className="tm-crt-osd-ch">CH {bulletin.ch} • {bulletin.network}</span>
            <span className="tm-crt-osd-date">{bulletin.date}</span>
          </div>

          {/* Story overlay */}
          <div className="tm-crt-story-box">
            <span className="tm-crt-news-tag">{bulletin.tag}</span>
            <h4 className="tm-crt-headline">{bulletin.headline}</h4>
            <p className="tm-crt-summary">{bulletin.summary}</p>
          </div>

          {/* Scrolling lower-third ticker */}
          <div className="tm-crt-ticker-bar">
            <span className="tm-crt-ticker-label">LIVE</span>
            <div className="tm-crt-ticker-track">
              <span>{bulletin.ticker} • {bulletin.ticker}</span>
            </div>
          </div>
        </div>

        {/* Woodgrain + chrome side dial stack */}
        <div className="tm-crt-side-panel">
          <div className="tm-crt-dial-label">VHF TUNER</div>
          <div className="tm-crt-rotary-dial" aria-label="Channel dial">
            <button
              type="button"
              className="tm-crt-dial-step"
              onClick={() => switchChannel(-1)}
              title="Previous 80s Channel"
            >
              ◀ CH-
            </button>
            <div className="tm-crt-dial-knob" onClick={() => switchChannel(1)} title="Click knob for next channel">
              <span>{bulletin.ch}</span>
            </div>
            <button
              type="button"
              className="tm-crt-dial-step"
              onClick={() => switchChannel(1)}
              title="Next 80s Channel"
            >
              CH+ ▶
            </button>
          </div>

          <button
            type="button"
            className={`tm-crt-speak-btn ${speaking ? 'is-speaking' : ''}`}
            onClick={handleReadNews}
          >
            {speaking ? '🎙️ On Air...' : '🔊 Read News'}
          </button>

          <div className="tm-crt-speaker-grille" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </div>
        </div>
      </div>
    </aside>
  );

  return tvCabinet;
});

export default VintageCrtNewsTv;
