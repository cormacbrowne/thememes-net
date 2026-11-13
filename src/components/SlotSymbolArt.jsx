import { useId } from 'react';

/**
 * Crisp inline SVG Las Vegas Slot Machine Reel Graphics
 * Covers Classic Bandit '85 + Silver Mustang (Dougie S3) + Lightning Vault + Cyber Buffalo '86
 */
export default function SlotSymbolArt({ symbolId, size = 54, badge = null }) {
  const uid = useId().replace(/:/g, '');

  const renderSvg = () => {
    switch (symbolId) {
      case '777':
      case 'volt7': {
        const isVolt = symbolId === 'volt7';
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label={isVolt ? 'Volt 777' : 'Flaming Lucky 777'}>
            <defs>
              <linearGradient id={`g7-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isVolt ? '#7dd3fc' : '#ff4d4d'} />
                <stop offset="50%" stopColor={isVolt ? '#0284c7' : '#dc2626'} />
                <stop offset="100%" stopColor={isVolt ? '#1e3a8a' : '#7f1d1d'} />
              </linearGradient>
              <linearGradient id={`g7g-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor={isVolt ? '#38bdf8' : '#facc15'} />
                <stop offset="100%" stopColor={isVolt ? '#0369a1' : '#b45309'} />
              </linearGradient>
            </defs>
            <path
              d="M12 48 C8 38, 15 28, 12 20 C19 25, 22 14, 30 8 C33 17, 42 12, 48 20 C54 27, 55 40, 48 48 Z"
              fill={isVolt ? '#00f3ff' : '#f97316'}
              opacity="0.32"
            />
            <path
              d="M8 14 H28 L18 46 H10 L19 21 H8 Z"
              fill={isVolt ? '#0c4a6e' : '#991b1b'}
              stroke={isVolt ? '#38bdf8' : '#facc15'}
              strokeWidth="1.4"
              opacity="0.88"
            />
            <path
              d="M36 14 H56 L46 46 H38 L47 21 H36 Z"
              fill={isVolt ? '#0c4a6e' : '#991b1b'}
              stroke={isVolt ? '#38bdf8' : '#facc15'}
              strokeWidth="1.4"
              opacity="0.88"
            />
            <path
              d="M15 10 H50 L34 55 H21 L35 20 H15 Z"
              fill={`url(#g7-${uid})`}
              stroke={`url(#g7g-${uid})`}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M19 14 H44" stroke="#fef9c3" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            <rect x="13" y="47" width="38" height="11" rx="3" fill="#111827" stroke={isVolt ? '#38bdf8' : '#facc15'} strokeWidth="1.5" />
            <text
              x="32"
              y="55.5"
              textAnchor="middle"
              fill={isVolt ? '#7dd3fc' : '#fef08a'}
              fontSize="8.5"
              fontWeight="900"
              fontFamily="Impact, Arial Black, sans-serif"
              letterSpacing="1"
            >
              {isVolt ? 'VOLT 7' : 'JACKPOT'}
            </text>
          </svg>
        );
      }

      case 'bar':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Triple Gold BAR">
            {[8, 25, 42].map((y, idx) => (
              <g key={y}>
                <rect x="6" y={y} width="52" height="14" rx="3.5" fill="#0f172a" stroke="#facc15" strokeWidth="2.2" />
                <rect x="8.5" y={y + 2} width="47" height="3" rx="1" fill="#fde047" opacity="0.25" />
                <text
                  x="32"
                  y={y + 10.8}
                  textAnchor="middle"
                  fill={idx === 1 ? '#fef08a' : '#facc15'}
                  fontSize="10.5"
                  fontWeight="900"
                  fontFamily="Impact, Arial Black, sans-serif"
                  letterSpacing="2.2"
                >
                  BAR
                </text>
              </g>
            ))}
          </svg>
        );

      case 'bell':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Golden Liberty Bell">
            <defs>
              <linearGradient id={`gbell-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef9c3" />
                <stop offset="45%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="11" r="4.5" fill="#d97706" stroke="#78350f" strokeWidth="1.8" />
            <circle cx="32" cy="51" r="6" fill="#b45309" stroke="#78350f" strokeWidth="2" />
            <path
              d="M32 14 C19 14, 15 26, 13 39 L8 46 H56 L51 39 C49 26, 45 14, 32 14 Z"
              fill={`url(#gbell-${uid})`}
              stroke="#78350f"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M22 21 C20 28, 18 35, 16 41" stroke="#fef9c3" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M35 30 L33 37 L36 41 L34 46" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        );

      case 'cherry':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Glossy Twin Cherries">
            <defs>
              <radialGradient id={`gch-${uid}`} cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#fda4af" />
                <stop offset="35%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#881337" />
              </radialGradient>
            </defs>
            <path d="M21 36 C21 22, 30 14, 38 9 C36 20, 41 26, 45 38" fill="none" stroke="#15803d" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M37 10 C46 7, 54 12, 51 19 C44 21, 38 17, 37 10 Z" fill="#22c55e" stroke="#14532d" strokeWidth="1.8" />
            <circle cx="20" cy="43" r="12.5" fill={`url(#gch-${uid})`} stroke="#881337" strokeWidth="2.2" />
            <ellipse cx="16" cy="38" rx="3.8" ry="2.3" transform="rotate(-30 16 38)" fill="#fff" opacity="0.75" />
            <circle cx="44" cy="45" r="12.5" fill={`url(#gch-${uid})`} stroke="#881337" strokeWidth="2.2" />
            <ellipse cx="40" cy="40" rx="3.8" ry="2.3" transform="rotate(-30 40 40)" fill="#fff" opacity="0.75" />
          </svg>
        );

      case 'diamond':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Neon Casino Diamond">
            <defs>
              <linearGradient id={`gdiam-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="45%" stopColor="#00f3ff" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>
            <polygon points="18,12 46,12 57,26 32,55 7,26" fill={`url(#gdiam-${uid})`} stroke="#0369a1" strokeWidth="2.4" strokeLinejoin="round" />
            <polyline points="7,26 57,26" stroke="#e0f2fe" strokeWidth="1.8" />
            <polyline points="18,12 24,26 32,55 40,26 46,12" fill="none" stroke="#bae6fd" strokeWidth="1.6" />
            <polygon points="24,26 32,12 40,26" fill="#ffffff" opacity="0.55" />
          </svg>
        );

      case 'watermelon':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Vegas Watermelon Slice">
            <path d="M8 22 A25 25 0 0 0 56 22 Z" fill="#16a34a" stroke="#14532d" strokeWidth="2.4" transform="rotate(-14 32 30)" />
            <path d="M12 22 A21 21 0 0 0 52 22 Z" fill="#dcfce7" transform="rotate(-14 32 30)" />
            <path d="M14.5 22 A18.5 18.5 0 0 0 49.5 22 Z" fill="#ef4444" transform="rotate(-14 32 30)" />
            <g fill="#111827" transform="rotate(-14 32 30)">
              <ellipse cx="24" cy="28" rx="1.6" ry="2.5" />
              <ellipse cx="32" cy="31" rx="1.6" ry="2.5" />
              <ellipse cx="40" cy="28" rx="1.6" ry="2.5" />
              <ellipse cx="28" cy="35" rx="1.5" ry="2.3" />
              <ellipse cx="36" cy="35" rx="1.5" ry="2.3" />
            </g>
          </svg>
        );

      case 'lemon':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Golden Vegas Lemon">
            <defs>
              <radialGradient id={`glem-${uid}`} cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#fef9c3" />
                <stop offset="55%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#ca8a04" />
              </radialGradient>
            </defs>
            <g transform="rotate(-22 32 34)">
              <path
                d="M10 34 C14 20, 24 18, 32 18 C40 18, 50 20, 54 34 C50 48, 40 50, 32 50 C24 50, 14 48, 10 34 Z"
                fill={`url(#glem-${uid})`}
                stroke="#a16207"
                strokeWidth="2.4"
              />
              <ellipse cx="27" cy="27" rx="8" ry="3" fill="#fff" opacity="0.6" />
            </g>
            <path d="M36 16 C43 10, 52 12, 49 19 C43 21, 38 19, 36 16 Z" fill="#22c55e" stroke="#14532d" strokeWidth="1.8" />
          </svg>
        );

      // ===== DOUGIE JONES / SILVER MUSTANG (TWIN PEAKS S3) =====
      case 'dougie':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Mr. Jackpots Dougie Jones">
            <defs>
              <linearGradient id={`gdj-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            {/* Gold Jackpot Halo */}
            <circle cx="32" cy="30" r="24" fill={`url(#gdj-${uid})`} opacity="0.22" stroke="#facc15" strokeWidth="2" />
            {/* Lime Green Dougie Suit & Red Tie */}
            <path d="M14 54 C16 42, 24 39, 32 39 C40 39, 48 42, 50 54 Z" fill="#84cc16" stroke="#365314" strokeWidth="2" />
            <polygon points="32,40 28,53 32,56 36,53" fill="#dc2626" />
            {/* Face & Neat Hair */}
            <circle cx="32" cy="25" r="11" fill="#fed7aa" stroke="#7c2d12" strokeWidth="1.8" />
            <path d="M21 23 C21 13, 43 13, 43 23 C39 18, 25 18, 21 23 Z" fill="#1e1b4b" />
            {/* Cool Vegas Shades */}
            <rect x="23" y="22" width="8" height="5" rx="1.5" fill="#090a0f" stroke="#facc15" strokeWidth="1" />
            <rect x="33" y="22" width="8" height="5" rx="1.5" fill="#090a0f" stroke="#facc15" strokeWidth="1" />
            <line x1="31" y1="24" x2="33" y2="24" stroke="#facc15" strokeWidth="1.2" />
            {/* Ribbon */}
            <rect x="7" y="48" width="50" height="12" rx="4" fill="#991b1b" stroke="#fde047" strokeWidth="1.6" />
            <text x="32" y="57" textAnchor="middle" fill="#fef08a" fontSize="7.5" fontWeight="900" fontFamily="Impact, sans-serif" letterSpacing="0.5">
              MR.JACKPOTS
            </text>
          </svg>
        );

      case 'orb':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Black Lodge Golden Orb Wild">
            <defs>
              <radialGradient id={`gorb-${uid}`} cx="38%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#fde047" />
                <stop offset="75%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#92400e" />
              </radialGradient>
            </defs>
            <circle cx="32" cy="28" r="22" fill="#facc15" opacity="0.24" />
            <circle cx="32" cy="28" r="17" fill={`url(#gorb-${uid})`} stroke="#fef08a" strokeWidth="2.4" />
            <path d="M22 22 C26 16, 36 16, 40 22" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
            <rect x="11" y="46" width="42" height="12" rx="4" fill="#111827" stroke="#fde047" strokeWidth="1.6" />
            <text x="32" y="55" textAnchor="middle" fill="#fde047" fontSize="8.5" fontWeight="900" fontFamily="Impact, sans-serif" letterSpacing="1">
              ORB WILD
            </text>
          </svg>
        );

      case 'coffee':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Damn Fine Black Coffee">
            {/* Steam */}
            <path d="M24 18 C22 13, 27 11, 25 6" fill="none" stroke="#e2e8f0" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M32 17 C30 12, 35 10, 33 5" fill="none" stroke="#e2e8f0" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M40 18 C38 13, 43 11, 41 6" fill="none" stroke="#e2e8f0" strokeWidth="2.2" strokeLinecap="round" />
            {/* Mug */}
            <path d="M45 27 H51 C55 27, 56 38, 51 40 H45" fill="none" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" />
            <rect x="15" y="22" width="31" height="27" rx="6" fill="#f8fafc" stroke="#334155" strokeWidth="2.2" />
            <ellipse cx="30.5" cy="24" rx="13" ry="3.5" fill="#1c1917" />
            <ellipse cx="30.5" cy="52" rx="20" ry="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1.8" />
            <text x="30.5" y="40" textAnchor="middle" fill="#7c2d12" fontSize="7.5" fontWeight="900" fontFamily="Impact, sans-serif">
              COOP
            </text>
          </svg>
        );

      case 'pie':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Twin Peaks Cherry Pie">
            <polygon points="10,36 52,22 54,44 12,50" fill="#d97706" stroke="#78350f" strokeWidth="2.2" strokeLinejoin="round" />
            <polygon points="10,36 52,22 36,14" fill="#fde68a" stroke="#b45309" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 42 L53 33 L54 41 L12 47 Z" fill="#dc2626" />
            <circle cx="28" cy="39" r="3" fill="#991b1b" />
            <circle cx="40" cy="36" r="3" fill="#991b1b" />
            <ellipse cx="34" cy="21" rx="8" ry="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
          </svg>
        );

      case 'owlring':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Green Owl Cave Ring">
            <ellipse cx="32" cy="40" rx="19" ry="12" fill="none" stroke="#facc15" strokeWidth="6" />
            <ellipse cx="32" cy="40" rx="19" ry="12" fill="none" stroke="#92400e" strokeWidth="1.6" />
            <polygon points="20,16 44,16 48,26 44,34 20,34 16,26" fill="#16a34a" stroke="#fde047" strokeWidth="2.4" />
            {/* Owl Rune */}
            <path d="M24 23 L32 28 L40 23 M26 23 L22 20 M38 23 L42 20 M32 28 V32" fill="none" stroke="#dcfce7" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      case 'redshoes':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="New Red Shoes">
            <path d="M12 44 L16 24 L24 24 L27 38 L46 42 C53 43, 55 48, 52 50 H12 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2.2" strokeLinejoin="round" />
            <rect x="13" y="46" width="6" height="8" rx="1.5" fill="#450a0a" />
            <path d="M20 39 C26 39, 32 42, 42 44" stroke="#fca5a5" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        );

      // ===== LIGHTNING VAULT 5000 =====
      case 'bolt':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Lightning Vault Orb">
            <defs>
              <radialGradient id={`gbolt-${uid}`} cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ecfeff" />
                <stop offset="45%" stopColor="#00f3ff" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="24" fill={`url(#gbolt-${uid})`} stroke="#a5f3fc" strokeWidth="2.5" />
            <polygon points="35,12 20,35 31,35 27,53 45,28 34,28" fill="#fef08a" stroke="#78350f" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        );

      case 'vault':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Cyber Vault Door">
            <rect x="10" y="10" width="44" height="44" rx="8" fill="#312e81" stroke="#a855f7" strokeWidth="2.8" />
            <circle cx="32" cy="32" r="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.4" />
            <circle cx="32" cy="32" r="5" fill="#facc15" />
            <line x1="32" y1="18" x2="32" y2="27" stroke="#38bdf8" strokeWidth="2.4" />
            <line x1="20" y1="38" x2="28" y2="34" stroke="#38bdf8" strokeWidth="2.4" />
            <line x1="44" y1="38" x2="36" y2="34" stroke="#38bdf8" strokeWidth="2.4" />
          </svg>
        );

      case 'wildchip':
      case 'wild2x': {
        const isMult = symbolId === 'wild2x';
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Wild Symbol">
            <polygon
              points="32,6 39,21 56,23 43,34 47,51 32,42 17,51 21,34 8,23 25,21"
              fill={isMult ? '#22c55e' : '#facc15'}
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <rect x="10" y="24" width="44" height="17" rx="5" fill="#090a0f" stroke={isMult ? '#4ade80' : '#fde047'} strokeWidth="2" />
            <text x="32" y="36" textAnchor="middle" fill={isMult ? '#4ade80' : '#fde047'} fontSize="11" fontWeight="900" fontFamily="Impact, sans-serif">
              {badge || 'WILD'}
            </text>
          </svg>
        );
      }

      // ===== CYBER BUFFALO STAMPEDE '86 =====
      case 'buffalo':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Cyber Buffalo">
            <path d="M10 22 C8 12, 16 10, 20 18" fill="none" stroke="#fde047" strokeWidth="4" strokeLinecap="round" />
            <path d="M54 22 C56 12, 48 10, 44 18" fill="none" stroke="#fde047" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="32" cy="34" rx="20" ry="18" fill="#7c2d12" stroke="#f97316" strokeWidth="2.4" />
            <ellipse cx="32" cy="27" rx="16" ry="10" fill="#431407" />
            <circle cx="24" cy="33" r="3" fill="#00f3ff" />
            <circle cx="40" cy="33" r="3" fill="#00f3ff" />
            <ellipse cx="32" cy="43" rx="9" ry="6" fill="#292524" />
            <circle cx="28" cy="43" r="1.8" fill="#090a0f" />
            <circle cx="36" cy="43" r="1.8" fill="#090a0f" />
            <path d="M26 48 A6 6 0 0 0 38 48" fill="none" stroke="#facc15" strokeWidth="2.4" />
          </svg>
        );

      case 'eagle':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Neon Eagle">
            <path d="M8 28 C16 16, 28 14, 32 22 C36 14, 48 16, 56 28 L44 36 L32 52 L20 36 Z" fill="#0284c7" stroke="#7dd3fc" strokeWidth="2.2" />
            <circle cx="32" cy="24" r="9" fill="#f8fafc" stroke="#0369a1" strokeWidth="1.8" />
            <polygon points="28,27 36,27 32,35" fill="#facc15" stroke="#92400e" strokeWidth="1.5" />
            <circle cx="29" cy="23" r="1.6" fill="#090a0f" />
            <circle cx="35" cy="23" r="1.6" fill="#090a0f" />
          </svg>
        );

      case 'wolf':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Synth Wolf">
            <polygon points="14,12 24,22 14,34" fill="#7e22ce" stroke="#e9d5ff" strokeWidth="2" />
            <polygon points="50,12 40,22 50,34" fill="#7e22ce" stroke="#e9d5ff" strokeWidth="2" />
            <polygon points="16,24 48,24 40,50 32,55 24,50" fill="#4c1d95" stroke="#c084fc" strokeWidth="2.2" />
            <circle cx="25" cy="33" r="2.6" fill="#00f3ff" />
            <circle cx="39" cy="33" r="2.6" fill="#00f3ff" />
            <polygon points="29,44 35,44 32,49" fill="#090a0f" />
          </svg>
        );

      case 'goldcoin':
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Gold Stampede Coin">
            <defs>
              <radialGradient id={`ggc-${uid}`} cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#fef9c3" />
                <stop offset="55%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#b45309" />
              </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="23" fill={`url(#ggc-${uid})`} stroke="#fef08a" strokeWidth="2.6" />
            <circle cx="32" cy="32" r="17" fill="none" stroke="#92400e" strokeWidth="1.8" strokeDasharray="4 3" />
            <text x="32" y="38" textAnchor="middle" fill="#78350f" fontSize="20" fontWeight="900" fontFamily="Impact, sans-serif">
              $
            </text>
          </svg>
        );

      case 'wheel':
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Vegas Bonus Wheel">
            <circle cx="32" cy="32" r="23" fill="#1e1b4b" stroke="#facc15" strokeWidth="2.8" />
            <path d="M32 32 L32 9 A23 23 0 0 1 55 32 Z" fill="#ec4899" />
            <path d="M32 32 L55 32 A23 23 0 0 1 32 55 Z" fill="#06b6d4" />
            <path d="M32 32 L32 55 A23 23 0 0 1 9 32 Z" fill="#f59e0b" />
            <path d="M32 32 L9 32 A23 23 0 0 1 32 9 Z" fill="#8b5cf6" />
            <circle cx="32" cy="32" r="8" fill="#090a0f" stroke="#fde047" strokeWidth="2" />
            <text x="32" y="35" textAnchor="middle" fill="#fde047" fontSize="6.8" fontWeight="900">
              SPIN
            </text>
          </svg>
        );
    }
  };

  return (
    <div className="tm-slot-svg-wrap" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {renderSvg()}
      {badge && <span className="tm-slot-cell-badge">{badge}</span>}
    </div>
  );
}
