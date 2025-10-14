import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import AuthButton from './components/AuthButton';
import MemeUploader from './components/MemeUploader';
import Gallery from './components/Gallery';

export default function App() {
  const [user, setUser] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription.unsubscribe()();
  }, []);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

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
      <AuthButton />
      <h1 className="retro-heading">🔥 theMEMES.net 🔥</h1>
      <p style={{ color: '#39FF14' }}>Retro chaos awaits. This version WORKS.</p>
      {user && <MemeUploader onUpload={() => setRefresh((r) => r + 1)} />}
      {user && <Gallery key={refresh} user={user} />}
    </div>
  );
}
