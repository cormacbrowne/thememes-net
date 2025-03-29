import { supabase } from '../supabaseClient';

export default function App() {
  const root = document.getElementById('root');
  root.innerHTML = \`
    <h1>Upload a Meme</h1>
    <input type="file" id="fileInput" />
    <div id="memeGallery"></div>
  \`;

  const fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const filePath = \`memes/\${Date.now()}_\${file.name}\`;
    const { error } = await supabase.storage.from('memes').upload(filePath, file);
    if (error) {
      alert('Upload failed');
      return;
    }
    alert('Upload successful');
    loadGallery();
  });

  async function loadGallery() {
    const { data, error } = await supabase.storage.from('memes').list('', { limit: 20 });
    if (error) {
      console.error('Error loading gallery:', error);
      return;
    }

    const gallery = document.getElementById('memeGallery');
    gallery.innerHTML = '';
    for (const item of data) {
      const { data: urlData } = await supabase.storage.from('memes').getPublicUrl(item.name);
      const img = document.createElement('img');
      img.src = urlData.publicUrl;
      img.style.maxWidth = '300px';
      img.style.display = 'block';
      img.style.margin = '10px 0';
      gallery.appendChild(img);
    }
  }

  loadGallery();
}