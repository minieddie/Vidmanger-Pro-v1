
import React, { useRef, useState, useEffect } from 'react';
import { VideoAsset, VideoClip } from '../types';
import { X, Scissors, Plus, Play, Pause, RotateCcw, Shuffle, Volume2, VolumeX, Maximize, Minimize, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface VideoPlayerProps {
  video: VideoAsset | null;
  playlist?: VideoClip[];
  onClose: () => void;
  onAddClip: (clip: VideoClip) => void;
  onNextRandom: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, playlist, onClose, onAddClip, onNextRandom }) => {
  // Using any for ref to bypass environment-specific HTMLVideoElement type issues
  const videoRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [clipStart, setClipStart] = useState<number>(0);
  const [clipEnd, setClipEnd] = useState<number>(0);
  const [isClipMode, setIsClipMode] = useState(false);

  // 强制开始播放
  const startPlayback = () => {
    if (videoRef.current) {
      // Fixed: Casting to any to handle missing play definition
      (videoRef.current as any).play().catch((e: any) => console.warn("Autoplay block:", e));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      // Fixed: Casting e to any to access key property
      switch((e as any).key) {
        case 'ArrowLeft': 
          (videoRef.current as any).currentTime = Math.max(0, (videoRef.current as any).currentTime - 10); 
          break;
        case 'ArrowRight': 
          (videoRef.current as any).currentTime = Math.min((videoRef.current as any).duration, (videoRef.current as any).currentTime + 10); 
          break;
        case ' ': 
          e.preventDefault(); 
          togglePlay(); 
          break;
        case 'Escape': 
          // Fixed: Using (window as any).document casting
          if (((window as any).document as any).fullscreenElement) ((window as any).document as any).exitFullscreen(); 
          else onClose(); 
          break;
      }
    };
    // Fixed: Using (window as any) for global listeners
    (window as any).addEventListener('keydown', handleKeyDown);
    return () => (window as any).removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (playlist && playlist[activeClipIndex]) {
        // Fixed: Casting v to any to access currentTime
        (v as any).currentTime = playlist[activeClipIndex].startTime;
    }

    const updateTime = () => {
      // Fixed: Casting v to any to access currentTime
      setCurrentTime((v as any).currentTime);
      // 如果是播放列表模式，到达结束点自动下一段
      if (playlist && playlist[activeClipIndex]) {
        if ((v as any).currentTime >= playlist[activeClipIndex].endTime) {
          if (activeClipIndex < playlist.length - 1) {
            setActiveClipIndex(activeClipIndex + 1);
          } else {
            // Fixed: Casting v to any for pause
            (v as any).pause();
          }
        }
      }
    };

    const handleLoaded = () => {
        // Fixed: Casting v to any for duration
        setDuration((v as any).duration);
        if (!playlist && clipEnd === 0) setClipEnd((v as any).duration);
        startPlayback(); // 元数据加载后强制播放
    };
    
    // Fixed: Using casting for event listeners on the element
    (v as any).addEventListener('timeupdate', updateTime);
    (v as any).addEventListener('loadedmetadata', handleLoaded);
    (v as any).addEventListener('play', () => setIsPlaying(true));
    (v as any).addEventListener('pause', () => setIsPlaying(false));
    (v as any).addEventListener('canplay', startPlayback);

    return () => {
      (v as any).removeEventListener('timeupdate', updateTime);
      (v as any).removeEventListener('loadedmetadata', handleLoaded);
      (v as any).removeEventListener('canplay', startPlayback);
    };
  }, [video?.id, activeClipIndex, playlist]);

  const togglePlay = () => {
    if (videoRef.current) {
      // Fixed: Casting for play/pause methods
      if (isPlaying) (videoRef.current as any).pause();
      else (videoRef.current as any).play();
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (videoRef.current) {
      // Fixed: Casting for volume property
      (videoRef.current as any).volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      // Fixed: Casting for muted property
      (videoRef.current as any).muted = nextMute;
    }
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    // Fixed: Using (window as any).document casting and container casting
    if (!((window as any).document as any).fullscreenElement) (containerRef.current as any).requestFullscreen();
    else ((window as any).document as any).exitFullscreen();
  };

  if (!video) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black animate-in fade-in duration-200">
        
        {/* Header Bar */}
        {!isFullScreen && (
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
              <div className="flex items-center space-x-4 min-w-0">
                  <h3 className="text-white font-bold truncate text-xs flex items-center gap-2">
                    <span className="text-blue-500 uppercase text-[9px] tracking-widest bg-blue-900/20 px-1.5 py-0.5 rounded">{playlist ? 'Playlist' : 'Direct'}</span> 
                    <span className="truncate opacity-80">{playlist ? `Segment ${activeClipIndex + 1}/${playlist.length}` : video.title}</span>
                  </h3>
              </div>

              <div className="flex items-center space-x-2">
                {!playlist && (
                   <div className="flex items-center space-x-1">
                      <button 
                        onClick={onNextRandom}
                        className="flex items-center space-x-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-[10px] font-black text-white transition-all active:scale-95 shadow-lg"
                        title="Random Next"
                      >
                        <Shuffle size={12} /> <span>NEXT RANDOM</span>
                      </button>
                      <button 
                        onClick={() => setIsClipMode(!isClipMode)}
                        className={`flex items-center space-x-1.5 px-3 py-1 rounded text-[10px] font-bold transition-all ${isClipMode ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                      >
                        <Scissors size={12} /> <span>CUT MODE</span>
                      </button>
                   </div>
                )}
                
                {playlist && (
                   <div className="flex items-center bg-gray-800 rounded p-0.5 border border-gray-700">
                      <button disabled={activeClipIndex === 0} onClick={() => setActiveClipIndex(prev => prev - 1)} className="p-1 hover:bg-gray-700 disabled:opacity-20 text-white"><ChevronLeft size={16} /></button>
                      <span className="px-2 text-[10px] font-mono text-gray-400">{activeClipIndex + 1}/{playlist.length}</span>
                      <button disabled={activeClipIndex === playlist.length - 1} onClick={() => setActiveClipIndex(prev => prev + 1)} className="p-1 hover:bg-gray-700 disabled:opacity-20 text-white"><ChevronRight size={16} /></button>
                   </div>
                )}
                
                <div className="w-px h-4 bg-gray-800 mx-1"></div>
                <button onClick={onClose} className="text-gray-500 hover:text-white p-1.5 rounded-full hover:bg-gray-800"><X size={20} /></button>
              </div>
            </div>
        )}
        
        {/* Video Viewport */}
        <div 
          ref={containerRef}
          className="flex-1 bg-black flex items-center justify-center relative overflow-hidden group/video"
          onDoubleClick={toggleFullScreen}
        >
          <video 
            key={`${video.id}-${activeClipIndex}`} 
            ref={videoRef} src={video.url} 
            className="w-full h-full object-contain"
            autoPlay 
            onClick={togglePlay}
          />
          
          {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                    <Play size={40} className="text-white fill-white ml-1" />
                  </div>
              </div>
          )}
        </div>

        {/* Compact Controls */}
        {!isFullScreen && (
            <div className="flex-shrink-0 bg-gray-950 border-t border-gray-900 px-6 py-2.5 space-y-2">
              <div className="flex items-center space-x-4">
                <button onClick={togglePlay} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-white transition-all active:scale-90">
                   {isPlaying ? <Pause size={16} /> : <Play size={16} fill="white" />}
                </button>

                <div className="flex-1 group relative flex items-center">
                    <input 
                      type="range" min={0} max={duration || 100} step={0.1}
                      value={currentTime} 
                      onChange={(e) => {
                        // Fixed: Casting e.target to any
                        const t = Number((e.target as any).value);
                        if(videoRef.current) (videoRef.current as any).currentTime = t;
                      }}
                      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    {isClipMode && (
                        <div className="absolute top-0 left-0 right-0 h-1 pointer-events-none opacity-40">
                            <div 
                                className="absolute top-0 h-full bg-emerald-500"
                                style={{
                                    left: `${(clipStart / (duration || 1)) * 100}%`,
                                    width: `${((clipEnd - clipStart) / (duration || 1)) * 100}%`
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-4 min-w-fit">
                    {/* Volume Control */}
                    <div className="flex items-center space-x-2 group/volume relative">
                        <button onClick={toggleMute} className="text-gray-500 hover:text-white transition-colors">
                            {isMuted || volume === 0 ? <VolumeX size={16}/> : <Volume2 size={16}/>}
                        </button>
                        <input 
                            type="range" min="0" max="1" step="0.05" 
                            value={isMuted ? 0 : volume}
                            // Fixed: Casting e.target to any
                            onChange={(e) => handleVolumeChange(Number((e.target as any).value))}
                            className="w-0 group-hover/volume:w-16 transition-all h-1 bg-gray-800 appearance-none accent-gray-400 rounded-full overflow-hidden"
                        />
                    </div>

                    <span className="text-[10px] font-mono text-gray-500">
                        {Math.floor(currentTime/60)}:{(currentTime%60).toFixed(0).padStart(2,'0')} / {Math.floor(duration/60)}:{(duration%60).toFixed(0).padStart(2,'0')}
                    </span>
                    <button onClick={toggleFullScreen} className="text-gray-500 hover:text-white"><Maximize size={14} /></button>
                </div>
              </div>

              {isClipMode && !playlist && (
                <div className="flex items-center justify-between gap-4 py-1.5 border-t border-gray-900 animate-in slide-in-from-bottom-2">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center bg-gray-900 rounded px-2 py-1 border border-gray-800">
                            <span className="text-[9px] text-gray-600 font-black mr-2">START</span>
                            <span className="text-[10px] font-mono text-blue-400">{Math.floor(clipStart/60)}:{(clipStart%60).toFixed(1).padStart(4,'0')}</span>
                            <button onClick={() => setClipStart(currentTime)} className="ml-2 hover:text-emerald-500 text-gray-600 transition-colors"><Check size={12} /></button>
                        </div>
                        <div className="flex items-center bg-gray-900 rounded px-2 py-1 border border-gray-800">
                            <span className="text-[9px] text-gray-600 font-black mr-2">END</span>
                            <span className="text-[10px] font-mono text-blue-400">{Math.floor(clipEnd/60)}:{(clipEnd%60).toFixed(1).padStart(4,'0')}</span>
                            <button onClick={() => setClipEnd(currentTime)} className="ml-2 hover:text-emerald-500 text-gray-600 transition-colors"><Check size={12} /></button>
                        </div>
                        <button onClick={() => { setClipStart(0); setClipEnd(duration); }} className="p-1 text-gray-600 hover:text-white" title="Reset Range"><RotateCcw size={14} /></button>
                    </div>

                    <button 
                        onClick={() => {
                            onAddClip({
                                id: crypto.randomUUID(),
                                sourceVideoId: video.id,
                                sourceTitle: video.title,
                                thumbnail: video.thumbnail,
                                startTime: clipStart,
                                endTime: clipEnd || duration
                            });
                            setIsClipMode(false);
                        }}
                        className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                    >
                        <Plus size={12} />
                        <span>Add Segment</span>
                    </button>
                </div>
              )}
            </div>
        )}
    </div>
  );
};
