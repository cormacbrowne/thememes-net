import { useState } from 'react';
import { useRef, useState } from 'react';
import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function MemeUploader() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [memeUrl, setMemeUrl] = useState(null);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
    setStatus('');
  };

  const uploadMeme = async () => {
    if (!file) return;

    setUploading(true);
    setStatus('Uploading...');
    setMemeUrl(null);
    const filePath = `${Date.now()}_${file.name}`;
    let { error } = await supabase.storage.from('memes').upload(filePath, file);

    const filePath = `public/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('memes').upload(filePath, file);

    setUploading(false);
    if (error) return alert('Upload failed');
    alert('Meme uploaded!');

    if (error) {
      setStatus(`Upload failed: ${error.message}`);
    } else {
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
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <input
        type="file"
        ref={inputRef}
        onChange={(e) => setFile(e.target.files[0])}
      />
      <input type="file" ref={inputRef} onChange={handleFileChange} />
      {previewUrl && <img src={previewUrl} alt="preview" width={300} />}
      <button className="retro-button" onClick={uploadMeme} disabled={uploading}>
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
