
import React, { useState } from 'react';
import { VideoAsset, GenerationState } from '../types';
import { Wand2, Save, Tag, FileVideo, Info } from 'lucide-react';
import { generateVideoMetadata } from '../services/gemini';
import { generateNFOString } from '../utils';

interface MetadataPanelProps {
  video: VideoAsset | null;
  onUpdateVideo: (id: string, updates: Partial<VideoAsset>) => void;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ video, onUpdateVideo }) => {
  const [genState, setGenState] = useState<GenerationState>({ isGenerating: false, error: null });

  if (!video) {
    return (
      <div className="w-96 bg-gray-950 border-l border-gray-900 p-8 flex flex-col items-center justify-center text-center h-full flex-shrink-0">
        <div className="w-20 h-20 bg-gray-900/50 rounded-full flex items-center justify-center mb-6 text-gray-800 border border-gray-800/50">
          <Info size={40} />
        </div>
        <h3 className="text-gray-300 font-bold text-lg mb-3 tracking-tight">Inspect Asset</h3>
        <p className="text-sm text-gray-600 leading-relaxed max-w-[220px]">Pick any video from your library to modify metadata, generate AI plots, or export NFO files.</p>
      </div>
    );
  }

  return (
    <aside className="w-96 bg-gray-950 border-l border-gray-900 flex flex-col h-full overflow-y-auto flex-shrink-0 custom-scrollbar">
      <div className="p-8 border-b border-gray-900 bg-gray-950/50 sticky top-0 backdrop-blur-md z-10 flex flex-col gap-1">
           <h2 className="text-xl font-black text-white tracking-tight uppercase">ASSET INFO</h2>
           <p className="text-[10px] text-gray-600 font-mono font-bold truncate opacity-80">{video.id}</p>
      </div>

      <div className="p-8 space-y-10">
        {/* Responsive Aspect Ratio Image */}
        <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Source Identity</label>
            <div className="w-full bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
            {video.thumbnail ? (
                <img 
                  src={video.thumbnail} 
                  alt={video.title} 
                  className="w-full h-auto block object-contain max-h-[400px]" 
                />
            ) : (
                <div className="aspect-video w-full flex items-center justify-center text-gray-800 bg-gray-900">
                    <FileVideo size={48} />
                </div>
            )}
            </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Asset Label</label>
          <input
            type="text"
            value={video.title}
            // Casting e.target to any for value
            onChange={(e) => onUpdateVideo(video.id, { title: (e.target as any).value })}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-bold focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-inner"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Narrative / Plot</label>
            <button
              onClick={async () => {
                 setGenState({ isGenerating: true, error: null });
                 try {
                   const res = await generateVideoMetadata(video.title);
                   onUpdateVideo(video.id, { description: res.description, tags: res.tags });
                 } catch (e) { setGenState({ isGenerating: false, error: "AI Failed" }); }
                 finally { setGenState(p => ({...p, isGenerating: false})); }
              }}
              disabled={genState.isGenerating}
              className="flex items-center gap-2 text-[10px] font-black bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full transition-all disabled:opacity-20 shadow-lg active:scale-90"
            >
              <Wand2 size={12} />
              <span>{genState.isGenerating ? 'ANALYZING...' : 'AI GENERATE'}</span>
            </button>
          </div>
          <textarea
            value={video.description}
            // Casting e.target to any for value
            onChange={(e) => onUpdateVideo(video.id, { description: (e.target as any).value })}
            rows={6}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-300 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-inner resize-none leading-relaxed"
            placeholder="No description available..."
          />
        </div>

        <div className="space-y-4 pb-8">
          <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] flex items-center gap-2">
            <Tag size={12} /> Genre Taxonomy
          </label>
          <div className="flex flex-wrap gap-2.5 p-4 bg-gray-900 rounded-2xl border border-gray-800 shadow-inner">
            {video.tags.map((tag, idx) => (
              <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-850 border border-gray-800 text-[11px] font-bold text-gray-300">
                {tag}
                <button 
                  onClick={() => onUpdateVideo(video.id, { tags: video.tags.filter((_, i) => i !== idx) })}
                  className="ml-2 text-gray-600 hover:text-red-500 transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="+ New Tag"
              className="bg-transparent text-[11px] text-blue-500 font-bold focus:outline-none w-24 placeholder-gray-700"
              onKeyDown={(e) => {
                // Casting e.currentTarget to any for value
                if ((e as any).key === 'Enter') {
                  const val = (e.currentTarget as any).value.trim();
                  if (val && !video.tags.includes(val)) {
                    onUpdateVideo(video.id, { tags: [...video.tags, val] });
                    (e.currentTarget as any).value = '';
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="p-8 border-t border-gray-900 bg-gray-950 mt-auto sticky bottom-0">
        <button 
          onClick={() => {
              const str = generateNFOString(video);
              const b = new Blob([str], { type: 'text/xml' });
              const url = URL.createObjectURL(b);
              // Added (window as any).document casting to handle environments with missing DOM type definitions
              const a = ((window as any).document as any).createElement('a');
              a.href = url;
              a.download = video.title.split('.')[0] + '.nfo';
              a.click();
              URL.revokeObjectURL(url);
          }}
          className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-200 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95"
        >
          <Save size={18} />
          <span>Export .NFO File</span>
        </button>
      </div>
    </aside>
  );
};