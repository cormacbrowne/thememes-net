import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [memes, setMemes] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMemes();
  }, []);

  const fetchMemes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('memes')
      .select('*')
      .order('likes', { ascending: false });
    if (!error) setMemes(data);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('memes')
      .upload(fileName, file);
    if (uploadError) return console.error(uploadError);
    const { data: publicData } = supabase
      .storage
      .from('memes')
      .getPublicUrl(fileName);
    const meme = {
      title: file.name,
      image_url: publicData.publicUrl,
      likes: 0,
    };
    await supabase.from('memes').insert([meme]);
    await fetchMemes();
    setFile(null);
    setLoading(false);
  };

  const handleLike = async (id, currentLikes) => {
    await supabase
      .from('memes')
      .update({ likes: currentLikes + 1 })
      .eq('id', id);
    fetchMemes();
  };

  const topMeme = memes[0];

  return (
    <div style={{ padding: '1rem', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '3rem', margin: '1rem 0', color: '#ff69b4' }}>theMEMES.net</h1>
      <p>Upload your chaos. Rate the madness.</p>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} disabled={loading} style={{ marginLeft: '1rem' }}>
        Upload Meme
      </button>
      {topMeme && (
        <section style={{ margin: '2rem 0' }}>
          <h2>Top Meme of the Week</h2>
          <img src={topMeme.image_url} alt={topMeme.title} style={{ maxWidth: '300px' }} />
          <p>{topMeme.title}</p>
          <p>❤️ {topMeme.likes} Likes</p>
        </section>
      )}
      <hr />
      <h2>All Memes</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {memes.map((meme) => (
          <div key={meme.id} style={{
            background: '#222',
            margin: '1rem',
            padding: '1rem',
            borderRadius: '10px',
            width: '300px'
          }}>
            <h3>{meme.title}</h3>
            <img src={meme.image_url} alt={meme.title} style={{ width: '100%', borderRadius: '10px' }} />
            <button onClick={() => handleLike(meme.id, meme.likes)} style={{ marginTop: '0.5rem' }}>
              ❤️ {meme.likes} Likes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
