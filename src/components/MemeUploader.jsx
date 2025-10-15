import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function MemeUploader({ onUpload }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [memeUrl, setMemeUrl] = useState(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
    setMemeUrl(null);
    setStatus('');
  };

  const uploadMeme = async () => {
    if (!file) return;
    setUploading(true);
    setStatus('Uploading...');
    const filePath = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('memes').upload(filePath, file);
    if (uploadError) {
      setStatus(`Upload failed: ${uploadError.message}`);
    } else {
      const { data } = await supabase.storage.from('memes').getPublicUrl(filePath);
      setStatus('Upload successful!');
      setMemeUrl(data.publicUrl);
      if (onUpload) onUpload();
    }
    setUploading(false);
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <input ref={inputRef} type="file" onChange={handleFileChange} />
      {previewUrl && <img src={previewUrl} alt="Preview" />}
      {status && <p>{status}</p>}
      {memeUrl && <input type="text" value={memeUrl} readOnly onClick={(e) => e.target.select()} />}
      <button onClick={uploadMeme} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Meme'}
      </button>
    </div>
  );
}
