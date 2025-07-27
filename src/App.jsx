import React, { useEffect, useState, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
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
  // Cache the NSFW model once it's loaded. Using state ensures it persists
  // across renders and is loaded only on demand.
  const [nsfwModel, setNsfwModel] = useState(null);

  // New state for lightbox overlay and retro beep feedback
  const [selectedMeme, setSelectedMeme] = useState(null);
  const [clickedMemeId, setClickedMemeId] = useState(null);
  const audioCtxRef = useRef(null);

  const playBeep = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const oscillator = audioCtxRef.current.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioCtxRef.current.currentTime);
    oscillator.connect(audioCtxRef.current.destination);
    oscillator.start();
    oscillator.stop(audioCtxRef.current.currentTime + 0.15);
  };

  const openMeme = (meme) => setSelectedMeme(meme);
  const closeMeme = () => setSelectedMeme(null);

  // Fetch the current user and memes on mount.
  useEffect(() => {
    getUser().then(({ user }) => setUser(user));
    loadMemes();
    // Load the NSFW model on mount. If the model fails to load, we log
    // the error but allow uploads (uploads will proceed without filtering).
    nsfwjs
      .load()
      .then((model) => {
        setNsfwModel(model);
      })
      .catch((err) => {
        console.error('Failed to load NSFW model', err);
      });
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
      // Before uploading, classify the image to detect inappropriate content.
      // If the model is loaded, run a prediction. Otherwise, skip filtering.
      let safeToUpload = true;
      if (nsfwModel) {
        try {
          // Create an image element to load the file for classification.
          const img = document.createElement('img');
          img.src = URL.createObjectURL(file);
          await new Promise((resolve) => {
            img.onload = () => resolve();
          });
          const predictions = await nsfwModel.classify(img);
          // Determine if any inappropriate category exceeds a threshold.
          safeToUpload = !predictions.some(
            (p) =>
              (p.className === 'Porn' ||
                p.className === 'Hentai' ||
                p.className === 'Sexy') &&
              p.probability > 0.8
          );
        } catch (err) {
          console.error('NSFW classification failed', err);
        }
      }
      if (!safeToUpload) {
        alert(
          'This image appears to contain inappropriate content. Please choose another file.'
        );
        return;
      }
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
      {/* Header with logo and authentication buttons */}
      <header className="site-header">
        <img
          src="/images/logo.png"
          alt="The MEMES logo"
          className="site-logo"
        />
        <div className="header-buttons">
          {user ? (
            <>
              <span className="welcome-text">Welcome, {user.email}</span>
              <button className="header-btn" onClick={handleLogout}>
                Log out
              </button>
              <label className="header-btn upload-btn">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            </>
          ) : (
            <>
              <button className="header-btn" onClick={handleLogin}>
                Log in
              </button>
              <button className="header-btn" onClick={handleLogin}>
                Sign up
              </button>
            </>
          )}
        </div>
      </header>

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
          // When there are no memes, encourage viewers to log in and upload
          <p className="loading-text">
            No memes yet. Log in and be the first to upload!
          </p>
        ) : (
          memes.map((meme) => (
            <div key={meme.id} className="meme-row">
              <img
                src={meme.url}
                alt="meme"
                className="meme-thumb"
                onClick={() => openMeme(meme)}
              />
              <div className="meme-meta">
                <div className="vote-box">
                  <span className="heart">❤</span>
                  <span className="vote-number">{meme.votes ?? 0}</span>
                </div>
                <span className="meme-time">{timeAgo(meme.created_at)} ago</span>
                <button
                  className={
                    'vote-button' +
                    (clickedMemeId === meme.id ? ' clicked' : '')
                  }
                  onClick={() => {
                    handleUpvote(meme.id);
                    setClickedMemeId(meme.id);
                    playBeep();
                  }}
                  disabled={!user}
                >
                  {user ? 'Vote' : 'Login'}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Overlay to display selected meme in large view */}
      {selectedMeme && (
        <div className="overlay" onClick={closeMeme}>
          <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
            <img
              className="overlay-image"
              src={selectedMeme.url}
              alt="Selected Meme"
            />
            <div className="overlay-meta">
              <div className="vote-box">
                <span className="heart">❤</span>
                <span className="vote-number">
                  {selectedMeme.votes ?? 0}
                </span>
              </div>
              <span className="meme-time">
                {timeAgo(selectedMeme.created_at)} ago
              </span>
              <button
                className={
                  'vote-button' +
                  (clickedMemeId === selectedMeme.id ? ' clicked' : '')
                }
                onClick={() => {
                  handleUpvote(selectedMeme.id);
                  setClickedMemeId(selectedMeme.id);
                  playBeep();
                }}
                disabled={!user}
              >
                {user ? 'Vote' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
