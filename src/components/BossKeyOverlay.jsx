export default function BossKeyOverlay({ onExitBossMode }) {
  const rows = [
    ['Q1-2026', 'North America Cloud Ops', '$1,420,690.00', '$1,380,110.00', '+2.94%', 'On Track'],
    ['Q2-2026', 'Cross-Platform Synergy KPI', '$892,400.00', '$910,000.00', '-1.93%', 'Under Review'],
    ['Q3-2026', 'Enterprise Bandwidth Allocation', '$2,150,000.00', '$1,985,400.00', '+8.29%', 'Approved'],
    ['Q4-2026', 'Kubernetes Cluster Depreciation', '$640,120.00', '$622,800.00', '+2.78%', 'Audited'],
    ['FY-2026', 'Total Consolidated EBITDA', '$5,103,210.00', '$4,898,310.00', '+4.18%', 'Verified']
  ];

  return (
    <div className="tm-boss-overlay" role="dialog" aria-label="Enterprise Spreadsheet View">
      <div className="tm-boss-topbar">
        <div>
          <strong>📊 Q4_Enterprise_Cloud_Synergy_Forecast_2026.xlsx</strong> — Read-Only Corporate Portal
        </div>
        <button
          type="button"
          className="tm-boss-exit-btn"
          onClick={onExitBossMode}
        >
          ⚡ Coast is Clear! Return to Memes (Esc)
        </button>
      </div>

      <div className="tm-boss-formula-bar">
        <span className="tm-boss-cell-ref">fx</span>
        <span>=SUM(C2:C6)*VLOOKUP(&quot;SYNERGY_MULTIPLIER&quot;, A1:F12, 4, FALSE)</span>
      </div>

      <div className="tm-boss-table-wrap">
        <table className="tm-boss-table">
          <thead>
            <tr>
              <th>#</th>
              <th>A — Fiscal Period</th>
              <th>B — Department Cost Center</th>
              <th>C — Actual Allocation</th>
              <th>D — Baseline Forecast</th>
              <th>E — Variance (%)</th>
              <th>F — Audit Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r[0]}>
                <td>{i + 1}</td>
                <td>{r[0]}</td>
                <td>{r[1]}</td>
                <td>{r[2]}</td>
                <td>{r[3]}</td>
                <td style={{ color: r[4].startsWith('+') ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                  {r[4]}
                </td>
                <td>{r[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
