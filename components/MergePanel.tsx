import React, { useState } from 'react';
import { VideoClip, ExportConfig, ProcessingStatus } from '../types';
import { Trash2, Film, Download, Video, Play, Settings2, ChevronDown, Activity, AlertCircle, RefreshCw } from 'lucide-react';

interface MergePanelProps {
  clips: VideoClip[];
  onRemoveClip: (id: string) => void;
  onProcess: (config: ExportConfig) => void;
  onPreview: () => void;
  status: ProcessingStatus;
  onClose: () => void;
}

export const MergePanel: React.FC<MergePanelProps> = ({ clips, onRemoveClip, onProcess, onPreview, status, onClose }) => {
  const [config, setConfig] = useState<ExportConfig>({
    resolution: 'original',
    format: 'mp4',
    codec: 'libx264',
    overlayText: true,
    fontSize: 32,
    fontOpacity: 0.9
  });

  const totalDuration = clips.reduce((acc, clip) => acc + (clip.endTime - clip.startTime), 0);
  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 shadow-2xl z-40 flex flex-col transition-all duration-300 ${status.isProcessing ? 'h-[35vh]' : 'h-[60vh]'}`}>
      
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center space-x-4">
           <Film className="text-blue-500" size={18} />
           <span className="font-bold text-white text-xs tracking-tight">EXPORT ENGINE</span>
           <span className="px-2 py-0.5 bg-blue-900/40 text-blue-400 rounded text-[9px] font-black uppercase">{clips.length} SEGMENTS</span>
           {!status.isProcessing && <span className="text-[10px] text-gray-500 font-mono">EST: {formatDuration(totalDuration)}</span>}
        </div>
        <div className="flex items-center gap-3">
            {!status.isProcessing && (
                <button 
                    onClick={onPreview} 
                    disabled={clips.length === 0}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px] font-bold border border-gray-700 transition-all active:scale-95 disabled:opacity-20"
                >
                    <Play size={10} fill="currentColor"/> PREVIEW LIST
                </button>
            )}
            <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors"><ChevronDown size={20} /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {status.isProcessing ? (
            <div className="flex-1 flex items-center justify-center p-8 bg-black/40">
                <div className="max-w-lg w-full space-y-6 text-center">
                    {status.stage === 'Error' ? (
                        <div className="space-y-4 animate-in zoom-in-95">
                            <AlertCircle className="text-red-500 mx-auto" size={48} />
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold text-white">Export Failed</h2>
                                <p className="text-xs text-red-400/80 font-mono">{status.log || "Critical error occurred during transcode."}</p>
                            </div>
                            <button 
                                onClick={() => (window as any).location.reload()}
                                className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-xs font-bold transition-all"
                            >
                                <RefreshCw size={14} /> Restart Engine
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="relative inline-block">
                                <Activity className="text-blue-500 animate-pulse" size={40} />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <h2 className="text-sm font-black text-white tracking-widest uppercase">{status.stage}</h2>
                                    <span className="text-xl font-mono text-blue-500">{status.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden border border-gray-800">
                                    <div 
                                        className="bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-500 h-full transition-all duration-500" 
                                        style={{ width: `${status.progress}%` }} 
                                    />
                                </div>
                                <p className="text-[9px] text-gray-600 font-mono italic">Operating in-memory. Keep the window active.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-black/20 custom-scrollbar">
                {clips.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-2">
                        <Video size={28} className="opacity-10" />
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Add segments from the player</p>
                    </div>
                ) : (
                    clips.map((clip, idx) => (
                    <div key={clip.id} className="flex items-center bg-gray-900/50 p-2 rounded border border-gray-800 group hover:border-gray-700 transition-all">
                        <span className="w-5 text-center text-gray-700 font-black text-[9px]">{idx + 1}</span>
                        <div className="w-14 aspect-video bg-black rounded overflow-hidden mx-3 border border-gray-800">
                            {clip.thumbnail ? (
                                <img src={clip.thumbnail} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full bg-gray-800" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-bold text-gray-200 truncate">{clip.sourceTitle}</h4>
                            <p className="text-[9px] font-mono text-gray-500">{clip.startTime.toFixed(1)}s → {clip.endTime.toFixed(1)}s</p>
                        </div>
                        <button 
                            onClick={() => onRemoveClip(clip.id)} 
                            className="p-1.5 text-gray-700 hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                    ))
                )}
                </div>

                <div className="w-72 bg-gray-950 border-l border-gray-900 p-6 flex flex-col space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-[9px] font-black text-gray-600 uppercase flex items-center gap-2 tracking-widest">
                            <Settings2 size={12}/> Export Settings
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-bold text-gray-500 block mb-1 uppercase tracking-tight">Resolution</label>
                                <select 
                                    value={config.resolution} 
                                    onChange={(e) => setConfig({...config, resolution: (e.target as any).value as any})}
                                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-[10px] text-white outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="original">Original (Native)</option>
                                    <option value="1080p">1080p Full HD</option>
                                    <option value="720p">720p HD</option>
                                    <option value="480p">480p SD</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between p-2.5 bg-gray-900/50 rounded border border-gray-800">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-300">Burn Titles</span>
                                    <span className="text-[8px] text-gray-600">Overlay asset name</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={config.overlayText} 
                                    onChange={(e) => setConfig({...config, overlayText: (e.target as any).checked})} 
                                    className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-0" 
                                />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => onProcess(config)}
                        disabled={clips.length === 0}
                        className="mt-auto w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white py-3 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all shadow-xl active:scale-95"
                    >
                        <Download size={14} />
                        <span>Build Video</span>
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};