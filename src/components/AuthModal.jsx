export default function AuthModal({
  authMode,
  setAuthMode,
  authUsername,
  setAuthUsername,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authMessage,
  onQuickGuestLogin,
  onAuthSubmit,
  onClose
}) {
  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal"
        style={{ maxWidth: '420px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="tm-modal-sticky-header"
          style={{
            marginBottom: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: '19px' }}>
              {authMode === 'login' ? '👾 Log In' : '🚀 Sign Up'}
            </h2>
          </div>
          <button type="button" className="tm-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div
          style={{
            background: 'rgba(250, 204, 21, 0.1)',
            border: '1px solid rgba(250, 204, 21, 0.3)',
            padding: '12px',
            borderRadius: '12px',
            marginBottom: '16px'
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#facc15',
              marginBottom: '6px'
            }}
          >
            ⚡ INSTANT ARCADE ACCESS (NO EMAIL NEEDED)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="tm-input"
              placeholder="Pick a Memer Handle..."
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
            />
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              onClick={onQuickGuestLogin}
            >
              Go!
            </button>
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            fontSize: '11px',
            color: '#64748b',
            margin: '10px 0'
          }}
        >
          — OR USE SUPABASE EMAIL AUTH —
        </div>

        <form
          onSubmit={onAuthSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <input
            type="email"
            required
            className="tm-input"
            placeholder="Email address"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
          />
          <input
            type="password"
            required
            className="tm-input"
            placeholder="Password (min 6 chars)"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
          />
          {authMessage && (
            <div style={{ fontSize: '12px', color: '#facc15' }}>{authMessage}</div>
          )}
          <button
            type="submit"
            className="tm-btn tm-btn-primary"
            style={{ justifyContent: 'center', padding: '11px' }}
          >
            {authMode === 'login' ? 'Log In with Supabase' : 'Create Account'}
          </button>
        </form>

        <div
          style={{
            marginTop: '12px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#94a3b8'
          }}
        >
          {authMode === 'login' ? (
            <>
              Need an account?{' '}
              <span
                style={{ color: '#facc15', cursor: 'pointer', fontWeight: 700 }}
                onClick={() => setAuthMode('signup')}
              >
                Sign up
              </span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span
                style={{ color: '#facc15', cursor: 'pointer', fontWeight: 700 }}
                onClick={() => setAuthMode('login')}
              >
                Log in
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
