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
  // Active tab for sorting/filtering memes (either 'latest' or 'topWeek')
  const [activeTab, setActiveTab] = useState('latest');

  // Fetch the current user and memes on mount.
  useEffect(() => {
    getUser().then(({ user }) => setUser(user));
    loadMemes();
  }, []);

  // Helper to load memes from Supabase.
  async function loadMemes() {
    setLoadingMemes(true);
    const { memes } = await fetchMemes();
    let list = memes || [];
    // Apply filtering and sorting based on the active tab.
    if (activeTab === 'topWeek') {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      list = list.filter((m) => new Date(m.created_at) >= new Date(oneWeekAgo));
      list.sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }
    setMemes(list);
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

  // Convert a timestamp into a relative time string (e.g. "5 minutes")
  const timeAgo = (timestamp) => {
    const now = Date.now();
    const date = new Date(timestamp);
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / (24 * 3600000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    if (hours < 24) return hours === 1 ? '1 hour' : `${hours} hours`;
    return days === 1 ? '1 day' : `${days} days`;
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

      {/* Navigation bar with sorting options and upload link */}
      <nav className="nav-bar">
        <button
          className={activeTab === 'latest' ? 'nav-item active' : 'nav-item'}
          onClick={() => {
            setActiveTab('latest');
            loadMemes();
          }}
        >
          Latest
        </button>
        <button
          className={activeTab === 'topWeek' ? 'nav-item active' : 'nav-item'}
          onClick={() => {
            setActiveTab('topWeek');
            loadMemes();
          }}
        >
          Top This Week
        </button>
        {user && (
          <label className="nav-item upload-nav">
            Upload
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </nav>

      {/* Meme list with votes and time */}
      <section className="meme-list">
        {loadingMemes ? (
          <p className="loading-text">Loading memes…</p>
        ) : memes.length === 0 ? (
          <p className="loading-text">No memes yet. Be the first to upload!</p>
        ) : (
          memes.map((meme) => (
            <div key={meme.id} className="meme-row">
              <img src={meme.url} alt="meme" className="meme-thumb" />
              <div className="meme-meta">
                <div className="vote-box">
                  <span className="heart">❤</span>
                  <span className="vote-number">{meme.votes ?? 0}</span>
                </div>
                <span className="meme-time">{timeAgo(meme.created_at)} ago</span>
                <button
                  className="vote-button"
                  onClick={() => handleUpvote(meme.id)}
                  disabled={!user}
                >
                  {user ? 'Vote' : 'Login'}
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