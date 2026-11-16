import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient, fetchSupabaseAuthSettings } from '../supabaseClient';
import { anonymousHandleFor, validateUsername } from '../../supabase/functions/_shared/identity.js';
import { claimUsername, USERNAME_ERROR_MESSAGES, textRejectionMessage } from '../utils/serverWrites';
import { sfx } from '../utils/soundEngine';

const FAKE_USER_ID_RE = /^(oauth-|magic-|email-|arcade-)/;

const isRealCachedUser = (u) =>
  Boolean(
    u &&
      typeof u === 'object' &&
      typeof u.id === 'string' &&
      u.id.length > 0 &&
      !FAKE_USER_ID_RE.test(u.id) &&
      u.provider !== 'ArcadePass' &&
      !u.isAnonymous &&
      u.verified === true
  );

const sanitizeFallbackHandle = (raw = '') =>
  String(raw)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/^[^a-zA-Z0-9]+/, '')
    .slice(0, 20);

const clearStoredUser = () => {
  try {
    localStorage.removeItem('tm_user');
  } catch {
    // Ignore storage errors
  }
};

/**
 * Manages honest Supabase Auth sessions:
 * - Anonymous sessions created automatically on first write get a deterministic handle (`anonHandle`),
 *   and are never presented as verified/signed-in users (`user` stays null).
 * - Only verified email, Magic Link (after clicking the link), or OAuth sessions set `user` and `tm_user`.
 * - Signing in / linking upgrades an existing anonymous session when supported so strikes/history carry over.
 */
