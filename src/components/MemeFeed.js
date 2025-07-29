import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function MemeFeed() {
  const [memes, setMemes] = useState([]);

  useEffect(() => {
    async function fetchMemes() {
      const { data, error } = await supabase.storage.from('memes').list('public');
      if (data) {
        setMemes(data);
      }
    }
    fetchMemes();
  }, []);

  return (
    <div>
      <h2>Latest Memes</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {memes.map((meme) => (
          <div key={meme.name} style={{ margin: 10 }}>
            <img src={`https://your-supabase-url.storage.googleapis.com/memes/public/${meme.name}`} alt={meme.name} width={300} />
          </div>
        ))}
      </div>
    </div>
  );
}