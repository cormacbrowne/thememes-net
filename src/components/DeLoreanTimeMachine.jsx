import { useState, useEffect, useId } from 'react';
import { sfx } from '../utils/soundEngine';
import { DELOREAN_ERAS, EIGHTIES_CARS } from '../data/deloreanEras';
import './DeLoreanTimeMachine.css';

/**
 * Distinct SVG side-profiles for our 1980s iconic garage:
 * DeLorean DMC-12, Aston Martin Lagonda, Ford Sierra RS Cosworth & Porsche 911 SC.
 */
export function EightiesCarSvg({
  carId = 'delorean',
  className = '',
  showFlames = true,
  fluxActive = true
}) {
  const uid = useId().replace(/:/g, '');
  const flameId = `carFlame-${uid}`;
  const steelId = `carSteel-${uid}`;
  const glassId = `carGlass-${uid}`;
  const fluxId = `carFlux-${uid}`;

  if (carId === 'lagonda') {
    // 1982 Aston Martin Lagonda — Ultra-long origami wedge saloon with green CRT digital glow
    return (
      <svg viewBox="0 0 320 110" className={`tm-delorean-svg ${className}`.trim()} aria-hidden="true">
        <defs>
          <linearGradient id={steelId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a3a" />
            <stop offset="48%" stopColor="#0f2928" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id={flameId} x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0" />
          </linearGradient>
        </defs>
        {showFlames && (
          <path d="M 66 86 Q 28 82 2 88 Q 30 94 66 93 Z" fill={`url(#${flameId})`} className="tm-delorean-flames" />
        )}
        <ellipse cx="182" cy="96" rx="122" ry="7" fill="#4ade80" opacity={fluxActive ? 0.32 : 0.16} />
        {/* Long angular Lagonda 4-door wedge */}
        <path
          d="M 48 64 L 64 52 L 122 31 L 194 31 L 236 50 L 306 58 L 309 69 L 300 79 L 52 79 Z"
          fill={`url(#${steelId})`}
          stroke="#4ade80"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <polygon points="126,35 190,35 224,50 116,50" fill="#061217" stroke="#34d399" strokeWidth="1.2" />
        <line x1="158" y1="35" x2="158" y2="77" stroke="#065f46" strokeWidth="1.8" />
        {/* Pop-up quad headlamps & crisp gold coachline */}
        <line x1="56" y1="63" x2="305" y2="63" stroke="#facc15" strokeWidth="1.6" />
        <polygon points="295,58 308,60 308,66 295,66" fill="#fef08a" />
        <polygon points="308,60 320,55 320,69 308,66" fill="#fde047" opacity="0.3" />
        <rect x="49" y="61" width="9" height="6" rx="1" fill="#ef4444" />
        {[106, 256].map((wx) => (
          <g key={wx}>
            <circle cx={wx} cy="80" r="17" fill="#090d16" stroke="#334155" strokeWidth="2" />
            <circle cx={wx} cy="80" r="10.5" fill="#d1d5db" stroke="#4ade80" strokeWidth="1.5" />
            <circle cx={wx} cy="80" r="4" fill="#facc15" />
          </g>
        ))}
      </svg>
    );
  }

  if (carId === 'cosworth') {
    // 1986 Ford Sierra RS Cosworth — Signature huge upright whale-tail wing & turbo blue stripes
    return (
      <svg viewBox="0 0 320 110" className={`tm-delorean-svg ${className}`.trim()} aria-hidden="true">
        <defs>
          <linearGradient id={steelId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="55%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id={flameId} x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="45%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {showFlames && (
          <path d="M 76 86 Q 36 80 4 88 Q 36 96 76 93 Z" fill={`url(#${flameId})`} className="tm-delorean-flames" />
        )}
        <ellipse cx="186" cy="96" rx="112" ry="7" fill="#38bdf8" opacity={fluxActive ? 0.38 : 0.18} />
        {/* Massive Sierra RS Cosworth Whale-Tail Wing */}
        <path
          d="M 52 24 L 96 24 L 106 38 L 86 52 L 64 52 L 62 38 Z"
          fill="#0f172a"
          stroke="#38bdf8"
          strokeWidth="1.6"
        />
        {/* 3-door Sierra Fastback Shell */}
        <path
          d="M 74 64 L 84 48 L 136 28 L 204 28 L 246 47 L 298 55 L 304 68 L 298 80 L 74 80 Z"
          fill={`url(#${steelId})`}
          stroke="#38bdf8"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <polygon points="140,32 200,32 238,48 122,48" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
        {/* Ford Motorsport Blue/Red Stripe */}
        <rect x="78" y="64" width="222" height="4" fill="#2563eb" />
        <rect x="78" y="68" width="222" height="2" fill="#ef4444" />
        <polygon points="292,57 305,59 305,65 292,65" fill="#fef08a" />
        <rect x="73" y="60" width="8" height="7" rx="1" fill="#ef4444" />
        {[120, 256].map((wx) => (
          <g key={wx}>
            <circle cx={wx} cy="80" r="18" fill="#090d16" stroke="#334155" strokeWidth="2" />
            <circle cx={wx} cy="80" r="11" fill="#e2e8f0" stroke="#38bdf8" strokeWidth="1.6" />
            <circle cx={wx} cy="80" r="4" fill="#ef4444" />
          </g>
        ))}
      </svg>
    );
  }

  if (carId === 'porsche911') {
    // 1984 Porsche 911 Carrera / 930 Turbo — Guards Red iconic flyline fastback, whale-tail & Fuchs alloys
    return (
      <svg viewBox="0 0 320 110" className={`tm-delorean-svg ${className}`.trim()} aria-hidden="true">
        <defs>
          <linearGradient id={steelId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff4d6d" />
            <stop offset="42%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id={flameId} x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="45%" stopColor="#ff2a85" />
            <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {showFlames && (
          <path d="M 76 84 Q 36 78 6 86 Q 38 94 76 91 Z" fill={`url(#${flameId})`} className="tm-delorean-flames" />
        )}
        {/* Underglow shadow */}
        <ellipse cx="185" cy="97" rx="112" ry="6.5" fill="#ff2a85" opacity={fluxActive ? 0.36 : 0.2} />
        {/* Dual Chrome Rear Exhaust Tips */}
        <rect x="61" y="76" width="14" height="3.2" rx="1.4" fill="#cbd5e1" stroke="#475569" strokeWidth="0.7" />
        <rect x="64" y="80" width="12" height="2.8" rx="1.2" fill="#94a3b8" />
        {/* Iconic 930 Tea-Tray / Whale-Tail Spoiler (Red tray + thick black rubber lip) */}
        <path d="M 67 44 L 112 46 L 106 54 L 74 54 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" />
        <path d="M 63 39 Q 66 37 72 41 L 116 44 L 113 48 L 64 45 Z" fill="#090d16" stroke="#334155" strokeWidth="1" />
        {/* Low Flat Hood Line (behind raised cannon front fender) */}
        <path d="M 212 48 Q 252 49 294 59 L 296 68 L 212 68 Z" fill="#991b1b" />
        {/* Main Iconic 911 Flyline Body & Fastback Roofline */}
        <path
          d="M 73 76 L 71 60 C 74 52 88 50 108 48 C 128 38 144 25 170 24.5 C 188 24.5 203 33 218 48 C 242 48 272 48 294 57 C 299 60 301 66 300 76 L 274 78 A 22 22 0 0 0 230 78 L 136 78 A 22 22 0 0 0 92 78 Z"
          fill={`url(#${steelId})`}
          stroke="#fca5a5"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Raised Front Cannon Fender Ridge */}
        <path d="M 216 51 C 244 47 272 48 293 57" fill="none" stroke="#fecaca" strokeWidth="1.4" opacity="0.75" />
        {/* Signature 911 Teardrop Side Windows + Black B-Pillar */}
        <path d="M 118 47 C 134 36 150 28 168 27.5 L 168 47 Z" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.1" />
        <path d="M 172 27.5 C 188 28 202 35 215 47.5 L 172 47.5 Z" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.1" />
        <rect x="167.5" y="27" width="4" height="21" fill="#1e293b" />
        {/* Wing Mirror Flag */}
        <path d="M 199 47 L 207 43 L 210 47 Z" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.9" />
        {/* Door Handle & Panel Seam */}
        <path d="M 148 48 L 144 74" stroke="#7f1d1d" strokeWidth="1.1" opacity="0.7" />
        <path d="M 212 49 L 211 75" stroke="#7f1d1d" strokeWidth="1.1" opacity="0.7" />
        <rect x="155" y="55" width="11" height="2.6" rx="1" fill="#090d16" stroke="#cbd5e1" strokeWidth="0.6" />
        {/* Black 930 Turbo Shark-Fin Stone Guard ahead of Rear Wheel Arch */}
        <path d="M 136 75 L 147 59 C 150 65 149 72 146 76 Z" fill="#090d16" opacity="0.92" />
        {/* Lower Black Sill Rocker & CARRERA Side Stripe */}
        <rect x="136" y="71" width="94" height="2.4" fill="#090d16" opacity="0.88" />
        <text x="164" y="69.5" fill="#090d16" fontSize="5.4" fontWeight="900" fontFamily="Impact, sans-serif" letterSpacing="1.2">
          CARRERA
        </text>
        {/* Tilted Frog-Eye Headlight Bezel & Beam */}
        <ellipse
          cx="291"
          cy="56.5"
          rx="5.2"
          ry="7.4"
          transform="rotate(-24 291 56.5)"
          fill="#fef08a"
          stroke="#e2e8f0"
          strokeWidth="1.8"
        />
        <polygon points="295,52 320,45 320,68 295,62" fill="#fef08a" opacity="0.24" />
        {/* Red Taillight Lens & Amber Front Indicator */}
        <rect x="70" y="56" width="8" height="6" rx="1.2" fill="#ef4444" stroke="#fecaca" strokeWidth="0.8" />
        <rect x="286" y="64.5" width="9" height="4" rx="1" fill="#f97316" stroke="#fde047" strokeWidth="0.6" />
        {/* 1984 Accordion Impact Bumpers (Front & Rear) + Chin Spoiler */}
        <rect x="69" y="64" width="14" height="7" rx="1.5" fill="#090d16" stroke="#334155" strokeWidth="0.9" />
        <rect x="285" y="68" width="17" height="6.5" rx="1.5" fill="#090d16" stroke="#334155" strokeWidth="0.9" />
        <path d="M 271 78 L 299 77 L 296 82 L 272 82 Z" fill="#090d16" />
        {/* Authentic 5-Petal Black/Silver Fuchs Alloy Wheels */}
        {[114, 252].map((wx) => (
          <g key={wx} transform={`translate(${wx}, 80)`}>
            <circle cx="0" cy="0" r="17.5" fill="#090d16" stroke="#334155" strokeWidth="2" />
            <circle cx="0" cy="0" r="12.2" fill="#111827" stroke="#e2e8f0" strokeWidth="2.3" />
            {/* 5 Fuchs Petals */}
            {[0, 72, 144, 216, 288].map((deg) => (
              <polygon
                key={deg}
                points="-2.1,-2.5 2.1,-2.5 3.1,-10.2 -3.1,-10.2"
                fill="#e2e8f0"
                transform={`rotate(${deg})`}
              />
            ))}
            <circle cx="0" cy="0" r="3.2" fill="#090d16" stroke="#facc15" strokeWidth="1.2" />
          </g>
        ))}
      </svg>
    );
  }

  // Default: 1981 DeLorean DMC-12 Time Machine
  return (
    <svg viewBox="0 0 320 110" className={`tm-delorean-svg ${className}`.trim()} aria-hidden="true">
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

      {showFlames && (
        <g className="tm-delorean-flames">
          <path d="M 88 86 Q 40 82 4 88 Q 38 94 88 94 Z" fill={`url(#${flameId})`} />
          <path d="M 84 95 Q 46 93 14 98 Q 48 102 84 101 Z" fill={`url(#${flameId})`} opacity="0.8" />
        </g>
      )}

      <ellipse cx="192" cy="96" rx="108" ry="7" fill={fluxActive ? '#00f3ff' : '#38bdf8'} opacity={fluxActive ? 0.35 : 0.18} />
      <rect x="86" y="34" width="24" height="14" rx="3" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="92" y="24" width="12" height="11" rx="2" fill="#e2e8f0" stroke="#38bdf8" strokeWidth="1.2" />
      <rect x="95" y="20" width="6" height="5" rx="1" fill="#00f3ff" />
      <polygon points="72,56 96,46 112,48 96,62" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />

      <path
        d="M 80 64 L 112 46 L 156 28 L 210 28 L 252 47 L 298 56 L 304 68 L 298 80 L 82 80 L 74 72 Z"
        fill={`url(#${steelId})`}
        stroke="#e2e8f0"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      <line x1="94" y1="64" x2="296" y2="64" stroke="#0f172a" strokeWidth="2.5" />
      <path d="M 164 31 L 160 78 M 224 31 L 230 78" stroke="#334155" strokeWidth="1.5" fill="none" />

      <g stroke="#334155" strokeWidth="2">
        <line x1="120" y1="44" x2="152" y2="32" />
        <line x1="126" y1="47" x2="155" y2="36" />
        <line x1="133" y1="49" x2="158" y2="40" />
      </g>

      <polygon points="162,32 208,32 242,48 160,48" fill={`url(#${glassId})`} stroke="#00f3ff" strokeWidth="1.2" />
      {fluxActive && (
        <path
          d="M 183 36 L 188 41 L 193 36 M 188 41 L 188 46"
          stroke="#fde047"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )}

      <path
        d="M 82 72 L 106 72 M 256 71 L 302 68 M 112 48 L 154 30"
        stroke={`url(#${fluxId})`}
        strokeWidth={fluxActive ? '3' : '1.8'}
        strokeLinecap="round"
        fill="none"
      />

      <polygon points="294,57 305,59 305,65 294,65" fill="#fef08a" />
      <polygon points="305,59 320,54 320,68 305,65" fill="#fef08a" opacity="0.28" />
      <rect x="76" y="61" width="7" height="7" rx="1" fill="#ef4444" />

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

export function DeLoreanSvg(props) {
  return <EightiesCarSvg {...props} />;
}

function DeLoreanFlybyLayer({ eraLabel, carId = 'delorean' }) {
  const carObj = EIGHTIES_CARS.find((c) => c.id === carId) || EIGHTIES_CARS[0];
  const targetSpeed = carObj.topSpeedMph || 88;
  const [mph, setMph] = useState(14);

  useEffect(() => {
    const iv = setInterval(() => {
      setMph((prev) => {
        const step = Math.max(8, Math.ceil(targetSpeed / 7));
        const next = Math.min(targetSpeed, prev + step);
        if (next >= targetSpeed) clearInterval(iv);
        return next;
      });
    }, 65);
    return () => clearInterval(iv);
  }, [targetSpeed]);

  return (
    <div className="tm-delorean-flyby-layer" aria-hidden="true">
      <div className="tm-delorean-flux-flash" />
      <div className="tm-delorean-tire-tracks" />
      <div className="tm-delorean-speed-hud" style={{ borderColor: carObj.accent }}>
        <span className="tm-delorean-mph">{String(mph).padStart(2, '0')} MPH</span>
        <span className="tm-delorean-hud-tag">
          ⚡ {carObj.shortName.toUpperCase()} • {eraLabel || '80s TURBO WARP!'}
        </span>
      </div>
      <div className="tm-delorean-car-runner">
        <EightiesCarSvg carId={carId} showFlames fluxActive />
      </div>
    </div>
  );
}

/**
 * Global 80s Cars Flyby Animation + Garage & Time Circuits Modal.
 */
export function DeLoreanTimeWarpStage({
  flybyEvent,
  activeEra,
  activeCarId = 'delorean',
  onSelectCar,
  modalOpen,
  onCloseModal,
  onTriggerWarp,
  bonusClaimedToday = false
}) {
  const activeEraObj = DELOREAN_ERAS.find((e) => e.id === activeEra) || DELOREAN_ERAS[3];
  const activeCar = EIGHTIES_CARS.find((c) => c.id === activeCarId) || EIGHTIES_CARS[0];

  return (
    <>
      {flybyEvent && (
        <DeLoreanFlybyLayer
          key={flybyEvent.id}
          eraLabel={flybyEvent.eraLabel}
          carId={flybyEvent.carId || activeCarId}
        />
      )}

      {modalOpen && (
        <div
          className="tm-modal-backdrop tm-delorean-modal-backdrop"
          onClick={onCloseModal}
          role="dialog"
          aria-modal="true"
          aria-label="80s Iconic Cars & Time Circuits Console"
        >
          <div className="tm-modal-card tm-delorean-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-delorean-modal-head">
              <div>
                <div className="tm-delorean-kicker">
                  🚗⚡ 80s GARAGE FLEET • {activeCar.plate}
                </div>
                <h2 className="tm-delorean-modal-title">80s CARS &amp; TIME CIRCUITS</h2>
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
                ✕ Close
              </button>
            </div>

            {/* 80s Iconic Cars Garage Selector */}
            <div className="tm-80s-car-picker" role="tablist" aria-label="Select 1980s Hero Car">
              {EIGHTIES_CARS.map((car) => (
                <button
                  key={car.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCar.id === car.id}
                  className={`tm-80s-car-tab ${activeCar.id === car.id ? 'active' : ''}`}
                  style={{ '--car-accent': car.accent }}
                  onClick={() => {
                    sfx.playToggle?.();
                    onSelectCar?.(car.id);
                  }}
                >
                  <strong>{car.shortName}</strong>
                  <span>{car.topSpeedMph} MPH</span>
                </button>
              ))}
            </div>

            <div className="tm-delorean-showcase">
              <div className="tm-flux-capacitor-box" aria-hidden="true">
                <div className="tm-flux-y">
                  <span className="tm-flux-arm a1" />
                  <span className="tm-flux-arm a2" />
                  <span className="tm-flux-arm a3" />
                  <span className="tm-flux-core" />
                </div>
                <span className="tm-flux-label">{activeCar.topSpeedMph} MPH</span>
              </div>
              <div className="tm-delorean-showcase-car">
                <EightiesCarSvg carId={activeCar.id} showFlames fluxActive />
                <div className="tm-80s-car-caption">
                  <strong>{activeCar.name}</strong> — {activeCar.tagline}
                </div>
              </div>
            </div>

            <div className="tm-time-circuits-panel">
              <div className="tm-tc-row dest">
                <span className="tm-tc-tag">DESTINATION TIME</span>
                <span className="tm-tc-led">{activeEraObj.dateLabel}</span>
                <span className="tm-tc-led">{activeEraObj.timeLabel}</span>
              </div>
              <div className="tm-tc-row present">
                <span className="tm-tc-tag">ACTIVE GARAGE RIDE</span>
                <span className="tm-tc-led">{activeCar.name.toUpperCase()}</span>
                <span className="tm-tc-led">{activeCar.plate}</span>
              </div>
              <div className="tm-tc-row departed">
                <span className="tm-tc-tag">FLUX BONUS</span>
                <span className="tm-tc-led">
                  {bonusClaimedToday ? 'CHARGED TODAY' : '+M$5 MEMEDOLLARZ'}
                </span>
                <span className="tm-tc-led">{activeCar.topSpeedMph} MPH</span>
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
                    onClick={() => onTriggerWarp(era.id, activeCar.id)}
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
                onClick={() => onTriggerWarp(activeEra === 'present' ? '1985' : activeEra, activeCar.id)}
              >
                ⚡ DRIVE {activeCar.shortName.toUpperCase()} TO {activeCar.topSpeedMph} MPH!
                {!bonusClaimedToday ? ' (+M$5)' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Interactive 80s Iconic Cars Garage Banner for Arcade Lobby & Home Feed.
 */
export function DeLoreanDockBanner({
  activeEra,
  activeCarId = 'delorean',
  onSelectCar,
  onOpenModal,
  onQuickWarp
}) {
  const eraObj = DELOREAN_ERAS.find((e) => e.id === activeEra);
  const activeCar = EIGHTIES_CARS.find((c) => c.id === activeCarId) || EIGHTIES_CARS[0];

  return (
    <div className="tm-delorean-banner" role="region" aria-label="80s Iconic Cars Time Machine Garage">
      <button
        type="button"
        className="tm-delorean-banner-car-btn"
        onClick={() => onQuickWarp?.(activeEra === 'present' ? activeCar.defaultEra : activeEra, activeCar.id)}
        title={`Tap the ${activeCar.name} to hit ${activeCar.topSpeedMph} MPH!`}
      >
        <EightiesCarSvg carId={activeCar.id} className="tm-delorean-mini-svg" showFlames={false} fluxActive />
      </button>

      <div className="tm-delorean-banner-copy">
        <div className="tm-delorean-banner-eyebrow">
          ⚡ 80s GARAGE: {activeCar.name} {activeEra !== 'present' && eraObj ? `• ${eraObj.badge}` : ''}
        </div>
        <div className="tm-delorean-banner-title">
          Pick an 80s legend to cruise &amp; warp ({activeCar.tagline})
        </div>
        <div className="tm-80s-banner-car-strip" role="group" aria-label="Switch 80s Car">
          {EIGHTIES_CARS.map((car) => (
            <button
              key={car.id}
              type="button"
              className={`tm-80s-car-chip ${activeCar.id === car.id ? 'active' : ''}`}
              style={{ '--car-accent': car.accent }}
              onClick={() => {
                onSelectCar?.(car.id);
                onQuickWarp?.(activeEra === 'present' ? car.defaultEra : activeEra, car.id);
              }}
              title={`Cruise in the ${car.name}`}
            >
              🚗 {car.shortName}
            </button>
          ))}
        </div>
      </div>

      <div className="tm-delorean-banner-actions">
        <button
          type="button"
          className="tm-btn tm-btn-primary tm-delorean-pill-btn"
          onClick={() => onQuickWarp?.(activeEra === 'present' ? activeCar.defaultEra : activeEra, activeCar.id)}
        >
          ⚡ {activeCar.topSpeedMph} MPH!
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
