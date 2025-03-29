
import React, { useState } from 'react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [memes, setMemes] = useState([]);
  return (
    <div className="app">
      <header className="header">
        <h1>🔥 theMEMES.net 🔥</h1>
        <p>{user ? `Welcome, ${user}` : 'Please log in'}</p>
      </header>
      <section className="memes-grid">
        {memes.length === 0 ? (
          <p>No memes yet. Be the first to upload!</p>
        ) : (
          memes.map((meme, index) => (
            <div key={index} className="meme-card">
              <img src={meme.url} alt={`Meme ${index}`} />
              <button>❤️ Like</button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default App;
