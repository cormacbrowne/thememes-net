
import React, { useEffect, useState } from "react";
import { supabase, getUser, signInWithGoogle, signOut, uploadMeme, fetchMemes } from "../supabaseClient";

function App() {
  const [user, setUser] = useState(null);
  const [memes, setMemes] = useState([]);

  useEffect(() => {
    getUser().then(({ user }) => setUser(user));
    fetchMemes().then(({ memes }) => setMemes(memes || []));
  }, []);

  const handleLogin = async () => {
    await signInWithGoogle();
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && user) {
      const { error } = await uploadMeme(file, user.id);
      if (!error) window.location.reload();
    }
  };

  return (
    <div className="app">
      <h1>🔥 theMEMES.net 🔥</h1>
      {user ? (
        <>
          <p>Welcome, {user.email}</p>
          <button onClick={handleLogout}>Logout</button>
          <input type="file" onChange={handleFileChange} />
        </>
      ) : (
        <button onClick={handleLogin}>Login with Google</button>
      )}
      <div className="gallery">
        {memes.map((meme) => (
          <img key={meme.id} src={meme.url} alt="meme" className="meme" />
        ))}
      </div>
    </div>
  );
}

export default App;
