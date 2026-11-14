import { useState } from 'react';
import { triggerHelicopterFlyby } from '../utils/winCelebration';
import { formatEightiesPrice } from '../utils/tokenEconomy';
import { sfx } from '../utils/soundEngine';
import './EightiesIconsStrip.css';

const EIGHTIES_ICON_CAST = [
  {
    id: 'bender',
    name: 'Bender',
    fullName: 'John Bender',
    movie: 'The Breakfast Club (1985)',
    role: 'The Criminal',
    quote: "Does Barry Manilow know that you raid his wardrobe?",
    priceTokens: 5,
    item80s: 'Flannel & Fingerless Gloves',
    bg: '#450a0a',
    accent: '#ef4444'
  },
  {
    id: 'claire',
    name: 'Claire',
    fullName: 'Claire Standish',
    movie: 'The Breakfast Club (1985)',
    role: 'The Princess',
    quote: "Saturday detention never stopped diamond earrings.",
    priceTokens: 15,
    item80s: 'Shermer Mall Sushi Box',
    bg: '#500724',
    accent: '#ec4899'
  },
  {
    id: 'allison',
    name: 'Allison',
    fullName: 'Allison Reynolds',
    movie: 'The Breakfast Club (1985)',
    role: 'The Basket Case',
    quote: "When you grow up, your heart dies — good thing memes are eternal.",
    priceTokens: 2,
    item80s: 'Cap’n Crunch Sandwich',
    bg: '#1e1b4b',
    accent: '#a855f7'
  },
  {
    id: 'brian',
    name: 'Brian',
    fullName: 'Brian Johnson',
    movie: 'The Breakfast Club (1985)',
    role: 'The Brain',
    quote: "Sincere calculations show the casino house edge is undefeated.",
    priceTokens: 3,
    item80s: 'Physics Lab Quarter Pack',
    bg: '#052e16',
    accent: '#4ade80'
  },
  {
    id: 'andrew',
    name: 'Andrew',
    fullName: 'Andrew Clark',
    movie: 'The Breakfast Club (1985)',
    role: 'The Athlete',
    quote: "Don’t mess with the bull, young man — you’ll get the horns.",
    priceTokens: 8,
    item80s: 'Varsity Letterman Patch',
    bg: '#172554',
    accent: '#38bdf8'
  },
  {
    id: 'ferris',
    name: 'Ferris',
    fullName: 'Ferris Bueller',
    movie: "Ferris Bueller's Day Off (1986)",
    role: 'Day-Off Legend',
    quote: "Life moves pretty fast. If you don't spin once in a while, you miss it.",
    priceTokens: 14,
    item80s: 'Matinee Ticket & Hot Dog',
    bg: '#3f2c12',
    accent: '#facc15'
  },
  {
    id: 'cameron',
    name: 'Cameron',
    fullName: 'Cameron Frye',
    movie: "Ferris Bueller's Day Off (1986)",
    role: 'Co-Pilot',
    quote: "I am NOT putting another mile on my dad's 1961 GT California!",
    priceTokens: 10,
    item80s: '#9 Red Wings Jersey',
    bg: '#450a0a',
    accent: '#f87171'
  },
  {
    id: 'marty',
    name: 'Marty',
    fullName: 'Marty McFly',
    movie: 'Back to the Future (1985)',
    role: '88 MPH Racer',
    quote: "Wait a minute, Doc — are you telling me 1 Token is still 25¢?",
    priceTokens: 1,
    item80s: 'Hill Valley Pepsi Free',
    bg: '#431407',
    accent: '#fb923c'
  },
  {
    id: 'doc',
    name: 'Doc Brown',
    fullName: 'Dr. Emmett Brown',
    movie: 'Back to the Future (1985)',
    role: 'Flux Inventor',
    quote: "Great Scott! 1.21 gigawatts straight into the Neon Slots!",
    priceTokens: 20,
    item80s: 'Twin Pines RadioShack Diode',
    bg: '#0f172a',
    accent: '#22d3ee'
  },
  {
    id: 'crockett',
    name: 'Crockett',
    fullName: 'Sonny Crockett',
    movie: 'Miami Vice (1984)',
    role: 'Vice Detective',
    quote: "Pastel blazer pressed, Wayfarers on, cassette cranked to 11.",
    priceTokens: 25,
    item80s: 'Ocean Drive Espresso & Shades',
    bg: '#083344',
    accent: '#00f3ff'
  },
  {
    id: 'mrt',
    name: 'B.A.',
    fullName: 'B.A. Baracus (Mr. T)',
    movie: 'The A-Team (1983)',
    role: 'Heavy Muscle',
    quote: "I pity the fool who bets the rent on a single roulette spin!",
    priceTokens: 16,
    item80s: '1983 Gold Chain Starter',
    bg: '#27272a',
    accent: '#eab308'
  },
  {
    id: 'maverick',
    name: 'Maverick',
    fullName: 'Pete "Maverick" Mitchell',
    movie: 'Top Gun (1986)',
    role: 'Mach-2 Ace',
    quote: "I feel the need... the need for 80s arcade speed!",
    priceTokens: 12,
    item80s: 'Miramar Aviator Polarized Specs',
    bg: '#1a2e05',
    accent: '#a3e635'
  },
  {
    id: 'hawke',
    name: 'Hawke',
    fullName: 'Stringfellow Hawke',
    movie: 'Airwolf (1984)',
    role: 'Stealth Pilot',
    quote: "Turbos armed. Scramble Airwolf or Blue Thunder on the double!",
    priceTokens: 25,
    item80s: 'Santini Air Fuel Voucher',
    bg: '#020617',
    accent: '#38bdf8'
  }
];

