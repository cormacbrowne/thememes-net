// src/components/MemeCard.jsx
import React from 'react';
import { Flame, MessageSquare, Share2, Dna } from 'lucide-react';
import { MutateActionBar } from './MemeEvolutionModal';

export default function MemeCard({
  meme,
  onUpvote,
  onOpenComments,
  onTriggerStudioMutate,
  playArcadeSound,
}) {
  return (
    <div className="group relative flex flex-col justify-between rounded-xl bg-[#0b0b16] border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.08)] hover:shadow-[0_0_30px_rgba(0,243,255,0.25)] transition-all duration-300 overflow-hidden p-3">
      
      {/* Top Header: Title & Creator */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-mono font-bold text-sm text-white truncate">
          {meme.title || 'UNTITLED_TRANSMISSION'}
        </h3>
        <span className="shrink-0 text-[11px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
          @{meme.username || 'ANON'}
        </span>
      </div>

      {/* Meme Image Container with Generation Overlay Badge */}
      <div className="relative w-full overflow-hidden rounded-lg bg-black border border-slate-800">
        {meme.generation > 0 && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-fuchsia-500 text-fuchsia-300 text-[10px] font-mono font-black uppercase shadow-[0_0_12px_rgba(255,0,255,0.5)]">
            <Dna className="w-3 h-3 text-fuchsia-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>GEN-{meme.generation} REMIX</span>
          </div>
        )}

        <img
          src={meme.image_url}
          alt={meme.title}
          loading="lazy"
          className="w-full max-h-[460px] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
        />
      </div>

      {/* Standard Engagement Row (Upvotes, Comments, Share) */}
      <div className="flex items-center justify-between pt-3 mt-1 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpvote && onUpvote(meme.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-cyan-950 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 transition-all"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="font-bold">{meme.upvotes || 0}</span>
          </button>

          <button
            onClick={() => onOpenComments && onOpenComments(meme)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>{meme.comment_count || 0}</span>
          </button>
        </div>

        <button
          onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/?meme=${meme.id}`)}
          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
          title="Copy Link"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fork & Mutate Action Bar + Evolution Tree Trigger */}
      <MutateActionBar
        meme={meme}
        onTriggerStudioMutate={onTriggerStudioMutate}
        playArcadeSound={playArcadeSound}
      />
    </div>
  );
}