import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

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
        setError('Failed to load memes.');
      } else {
        const withPaths = data.map((meme) => ({
          ...meme,
          name: `public/${meme.name}`,
        }));
        setMemes(withPaths);
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

  return (
    <div>
      <h2>Latest Memes</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {memes.map((meme) => (
          <div key={meme.name} style={{ margin: 10 }}>
            <img src={`https://your-supabase-url.storage.googleapis.com/memes/public/${meme.name}`} alt={meme.name} width={300} />
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
