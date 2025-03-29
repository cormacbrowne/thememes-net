
import React, { useEffect, useState } from "react";
import { supabase, signInWithGoogle, signOut, getUser, uploadMeme, fetchMemes } from "../supabaseClient";

function App() {
  const [user, setUser] = useState(null);
  const [memes, setMemes] = useState([]);

  useEffect(() => {
    getUser().then(({ user }) => setUser(user));
    fetchMemes().then(({ memes }) => setMemes(memes || []));
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    const { url } = await uploadMeme(file, user.id);
    setMemes([{ url }, ...memes]);
  };

  return (
    <div>
      <h1>🔥 theMEMES 🔥</h1>
      {user ? (
        <>
          <p>Welcome, {user.email}</p>
          <input type="file" onChange={handleFileChange} />
          <button onClick={signOut}>Logout</button>
        </>
      ) : (
        <button onClick={signInWithGoogle}>Login with Google</button>
      )}
      <div>
        {memes.map((meme, idx) => (
          <img key={idx} src={meme.url} alt="meme" />
        ))}
      </div>
    </div>
  );
}
export default App;
