import { useState, useEffect, useRef } from 'react';
import { track } from '../utils/analytics';
import { sfx } from '../utils/soundEngine';
import { PRANK_DISGUISE_TO_PATH, SITE_ORIGIN, getSeoRouteByPath } from '../data/seoRoutes';
import CrackedScreenPrank from './CrackedScreenPrank';
import './BossKeyOverlay.css';
import { linkSafeShareText } from '../utils/shareText.js';

const DISGUISE_MODES = [
  { id: 'excel', label: '📊 1. Spreadsheet' },
  { id: 'terminal', label: '💻 2. DevOps Terminal' },
  { id: 'zoom', label: '📹 3. Video Call' },
  { id: 'ai', label: '🤖 4. Enterprise AI' },
  { id: 'update', label: '🔄 5. OS Update' },
  { id: 'bsod', label: '💀 6. Blue Screen' },
  { id: 'crackphone', label: '📱 7. Cracked iPhone' },
  { id: 'crackpad', label: '📱 8. Cracked iPad' },
  { id: 'secretsanta', label: '🎅 9. Secret Santa' }
];

const CRACK_IDS = new Set(['crackphone', 'crackpad']);

// Full screen for the cracked-screen pranks. iPhone Safari does not let web pages go full screen
// (iPad, Android and desktop do), so there we explain the Home Screen / Hide Toolbar routes.
const fsElement = () =>
  typeof document !== 'undefined' ? document.fullscreenElement || document.webkitFullscreenElement || null : null;
