import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import MemeUploader from './components/MemeUploader';
import Gallery from './components/Gallery';

function App() {
  const [user, setUser] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null)
    );
    return () => listener?.subscription.unsubscribe();
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
          <button className="retro-button" onClick={signIn}>Sign in with Google</button>
        )}
      </div>
      <h1 className="retro-heading">🔥 theMEMES.net 🔥</h1>
      <p style={{ color: '#39FF14' }}>Retro chaos awaits. This version WORKS.</p>
      {user && <MemeUploader />}
      <button className="retro-button" style={{ marginTop: '2rem' }}>Vote 👍</button>
      <img src="/assets/neon-zigzag.svg" alt="zigzag" style={{ marginTop: '2rem', width: '100px' }} />
      {user && <MemeUploader onUpload={() => setRefresh((r) => r + 1)} />}
      {user && <Gallery key={refresh} user={user} />}
    </div>
  );
}

export default App;
