import React, { useEffect, useState } from 'react';
import {
  signInWithGoogle,
  signOut,
  getUser,
  uploadMeme,
  fetchMemes,
  upvoteMeme,
} from './supabaseClient.js';

// Main application component. This implements authentication with Supabase,
// uploading memes, displaying them in a grid and allowing voting.
function App() {
  const [user, setUser] = useState(null);
  const [memes, setMemes] = useState([]);
  const [loadingMemes, setLoadingMemes] = useState(true);

  // Fetch the current user and memes on mount.
  useEffect(() => {
    getUser().then(({ user }) => setUser(user));
    loadMemes();
  }, []);

  // Helper to load memes from Supabase.
  async function loadMemes() {
    setLoadingMemes(true);
    const { memes } = await fetchMemes();
    setMemes(memes || []);
    setLoadingMemes(false);
  }

  // Trigger Google OAuth sign in.
  const handleLogin = async () => {
    await signInWithGoogle();
  };

  // Logout the current user.
  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  // Handle file upload when a file is selected.
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && user) {
      // Use the uploadMeme helper without passing the user ID; the helper
      // fetches the current authenticated user automatically.
      const { error } = await uploadMeme(file);
      if (!error) {
        // Refresh the list after successful upload.
        await loadMemes();
      } else {
        console.error('Upload error', error);
      }
    }
  };

  // Handle voting on a meme.
  const handleUpvote = async (memeId) => {
    await upvoteMeme(memeId);
    // Reload memes to reflect updated vote counts.
    await loadMemes();
  };

  return (
    <div className="app-container">
      {/* Hero section with title and call to action */}
      <section className="hero">
        <div className="hero-overlay">
          <h1 className="hero-title">theMEMES.net</h1>
          <p className="hero-tagline">
            A place to upload, like and discover the funniest memes!
          </p>
          <div className="hero-actions">
            {user ? (
              <>
                <span className="welcome-text">Welcome, {user.email}</span>
                <button className="button" onClick={handleLogout}>
                  Log out
                </button>
                <label className="upload-button">
                  Upload Meme
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </>
            ) : (
              <button className="button" onClick={handleLogin}>
                Log in with Google
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Meme grid */}
      <section className="meme-grid">
        {loadingMemes ? (
          <p className="loading-text">Loading memes…</p>
        ) : memes.length === 0 ? (
          <p className="loading-text">No memes yet. Be the first to upload!</p>
        ) : (
          memes.map((meme) => (
            <div key={meme.id} className="meme-card">
              <img src={meme.url} alt="meme" className="meme-image" />
              <div className="meme-info">
                <span className="vote-count">{meme.votes ?? 0} votes</span>
                <button
                  className="vote-button"
                  onClick={() => handleUpvote(meme.id)}
                  disabled={!user}
                >
                  {user ? 'Vote' : 'Login to vote'}
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default App;