import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function MemeUploader() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const uploadMeme = async () => {
    if (!file) return;
    setUploading(true);
    const filePath = `${Date.now()}_${file.name}`;
    let { error } = await supabase.storage.from('memes').upload(filePath, file);
    setUploading(false);
    if (error) return alert('Upload failed');
    alert('Meme uploaded!');
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button className="retro-button" onClick={uploadMeme} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Meme'}
      </button>
    </div>
  );
}
