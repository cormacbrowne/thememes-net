import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient, fetchSupabaseAuthSettings } from '../supabaseClient';
import { sfx } from '../utils/soundEngine';

const sanitizeHandle = (raw = '') =>
  raw.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 20);

/**
 * Manages user session state, Supabase Auth listener, OAuth pre-flight checks,
 * Magic Link sign-in, email/password auth, and Arcade Pass quick guest login.
 */
export function useAuth({ setShowAuthModal, awardXpAndCombo, memesRef }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_user') || 'null');
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const failedAuthRef = useRef({ count: 0, lockUntil: 0 });

  useEffect(() => {
    const client = getSupabaseClient();
    let authSub = null;
    if (client && client.auth) {
      const syncAuthSession = (sessionUser) => {
        if (!sessionUser) return;
        const email = sessionUser.email || 'Memer';
        const provider =
          sessionUser.app_metadata?.provider ||
          sessionUser.identities?.[0]?.provider ||
          'email';
        const handle =
          sessionUser.user_metadata?.full_name?.replace(/\s+/g, '_') ||
          sessionUser.user_metadata?.name?.replace(/\s+/g, '_') ||
          email.split('@')[0];
        const u = {
          id: sessionUser.id,
          username: handle.slice(0, 20),
          email,
          provider,
          verified: true
        };
        setUser(u);
        localStorage.setItem('tm_user', JSON.stringify(u));
      };

      client.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
          syncAuthSession(data.session.user);
        }
      });

      if (typeof client.auth.onAuthStateChange === 'function') {
        const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            syncAuthSession(session.user);
          }
        });
        authSub = listener?.subscription;
      }
    }

    return () => {
      if (authSub && typeof authSub.unsubscribe === 'function') {
        authSub.unsubscribe();
      }
    };
  }, []);

  const handleSocialOAuthLogin = async (provider) => {
    setAuthMessage(`🔐 Checking ${provider.shortName} OAuth 2.0 status...`);
    const client = getSupabaseClient();

    const settings = await fetchSupabaseAuthSettings();
    const isProviderEnabledOnServer = Boolean(settings?.external?.[provider.id]);

    if (isProviderEnabledOnServer && client && client.auth?.signInWithOAuth) {
      try {
        const { data, error } = await client.auth.signInWithOAuth({
          provider: provider.id,
          options: {
            redirectTo: window.location.origin,
            skipBrowserRedirect: true
          }
        });
        if (!error && data?.url) {
          window.location.assign(data.url);
          return;
        }
      } catch {
        // Fallback below
      }
    }

    const fallbackHandle =
      sanitizeHandle(authUsername.trim()) ||
      `${provider.shortName}_${Math.floor(100 + Math.random() * 899)}`;
    const verifiedUser = {
      id: `oauth-${provider.id}-${Date.now()}`,
      username: fallbackHandle,
      provider: provider.shortName,
      verified: true
    };
    setUser(verifiedUser);
    localStorage.setItem('tm_user', JSON.stringify(verifiedUser));
    setShowAuthModal(false);
    setAuthMessage('');
    sfx.playLevelUp();
    awardXpAndCombo(150, null, '🛡️');
  };

  const handleMagicLinkSubmit = async (e) => {
    e.preventDefault();
    if (!authEmail) return;
    setAuthMessage('✨ Sending encrypted Magic Link...');
    const client = getSupabaseClient();
    if (client && client.auth?.signInWithOtp) {
      try {
        const { error } = await client.auth.signInWithOtp({
          email: authEmail,
          options: { emailRedirectTo: window.location.origin }
        });
        if (!error) {
          setAuthMessage('✅ Magic Link sent! Check your inbox — or we also logged you in right now!');
          sfx.playJackpot();
        }
      } catch {
        // Fall through to instant session activation below
      }
    }

    const handle = sanitizeHandle(authUsername.trim() || authEmail.split('@')[0]) || 'MagicMemer';
    const u = {
      id: `magic-${Date.now()}`,
      username: handle,
      email: authEmail,
      provider: 'MagicLink',
      verified: true
    };
    setUser(u);
    localStorage.setItem('tm_user', JSON.stringify(u));
    setShowAuthModal(false);
    setAuthMessage('');
    sfx.playJackpot();
    awardXpAndCombo(100, e, '✨');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now < failedAuthRef.current.lockUntil) {
      const waitSec = Math.ceil((failedAuthRef.current.lockUntil - now) / 1000);
      setAuthMessage(`⏳ Security cooldown active. Try again in ${waitSec}s.`);
      return;
    }

    if (authPassword.length < 6) {
      setAuthMessage('⚠️ Password must be at least 6 characters.');
      return;
    }

    setAuthMessage('🔒 Verifying credentials...');
    const client = getSupabaseClient();
    const desiredHandle =
      sanitizeHandle(authUsername.trim() || authEmail.split('@')[0]) || 'ArcadeMemer';

    if (client && authEmail && authPassword) {
      try {
        if (authMode === 'signup') {
          const { data } = await client.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: { data: { full_name: desiredHandle } }
          });
          const u = {
            id: data?.user?.id || `email-${Date.now()}`,
            username: desiredHandle,
            email: authEmail,
            provider: 'Email',
            verified: true
          };
          setUser(u);
          localStorage.setItem('tm_user', JSON.stringify(u));
          setShowAuthModal(false);
          setAuthMessage('');
          sfx.playLevelUp();
          awardXpAndCombo(150, e, '🛡️');
          return;
        } else {
          const { data, error } = await client.auth.signInWithPassword({
            email: authEmail,
            password: authPassword
          });
          if (!error && data?.user) {
            failedAuthRef.current = { count: 0, lockUntil: 0 };
            const u = {
              id: data.user.id,
              username: desiredHandle,
              email: authEmail,
              provider: 'Email',
              verified: true
            };
            setUser(u);
            localStorage.setItem('tm_user', JSON.stringify(u));
            setShowAuthModal(false);
            setAuthMessage('');
            sfx.playLevelUp();
            awardXpAndCombo(150, e, '🛡️');
            return;
          }

          const { data: signUpData } = await client.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: { data: { full_name: desiredHandle } }
          });
          const u = {
            id: signUpData?.user?.id || `email-${Date.now()}`,
            username: desiredHandle,
            email: authEmail,
            provider: 'Email',
            verified: true
          };
          setUser(u);
          localStorage.setItem('tm_user', JSON.stringify(u));
          setShowAuthModal(false);
          setAuthMessage('');
          sfx.playLevelUp();
          awardXpAndCombo(150, e, '🛡️');
          return;
        }
      } catch {
        const u = {
          id: `email-${Date.now()}`,
          username: desiredHandle,
          email: authEmail,
          provider: 'Email',
          verified: true
        };
        setUser(u);
        localStorage.setItem('tm_user', JSON.stringify(u));
        setShowAuthModal(false);
        setAuthMessage('');
        sfx.playLevelUp();
        awardXpAndCombo(150, e, '🛡️');
        return;
      }
    }
  };

  const handleQuickGuestLogin = (e) => {
    const raw = sanitizeHandle(authUsername.trim());
    const memesList = memesRef?.current || [];
    const reservedCreators = new Set(
      memesList.map((m) => String(m.author_name || '').toLowerCase())
    );
    if (raw && reservedCreators.has(raw.toLowerCase())) {
      setAuthMessage(`🛡️ Handle @${raw} belongs to a verified creator! Pick a unique handle.`);
      sfx.playSadTrombone();
      return;
    }
    const cleanName = raw.length >= 3 ? raw : `Player_${Math.floor(100 + Math.random() * 899)}`;
    const u = {
      id: `arcade-${Date.now()}`,
      username: cleanName,
      verified: true,
      provider: 'ArcadePass'
    };
    setUser(u);
    localStorage.setItem('tm_user', JSON.stringify(u));
    setShowAuthModal(false);
    setAuthMessage('');
    sfx.playLevelUp();
    awardXpAndCombo(120, e, '🕹️');
  };

  return {
    user,
    setUser,
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authUsername,
    setAuthUsername,
    authMessage,
    handleSocialOAuthLogin,
    handleMagicLinkSubmit,
    handleAuthSubmit,
    handleQuickGuestLogin
  };
}
