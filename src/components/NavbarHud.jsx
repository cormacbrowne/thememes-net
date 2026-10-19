export default function NavbarHud({
  comboTimer,
  combo,
  dbStatus,
  currentRank,
  xp,
  xpProgress,
  crtOn,
  onToggleCrt,
  soundOn,
  onToggleSound,
  onOpenBlankStudio,
  onOpenLeaderboard,
  onOpenProfile,
  user,
  onLogout,
  onOpenAuthModal,
  onResetFeed
}) {
  return (
    <>
      {/* COMBO TIMER PROGRESS BAR */}
      <div className="tm-combo-bar">
        <div
          className={`tm-combo-fill ${combo >= 3 ? 'overdrive' : ''}`}
          style={{ width: `${comboTimer}%` }}
        />
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="tm-nav">
        <div className="tm-brand" onClick={onResetFeed}>
          <div className="tm-logo-badge">THE MEMES.net</div>
          <div className="tm-status-pill" title="Connected to Supabase project otvvphmjojqyjaznjzyo">
            <span className={`tm-dot ${dbStatus === 'live' ? 'live' : 'local'}`} />
            {dbStatus === 'live' ? 'SUPABASE LIVE' : 'ARCADE READY'}
          </div>
        </div>

        <div className="tm-hud">
          <div className={`tm-combo-badge ${combo >= 3 ? 'hot' : ''}`}>
            {combo > 1 ? `🔥 ${combo}x OVERDRIVE` : '⚡ 1x COMBO'}
          </div>

          <div
            className="tm-xp-box"
            style={{ cursor: 'pointer' }}
            onClick={() => onOpenProfile(user?.username || 'You (Arcade Player)')}
            title="Click to inspect your Arcade Player Card & Badges"
          >
            <div className="tm-xp-top">
              <span>
                Lv.{currentRank.level} {currentRank.title}
              </span>
              <span style={{ color: '#facc15' }}>{xp} XP</span>
            </div>
            <div className="tm-xp-track">
              <div className="tm-xp-bar" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          <button
            type="button"
            className="tm-btn"
            onClick={onOpenLeaderboard}
            title="Open Cyber-Arcade Hall of Fame Leaderboard"
          >
            🏆 Ranks
          </button>

          <button
            type="button"
            className={`tm-btn ${crtOn ? 'tm-btn-crt-active' : ''}`}
            onClick={onToggleCrt}
            title="Toggle Retro CRT Scanline & Phosphor Shader"
          >
            {crtOn ? '📺 CRT: ON' : '📺 CRT: OFF'}
          </button>

          <button type="button" className="tm-btn" onClick={onToggleSound}>
            {soundOn ? '🔊 SFX' : '🔇 MUTE'}
          </button>

          <button type="button" className="tm-btn tm-btn-primary" onClick={onOpenBlankStudio}>
            + Upload / Create
          </button>

          {user ? (
            <div style={{ display: 'inline-flex', gap: '4px' }}>
              <button
                type="button"
                className="tm-btn"
                onClick={() => onOpenProfile(user.username)}
                title="View your Arcade Player Card"
              >
                👾 @{user.username}
              </button>
              <button
                type="button"
                className="tm-btn"
                onClick={onLogout}
                title="Log out"
                style={{ padding: '9px 10px' }}
              >
                🚪
              </button>
            </div>
          ) : (
            <button type="button" className="tm-btn" onClick={onOpenAuthModal}>
              Log in / Sign up
            </button>
          )}
        </div>
      </header>
    </>
  );
}
