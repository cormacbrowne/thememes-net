import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import AuthButton from './components/AuthButton';
import MemeUploader from './components/MemeUploader';
import MemeFeed from './components/MemeFeed';

/**
 * Root application component for theMEMES.net.
 *
 * This simplified version manages authentication state using Supabase and
 * conditionally renders the uploader and feed when a user is logged in.
 * A `refresh` state is incremented after each upload to force the feed
 * component to reload the latest memes.
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [refresh, setRefresh] = useState(0);

  // Fetch the current user on mount and subscribe to auth state changes.
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  // Trigger a Google sign‑in via Supabase.
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  // Sign the current user out.
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="App" style={{ textAlign: 'center', padding: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        {user ? (
          <button className="retro-button" onClick={signOut}>Sign Out</button>
        ) : (
          <button className="retro-button" onClick={signIn}>Sign In with Google</button>
        )}
      </div>
      {/* Button to toggle between auth providers */}
      <AuthButton />
      <h1 className="retro-heading">🔥 theMEMES.net 🔥</h1>
      <p style={{ color: '#39FF14' }}>Retro chaos awaits. This version WORKS.</p>
      {/* Only show uploader and feed when a user is authenticated */}
      {user && <MemeUploader onUpload={() => setRefresh((r) => r + 1)} />}
      {user && <MemeFeed key={refresh} />}
    </div>
  );
}
