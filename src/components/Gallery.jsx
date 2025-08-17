import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Gallery({ user }) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const { data, error } = await supabase
        .storage
      const { data, error } = await supabase.storage
        .from('memes')
        .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' }});
        .list('public', { limit: 100, sortBy: { column: 'created_at', order: 'desc' }});
        .list('public', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) return console.error(error);
      const publicUrls = data.map(f => supabase.storage.from('memes').getPublicUrl(f.name).data.publicUrl);
      const publicUrls = data.map(f =>
        .list('public', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        console.error(error);
        return;
      }

      const publicUrls = data.map((f) =>
        supabase.storage.from('memes').getPublicUrl(`public/${f.name}`).data.publicUrl
      );
      setUrls(publicUrls);
    }

    load();
  }, [user]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2rem' }}>
      {urls.map((u, i) => <img key={i} src={u} alt="meme" style={{ width: '200px', margin: '0.5rem', border: '3px solid #39ff14', borderRadius: '8px' }} />)}
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: '2rem',
      }}
    >
      {urls.map((u, i) => (
        <img
          key={i}
          src={u}
          alt="meme"
          style={{ width: '300px', margin: '0.5rem', border: '3px solid #39ff14', borderRadius: '8px' }}
          style={{
            width: '300px',
            margin: '0.5rem',
            border: '3px solid #39ff14',
            borderRadius: '8px',
          }}
        />
      ))}
    </div>
  );
}

src/components/MemeFeed.js
+2
-39

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { supabase } from '../supabaseClient';

export default function MemeFeed() {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMemes() {
      const { data, error } = await supabase.storage.from('memes').list('public');
      if (data) {
        setMemes(data);
      const { data, error: listError } = await supabase.storage
        .from('memes')
        .list('public');

      if (listError || !data) {
      if (listError) {
        setError('Failed to load memes.');
      } else {
        const withPaths = data.map((meme) => ({
          ...meme,
          name: `public/${meme.name}`,
        }));
        setMemes(withPaths);
        const filesWithUrls = data.map((meme) => {
          const { data: urlData } = supabase.storage
            .from('memes')
            .getPublicUrl(`public/${meme.name}`);
          return { name: meme.name, url: urlData.publicUrl };
        });
        setMemes(filesWithUrls);
      }
      setLoading(false);
    }

    fetchMemes();
  }, []);

  if (loading) {
    return <div>Loading memes...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }
  if (loading) return <div>Loading memes...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h2>Latest Memes</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {memes.length === 0 && <p>No memes found.</p>}
        {memes.map((meme) => (
          <div key={meme.name} style={{ margin: 10 }}>
            <img src={`https://your-supabase-url.storage.googleapis.com/memes/public/${meme.name}`} alt={meme.name} width={300} />
            <img src={meme.url} alt={meme.name} width={300} />
          </div>
        ))}
        {memes.length === 0 && <p>No memes found.</p>}
        {memes.map((meme) => {
          const { data: urlData, error: urlError } = supabase.storage
            .from('memes')
            .getPublicUrl(meme.name);

          if (urlError || !urlData) {
            return (
              <div key={meme.name} style={{ margin: 10 }}>
                <p>Failed to load meme.</p>
              </div>
            );
          }

          return (
            <div key={meme.name} style={{ margin: 10 }}>
              <img src={urlData.publicUrl} alt={meme.name} width={300} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
}
