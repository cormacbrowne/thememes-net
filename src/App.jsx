import React from 'react';

function App() {
  const playSound = () => {
    const audio = new Audio('/sounds/beep.mp3');
    audio.play();
  };

  return (
    <div className="App">
      <h1 className="retro-heading">🔥 theMEMES.net 🔥</h1>
      <p>Retro chaos awaits. This version WORKS.</p>
      <button onClick={playSound} className="retro-button">Vote 👍</button>
      <img src="/assets/neon-zigzag.svg" alt="zigzag" style={{ marginTop: '2rem', width: '100px' }} />
    </div>
  );
}

export default App;
