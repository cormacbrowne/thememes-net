import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// A simple meme feed component that fetches images from the Supabase
// storage bucket called `memes`. It retrieves the list of files in
// the `public` folder and then constructs public URLs for each file.
// The component displays a loading state, an error state, and
// finally a list of images once loaded. Each image is displayed
// within a flex container so that items wrap on smaller screens.
export default function MemeFeed() {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMemes() {
      // Fetch the list of files in the `public` folder of the `memes` bucket
      const { data: fileList, error } = await supabase.storage.from('memes').list('public');
      if (error || !fileList) {
        setError('Failed to load memes.');
        setLoading(false);
        return;
      }

      try {
        // Construct a promise for each file to fetch its public URL
        const urlPromises = fileList.map(async (file) => {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('memes')
            .getPublicUrl(`public/${file.name}`);
          if (urlError || !urlData) {
            return null;
          }
          return { name: file.name, url: urlData.publicUrl };
        });
        // Resolve all promises and filter out any null results
        const urls = (await Promise.all(urlPromises)).filter(Boolean);
        setMemes(urls);
      } catch (e) {
        setError('An unexpected error occurred while loading memes.');
      }
      setLoading(false);
    }
    fetchMemes();
  }, []);

  if (loading) return <div>Loading memes...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h2>Latest Memes</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {memes.length === 0 && <p>No memes found.</p>}
        {memes.map((meme) => (
          <div key={meme.name} style={{ margin: 10 }}>
            <img src={meme.url} alt={meme.name} width={300} />
          </div>
        ))}
      </div>
    </div>
  );
}