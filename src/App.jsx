import React, { useState } from 'react';

const starterMemes = [
  {
    id: 1,
    title: 'When ChatGPT writes your code',
    src: '/memes/meme1.jpg',
    likes: 15,
  },
  {
    id: 2,
    title: 'Building a meme empire at 3AM',
    src: '/memes/meme2.jpg',
    likes: 22,
  },
];

function App() {
  const [memes, setMemes] = useState(starterMemes);
  const [file, setFile] = useState(null);

  const handleUpload = () => {
    if (file) {
      const newMeme = {
        id: Date.now(),
        title: file.name,
        src: URL.createObjectURL(file),
        likes: 0,
      };
      setMemes([newMeme, ...memes]);
    }
  };

  const handleLike = (id) => {
    setMemes(memes.map(meme => meme.id === id ? { ...meme, likes: meme.likes + 1 } : meme));
  };

  return (
    <div>
      <h1 style={{ fontSize: '3rem', margin: '1rem 0', color: '#ff69b4' }}>theMEMES.net</h1>
      <p style={{ fontStyle: 'italic' }}>Upload your chaos. Rate the madness.</p>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}>
        Upload Meme
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2rem' }}>
        {memes.map((meme) => (
          <div key={meme.id} style={{
            border: '2px solid #ff69b4',
            borderRadius: '10px',
            margin: '1rem',
            padding: '1rem',
            background: '#222',
            maxWidth: '300px'
          }}>
            <h3>{meme.title}</h3>
            <img src={meme.src} alt={meme.title} style={{ width: '100%', borderRadius: '10px' }} />
            <button onClick={() => handleLike(meme.id)} style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              background: '#ff0',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}>
              ❤️ {meme.likes} Likes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
