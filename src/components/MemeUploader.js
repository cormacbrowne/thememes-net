import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRef, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function MemeUploader() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [memeUrl, setMemeUrl] = useState(null);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    const selected = e.target.files[0];
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
    setStatus('');
  };

  const handleUpload = async () => {
    if (!file) return;
    const { data, error } = await supabase.storage.from('memes').upload(`public/${file.name}`, file);
    setUploading(true);
    setStatus('Uploading...');
    setMemeUrl(null);
    const filePath = `public/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('memes').upload(filePath, file);
    setUploading(false);
    if (error) {
      alert('Upload failed.');
      setStatus(`Upload failed: ${error.message}`);
    } else {
      alert('Upload successful!');
      const { data } = supabase.storage.from('memes').getPublicUrl(filePath);
      setStatus('Upload successful!');
      setMemeUrl(data.publicUrl);
      setFile(null);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <input type="file" ref={inputRef} onChange={handleFileChange} />
      {previewUrl && <img src={previewUrl} alt="preview" width={300} />}
      <button onClick={handleUpload}>Upload Meme</button>
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Meme'}
      </button>
      {status && (
        <p>
          {status}{' '}
          {memeUrl && (
            <a href={memeUrl} target="_blank" rel="noreferrer">
              View meme
            </a>
          )}
        </p>
      )}
    </div>
  );
}
