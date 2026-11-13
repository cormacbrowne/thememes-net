import { useState, useEffect, useId } from 'react';
import { sfx } from '../utils/soundEngine';
import { DELOREAN_ERAS } from '../data/deloreanEras';
import './DeLoreanTimeMachine.css';

/**
 * Crisp SVG DeLorean DMC-12 Time Machine side profile with gull-wing seam,
 * rear louvers, Mr. Fusion, glowing cyan flux bands, and twin 88 MPH flame trails.
 */
export function DeLoreanSvg({ className = '', showFlames = true, fluxActive = true }) {
  const uid = useId().replace(/:/g, '');
  const steelId = `dmcSteel-${uid}`;
  const glassId = `dmcGlass-${uid}`;
  const flameId = `dmcFlame-${uid}`;
  const fluxId = `dmcFlux-${uid}`;

  return (
    <svg
      viewBox="0 0 320 110"
      className={`tm-delorean-svg ${className}`.trim()}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={steelId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="45%" stopColor="#94a3b8" />
          <stop offset="75%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={glassId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id={flameId} x1="100%" y1="50%" x2="0%" y2="50%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#f97316" />
          <stop offset="75%" stopColor="#ef4444" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={fluxId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#00f3ff" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* Twin 88 MPH Flame Trails behind rear tires */}
      {showFlames && (
        <g className="tm-delorean-flames">
          <path d="M 88 86 Q 40 82 4 88 Q 38 94 88 94 Z" fill={`url(#${flameId})`} />
          <path d="M 84 95 Q 46 93 14 98 Q 48 102 84 101 Z" fill={`url(#${flameId})`} opacity="0.8" />
        </g>
      )}

      {/* Neon Underbody Hover Glow */}
      <ellipse
        cx="192"
        cy="96"
        rx="108"
        ry="7"
        fill={fluxActive ? '#00f3ff' : '#38bdf8'}
        opacity={fluxActive ? 0.35 : 0.18}
      />

      {/* Mr. Fusion & Rear Plutonium Reactor Deck */}
      <rect x="86" y="34" width="24" height="14" rx="3" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="92" y="24" width="12" height="11" rx="2" fill="#e2e8f0" stroke="#38bdf8" strokeWidth="1.2" />
      <rect x="95" y="20" width="6" height="5" rx="1" fill="#00f3ff" />
      {/* Rear exhaust vents */}
      <polygon points="72,56 96,46 112,48 96,62" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />

      {/* Main Brushed Stainless Steel DMC-12 Wedge Body */}
      <path
        d="M 80 64 L 112 46 L 156 28 L 210 28 L 252 47 L 298 56 L 304 68 L 298 80 L 82 80 L 74 72 Z"
        fill={`url(#${steelId})`}
        stroke="#e2e8f0"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Iconic Side Rub-Strip & Gull-Wing Door Seam */}
      <line x1="94" y1="64" x2="296" y2="64" stroke="#0f172a" strokeWidth="2.5" />
      <path d="M 164 31 L 160 78 M 224 31 L 230 78" stroke="#334155" strokeWidth="1.5" fill="none" />

      {/* Rear Window Louvers */}
      <g stroke="#334155" strokeWidth="2">
        <line x1="120" y1="44" x2="152" y2="32" />
        <line x1="126" y1="47" x2="155" y2="36" />
        <line x1="133" y1="49" x2="158" y2="40" />
      </g>

      {/* Cabin Windows */}
      <polygon
        points="162,32 208,32 242,48 160,48"
        fill={`url(#${glassId})`}
        stroke="#00f3ff"
        strokeWidth="1.2"
      />
      {/* Glowing Flux Capacitor Spark inside cabin */}
      {fluxActive && (
        <path
          d="M 183 36 L 188 41 L 193 36 M 188 41 L 188 46"
          stroke="#fde047"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Flux Band / Cyan Time-Coil Wiring around bumper & rocker */}
      <path
        d="M 82 72 L 106 72 M 256 71 L 302 68 M 112 48 L 154 30"
        stroke={`url(#${fluxId})`}
        strokeWidth={fluxActive ? '3' : '1.8'}
        strokeLinecap="round"
        fill="none"
      />

      {/* Headlight & Taillight Glow */}
      <polygon points="294,57 305,59 305,65 294,65" fill="#fef08a" />
      <polygon points="305,59 320,54 320,68 305,65" fill="#fef08a" opacity="0.28" />
      <rect x="76" y="61" width="7" height="7" rx="1" fill="#ef4444" />

      {/* Front & Rear Wheel Arches + Turbine Wheels */}
      {[124, 256].map((wx) => (
        <g key={wx} className="tm-delorean-wheel">
          <circle cx={wx} cy="80" r="18" fill="#090d16" stroke="#334155" strokeWidth="2" />
          <circle cx={wx} cy="80" r="11" fill="#94a3b8" stroke="#00f3ff" strokeWidth="1.6" />
          <circle cx={wx} cy="80" r="4" fill="#facc15" />
          <line x1={wx - 9} y1="80" x2={wx + 9} y2="80" stroke="#0f172a" strokeWidth="1.5" />
          <line x1={wx} y1="71" x2={wx} y2="89" stroke="#0f172a" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

function DeLoreanFlybyLayer({ eraLabel }) {
  const [mph, setMph] = useState(12);

  useEffect(() => {
    const iv = setInterval(() => {
      setMph((prev) => {
        const next = Math.min(88, prev + 11);
        if (next >= 88) clearInterval(iv);
        return next;
      });
    }, 65);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="tm-delorean-flyby-layer" aria-hidden="true">
      <div className="tm-delorean-flux-flash" />
      <div className="tm-delorean-tire-tracks" />
      <div className="tm-delorean-speed-hud">
        <span className="tm-delorean-mph">{String(mph).padStart(2, '0')} MPH</span>
        <span className="tm-delorean-hud-tag">⚡ {eraLabel || '1.21 GIGAWATTS!'}</span>
      </div>
      <div className="tm-delorean-car-runner">
        <DeLoreanSvg showFlames fluxActive />
      </div>
    </div>
  );
}

/**
 * Global DeLorean 88 MPH Flyby Animation + Time Circuits Modal.
 */
export function DeLoreanTimeWarpStage({
  flybyEvent,
  activeEra,
  modalOpen,
  onCloseModal,
  onTriggerWarp,
  bonusClaimedToday = false
}) {
  const activeEraObj = DELOREAN_ERAS.find((e) => e.id === activeEra) || DELOREAN_ERAS[3];

  return (
    <>
      {/* 1. Full-width 88 MPH Flyby Overlay (non-blocking, overflow-hidden) */}
      {flybyEvent && (
        <DeLoreanFlybyLayer key={flybyEvent.id} eraLabel={flybyEvent.eraLabel} />
      )}

      {/* 2. Interactive Time Circuits Console Modal */}
      {modalOpen && (
        <div
          className="tm-modal-backdrop tm-delorean-modal-backdrop"
          onClick={onCloseModal}
          role="dialog"
          aria-modal="true"
          aria-label="DeLorean Time Circuits Console"
        >
          <div
            className="tm-modal-card tm-delorean-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tm-delorean-modal-head">
              <div>
                <div className="tm-delorean-kicker">🚗⚡ DMC-12 TIME MACHINE • OUTATIME</div>
                <h2 className="tm-delorean-modal-title">TIME CIRCUITS &amp; FLUX CAPACITOR</h2>
              </div>
              <button
                type="button"
                className="tm-close-btn"
                onClick={() => {
                  sfx.playToggle?.();
                  onCloseModal();
                }}
                aria-label="Close Time Circuits"
              >
                ✕
              </button>
            </div>

            <div className="tm-delorean-showcase">
              <div className="tm-flux-capacitor-box" aria-hidden="true">
                <div className="tm-flux-y">
                  <span className="tm-flux-arm a1" />
                  <span className="tm-flux-arm a2" />
                  <span className="tm-flux-arm a3" />
                  <span className="tm-flux-core" />
                </div>
                <span className="tm-flux-label">1.21 GW</span>
              </div>
              <div className="tm-delorean-showcase-car">
                <DeLoreanSvg showFlames fluxActive />
              </div>
            </div>

            {/* Classic 3-Row LED Time Circuits Display */}
            <div className="tm-time-circuits-panel">
              <div className="tm-tc-row dest">
                <span className="tm-tc-tag">DESTINATION TIME</span>
                <span className="tm-tc-led">{activeEraObj.dateLabel}</span>
                <span className="tm-tc-led">{activeEraObj.timeLabel}</span>
              </div>
              <div className="tm-tc-row present">
                <span className="tm-tc-tag">PRESENT TIME</span>
                <span className="tm-tc-led">NOV 13 2026</span>
                <span className="tm-tc-led">THEMEMES</span>
              </div>
              <div className="tm-tc-row departed">
                <span className="tm-tc-tag">FLUX BONUS</span>
                <span className="tm-tc-led">
                  {bonusClaimedToday ? 'CHARGED TODAY' : '+5 TOKENS READY'}
                </span>
                <span className="tm-tc-led">88 MPH</span>
              </div>
            </div>

            <div className="tm-delorean-era-grid">
              {DELOREAN_ERAS.map((era) => {
                const isSelected = activeEra === era.id;
                return (
                  <button
                    key={era.id}
                    type="button"
                    className={`tm-delorean-era-btn ${isSelected ? 'active' : ''}`}
                    style={{ '--era-accent': era.accent }}
                    onClick={() => onTriggerWarp(era.id)}
                  >
                    <span className="tm-era-badge">{era.badge}</span>
                    <strong className="tm-era-title">{era.title}</strong>
                    <span className="tm-era-desc">{era.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="tm-delorean-modal-foot">
              <button
                type="button"
                className="tm-btn tm-btn-primary tm-delorean-warp-cta"
                onClick={() => onTriggerWarp(activeEra === 'present' ? '1985' : activeEra)}
              >
                ⚡ HIT 88 MPH TIME WARP!{!bonusClaimedToday ? ' (+5 🪙)' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Compact interactive DeLorean DMC-12 Banner / Strip for Arcade Lobby & Feed.
 */
export function DeLoreanDockBanner({ activeEra, onOpenModal, onQuickWarp }) {
  const eraObj = DELOREAN_ERAS.find((e) => e.id === activeEra);
  return (
    <div className="tm-delorean-banner" role="region" aria-label="DeLorean DMC-12 Time Machine">
      <button
        type="button"
        className="tm-delorean-banner-car-btn"
        onClick={() => onQuickWarp?.(activeEra === 'present' ? '1985' : activeEra)}
        title="Tap the DeLorean to hit 88 MPH!"
      >
        <DeLoreanSvg className="tm-delorean-mini-svg" showFlames={false} fluxActive />
      </button>
      <div className="tm-delorean-banner-copy">
        <div className="tm-delorean-banner-eyebrow">
          ⚡ DMC-12 TIME MACHINE {activeEra !== 'present' && eraObj ? `• ${eraObj.badge} ACTIVE` : '• PARKED IN THE ARCADE'}
        </div>
        <div className="tm-delorean-banner-title">
          Hit <strong>88 MPH</strong> to Time-Warp the Site &amp; Charge the Flux Capacitor
        </div>
      </div>
      <div className="tm-delorean-banner-actions">
        <button
          type="button"
          className="tm-btn tm-btn-primary tm-delorean-pill-btn"
          onClick={() => onQuickWarp?.(activeEra === 'present' ? '1985' : activeEra)}
        >
          ⚡ 88 MPH!
        </button>
        <button
          type="button"
          className="tm-btn tm-delorean-pill-btn secondary"
          onClick={onOpenModal}
        >
          🕰️ Time Circuits
        </button>
      </div>
    </div>
  );
}