const canGoFullscreen = () =>
  typeof document !== 'undefined' && Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const isStandaloneApp = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) return el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch {
    // ignore
  }
  return undefined;
}
function exitFullscreen() {
  try {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch {
    // ignore
  }
}

const INITIAL_EXCEL_ROWS = [
  ['Q1-2026', 'North America Cloud Ops', '$1,420,690.00', '$1,380,110.00', '+2.94%', 'On Track', 'A. Vance'],
  ['Q2-2026', 'Cross-Platform Synergy KPI', '$892,400.00', '$910,000.00', '-1.93%', 'Under Review', 'S. Jenkins'],
  ['Q3-2026', 'Enterprise Bandwidth Allocation', '$2,150,000.00', '$1,985,400.00', '+8.29%', 'Approved', 'D. Compliance'],
  ['Q4-2026', 'Kubernetes Cluster Depreciation', '$640,120.00', '$622,800.00', '+2.78%', 'Audited', 'K. DevOps'],
  ['Q4-ADJ', 'AI Paradigm Shift Amortization', '$1,337,420.00', '$1,290,000.00', '+3.68%', 'Verified', 'M. Strategy'],
  ['FY-2026', 'Total Consolidated EBITDA', '$6,440,630.00', '$6,188,310.00', '+4.08%', 'Board Ready', 'CFO Office']
];

const FAKE_TERMINAL_LINES = [
  '[09:41:02 UTC] INFO  k8s-scheduler: Rebalancing 64 production pods across us-east-1a...',
  '[09:41:03 UTC] OK    rustc-optimizer: Compiled crate `enterprise_synergy_core v4.12.0` in 1.84s',
  '[09:41:04 UTC] WARN  postgres-pool: Connection pool utilization at 69.0% (within SLA threshold)',
  '[09:41:05 UTC] INFO  terraform-apply: aws_eks_node_group.prod_workers: Modifications complete [id=prod-ng-09]',
  '[09:41:06 UTC] OK    audit-daemon: SOC2 Type II zero-trust handshake verified (latency: 3.2ms)',
  '[09:41:07 UTC] INFO  prometheus-scraper: Ingested 142,850 metrics/sec — 0 anomalies detected',
  '[09:41:08 UTC] OK    git-ops-runner: Merged PR #4209 "Refactor microservice telemetry buffer"'
];

const BUZZWORD_EXCUSES = [
  '"Let’s double-click on that holistic deliverable in Q4."',
  '"We need to move the needle on cross-functional bandwidth before we boil the ocean."',
  '"I’ll circle back offline and ping the stakeholders to align our North Star KPIs."',
  '"From a 30,000-foot view, this paradigm shift is low-hanging fruit for our EBITDA."',
  '"Can we put a pin in this action item until we socialize the deck with Legal?"'
];

const AI_COPILOT_MEMOS = [
  {
    prompt: 'Draft a Q4 Executive Architecture Alignment Memo for the Board of Directors',
    response:
      'EXECUTIVE SUMMARY (CONFIDENTIAL):\n1. By leveraging hyper-converged Kubernetes microservices and proactive EBITDA guardrails, Engineering reduced coffee-to-deployment latency by 42.0%.\n2. Action Item: Transition all legacy monolithic spreadsheets into zero-trust AI synergy pipelines before Friday 4:59 PM.\n3. Projected ROI: +$1.42M in annualized cross-functional alignment.'
  },
  {
    prompt: 'Generate a polite corporate email explaining why the sprint deliverable needs 2 more weeks',
    response:
      'SUBJECT: Proactive Quality Assurance & Holistic Scope Calibration\n\nHi Team,\nIn order to maximize stakeholder delight and avoid boiling the ocean prematurely, we are strategically extending our runway by 10 business days to stress-test our edge-case telemetry. Let’s circle back in Q1!'
  },
  {
    prompt: 'Analyze why production CPU spiked to 99% during the Tuesday All-Hands',
    response:
      'ROOT CAUSE ANALYSIS (RCA-4209):\nOur distributed neural cluster experienced an unexpected surge in asynchronous paradigm shifts. Mitigation: Added 16 virtualized YAML load-balancers and rotated the compliance tokens. System stability is now 99.999%.'
  }
];

export default function BossKeyOverlay({
  onExitBossMode,
  onSecretWorkXp,
  memes = [],
  initialDisguise = 'excel',
  isPrankPage = false,
  onDisguiseChange
}) {
  const [disguise, setDisguise] = useState(initialDisguise || 'excel');
  useEffect(() => {
    track('prank_opened', { prank: String(disguise) });
  }, [disguise]);
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const [showFullscreenTip, setShowFullscreenTip] = useState(Boolean(isPrankPage));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCell, setSelectedCell] = useState('C6');
  const [excelRows, setExcelRows] = useState(INITIAL_EXCEL_ROWS);
  const [revealedMeme, setRevealedMeme] = useState(null);
  const [corporateNote, setCorporateNote] = useState(
    'Ready — All enterprise macros verified by Internal Audit.'
  );
  const [termLogs, setTermLogs] = useState(FAKE_TERMINAL_LINES);
  const [updatePct, setUpdatePct] = useState(69);
  const [secretXpEarned, setSecretXpEarned] = useState(0);
  const [activeBuzzword, setActiveBuzzword] = useState(BUZZWORD_EXCUSES[0]);
  const [webcamFrozen, setWebcamFrozen] = useState(false);
  const [meetingApp, setMeetingApp] = useState('teams'); // 'teams' | 'zoom'
  const [incomingBossCall, setIncomingBossCall] = useState(false);
  const [callReplyToast, setCallReplyToast] = useState('');
  const [copiedPrankLink, setCopiedPrankLink] = useState(false);
  const [aiMessages, setAiMessages] = useState([AI_COPILOT_MEMOS[0]]);
  const [bsodPct, setBsodPct] = useState(42);
  const [santaRedraws, setSantaRedraws] = useState(0);
  const [santaWishlistOpen, setSantaWishlistOpen] = useState(false);
  const [prevInitialDisguise, setPrevInitialDisguise] = useState(initialDisguise);
  const [crackSheet, setCrackSheet] = useState('start'); // 'start' | 'menu' | null
  const cornerTapsRef = useRef({ n: 0, t: 0 });

  if (initialDisguise !== prevInitialDisguise) {
    setPrevInitialDisguise(initialDisguise);
    if (initialDisguise) setDisguise(initialDisguise);
  }

  const handleSharePrankScreen = () => {
    if (typeof window === 'undefined') return;
    const path = PRANK_DISGUISE_TO_PATH[disguise] || '/fake-excel-boss-screen';
    const route = getSeoRouteByPath(path);
    const shareUrl = `${window.location.origin || SITE_ORIGIN}${path}?ref=prank`;
    const label = DISGUISE_MODES.find((d) => d.id === disguise)?.label || 'Prank Screen';
    const shareTitle = route?.title || `Boss Key Disguise: ${label}`;
    const shareText = route?.description || 'Check out this interactive prank/boss screen on THE MEMES.net! 💼';
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator
        .share({
          title: linkSafeShareText(shareTitle),
          text: linkSafeShareText(shareText),
          url: shareUrl
        })
        .catch(() => {});
    }
    sfx.playPop?.(2);
    setCopiedPrankLink(true);
    setTimeout(() => setCopiedPrankLink(false), 2200);
  };

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const selectDisguise = (nextId) => {
    setDisguise(nextId);
    if (CRACK_IDS.has(nextId)) setCrackSheet('start');
    if (nextId === 'bsod') sfx.playXpCrash();
    if (nextId === 'secretsanta') sfx.playJingleBells();
    if (onDisguiseChange) onDisguiseChange(nextId);
  };

  const handleToggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const earnStealthXp = (amount = 15) => {
    setSecretXpEarned((prev) => prev + amount);
    if (onSecretWorkXp) {
      onSecretWorkXp(amount);
    }
  };

  const handleRecalculateExcel = () => {
    earnStealthXp(15);
    const bump = (Math.random() * 6 + 1.2).toFixed(2);
    setExcelRows((prev) =>
      prev.map((r, idx) =>
        idx === 4
          ? [
              r[0],
              r[1],
              `$${(1337420 + Math.floor(Math.random() * 90000)).toLocaleString()}.00`,
              r[3],
              `+${bump}%`,
              'Synergized',
              r[6]
            ]
          : r
      )
    );
    setCorporateNote(
      `[Macro Executed] Recalculated Q4 Monte Carlo projection (+${bump}% variance). Stealth +15 XP banked!`
    );
  };

  const handleAppendTerminalLog = () => {
    earnStealthXp(15);
    const randomLine =
      FAKE_TERMINAL_LINES[Math.floor(Math.random() * FAKE_TERMINAL_LINES.length)];
    const ts = new Date().toISOString().slice(11, 19);
    setTermLogs((prev) => [
      ...prev.slice(-14),
      `[${ts} UTC] EXEC  worker-node-${Math.floor(10 + Math.random() * 89)}: ${randomLine.slice(21)}`
    ]);
  };

  const handleGenerateAiMemo = () => {
    earnStealthXp(15);
    const nextMemo = AI_COPILOT_MEMOS[aiMessages.length % AI_COPILOT_MEMOS.length];
    setAiMessages((prev) => [...prev.slice(-3), { ...nextMemo, id: Date.now() }]);
  };

  // Number keys 1-6 switch disguises; typing in terminal adds fake code lines
  useEffect(() => {
    const ignoredKeys = new Set(['Escape', 'F11', 'F5', 'F12', 'Shift', 'Control', 'Alt', 'Meta', 'Tab']);
    const onKey = (e) => {
      if (e.key === '1') selectDisguise('excel');
      else if (e.key === '2') selectDisguise('terminal');
      else if (e.key === '3') selectDisguise('zoom');
      else if (e.key === '4') selectDisguise('ai');
      else if (e.key === '5') selectDisguise('update');
      else if (e.key === '6') selectDisguise('bsod');
      else if (e.key === '7') selectDisguise('crackphone');
      else if (e.key === '8') selectDisguise('crackpad');
      else if (e.key === '9') selectDisguise('secretsanta');
      else if (disguise === 'terminal' && !ignoredKeys.has(e.key)) {
        handleAppendTerminalLog();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (CRACK_IDS.has(disguise)) {
    const onCornerTap = (e) => {
      e.stopPropagation();
      const now = Date.now();
      const c = cornerTapsRef.current;
      c.n = now - c.t < 650 ? c.n + 1 : 1;
      c.t = now;
      if (c.n >= 3) {
        c.n = 0;
        setCrackSheet('menu');
      }
    };
    const fsOk = canGoFullscreen();
    const inApp = isStandaloneApp();
    const deviceName = disguise === 'crackpad' ? 'iPad' : 'iPhone';
    return (
      <div className="tm-boss-overlay tm-boss-overlay--crack" role="dialog" aria-label="Cracked screen prank">
        <CrackedScreenPrank key={disguise} device={disguise === 'crackpad' ? 'tablet' : 'phone'} />
        <button
          type="button"
          className="tm-crack-exit-hotspot"
          aria-label="Triple-tap for prank controls"
          onPointerUp={onCornerTap}
        />
        {crackSheet && (
          <div className="tm-crack-start" onPointerUp={(e) => e.stopPropagation()}>
            {crackSheet === 'start' ? (
              <>
                <h2>Cracked {deviceName} prank</h2>
                {inApp ? (
                  <p className="tm-crack-fs-note is-good">✓ You&apos;re in the Home Screen app, so it&apos;s already full screen.</p>
                ) : fsOk ? (
                  <p className="tm-crack-fs-note is-good">Tap <strong>Full screen</strong>: every bar disappears and the cracks go edge to edge.</p>
                ) : (
                  <div className="tm-crack-fs-note">
                    <strong>iPhone Safari won&apos;t let websites go full screen.</strong> Two ways round it:
                    <ol>
                      <li>
                        <strong>Best:</strong> tap Share <span aria-hidden="true">⬆</span> ▸ <strong>Add to Home Screen</strong>. Open
                        THE MEMES from your Home Screen, then Play ▸ Pranks ▸ Cracked {deviceName}. No bars at all.
                      </li>
                      <li>
                        <strong>Quick:</strong> tap the <strong>aA</strong> / <strong>⋯</strong> button in Safari&apos;s address bar ▸{' '}
                        <strong>Hide Toolbar</strong>.
                      </li>
                    </ol>
                  </div>
                )}
                <ol>
                  <li>Leave it on the table, or hand it over: &ldquo;I just dropped it&hellip;&rdquo;</li>
                  <li>Every tap cracks it more and spits sparks.</li>
                  <li>To get out: triple-tap the <strong>top-left corner</strong>, or press Esc.</li>
                </ol>
                <div className="tm-crack-start-actions">
                  <button type="button" onClick={onExitBossMode}>
                    Back
                  </button>
                  {fsOk && !inApp ? (
                    <>
                      <button type="button" onClick={() => setCrackSheet(null)}>
                        Start
                      </button>
                      <button
                        type="button"
                        className="is-go"
                        onClick={() => {
                          setCrackSheet(null);
                          if (!fsElement()) enterFullscreen();
                        }}
                      >
                        ⛶ Full screen
                      </button>
                    </>
                  ) : (
                    <button type="button" className="is-go" onClick={() => setCrackSheet(null)}>
                      Start
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2>Prank controls</h2>
                <div className="tm-crack-start-actions">
                  <button type="button" onClick={() => selectDisguise(disguise === 'crackpad' ? 'crackphone' : 'crackpad')}>
                    {disguise === 'crackpad' ? 'iPhone version' : 'iPad version'}
                  </button>
                  <button type="button" onClick={handleSharePrankScreen}>
                    {copiedPrankLink ? 'Link copied' : 'Share'}
                  </button>
                  {fsOk && !inApp && (
                    <button
                      type="button"
                      onClick={() => {
                        if (fsElement()) exitFullscreen();
                        else enterFullscreen();
                        setCrackSheet(null);
                      }}
                    >
                      {fsElement() ? 'Exit full screen' : '⛶ Full screen'}
                    </button>
                  )}
                </div>
                <div className="tm-crack-start-actions" style={{ marginTop: 8 }}>
                  <button type="button" onClick={() => setCrackSheet(null)}>
                    Keep pranking
                  </button>
                  <button
                    type="button"
                    className="is-go"
                    onClick={() => {
                      if (fsElement()) exitFullscreen();
                      onExitBossMode();
                    }}
                  >
                    Exit prank
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tm-boss-overlay" role="dialog" aria-label="Enterprise Productivity Portal">
      {toolbarHidden && (
        <div className="tm-boss-floating-unhide">
          <button
            type="button"
            className="tm-boss-floating-btn"
            onClick={() => setToolbarHidden(false)}
          >
            👁️ Controls
          </button>
          <button
            type="button"
            className="tm-boss-floating-btn"
            onClick={onExitBossMode}
          >
            ✕ Exit (Esc)
          </button>
        </div>
      )}

      {/* Top Corporate Bar with 6-Tab Stealth Disguise Switcher */}
      {!toolbarHidden && (
        <div
          className="tm-boss-topbar"
          style={{
            background:
              disguise === 'terminal'
                ? '#0f172a'
                : disguise === 'zoom'
                  ? '#1e293b'
                  : disguise === 'ai'
                    ? '#312e81'
                    : disguise === 'update' || disguise === 'bsod'
                      ? '#0067b8'
                      : disguise === 'secretsanta'
                        ? '#7f1d1d'
                        : '#107c41'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <strong>
              {disguise === 'excel' && '📊 Q4_Enterprise_Cloud_Synergy_Forecast_2026.xlsx'}
              {disguise === 'terminal' && '💻 root@prod-k8s-cluster-09: ~/enterprise-monolith'}
              {disguise === 'zoom' && '📹 Executive Q4 Architecture Sync (Recording...)'}
              {disguise === 'ai' && '🤖 SynergyGPT Enterprise Copilot v5.4 (SOC2 Verified)'}
              {disguise === 'update' && '🔄 Enterprise OS Security Patch KB5042069'}
              {disguise === 'bsod' && '💀 System Kernel Diagnostic Utility'}
              {disguise === 'secretsanta' && '🎁 NorthPoleHR — Office Secret Santa Draw (Parody)'}
            </strong>
            {secretXpEarned > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(255,255,255,0.18)',
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}
                title="You are secretly earning Arcade XP while pretending to work!"
              >
                🕵️ Stealth XP Mined: +{secretXpEarned} XP
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {DISGUISE_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectDisguise(m.id)}
                style={{
                  background: disguise === m.id ? '#ffffff' : 'rgba(255,255,255,0.16)',
                  color: disguise === m.id ? '#0f172a' : '#ffffff',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {m.label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleSharePrankScreen}
              style={{
                background: copiedPrankLink ? '#16a34a' : 'rgba(255,255,255,0.22)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.35)',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Copy or Share direct URL for this exact prank / boss screen"
            >
              {copiedPrankLink ? '✅ Link Copied!' : '🔗 Share Screen'}
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              style={{
                background: 'rgba(255,255,255,0.22)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Toggle browser fullscreen (or press F11 on desktop)"
            >
              {isFullscreen ? '⛶ Exit Fullscreen' : '⛶ F11 Fullscreen'}
            </button>

            <button
              type="button"
              onClick={() => setToolbarHidden(true)}
              style={{
                background: 'rgba(15,23,42,0.4)',
                color: '#ffffff',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Hide this toolbar for a realistic edge-to-edge screen"
            >
              👁️ Hide Bar
            </button>

            <button
              type="button"
              className="tm-boss-exit-btn"
              onClick={onExitBossMode}
            >
              ⚡ Coast is Clear! (Esc)
            </button>
          </div>
        </div>
      )}

      {showFullscreenTip && !toolbarHidden && (
        <div className="tm-boss-prank-tip">
          <span>
            💡 <strong>Fullscreen Prank Tip:</strong> Press <strong>F11</strong> (or <strong>Ctrl+Cmd+F</strong> on Mac) or tap <strong>⛶ F11 Fullscreen</strong> + <strong>👁️ Hide Bar</strong> for an authentic edge-to-edge screen. Click anywhere to advance %, or press <strong>Esc</strong> to exit to THE MEMES.net.
          </span>
          <div className="tm-boss-prank-tip-actions">
            <button
              type="button"
              className="tm-boss-tip-btn"
              onClick={() => {
                setToolbarHidden(true);
                setShowFullscreenTip(false);
                handleToggleFullscreen();
              }}
            >
              🚀 Go Fullscreen Now
            </button>
            <button
              type="button"
              className="tm-boss-tip-close"
              onClick={() => setShowFullscreenTip(false)}
              aria-label="Dismiss fullscreen tip"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* DISGUISE 1: INTERACTIVE EXCEL SPREADSHEET */}
      {disguise === 'excel' && (
        <>
          <div className="tm-boss-formula-bar" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="tm-boss-cell-ref">{selectedCell}</span>
            <span style={{ flex: 1 }}>
              fx =SUM(C2:C7)*VLOOKUP(&quot;SYNERGY_MULTIPLIER&quot;, A1:G12, 4, FALSE)
            </span>
            <button
              type="button"
              onClick={handleRecalculateExcel}
              style={{
                background: '#107c41',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              📈 Run Monte Carlo Audit (+15 Stealth XP)
            </button>
            {memes && memes.length > 0 && (
              <button
                type="button"
                onClick={() => setRevealedMeme(memes[0])}
                style={{
                  background: '#047857',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: '6px'
                }}
              >
                📎 Cell D9 (Meme)
              </button>
            )}
          </div>

          <div className="tm-boss-table-wrap">
            <table className="tm-boss-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>A — Fiscal Period</th>
                  <th>B — Cost Center</th>
                  <th>C — Actual Allocation</th>
                  <th>D — Baseline Forecast</th>
                  <th>E — Variance (%)</th>
                  <th>F — Audit Status</th>
                  <th>G — Stakeholder</th>
                </tr>
              </thead>
              <tbody>
                {excelRows.map((r, i) => (
                  <tr
                    key={r[0]}
                    onClick={() => {
                      setSelectedCell(`C${i + 2}`);
                      earnStealthXp(10);
                    }}
                    style={{ cursor: 'cell' }}
                  >
                    <td>{i + 1}</td>
                    <td>{r[0]}</td>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td>{r[3]}</td>
                    <td
                      style={{
                        color: r[4].startsWith('+') ? '#15803d' : '#b91c1c',
                        fontWeight: 700
                      }}
                    >
                      {r[4]}
                    </td>
                    <td>{r[5]}</td>
                    <td>{r[6]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                marginTop: '14px',
                padding: '10px 12px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <span>📌 {corporateNote}</span>
              <span>Sheet 1 of 14 • Click any cell to mine Stealth XP</span>
            </div>
          </div>
        </>
      )}

      {/* DISGUISE 2: DEVOPS / LINUX KERNEL TERMINAL */}
      {disguise === 'terminal' && (
        <div
          onClick={handleAppendTerminalLog}
          style={{
            flex: 1,
            background: '#090d16',
            color: '#4ade80',
            fontFamily: 'Consolas, "Courier New", monospace',
            padding: '20px',
            fontSize: '13px',
            lineHeight: 1.6,
            overflowY: 'auto',
            cursor: 'text'
          }}
        >
          <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
            Linux prod-k8s-node-09 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux
            <br />
            CPU: [||||||||||||||...... 68.4%] • MEM: [|||||||||||......... 54.2GB/128GB] • SWP: [0.0%]
            <br />
            Tap anywhere or press any keyboard key to compile fake production microservices (+15 Stealth XP)...
          </div>
          {termLogs.map((line, idx) => (
            <div key={idx} style={{ marginBottom: '4px' }}>
              {line}
            </div>
          ))}
          <div style={{ marginTop: '10px', color: '#38bdf8', fontWeight: 700 }}>
            root@prod-k8s-cluster-09:~# cargo build --release --features &quot;quantum-synergy&quot; █
          </div>
        </div>
      )}

      {/* DISGUISE 3: GENERIC VIDEO MEETING STANDUP CALL (no real app names or logos) */}
      {disguise === 'zoom' && (
        <div
          style={{
            flex: 1,
            background: meetingApp === 'teams' ? '#141418' : '#0f172a',
            color: '#f8fafc',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowY: 'auto',
            position: 'relative'
          }}
        >
          {/* Meeting App Header Bar (Teams vs Zoom Switcher) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: meetingApp === 'teams' ? '#29293a' : '#1e293b',
              border: `1px solid ${meetingApp === 'teams' ? '#6d4fc2' : '#2563eb'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700 }}>
              <span
                style={{
                  background: meetingApp === 'teams' ? '#6d4fc2' : '#2d8cff',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}
              >
                {meetingApp === 'teams' ? 'Team Call' : 'Video Meeting'}
              </span>
              <span>🔴 REC 00:42:19 · Q4 Architecture &amp; Budget Alignment (4)</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setMeetingApp((app) => (app === 'teams' ? 'zoom' : 'teams'))}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🔄 Switch to {meetingApp === 'teams' ? 'Video Meeting style' : 'Team Call style'}
              </button>
              <button
                type="button"
                onClick={() => {
                  earnStealthXp(15);
                  sfx.playTeamsRingtone?.();
                  setCallReplyToast('');
                  setIncomingBossCall(true);
                }}
                style={{
                  background: '#6d4fc2',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📞 Trigger Incoming Boss Call
              </button>
            </div>
          </div>

          {callReplyToast && (
            <div
              style={{
                marginBottom: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid #22c55e',
                color: '#86efac',
                fontSize: '12px',
                fontWeight: 700,
                textAlign: 'center'
              }}
            >
              {callReplyToast}
            </div>
          )}

          {/* Simulated Incoming Boss Call Prank Toast Modal */}
          {incomingBossCall && (
            <div
              style={{
                position: 'fixed',
                bottom: '26px',
                right: '26px',
                zIndex: 999999,
                width: 'min(320px, calc(100vw - 32px))',
                padding: '16px',
                borderRadius: '12px',
                background: meetingApp === 'teams' ? '#242436' : '#1e293b',
                border: `2px solid ${meetingApp === 'teams' ? '#8b6ff0' : '#38bdf8'}`,
                boxShadow: '0 14px 36px rgba(0, 0, 0, 0.75)',
                color: '#ffffff'
              }}
            >
              <div style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 800, marginBottom: '4px' }}>
                {meetingApp === 'teams' ? '🟣 INCOMING TEAM CALL' : '🔵 INCOMING MEETING INVITE'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#4f46e5',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    fontSize: '15px'
                  }}
                >
                  RV
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '14px' }}>Richard Vance (VP of Synergy)</strong>
                  <span style={{ fontSize: '11px', color: '#cbd5e1' }}>&ldquo;Quick 5-min sync before EOD?&rdquo;</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    earnStealthXp(15);
                    setIncomingBossCall(false);
                    setActiveBuzzword('"Joining audio now — just unmuting while looking at the Q4 deck..."');
                  }}
                  style={{
                    flex: 1,
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  📞 Accept
                </button>
                <button
                  type="button"
                  onClick={() => {
                    earnStealthXp(15);
                    setIncomingBossCall(false);
                    setCallReplyToast('💬 Auto-replied: "On a client production sync — will circle back in 15 mins!"');
                  }}
                  style={{
                    flex: 1,
                    background: '#334155',
                    color: '#fff',
                    border: 'none',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  💬 I&apos;m Busy
                </button>
                <button
                  type="button"
                  onClick={() => setIncomingBossCall(false)}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px'
            }}
          >
            {[
              { name: 'Sarah Jenkins (VP of Synergy)', status: '🟢 Speaking...', initials: 'SJ', bg: '#1e3a8a' },
              { name: 'Dave (Compliance & Legal)', status: '🔇 Muted', initials: 'DC', bg: '#334155' },
              { name: 'Kevin (Principal Architect)', status: '🖥️ Sharing Screen', initials: 'KP', bg: '#1e293b' },
              {
                name: 'You (Senior IC)',
                status: webcamFrozen ? '⚠️ Reconnecting (Poor Bandwidth...)' : '🔇 Muted • Camera Off',
                initials: 'ME',
                bg: webcamFrozen ? '#7c2d12' : '#064e3b'
              }
            ].map((p) => (
              <div
                key={p.name}
                style={{
                  background: p.bg,
                  border: p.status.includes('Speaking') ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  height: '170px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  padding: '12px'
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 800,
                    marginBottom: '8px'
                  }}
                >
                  {p.initials}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, textAlign: 'center' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>{p.status}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              margin: '16px 0',
              padding: '14px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '10px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              💬 LIVE TRANSCRIPT (CLOSED CAPTIONS):
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>{activeBuzzword}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                earnStealthXp(15);
                setActiveBuzzword(
                  BUZZWORD_EXCUSES[Math.floor(Math.random() * BUZZWORD_EXCUSES.length)]
                );
              }}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✋ Say Corporate Buzzword (+15 Stealth XP)
            </button>
            <button
              type="button"
              onClick={() => {
                earnStealthXp(15);
                setWebcamFrozen((prev) => !prev);
              }}
              style={{
                background: '#d97706',
                color: '#fff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {webcamFrozen ? '📶 Restore Connection' : '🧊 Fake Tunnel Lag / Freeze Video'}
            </button>
            <button
              type="button"
              onClick={onExitBossMode}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              📞 Leave Meeting (Return to Memes)
            </button>
          </div>
        </div>
      )}

      {/* DISGUISE 4: ENTERPRISE AI COPILOT WORKSPACE */}
      {disguise === 'ai' && (
        <div
          style={{
            flex: 1,
            background: '#f8fafc',
            color: '#0f172a',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              paddingBottom: '12px',
              borderBottom: '1px solid #cbd5e1'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1e1b4b' }}>
                🤖 SynergyGPT Enterprise Copilot — Q4 Strategic Planning Workspace
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Connected to Internal Confluence, Jira &amp; Executive OKR Graph
              </span>
            </div>
            <button
              type="button"
              onClick={handleGenerateAiMemo}
              style={{
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✨ Generate Q4 Executive Deliverable (+15 Stealth XP)
            </button>
          </div>

          {aiMessages.map((msg, i) => (
            <div
              key={msg.id || i}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '14px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', marginBottom: '6px' }}>
                PROMPT: &ldquo;{msg.prompt}&rdquo;
              </div>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: '13px',
                  lineHeight: 1.55,
                  color: '#1e293b'
                }}
              >
                {msg.response}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* DISGUISE 5: FAKE OS SYSTEM UPDATE SCREEN */}
      {disguise === 'update' && (
        <div
          onClick={() => {
            setUpdatePct((p) => (p >= 99 ? 12 : p + 1));
            earnStealthXp(15);
          }}
          style={{
            flex: 1,
            background: '#0067b8',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px',
            cursor: 'progress',
            userSelect: 'none'
          }}
        >
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '26px', fontWeight: 300, marginBottom: '8px' }}>
            Working on updates {updatePct}% complete
          </div>
          <div style={{ fontSize: '18px', fontWeight: 300, opacity: 0.9 }}>
            Don&apos;t turn off your PC. This will take a while.
          </div>
          <div style={{ fontSize: '12px', opacity: 0.65, marginTop: '36px' }}>
            Your device will restart several times. (Tap screen to advance % + mine Stealth XP)
          </div>
        </div>
      )}

      {/* DISGUISE 6: FAKE BLUE CRASH SCREEN (generic, no OS logos or links) */}
      {disguise === 'bsod' && (
        <div
          onClick={() => {
            setBsodPct((p) => (p >= 100 ? 0 : p + 10));
            earnStealthXp(15);
          }}
          style={{
            flex: 1,
            background: '#0078d7',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 'clamp(24px, 8vw, 10%) clamp(20px, 6vw, 14%)',
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ fontSize: 'clamp(56px, 12vw, 96px)', fontWeight: 300, lineHeight: 1, marginBottom: '24px' }}>
            :(
          </div>
          <div style={{ fontSize: '24px', fontWeight: 400, maxWidth: '680px', lineHeight: 1.45 }}>
            Your device ran into a problem and needs to restart. We&apos;re just collecting some error
            info, and then we&apos;ll restart for you.
          </div>
          <div style={{ fontSize: '22px', marginTop: '24px', marginBottom: '32px' }}>
            {bsodPct}% complete
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '84px',
                height: '84px',
                background: '#ffffff',
                color: '#0078d7',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                fontSize: '11px',
                textAlign: 'center',
                padding: '6px'
              }}
            >
              [QR: IT TICKET #42069]
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.6, opacity: 0.92 }}>
              <div>For more information about this issue and possible fixes, visit thememes.net/prank-screens</div>
              <div>If you call a support person, give them this info:</div>
              <div style={{ fontWeight: 700 }}>
                Stop code: CRITICAL_SYNERGY_OVERFLOW_EXCEPTION (0x00000420)
              </div>
              <div style={{ opacity: 0.75, marginTop: '4px' }}>
                (Tap anywhere to mine +15 Stealth XP while telling your boss &ldquo;IT pushed a bad patch&rdquo;)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISGUISE 9: OFFICE SECRET SANTA PRANK (clearly marked parody) */}
      {disguise === 'secretsanta' && (
        <div
          data-testid="secret-santa-prank"
          style={{
            flex: 1,
            background: 'linear-gradient(155deg, #2a0a12 0%, #450a1a 52%, #0a2e1f 100%)',
            color: '#fffbeb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 14px',
            overflowY: 'auto',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <div
            style={{
              width: 'min(100%, 470px)',
              boxSizing: 'border-box',
              background: 'rgba(17, 10, 24, 0.92)',
              border: '2px solid rgba(250, 204, 21, 0.55)',
              borderRadius: '20px',
              padding: '22px 18px',
              boxShadow: '0 20px 44px rgba(0, 0, 0, 0.55)',
              display: 'grid',
              gap: '14px',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid rgba(252, 165, 165, 0.5)',
                  color: '#fecaca'
                }}
              >
                🎄 PARODY PRANK · NORTHPOLEHR
              </span>
              <span style={{ fontSize: '12px', color: '#fde047', fontWeight: 700 }}>
                Draw #2026-12-HR
              </span>
            </div>

            <div style={{ fontSize: '46px', lineHeight: 1 }} aria-hidden="true">
              🎅🎁
            </div>

            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 25px)', color: '#fef08a', lineHeight: 1.2 }}>
              Office Secret Santa: You&apos;ve been assigned…
            </h1>

            <div
              style={{
                background: 'linear-gradient(135deg, rgba(185, 28, 28, 0.35), rgba(21, 128, 61, 0.28))',
                border: '1px solid rgba(253, 224, 71, 0.45)',
                borderRadius: '14px',
                padding: '14px'
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.02em' }}>
                👔 YOUR BOSS
              </div>
              <div style={{ fontSize: '13px', color: '#fde68a', marginTop: '4px', fontWeight: 600 }}>
                Chief Synergy Officer · Executive Corner Office
              </div>
              <div style={{ fontSize: '12px', color: '#bbf7d0', marginTop: '6px' }}>
                Strict Budget: £15.00 max (itemised HR receipt mandatory)
              </div>
            </div>

            {santaRedraws > 0 && (
              <div
                role="status"
                style={{
                  fontSize: '13px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(250, 204, 21, 0.14)',
                  border: '1px solid rgba(250, 204, 21, 0.4)',
                  color: '#fef08a',
                  fontWeight: 700
                }}
              >
                {santaRedraws === 1
                  ? '🔄 Redraw #1 rejected: Conflict-of-interest check says… STILL YOUR BOSS.'
                  : santaRedraws === 2
                    ? '🔄 Redraw #2 blocked: Randomizer algorithm locked by Upper Management — STILL YOUR BOSS.'
                    : `🔄 Redraw #${santaRedraws}: Nice try. Please bring artisanal mince pies on Friday.`}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setSantaRedraws((c) => c + 1);
                  sfx.playHoHoHo?.();
                  earnStealthXp(15);
                }}
                style={{
                  minHeight: '44px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  flex: '1 1 170px'
                }}
              >
                🎲 Request HR Redraw
              </button>
              <button
                type="button"
                onClick={() => {
                  setSantaWishlistOpen((v) => !v);
                  sfx.playJingleBells?.();
                  earnStealthXp(10);
                }}
                style={{
                  minHeight: '44px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(250, 204, 21, 0.5)',
                  background: 'rgba(250, 204, 21, 0.14)',
                  color: '#fef08a',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  flex: '1 1 160px'
                }}
              >
                {santaWishlistOpen ? 'Hide Boss Wishlist' : '🎁 Peek Boss Wishlist'}
              </button>
            </div>

            {santaWishlistOpen && (
              <ul
                style={{
                  margin: 0,
                  padding: '10px 14px 10px 26px',
                  textAlign: 'left',
                  fontSize: '13px',
                  lineHeight: 1.55,
                  color: '#e5e7eb',
                  background: 'rgba(0, 0, 0, 0.28)',
                  borderRadius: '10px'
                }}
              >
                <li>&ldquo;A 10x Q4 with zero unplanned Friday deploys&rdquo;</li>
                <li>&ldquo;World&apos;s Most Synergistic Boss mug (receipt attached)&rdquo;</li>
                <li>&ldquo;Two fewer Slack threads asking if this could be an email&rdquo;</li>
              </ul>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: '12px', color: '#cbd5e1' }}>
              <span>Parody screen · no real HR data</span>
              <button
                type="button"
                onClick={() => onExitBossMode?.()}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.28)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✕ Exit Parody (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {revealedMeme && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#090d1a',
            border: '2px solid #00f3ff',
            padding: '12px',
            borderRadius: '12px',
            zIndex: 999999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.85)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '11px', color: '#00f3ff', fontWeight: 900, gap: '12px' }}>
            <span>🕵️ SECRET MEME UNLOCKED</span>
            <button
              type="button"
              onClick={() => setRevealedMeme(null)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>
          <img
            src={revealedMeme.poster_url || revealedMeme.image_url}
            alt=""
            style={{ maxWidth: '180px', maxHeight: '180px', display: 'block', borderRadius: '6px', objectFit: 'contain' }}
          />
          <div style={{ fontSize: '10.5px', color: '#facc15', marginTop: '6px', fontWeight: 700 }}>
            @{revealedMeme.author_name}
          </div>
        </div>
      )}
    </div>
  );
}
