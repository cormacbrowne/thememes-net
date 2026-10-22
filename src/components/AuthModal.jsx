import { useState, useMemo, useEffect } from 'react';
import {
  SUPABASE_OAUTH_CALLBACK_URL,
  fetchSupabaseAuthSettings
} from '../supabaseClient';

const SOCIAL_PROVIDERS = [
  {
    id: 'google',
    name: 'Continue with Google',
    shortName: 'Google',
    bg: '#1e293b',
    color: '#f8fafc',
    border: 'rgba(255,255,255,0.22)',
    badgeIcon: '🌐',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.31 0 3.25 2.69 1.28 6.61l3.77 2.93C5.94 6.89 8.72 5 12 5z"
        />
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.92c2.2-2.03 3.66-5.02 3.66-8.74z"
        />
        <path
          fill="#FBBC05"
          d="M5.05 14.46C4.8 13.68 4.66 12.86 4.66 12s.14-1.68.39-2.46L1.28 6.61C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l3.77-2.93z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.76-2.92c-1.08.72-2.45 1.16-4.17 1.16-3.28 0-6.06-1.89-6.95-4.54l-3.77 2.93C3.25 21.31 7.31 24 12 24z"
        />
      </svg>
    )
  },
  {
    id: 'discord',
    name: 'Continue with Discord',
    shortName: 'Discord',
    bg: '#5865F2',
    color: '#ffffff',
    border: '#5865F2',
    badgeIcon: '🎮',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
      </svg>
    )
  },
  {
    id: 'facebook',
    name: 'Continue with Facebook',
    shortName: 'Facebook',
    bg: '#1877F2',
    color: '#ffffff',
    border: '#1877F2',
    badgeIcon: '📘',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    )
  }
];

