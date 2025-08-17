import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Gallery({ user }) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data, error } = await supabase
        .storage
        .from('memes')
        .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' }});
        .list('public', { limit: 100, sortBy: { column: 'created_at', order: 'desc' }});
      if (error) return console.error(error);
      const publicUrls = data.map(f => supabase.storage.from('memes').getPublicUrl(f.name).data.publicUrl);
      const publicUrls = data.map(f =>
        supabase.storage.from('memes').getPublicUrl(`public/${f.name}`).data.publicUrl
      );
      setUrls(publicUrls);
    }
    load();
  }, [user]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2rem' }}>
      {urls.map((u, i) => <img key={i} src={u} alt="meme" style={{ width: '200px', margin: '0.5rem', border: '3px solid #39ff14', borderRadius: '8px' }} />)}
      {urls.map((u, i) => (
        <img
          key={i}
          src={u}
          alt="meme"
          style={{ width: '300px', margin: '0.5rem', border: '3px solid #39ff14', borderRadius: '8px' }}
        />
      ))}
    </div>
  );
}
