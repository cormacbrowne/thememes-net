import React from 'react';

function App() {
  const playSound = () => {
    const audio = new Audio('/sounds/beep.mp3');
    audio.play();
  };

  return (
    <div className="App">
      <h1 className="retro-heading">🔥 theMEMES.net 🔥</h1>
      <p>Welcome to the internet’s retro meme pit. Voting, overlays & chaos coming up.</p>
      <img src="/placeholder.png" alt="meme placeholder" style={{ maxWidth: '300px' }} />
      <div style={{ marginTop: '1rem' }}>
        <button onClick={playSound} className="retro-button">Vote 👍</button>
      </div>
      <img src="/assets/neon-zigzag.svg" alt="zigzag" style={{ marginTop: '2rem' }} />
    </div>
  );
}

export default App;