function evaluatePasswordStrength(pw = '') {
  if (!pw) return { score: 0, label: 'Enter a password', color: '#64748b' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) return { score: 25, label: '⚠️ Weak (Add numbers & symbols)', color: '#ef4444' };
  if (score === 2) return { score: 50, label: '🛡️ Fair (Use 8+ mixed chars)', color: '#facc15' };
  if (score === 3) return { score: 75, label: '🔒 Strong Password', color: '#38bdf8' };
  return { score: 100, label: '⚡ Cyber-Fortress Grade', color: '#22c55e' };
}

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
  onSocialOAuthLogin,
  onMagicLinkSubmit,
  onQuickGuestLogin,
  onAuthSubmit,
  onClose
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [providerSettings, setProviderSettings] = useState(null);
  const [copiedUri, setCopiedUri] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const pwStrength = useMemo(() => evaluatePasswordStrength(authPassword), [authPassword]);

  const loadProviderStatus = async (force = false) => {
    setCheckingStatus(true);
    const data = await fetchSupabaseAuthSettings(force);
    if (data?.external) {
      setProviderSettings(data.external);
    }
    setCheckingStatus(false);
  };

  useEffect(() => {
    let active = true;
    fetchSupabaseAuthSettings(false).then((data) => {
      if (active && data?.external) {
        setProviderSettings(data.external);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleProviderClick = async (provider) => {
    setOauthLoadingProvider(provider.id);
    if (onSocialOAuthLogin) {
      await onSocialOAuthLogin(provider);
    }
    setOauthLoadingProvider(null);
  };

  const handleCopyCallbackUrl = () => {
    navigator.clipboard?.writeText(SUPABASE_OAUTH_CALLBACK_URL).catch(() => {});
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2500);
  };

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal tm-auth-modal"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tm-modal-sticky-header" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: '18px' }}>
              🛡️ Arcade Identity & OAuth 2.0
            </h2>
          </div>
          <button type="button" className="tm-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {/* Security Status Banner */}
        <div className="tm-auth-security-banner">
          <span>🔒 PKCE Session + Instant Arcade Sign-In</span>
          <button
            type="button"
            className="tm-verified-pill"
            style={{ cursor: 'pointer', border: '1px solid #00f3ff' }}
            onClick={() => setShowSetupWizard((p) => !p)}
          >
            {showSetupWizard ? '← Back to Login' : '🛠️ OAuth Setup Guide'}
          </button>
        </div>

        {/* OPTIONAL HANDLE CUSTOMIZER FOR INSTANT LOGIN */}
        {!showSetupWizard && (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#94a3b8',
                  marginBottom: '5px'
                }}
              >
                🎮 CHOOSE YOUR CREATOR HANDLE (OPTIONAL — AUTO-FILLED IF BLANK):
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="tm-input"
                  placeholder="e.g. CyberKing99, DankLord, PixelNinja..."
                  maxLength={20}
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                />
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={onQuickGuestLogin}
                  title="Instant 1-Click Arcade Login with this handle!"
                >
                  ⚡ Instant Enter
                </button>
              </div>
            </div>

            {/* 1-CLICK SOCIAL OAUTH BUTTONS (GOOGLE, DISCORD, FACEBOOK) */}
            <div className="tm-oauth-grid">
              {SOCIAL_PROVIDERS.map((provider) => {
                const isLiveOAuth = Boolean(providerSettings?.[provider.id]);
                return (
                  <button
                    key={provider.id}
                    type="button"
                    className="tm-oauth-btn"
                    style={{
                      background: provider.bg,
                      color: provider.color,
                      borderColor: provider.border,
                      justifyContent: 'space-between'
                    }}
                    disabled={oauthLoadingProvider === provider.id}
                    onClick={() => handleProviderClick(provider)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                      <span className="tm-oauth-icon">{provider.svg}</span>
                      <span>
                        {oauthLoadingProvider === provider.id
                          ? `Connecting ${provider.shortName}...`
                          : provider.name}
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        padding: '2px 7px',
                        borderRadius: '999px',
                        background: isLiveOAuth
                          ? 'rgba(34, 197, 94, 0.25)'
                          : 'rgba(0, 0, 0, 0.28)',
                        color: isLiveOAuth ? '#4ade80' : 'inherit',
                        opacity: 0.9
                      }}
                    >
                      {isLiveOAuth ? '🟢 LIVE OAUTH' : '⚡ INSTANT +150 XP'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="tm-auth-divider">
              <span>OR EMAIL / PASSWORD / MAGIC LINK</span>
            </div>

            {/* Mode Switcher Tabs: Login / Sign Up / Magic Link */}
            <div className="tm-auth-tabs">
              <button
                type="button"
                className={`tm-auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                🔑 Log In
              </button>
              <button
                type="button"
                className={`tm-auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                🚀 Sign Up
              </button>
              <button
                type="button"
                className={`tm-auth-tab ${authMode === 'magic' ? 'active' : ''}`}
                onClick={() => setAuthMode('magic')}
              >
                ✨ Magic Link
              </button>
            </div>

            {authMode === 'magic' ? (
              <form
                onSubmit={onMagicLinkSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="tm-input"
                  placeholder="Enter your email for instant login link..."
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
                {authMessage && <div className="tm-auth-feedback">{authMessage}</div>}
                <button
                  type="submit"
                  className="tm-btn tm-btn-primary"
                  style={{ justifyContent: 'center', padding: '11px' }}
                >
                  ✨ Send Passwordless Magic Link (+100 XP)
                </button>
              </form>
            ) : (
              <form
                onSubmit={onAuthSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="tm-input"
                  placeholder="Email address"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    className="tm-input"
                    style={{ width: '100%', paddingRight: '42px' }}
                    placeholder="Password (6+ chars)"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Password Strength Meter during Sign Up */}
                {authMode === 'signup' && authPassword.length > 0 && (
                  <div className="tm-pw-meter-wrap">
                    <div className="tm-pw-meter-track">
                      <div
                        className="tm-pw-meter-fill"
                        style={{
                          width: `${pwStrength.score}%`,
                          background: pwStrength.color
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: pwStrength.color, fontWeight: 700 }}>
                      {pwStrength.label}
                    </span>
                  </div>
                )}

                {authMessage && <div className="tm-auth-feedback">{authMessage}</div>}

                <button
                  type="submit"
                  className="tm-btn tm-btn-primary"
                  style={{ justifyContent: 'center', padding: '11px' }}
                >
                  {authMode === 'login'
                    ? '🔒 Log In / Auto-Register (+150 XP)'
                    : '🛡️ Create Verified Account (+150 XP)'}
                </button>
              </form>
            )}

            <div
              style={{
                marginTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '11px',
                color: '#94a3b8'
              }}
            >
              <span>Want real Google/Discord/Facebook OAuth popups?</span>
              <button
                type="button"
                className="tm-link-btn"
                onClick={() => setShowSetupWizard(true)}
              >
                🛠️ Open Provider Key Setup Guide →
              </button>
            </div>
          </>
        )}

        {/* INTERACTIVE ADMIN OAUTH PROVIDER SETUP WIZARD */}
        {showSetupWizard && (
          <div className="tm-oauth-wizard-box">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px'
              }}
            >
              <strong style={{ fontSize: '13px', color: '#00f3ff' }}>
                🛠️ Supabase OAuth 2.0 Provider Setup Checklist
              </strong>
              <button
                type="button"
                className="tm-btn"
                style={{ padding: '4px 9px', fontSize: '11px' }}
                onClick={() => loadProviderStatus(true)}
                disabled={checkingStatus}
              >
                {checkingStatus ? '⏳ Checking...' : '🔄 Refresh Status'}
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '0 0 10px', lineHeight: 1.45 }}>
              Right now, buttons without keys in your Supabase Dashboard automatically log you in
              via <strong>Instant Verified Arcade Mode</strong> so nobody ever hits a dead error screen!
              To enable live OAuth redirects, copy this Callback URL into each provider:
            </p>

            {/* 1-CLICK COPY CALLBACK URI */}
            <div
              style={{
                background: 'rgba(0, 243, 255, 0.08)',
                border: '1px solid rgba(0, 243, 255, 0.35)',
                borderRadius: '10px',
                padding: '9px 11px',
                marginBottom: '12px'
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 900, color: '#00f3ff', marginBottom: '4px' }}>
                🔗 YOUR SUPABASE OAUTH CALLBACK / REDIRECT URL:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <code
                  style={{
                    flex: 1,
                    fontSize: '11px',
                    color: '#facc15',
                    wordBreak: 'break-all',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '6px 8px',
                    borderRadius: '6px'
                  }}
                >
                  {SUPABASE_OAUTH_CALLBACK_URL}
                </code>
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  style={{ padding: '6px 10px', fontSize: '11px' }}
                  onClick={handleCopyCallbackUrl}
                >
                  {copiedUri ? '✅ Copied!' : '📋 Copy URI'}
                </button>
              </div>
            </div>

            {/* LIVE PROVIDER STATUS PILLS */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                marginBottom: '12px'
              }}
            >
              {['google', 'discord', 'facebook'].map((id) => {
                const isLive = Boolean(providerSettings?.[id]);
                return (
                  <div
                    key={id}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isLive ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '8px',
                      padding: '6px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      fontWeight: 800
                    }}
                  >
                    <span style={{ textTransform: 'capitalize' }}>{id}</span>
                    <span style={{ color: isLive ? '#4ade80' : '#facc15' }}>
                      {isLive ? '🟢 Live' : '⚡ Sandbox'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ACCORDION GUIDES FOR EACH PROVIDER */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <details className="tm-faq-item" open>
                <summary>1️⃣ Google OAuth Setup (Free • 3 Mins)</summary>
                <p>
                  1. Go to <strong>console.cloud.google.com</strong> → <em>APIs &amp; Services → Credentials</em>.<br />
                  2. Click <strong>Create Credentials → OAuth client ID</strong> (choose <em>Web application</em>).<br />
                  3. Under <strong>Authorized redirect URIs</strong>, paste the Callback URL above.<br />
                  4. Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>.<br />
                  5. In <strong>Supabase Dashboard</strong> (project <code>otvvphmjojqyjaznjzyo</code>) → <em>Authentication → Providers → Google</em>, toggle Enable ON and paste both keys!
                </p>
              </details>

              <details className="tm-faq-item">
                <summary>2️⃣ Discord OAuth Setup (Free • 2 Mins)</summary>
                <p>
                  1. Go to <strong>discord.com/developers/applications</strong> → <strong>New Application</strong>.<br />
                  2. Click <strong>OAuth2</strong> in the left sidebar → click <strong>Add Redirect</strong> and paste the Callback URL above.<br />
                  3. Copy the <strong>Client ID</strong> and click <strong>Reset Secret</strong> to copy the <strong>Client Secret</strong>.<br />
                  4. Paste both into <strong>Supabase → Authentication → Providers → Discord</strong>!
                </p>
              </details>

              <details className="tm-faq-item">
                <summary>3️⃣ Facebook (Meta) OAuth Setup (Free)</summary>
                <p>
                  1. Go to <strong>developers.facebook.com/apps</strong> → <strong>Create App</strong> → select <em>Authenticate and request data from users</em>.<br />
                  2. Go to <em>Use Cases → Authentication and account creation → Customize → Settings</em>.<br />
                  3. Paste the Callback URL into <strong>Valid OAuth Redirect URIs</strong>.<br />
                  4. Copy your <strong>App ID</strong> and <strong>App Secret</strong> (under <em>App Settings → Basic</em>) into <strong>Supabase → Providers → Facebook</strong>.
                </p>
              </details>

              <details className="tm-faq-item">
                <summary>4️⃣ Email &amp; Magic Link Instant Login Tip</summary>
                <p>
                  In <em>Supabase → Authentication → Providers → Email</em>, toggle <strong>&quot;Confirm email&quot; OFF</strong> so users can sign up with email/password immediately without waiting for confirmation emails.
                </p>
              </details>
            </div>

            <button
              type="button"
              className="tm-btn tm-btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
              onClick={() => setShowSetupWizard(false)}
            >
              ← Back to Login Buttons
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