/* Crisp crisp-pixel/vector 16x16 digital CRT character portraits */
export function EightiesDigitalFaceSvg({ id, size = 38 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className="tm-80s-face-svg"
      aria-hidden="true"
    >
      {/* Subtle CRT dark backdrop */}
      <rect width="16" height="16" fill="#090d1a" />

      {id === 'bender' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#3b2314" />
          <rect x="2" y="4" width="2" height="4" fill="#3b2314" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="3" y="8" width="1" height="2" fill="#f59e0b" />
          <rect x="5" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="9" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#b91c1c" />
          <rect x="5" y="12" width="6" height="4" fill="#1f2937" />
          <rect x="6" y="13" width="4" height="1" fill="#f8fafc" />
        </>
      )}

      {id === 'claire' && (
        <>
          <rect x="3" y="2" width="10" height="5" fill="#9a3412" />
          <rect x="2" y="5" width="2" height="6" fill="#9a3412" />
          <rect x="12" y="5" width="2" height="6" fill="#9a3412" />
          <rect x="4" y="5" width="8" height="7" fill="#fde2cc" />
          <rect x="3" y="9" width="1" height="1" fill="#f8fafc" />
          <rect x="12" y="9" width="1" height="1" fill="#f8fafc" />
          <rect x="5" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="9" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="7" y="10" width="2" height="1" fill="#ec4899" />
          <rect x="3" y="12" width="10" height="4" fill="#fbcfe8" />
          <rect x="6" y="12" width="4" height="2" fill="#fdf2f8" />
        </>
      )}

      {id === 'allison' && (
        <>
          <rect x="3" y="2" width="10" height="5" fill="#0f172a" />
          <rect x="4" y="4" width="3" height="2" fill="#0f172a" />
          <rect x="4" y="6" width="8" height="6" fill="#fae5d3" />
          <rect x="5" y="7" width="2" height="2" fill="#111827" />
          <rect x="9" y="7" width="2" height="2" fill="#111827" />
          <rect x="7" y="10" width="2" height="1" fill="#6b7280" />
          <rect x="2" y="12" width="12" height="4" fill="#374151" />
          <rect x="4" y="12" width="8" height="2" fill="#64748b" />
        </>
      )}

      {id === 'brian' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#eab308" />
          <rect x="4" y="5" width="8" height="7" fill="#fcd9bd" />
          <rect x="5" y="7" width="2" height="1" fill="#1e3a8a" />
          <rect x="9" y="7" width="2" height="1" fill="#1e3a8a" />
          <rect x="6" y="10" width="4" height="1" fill="#f8fafc" />
          <rect x="3" y="12" width="10" height="4" fill="#15803d" />
          <rect x="6" y="12" width="4" height="2" fill="#f8fafc" />
        </>
      )}

      {id === 'andrew' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#451a03" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#9a3412" />
          <rect x="2" y="12" width="12" height="4" fill="#1d4ed8" />
          <rect x="5" y="12" width="6" height="4" fill="#e2e8f0" />
        </>
      )}

      {id === 'ferris' && (
        <>
          <rect x="4" y="1" width="8" height="4" fill="#5c3317" />
          <rect x="3" y="3" width="2" height="2" fill="#5c3317" />
          <rect x="4" y="5" width="8" height="7" fill="#f6cfb2" />
          <rect x="4" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="9" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="7" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#be123c" />
          <rect x="2" y="12" width="12" height="4" fill="#78350f" />
          <rect x="5" y="12" width="6" height="4" fill="#f8fafc" />
          <rect x="3" y="13" width="2" height="1" fill="#facc15" />
          <rect x="11" y="14" width="2" height="1" fill="#facc15" />
        </>
      )}

      {id === 'cameron' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#6b4423" />
          <rect x="4" y="5" width="8" height="7" fill="#f7d7c4" />
          <rect x="5" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="9" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="6" y="10" width="4" height="1" fill="#7f1d1d" />
          <rect x="2" y="12" width="12" height="4" fill="#dc2626" />
          <rect x="5" y="12" width="6" height="2" fill="#f8fafc" />
        </>
      )}

      {id === 'marty' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#613318" />
          <rect x="4" y="5" width="8" height="7" fill="#f6cfb2" />
          <rect x="4" y="7" width="3" height="2" fill="#111827" />
          <rect x="9" y="7" width="3" height="2" fill="#111827" />
          <rect x="5" y="7" width="1" height="1" fill="#38bdf8" />
          <rect x="10" y="7" width="1" height="1" fill="#38bdf8" />
          <rect x="6" y="10" width="4" height="1" fill="#9a3412" />
          <rect x="2" y="12" width="12" height="4" fill="#ea580c" />
          <rect x="5" y="12" width="6" height="4" fill="#2563eb" />
        </>
      )}

      {id === 'doc' && (
        <>
          <rect x="2" y="1" width="3" height="6" fill="#f8fafc" />
          <rect x="11" y="1" width="3" height="6" fill="#f8fafc" />
          <rect x="4" y="1" width="8" height="3" fill="#e2e8f0" />
          <rect x="4" y="4" width="8" height="8" fill="#fbd8c5" />
          <rect x="4" y="7" width="8" height="2" fill="#94a3b8" />
          <rect x="5" y="7" width="2" height="2" fill="#22d3ee" />
          <rect x="9" y="7" width="2" height="2" fill="#22d3ee" />
          <rect x="6" y="10" width="4" height="1" fill="#0f172a" />
          <rect x="2" y="12" width="12" height="4" fill="#facc15" />
          <rect x="6" y="12" width="4" height="4" fill="#f1f5f9" />
        </>
      )}

      {id === 'crockett' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#d97706" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="4" y="7" width="3" height="2" fill="#020617" />
          <rect x="9" y="7" width="3" height="2" fill="#020617" />
          <rect x="7" y="7" width="2" height="1" fill="#020617" />
          <rect x="5" y="11" width="6" height="1" fill="#94a3b8" />
          <rect x="2" y="12" width="12" height="4" fill="#f8fafc" />
          <rect x="5" y="12" width="6" height="4" fill="#06b6d4" />
        </>
      )}

      {id === 'mrt' && (
        <>
          <rect x="6" y="1" width="4" height="5" fill="#18181b" />
          <rect x="4" y="4" width="8" height="8" fill="#854d27" />
          <rect x="5" y="7" width="2" height="1" fill="#09090b" />
          <rect x="9" y="7" width="2" height="1" fill="#09090b" />
          <rect x="4" y="9" width="8" height="3" fill="#18181b" />
          <rect x="6" y="10" width="4" height="1" fill="#f8fafc" />
          <rect x="2" y="12" width="12" height="4" fill="#3f3f46" />
          <rect x="4" y="12" width="8" height="1" fill="#facc15" />
          <rect x="5" y="14" width="6" height="1" fill="#eab308" />
        </>
      )}

      {id === 'maverick' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#1e293b" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="4" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="9" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="4" y="6" width="8" height="1" fill="#facc15" />
          <rect x="6" y="10" width="4" height="1" fill="#f8fafc" />
          <rect x="2" y="12" width="12" height="4" fill="#365314" />
          <rect x="5" y="12" width="6" height="4" fill="#e2e8f0" />
        </>
      )}

      {id === 'hawke' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#92400e" />
          <rect x="2" y="4" width="12" height="2" fill="#1e293b" />
          <rect x="4" y="5" width="8" height="7" fill="#f6cfb2" />
          <rect x="4" y="7" width="3" height="2" fill="#020617" />
          <rect x="9" y="7" width="3" height="2" fill="#020617" />
          <rect x="5" y="7" width="1" height="1" fill="#38bdf8" />
          <rect x="10" y="7" width="1" height="1" fill="#38bdf8" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#0f172a" />
          <rect x="5" y="12" width="6" height="4" fill="#cbd5e1" />
        </>
      )}
    </svg>
  );
}

