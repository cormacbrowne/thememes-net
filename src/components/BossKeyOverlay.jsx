import { useState, useEffect } from 'react';

const DISGUISE_MODES = [
  { id: 'excel', label: '📊 Excel Sheet' },
  { id: 'terminal', label: '💻 DevOps Terminal' },
  { id: 'zoom', label: '📹 Zoom Standup' },
  { id: 'update', label: '🔄 OS Update' }
];

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
  '[09:41:07 UTC] INFO   prometheus-scraper: Ingested 142,850 metrics/sec — 0 anomalies detected',
  '[09:41:08 UTC] OK    git-ops-runner: Merged PR #4209 "Refactor microservice telemetry buffer"'
];

const BUZZWORD_EXCUSES = [
  '"Let’s double-click on that holistic deliverable in Q4."',
  '"We need to move the needle on cross-functional bandwidth before we boil the ocean."',
  '"I’ll circle back offline and ping the stakeholders to align our North Star KPIs."',
  '"From a 30,000-foot view, this paradigm shift is low-hanging fruit for our EBITDA."'
];

export default function BossKeyOverlay({ onExitBossMode, onSecretWorkXp }) {
  const [disguise, setDisguise] = useState('excel');
  const [selectedCell, setSelectedCell] = useState('C6');
  const [excelRows, setExcelRows] = useState(INITIAL_EXCEL_ROWS);
  const [corporateNote, setCorporateNote] = useState(
    'Ready — All enterprise macros verified by Internal Audit.'
  );
  const [termLogs, setTermLogs] = useState(FAKE_TERMINAL_LINES);
  const [updatePct, setUpdatePct] = useState(69);
  const [secretXpEarned, setSecretXpEarned] = useState(0);
  const [activeBuzzword, setActiveBuzzword] = useState(BUZZWORD_EXCUSES[0]);

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

  // Number keys 1-4 switch disguises; typing in terminal adds fake code lines
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '1') setDisguise('excel');
      else if (e.key === '2') setDisguise('terminal');
      else if (e.key === '3') setDisguise('zoom');
      else if (e.key === '4') setDisguise('update');
      else if (disguise === 'terminal' && e.key !== 'Escape') {
        handleAppendTerminalLog();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="tm-boss-overlay" role="dialog" aria-label="Enterprise Productivity Portal">
      {/* Top Corporate Bar with Stealth Disguise Switcher */}
      <div
        className="tm-boss-topbar"
        style={{
          background:
            disguise === 'terminal'
              ? '#0f172a'
              : disguise === 'zoom'
                ? '#1e293b'
                : disguise === 'update'
                  ? '#0067b8'
                  : '#107c41'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <strong>
            {disguise === 'excel' && '📊 Q4_Enterprise_Cloud_Synergy_Forecast_2026.xlsx'}
            {disguise === 'terminal' && '💻 root@prod-k8s-cluster-09: ~/enterprise-monolith'}
            {disguise === 'zoom' && '📹 Executive Q4 Architecture Sync (Recording...)'}
            {disguise === 'update' && '🔄 Enterprise OS Security Patch KB5042069'}
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
              onClick={() => setDisguise(m.id)}
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
            className="tm-boss-exit-btn"
            onClick={onExitBossMode}
          >
            ⚡ Coast is Clear! (Esc)
          </button>
        </div>
      </div>

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

      {/* DISGUISE 3: CORPORATE ZOOM / TEAMS STANDUP CALL */}
      {disguise === 'zoom' && (
        <div
          style={{
            flex: 1,
            background: '#0f172a',
            color: '#f8fafc',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowY: 'auto'
          }}
        >
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
              { name: 'You (Senior IC)', status: '🔇 Muted • Camera Off', initials: 'ME', bg: '#064e3b' }
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

      {/* DISGUISE 4: FAKE OS SYSTEM UPDATE SCREEN */}
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
    </div>
  );
}