export function useAuth({ setShowAuthModal, awardXpAndCombo }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('tm_user') || 'null');
      if (isRealCachedUser(cached)) return cached;
      if (cached) clearStoredUser();
      return null;
    } catch {
      clearStoredUser();
      return null;
    }
  });
  const [anonHandle, setAnonHandle] = useState('');
  const [profileStatus, setProfileStatus] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const failedAuthRef = useRef({ count: 0, lockUntil: 0 });

  const syncAuthSession = useCallback(async (sessionUser) => {
    const client = getSupabaseClient();
    if (!sessionUser) {
      setUser(null);
      setAnonHandle('');
      setProfileStatus(null);
      clearStoredUser();
      return null;
    }

    let profile = null;
    if (client && typeof client.rpc === 'function') {
      try {
        const { data } = await client.rpc('get_my_profile');
        if (data?.ok) profile = data;
      } catch {
        // Non-fatal: UI still functions with auth metadata
      }
    }

    if (sessionUser.is_anonymous) {
      setUser(null);
      clearStoredUser();
      setAnonHandle(anonymousHandleFor(sessionUser.id));
      setProfileStatus(profile);
      return null;
    }

    setAnonHandle('');
    setProfileStatus(profile);

    // If user confirmed a pending username from email signup and hasn't claimed yet, claim it now.
    let claimedUsername = profile?.username || '';
    const pendingUsername = sessionUser.user_metadata?.pending_username;
    if (!claimedUsername && pendingUsername && client) {
      const claimRes = await claimUsername(client, pendingUsername);
      if (claimRes.ok) {
        claimedUsername = claimRes.username;
      }
    }

    const email = sessionUser.email || '';
    const provider =
      sessionUser.app_metadata?.provider ||
      sessionUser.identities?.[0]?.provider ||
      'email';
    const rawFallback =
      sessionUser.user_metadata?.full_name?.replace(/\s+/g, '_') ||
      sessionUser.user_metadata?.name?.replace(/\s+/g, '_') ||
      email.split('@')[0] ||
      'Memer';
    const handle =
      claimedUsername || sanitizeFallbackHandle(rawFallback) || anonymousHandleFor(sessionUser.id);

    const u = {
      id: sessionUser.id,
      username: handle,
      claimedUsername: claimedUsername || null,
      avatarId: profile?.avatar_id || null,
      email,
      provider,
      verified: true,
      role: profile?.role || 'user',
      strikes: profile?.strikes || 0,
      suspendedUntil: profile?.suspended_until || null
    };
    setUser(u);
    try {
      localStorage.setItem('tm_user', JSON.stringify(u));
    } catch {
      // Ignore storage errors
    }
    return u;
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    let authSub = null;
    let active = true;

    if (client && client.auth) {
      client.auth.getSession().then(({ data }) => {
        if (active) {
          syncAuthSession(data?.session?.user || null);
        }
      });

      if (typeof client.auth.onAuthStateChange === 'function') {
        const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
          if (active) {
            syncAuthSession(session?.user || null);
          }
        });
        authSub = listener?.subscription;
      }
    }

    const onAnonCreated = (evt) => {
      const anonUser = evt?.detail?.user;
      if (active && anonUser?.is_anonymous) {
        syncAuthSession(anonUser);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tm-anon-session', onAnonCreated);
    }

    return () => {
      active = false;
      if (authSub && typeof authSub.unsubscribe === 'function') {
        authSub.unsubscribe();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('tm-anon-session', onAnonCreated);
      }
    };
  }, [syncAuthSession]);

  const handleSocialOAuthLogin = async (provider) => {
    setAuthMessage(`🔐 Checking ${provider.shortName} sign-in...`);
    const client = getSupabaseClient();

    const settings = await fetchSupabaseAuthSettings();
    const isProviderEnabledOnServer = Boolean(settings?.external?.[provider.id]);

    if (!isProviderEnabledOnServer || !client?.auth) {
      setAuthMessage(
        `🔐 ${provider.shortName} sign-in is not configured on this server yet. Use Magic Link or Email below.`
      );
      sfx.playSadTrombone();
      return;
    }

    try {
      const { data: sessionData } = await client.auth.getSession();
      const isAnon = Boolean(sessionData?.session?.user?.is_anonymous);

      if (isAnon && typeof client.auth.linkIdentity === 'function') {
        const { data: linkData, error: linkErr } = await client.auth.linkIdentity({
          provider: provider.id,
          options: {
            redirectTo: window.location.origin,
            skipBrowserRedirect: true
          }
        });
        if (!linkErr && linkData?.url) {
          window.location.assign(linkData.url);
          return;
        }
      }

      if (typeof client.auth.signInWithOAuth === 'function') {
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
        setAuthMessage(
          `⚠️ Could not start ${provider.shortName} sign-in: ${error?.message || 'provider unavailable'}.`
        );
        sfx.playSadTrombone();
        return;
      }
    } catch {
      // Handled below
    }

    setAuthMessage(`⚠️ ${provider.shortName} sign-in failed to start. Please try again or use Email.`);
    sfx.playSadTrombone();
  };

  const handleMagicLinkSubmit = async (e) => {
    e.preventDefault();
    const email = authEmail.trim();
    if (!email || !email.includes('@')) {
      setAuthMessage('⚠️ Enter a valid email address first.');
      return;
    }

    setAuthMessage('✨ Sending Magic Link to your inbox...');
    const client = getSupabaseClient();
    if (!client?.auth?.signInWithOtp) {
      setAuthMessage('📡 Auth service is unavailable right now. Please try again shortly.');
      return;
    }

    try {
      const { data: sessionData } = await client.auth.getSession();
      const isAnon = Boolean(sessionData?.session?.user?.is_anonymous);

      if (isAnon && typeof client.auth.updateUser === 'function') {
        const { error: linkErr } = await client.auth.updateUser(
          { email },
          { emailRedirectTo: window.location.origin }
        );
        if (!linkErr) {
          setAuthMessage(
            '✅ Confirmation link sent! Check your inbox and click the link to verify your account.'
          );
          sfx.playJackpot();
          return;
        }
      }

      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
      });
      if (!error) {
        setAuthMessage('✅ Magic Link sent! Check your inbox and click the link to sign in.');
        sfx.playJackpot();
        return;
      }

      setAuthMessage(`⚠️ Could not send Magic Link: ${error.message || 'please try again soon.'}`);
      sfx.playSadTrombone();
    } catch {
      setAuthMessage('📡 Could not reach the auth server. Check your connection and try again.');
      sfx.playSadTrombone();
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now < failedAuthRef.current.lockUntil) {
      const waitSec = Math.ceil((failedAuthRef.current.lockUntil - now) / 1000);
      setAuthMessage(`⏳ Too many failed attempts. Try again in ${waitSec}s.`);
      return;
    }

    const email = authEmail.trim();
    if (!email || !email.includes('@')) {
      setAuthMessage('⚠️ Enter a valid email address.');
      return;
    }

    // New passwords must match the Supabase Auth policy (8+ chars, a letter and a digit).
    // Sign-in keeps the old 6-char floor so existing accounts are never locked out.
    if (authMode === 'signup') {
      if (authPassword.length < 8 || !/[A-Za-z]/.test(authPassword) || !/[0-9]/.test(authPassword)) {
        setAuthMessage('⚠️ Password needs at least 8 characters, with a letter and a number.');
        return;
      }
    } else if (authPassword.length < 6) {
      setAuthMessage('⚠️ Password must be at least 6 characters.');
      return;
    }

    const client = getSupabaseClient();
    if (!client?.auth) {
      setAuthMessage('📡 Auth service is unavailable right now.');
      return;
    }

    if (authMode === 'signup') {
      const desiredRaw = authUsername.trim();
      let validatedUsername = '';
      if (desiredRaw) {
        const check = validateUsername(desiredRaw);
        if (!check.ok) {
          setAuthMessage(
            check.error === 'rejected'
              ? textRejectionMessage(check.detail)
              : USERNAME_ERROR_MESSAGES[check.error] || USERNAME_ERROR_MESSAGES.invalid_chars
          );
          sfx.playSadTrombone();
          return;
        }
        validatedUsername = check.username;
      }

      setAuthMessage('🔒 Creating your verified account...');
      try {
        const { data: sessionData } = await client.auth.getSession();
        const isAnon = Boolean(sessionData?.session?.user?.is_anonymous);

        let result = null;
        if (isAnon && typeof client.auth.updateUser === 'function') {
          const { data: linkData, error: linkErr } = await client.auth.updateUser(
            {
              email,
              password: authPassword,
              data: validatedUsername
                ? { pending_username: validatedUsername, full_name: validatedUsername }
                : undefined
            },
            { emailRedirectTo: window.location.origin }
          );
          if (!linkErr) {
            result = { data: { user: linkData?.user || null, session: sessionData.session }, error: null };
          } else {
            setAuthMessage(`⚠️ ${linkErr.message || 'Could not upgrade account.'}`);
            sfx.playSadTrombone();
            return;
          }
        } else {
          result = await client.auth.signUp({
            email,
            password: authPassword,
            options: {
              emailRedirectTo: window.location.origin,
              data: validatedUsername
                ? { pending_username: validatedUsername, full_name: validatedUsername }
                : undefined
            }
          });
        }

        const { data, error } = result;
        if (error) {
          setAuthMessage(`⚠️ ${error.message || 'Could not create account.'}`);
          sfx.playSadTrombone();
          return;
        }

        // Empty identities on signUp means an account with that email already exists.
        if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
          setAuthMessage('⚠️ An account with that email already exists. Switch to Sign In.');
          sfx.playSadTrombone();
          return;
        }

        // If email confirmation is required, Supabase returns user without a confirmed active session (or keeps anon pending).
        if (!data?.session?.user || data.session.user.is_anonymous) {
          setAuthMessage('📧 Check your inbox to confirm your email and activate your account!');
          sfx.playJackpot();
          return;
        }

        if (validatedUsername) {
          const claimRes = await claimUsername(client, validatedUsername);
          if (!claimRes.ok) {
            setAuthMessage(claimRes.message);
            await syncAuthSession(data.session.user);
            sfx.playSadTrombone();
            return;
          }
        }

        await syncAuthSession(data.session.user);
        setShowAuthModal(false);
        setAuthMessage('');
        sfx.playLevelUp();
        awardXpAndCombo(150, e, '🛡️');
        return;
      } catch {
        setAuthMessage('📡 Could not reach the auth server. Please try again.');
        sfx.playSadTrombone();
        return;
      }
    }

    // Login mode
    setAuthMessage('🔒 Verifying credentials...');
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password: authPassword
      });
      if (error || !data?.session?.user) {
        failedAuthRef.current.count += 1;
        if (failedAuthRef.current.count >= 5) {
          failedAuthRef.current.lockUntil = Date.now() + 30_000;
          failedAuthRef.current.count = 0;
        }
        setAuthMessage(`⚠️ ${error?.message || 'Invalid email or password.'}`);
        sfx.playSadTrombone();
        return;
      }

      failedAuthRef.current = { count: 0, lockUntil: 0 };
      await syncAuthSession(data.session.user);
      setShowAuthModal(false);
      setAuthMessage('');
      sfx.playLevelUp();
      awardXpAndCombo(150, e, '🛡️');
    } catch {
      setAuthMessage('📡 Could not reach the auth server. Please try again.');
      sfx.playSadTrombone();
    }
  };

  const handleClaimUsername = async (rawUsername) => {
    const client = getSupabaseClient();
    const res = await claimUsername(client, rawUsername);
    if (!res.ok) return res;
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, username: res.username, claimedUsername: res.username };
      try {
        localStorage.setItem('tm_user', JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
    return res;
  };

  const setUserAvatarId = useCallback((avatarId) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, avatarId };
      try {
        localStorage.setItem('tm_user', JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  const handleLogout = async () => {
    const client = getSupabaseClient();
    try {
      await client?.auth?.signOut?.();
    } catch {
      // Ignore network error during local sign-out
    }
    setUser(null);
    setAnonHandle('');
    setProfileStatus(null);
    clearStoredUser();
  };

  return {
    user,
    setUser,
    anonHandle,
    profileStatus,
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
    handleClaimUsername,
    setUserAvatarId,
    handleLogout
  };
}
