// src/components/MemeEvolutionModal.jsx
import React, { useEffect, useState } from 'react';
import { Dna, GitFork, Zap, Sparkles, X, Trophy, ArrowDownRight } from 'lucide-react';
import { supabase } from '../supabaseClient'; // Adjust path to your supabase client

/**
 * 1. Drop this bar into the bottom of your existing MemeCard component
 */
export function MutateActionBar({ meme, onTriggerStudioMutate, playArcadeSound }) {
  const [showTree, setShowTree] = useState(false);

  const handleMutateClick = (e) => {
    e.stopPropagation();
    if (playArcadeSound) playArcadeSound('powerup'); // Hooks into your Web Audio synth
    onTriggerStudioMutate(meme);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-cyan-500/20">
        {/* Generation & Tree Inspector Badge */}
        {(meme.generation > 0 || meme.mutation_count > 0) ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTree(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold tracking-wider uppercase rounded bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-500/40 hover:border-fuchsia-400 hover:bg-fuchsia-900/60 transition-all"
          >
            <GitFork className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>GEN-{meme.generation || 0}</span>
            {meme.mutation_count > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-fuchsia-500/30 rounded text-white">
                {meme.mutation_count} {meme.mutation_count === 1 ? 'REMIX' : 'REMIXES'}
              </span>
            )}
          </button>
        ) : (
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
            GEN-0 // PURE ORIGIN
          </span>
        )}

        {/* The Primary [MUTATE] CTA Button */}
        <button
          onClick={handleMutateClick}
          className="group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-black uppercase tracking-wider text-black bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-lime-400 rounded shadow-[0_0_15px_rgba(0,243,255,0.4)] hover:shadow-[0_0_25px_rgba(255,0,255,0.8)] hover:scale-105 active:scale-95 transition-all"
        >
          <Dna className="w-3.5 h-3.5 transition-transform group-hover:rotate-180 duration-500" />
          <span>MUTATE (+XP)</span>
        </button>
      </div>

      {showTree && (
        <MemeEvolutionModal
          memeId={meme.id}
          onClose={() => setShowTree(false)}
          onSelectMemeToMutate={(selectedNode) => {
            setShowTree(false);
            onTriggerStudioMutate(selectedNode);
          }}
        />
      )}
    </>
  );
}

/**
 * 2. The Interactive Genealogical Evolution Tree Modal
 */
export function MemeEvolutionModal({ memeId, onClose, onSelectMemeToMutate }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLineage() {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_meme_evolution_tree', {
        target_meme_id: memeId,
      });
      if (!error && data) {
        setNodes(data);
      }
      setLoading(false);
    }
    fetchLineage();
  }, [memeId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl bg-[#090912] border-2 border-cyan-400/60 shadow-[0_0_50px_rgba(0,243,255,0.25)] p-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/50">
              <Dna className="w-6 h-6 text-fuchsia-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 uppercase">
                Meme Evolution Tree
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Origin creators earn <span className="text-lime-400 font-bold">+50 XP</span> per mutation &{' '}
                <span className="text-cyan-300 font-bold">15% passive XP royalties</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lineage List */}
        {loading ? (
          <div className="py-16 text-center font-mono text-cyan-400 animate-pulse">
            SCANNING GENETIC MEME ARCHIVES...
          </div>
        ) : (
          <div className="space-y-4">
            {nodes.map((node) => {
              const isCurrent = node.id === memeId;
              const indentPx = Math.min(node.generation * 28, 140);

              return (
                <div
                  key={node.id}
                  style={{ marginLeft: `${indentPx}px` }}
                  className={`relative flex items-center justify-between gap-4 p-3 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.2)]'
                      : 'bg-slate-900/70 border-slate-800 hover:border-fuchsia-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {node.generation > 0 && (
                      <ArrowDownRight className="w-4 h-4 text-fuchsia-400 shrink-0" />
                    )}
                    <img
                      src={node.image_url}
                      alt={node.title}
                      className="w-16 h-16 object-cover rounded border border-slate-700 bg-black shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded uppercase ${
                            node.generation === 0
                              ? 'bg-lime-500/20 text-lime-300 border border-lime-500/40'
                              : 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                          }`}
                        >
                          {node.generation === 0 ? 'GEN-0 ORIGIN' : `GEN-${node.generation} MUTATION`}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono text-cyan-300 uppercase">
                            [VIEWING NOW]
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-white mt-1 line-clamp-1">
                        {node.title || 'Untitled Transmission'}
                      </h4>
                      <p className="text-xs font-mono text-slate-400">
                        by <span className="text-cyan-300">@{node.username}</span> • ⚡ {node.upvotes} Votes
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectMemeToMutate(node)}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_12px_rgba(255,0,255,0.4)] transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Mutate This</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}