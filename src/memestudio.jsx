// Inside your MemeStudio.jsx handlePublish() function:
stampArcadeCartridgeFooter(canvasRef.current, {
  username: currentUser?.username || 'CYBER_ANON',
  generation: parentMeme ? (parentMeme.generation || 0) + 1 : 0,
});

// ...convert canvas toBlob and upload to Supabase storage as you already do, then:
const { data, error } = await supabase.from('memes').insert([
  {
    title: memeTitle,
    image_url: publicUrl,
    user_id: currentUser.id,
    parent_meme_id: parentMeme ? parentMeme.id : null, // <-- Links the mutation tree!
  },
]);
useEffect(() => {
  if (mutatingParentMeme && canvasRef.current) {
    loadMemeIntoStudioCanvas(canvasRef.current, mutatingParentMeme.image_url);
  }
}, [mutatingParentMeme]);


// Inside src/components/MemeStudio.jsx
import React, { useRef, useEffect, useState } from 'react';
import { Dna, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  loadMemeIntoStudioCanvas,
  stampArcadeCartridgeFooter,
} from '../utils/canvasMutator';

export default function MemeStudio({
  mutatingParentMeme,
  onClearMutatingParent,
  onPublishSuccess,
  currentUser,
}) {
  const canvasRef = useRef(null);
  const [title, setTitle] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Automatically load the parent meme onto the canvas whenever mutatingParentMeme is set
  useEffect(() => {
    if (mutatingParentMeme && canvasRef.current) {
      setTitle(`REMIX: ${mutatingParentMeme.title || 'Untitled'}`);
      loadMemeIntoStudioCanvas(canvasRef.current, mutatingParentMeme.image_url).catch((err) =>
        console.error('Canvas load error:', err)
      );
    }
  }, [mutatingParentMeme]);

  const handlePublishMeme = async () => {
    if (!canvasRef.current || isPublishing) return;
    setIsPublishing(true);

    try {
      const nextGeneration = mutatingParentMeme ? (mutatingParentMeme.generation || 0) + 1 : 0;

      // 1. Stamp the 16-bit THEMEMES.NET cartridge bar at the bottom of the canvas
      stampArcadeCartridgeFooter(canvasRef.current, {
        username: currentUser?.username || 'ANON_PLAYER',
        generation: nextGeneration,
      });

      // 2. Convert Canvas to Blob and Upload to Supabase Storage
      const blob = await new Promise((resolve) =>
        canvasRef.current.toBlob(resolve, 'image/png', 0.95)
      );
      const fileName = `meme_${Date.now()}_gen${nextGeneration}.png`;

      const { error: uploadError } = await supabase.storage
        .from('memes')
        .upload(fileName, blob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('memes')
        .getPublicUrl(fileName);

      // 3. Insert row into Supabase with parent_meme_id linked
      const { error: insertError } = await supabase.from('memes').insert([
        {
          title: title || 'Mutated Transmission',
          image_url: publicUrlData.publicUrl,
          user_id: currentUser?.id || null,
          parent_meme_id: mutatingParentMeme ? mutatingParentMeme.id : null,
        },
      ]);

      if (insertError) throw insertError;

      if (onPublishSuccess) onPublishSuccess();
    } catch (err) {
      console.error('Failed to publish mutation:', err);
      alert('Upload failed — check console for details.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="p-6 rounded-xl bg-[#090914] border border-cyan-500/40">
      {/* Neon Banner shown ONLY when mutating an existing meme */}
      {mutatingParentMeme && (
        <div className="flex items-center justify-between gap-4 p-3 mb-4 rounded-lg bg-fuchsia-950/50 border border-fuchsia-500 text-xs font-mono">
          <div className="flex items-center gap-2 text-fuchsia-300">
            <Dna className="w-4 h-4 text-fuchsia-400 animate-pulse" />
            <span>
              MUTATING <strong>{mutatingParentMeme.title}</strong> (GEN-
              {(mutatingParentMeme.generation || 0) + 1}) — Origin creator receives{' '}
              <strong className="text-lime-400">+50 XP Royalty</strong>
            </span>
          </div>
          <button
            onClick={onClearMutatingParent}
            className="flex items-center gap-1 px-2 py-1 rounded bg-black/60 text-slate-300 hover:text-white border border-fuchsia-500/40"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset to Blank</span>
          </button>
        </div>
      )}

      {/* Your existing Canvas & Filter/Sticker Controls */}
      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          className="max-w-full rounded border-2 border-cyan-500/50 bg-black"
        />

        <div className="flex w-full max-w-md gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter meme caption or title..."
            className="flex-1 px-3 py-2 rounded bg-black border border-slate-700 font-mono text-sm text-white"
          />
          <button
            onClick={handlePublishMeme}
            disabled={isPublishing}
            className="px-5 py-2 rounded font-mono text-xs font-black uppercase bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black"
          >
            {isPublishing ? 'TRANSMITTING...' : 'PUBLISH'}
          </button>
        </div>
      </div>
    </div>
  );
}