export default function EightiesIconsStrip({ compact = false }) {
  const [selectedId, setSelectedId] = useState(compact ? '' : 'ferris');
  const selected = EIGHTIES_ICON_CAST.find((c) => c.id === selectedId) || null;

  return (
    <section
      className={`tm-80s-cast-bar ${compact ? 'is-compact' : ''}`}
      aria-label="1980s Pop Culture Crew & Chopper Patrol"
    >
      <div className="tm-80s-cast-header">
        <div className="tm-80s-cast-title">
          <span className="tm-80s-crt-dot" aria-hidden="true" />
          <span>📺 1980s CLASSICS CREW — DIGITAL CRT PORTRAITS</span>
          <span className="tm-80s-price-tag">ALL ITEMS IN 1985 PRICES (25¢ = 1🪙)</span>
        </div>
        <div className="tm-80s-chopper-btns">
          <button
            type="button"
            className="tm-80s-chopper-btn is-airwolf"
            onClick={() => triggerHelicopterFlyby('airwolf')}
          >
            🦅 Airwolf Flyby
          </button>
          <button
            type="button"
            className="tm-80s-chopper-btn is-bluethunder"
            onClick={() => triggerHelicopterFlyby('bluethunder')}
          >
            🚁 Blue Thunder
          </button>
        </div>
      </div>

      <div className="tm-80s-faces-rail" role="list">
        {EIGHTIES_ICON_CAST.map((char) => {
          const active = selectedId === char.id;
          return (
            <button
              key={char.id}
              type="button"
              role="listitem"
              className={`tm-80s-face-chip ${active ? 'is-active' : ''}`}
              style={{
                '--char-bg': char.bg,
                '--char-accent': char.accent
              }}
              onClick={() => {
                sfx.playToggle?.();
                setSelectedId((prev) => (prev === char.id ? '' : char.id));
              }}
              title={`${char.fullName} — ${char.movie}`}
            >
              <EightiesDigitalFaceSvg id={char.id} size={compact ? 30 : 38} />
              <span className="tm-80s-face-name">{char.name}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className="tm-80s-dossier-card"
          style={{ '--char-accent': selected.accent }}
        >
          <div className="tm-80s-dossier-avatar">
            <EightiesDigitalFaceSvg id={selected.id} size={52} />
          </div>
          <div className="tm-80s-dossier-body">
            <div className="tm-80s-dossier-top">
              <strong>{selected.fullName}</strong>
              <span className="tm-80s-dossier-movie">{selected.movie}</span>
              <span className="tm-80s-dossier-role">{selected.role}</span>
            </div>
            <div className="tm-80s-dossier-quote">“{selected.quote}”</div>
            <div className="tm-80s-dossier-meta">
              <span className="tm-80s-meta-pill">
                💵 1985 Prop: {selected.item80s} —{' '}
                <strong>{formatEightiesPrice(selected.priceTokens)}</strong> ({selected.priceTokens} 🪙)
              </span>
              {selected.id === 'hawke' && (
                <button
                  type="button"
                  className="tm-80s-chopper-btn is-airwolf"
                  onClick={() => triggerHelicopterFlyby('both', 'HAWKES & MURPHY: DOUBLE CHOPPER SCRAMBLE!')}
                >
                  ⚡ Scramble Airwolf + Blue Thunder
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            className="tm-80s-dossier-close"
            onClick={() => setSelectedId('')}
            aria-label="Close character dossier"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
