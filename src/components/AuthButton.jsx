import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthButton() {
  const [user, setUser] = useState(null);

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
    <div style={{ marginBottom: '1rem' }}>
      {user ? (
        <button className="retro-button" onClick={signOut}>Sign Out</button>
      ) : (
        <button className="retro-button" onClick={signIn}>Sign in with Google</button>
      )}
    </div>
  );
}
