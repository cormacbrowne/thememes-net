import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function MemeUploader() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!file) return;
    const { data, error } = await supabase.storage.from('memes').upload(`public/${file.name}`, file);
    if (error) {
      alert('Upload failed.');
    } else {
      alert('Upload successful!');
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      {previewUrl && <img src={previewUrl} alt="preview" width={300} />}
      <button onClick={handleUpload}>Upload Meme</button>
    </div>
  );
}