import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function MemeUploader() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');

  const uploadMeme = async () => {
    if (!file) return;
    setUploading(true);
    const filePath = `${Date.now()}_${file.name}`;
    let { error } = await supabase.storage.from('memes').upload(filePath, file);
    if (!error) {
      const { data } = supabase.storage
        .from('memes')
        .getPublicUrl(filePath);
      setUploadedUrl(data.publicUrl);
    }
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
      {uploadedUrl && (
        <div style={{ marginTop: '1rem' }}>
          <img
            src={uploadedUrl}
            alt="Uploaded meme"
            style={{ width: '200px', border: '3px solid #39ff14', borderRadius: '8px' }}
          />
        </div>
      )}
    </div>
  );
}
