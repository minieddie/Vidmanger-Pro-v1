
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MetadataPanel } from './components/MetadataPanel';
import { VideoPlayer } from './components/VideoPlayer';
import { MergePanel } from './components/MergePanel';
import { VideoAsset, ViewMode, VideoClip, ProcessingStatus, ExportConfig, Collection, LibraryData } from './types';
import { Play, Upload, FileVideo, Image as ImageIcon, LayoutGrid, FolderSearch, Layers, Save, Download, RefreshCw, X, Folder, AlertTriangle, Columns } from 'lucide-react';
import { generateThumbnail, parseNFO, VIDEO_EXTENSIONS, IMAGE_EXTENSIONS } from './utils';
import { processVideos } from './services/ffmpeg';

export default function App() {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  
  // Playback States
  const [playingVideo, setPlayingVideo] = useState<VideoAsset | null>(null);
  const [previewPlaylist, setPreviewPlaylist] = useState<VideoClip[] | null>(null);
  
  // Grid Config
  const [columnCount, setColumnCount] = useState<number>(4);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Merge Queue State
  const [mergeQueue, setMergeQueue] = useState<VideoClip[]>([]);
  const [showMergePanel, setShowMergePanel] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    progress: 0,
    stage: ''
  });
  
  const [showTools, setShowTools] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const loadIndexInputRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    videos.forEach(v => v.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      if (selectedCollectionId !== null && video.collectionId !== selectedCollectionId) return false;
      const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = selectedTags.length === 0 ? true : video.tags.some(tag => selectedTags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [videos, searchQuery, selectedTags, selectedCollectionId]);

  const selectedVideo = filteredVideos.find(v => v.id === selectedVideoId) || null;

  const handleUpdateVideo = (id: string, updates: Partial<VideoAsset>) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const handleFolderScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!(event.target as any).files || (event.target as any).files.length === 0) return;
    
    const fileList = Array.from((event.target as any).files) as any[];
    const dirMap = new Map<string, { videos: File[], images: File[], nfos: File[] }>();
    
    fileList.forEach(file => {
      const dirPath = (file.webkitRelativePath || '').split('/').slice(0, -1).join('/');
      if (!dirMap.has(dirPath)) dirMap.set(dirPath, { videos: [], images: [], nfos: [] });
      const entry = dirMap.get(dirPath)!;
      
      const lowerName = (file.name || '').toLowerCase();
      if (VIDEO_EXTENSIONS.some(ext => lowerName.endsWith(ext))) entry.videos.push(file as File);
      else if (IMAGE_EXTENSIONS.some(ext => lowerName.endsWith(ext))) entry.images.push(file as File);
      else if (lowerName.endsWith('.nfo')) entry.nfos.push(file as File);
    });

    const newAssets: VideoAsset[] = [];
    for (const [dir, contents] of dirMap.entries()) {
      const commonCover = contents.images.find(f => /poster|cover|folder|default/i.test(f.name));
      for (const videoFile of contents.videos) {
        const videoUrl = URL.createObjectURL(videoFile);
        const nameBase = videoFile.name.substring(0, videoFile.name.lastIndexOf('.'));
        const existing = videos.find(v => v.path === (videoFile as any).webkitRelativePath || v.title === videoFile.name);
        
        if (existing) {
             setVideos(prev => prev.map(v => v.id === existing.id ? { ...v, url: videoUrl } : v));
             continue;
        }

        let nfo = contents.nfos.find(f => f.name.toLowerCase().startsWith(nameBase.toLowerCase())) || contents.nfos[0];
        let img = contents.images.find(f => f.name.toLowerCase().startsWith(nameBase.toLowerCase())) || commonCover;
        let meta = nfo ? await parseNFO(nfo) : {};
        let thumb = img ? URL.createObjectURL(img) : await generateThumbnail(videoUrl);

        newAssets.push({
          id: crypto.randomUUID(),
          title: meta.title || videoFile.name,
          description: meta.description || '',
          tags: meta.tags || [],
          url: videoUrl,
          path: (videoFile as any).webkitRelativePath || videoFile.name,
          thumbnail: thumb,
          fileSize: `${(videoFile.size / (1024 * 1024)).toFixed(2)} MB`,
          createdAt: new Date(videoFile.lastModified),
          type: 'local',
          duration: '00:00',
          collectionId: selectedCollectionId || undefined
        });
      }
    }
    setVideos(prev => [...prev, ...newAssets]);
  };

  const handleSaveLibrary = () => {
    const data: LibraryData = { version: 1, collections, videos: videos.map(v => ({...v, url: ''})) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = ((window as any).document as any).createElement('a');
    a.href = url;
    a.download = `vidmanager_index_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadLibrary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!(e.target as any).files?.[0]) return;
    try {
      const data: LibraryData = JSON.parse(await (e.target as any).files[0].text());
      if (data.collections) setCollections(data.collections);
      if (data.videos) setVideos(prev => [...prev, ...data.videos.filter(v => !prev.some(p => p.id === v.id))]);
    } catch (err) { (window as any).alert("Load Failed"); }
  };

  const playRandom = () => {
    const pool = filteredVideos.filter(v => v.url);
    if(pool.length) {
      // 强制刷新播放器实例以确保 autoPlay 触发
      setPlayingVideo(null); 
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * pool.length);
        setPlayingVideo(pool[randomIndex]);
      }, 50);
    }
  };

  return (
    <div className="flex h-screen w-full bg-black text-gray-100 overflow-hidden font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="video/*" multiple onChange={handleFolderScan} />
      <input type="file" ref={folderInputRef} className="hidden" {...{ webkitdirectory: "", directory: "" } as any} onChange={handleFolderScan} />
      <input type="file" ref={loadIndexInputRef} className="hidden" accept=".json" onChange={handleLoadLibrary} />

      <Sidebar 
        currentView={viewMode} onViewChange={setViewMode} 
        onImportClick={() => (fileInputRef.current as any)?.click()} onScanClick={() => (folderInputRef.current as any)?.click()}
        allTags={allTags} selectedTags={selectedTags} onToggleTag={(t) => setSelectedTags(p => p.includes(t) ? p.filter(tag => tag !== t) : [...p, t])}
        onClearTags={() => setSelectedTags([])} onRandomPlay={playRandom}
        collections={collections} selectedCollectionId={selectedCollectionId} onSelectCollection={setSelectedCollectionId}
        onCreateCollection={(n) => setCollections(p => [...p, { id: crypto.randomUUID(), name: n }])}
        onDeleteCollection={(id) => setCollections(p => p.filter(c => c.id !== id))} onOpenTools={() => setShowTools(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-gray-950 relative">
        <header className="h-16 border-b border-gray-900 flex items-center justify-between px-6 bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center space-x-4">
             <h1 className="text-lg font-bold text-white">{selectedCollectionId ? collections.find(c => c.id === selectedCollectionId)?.name : 'Assets Library'}</h1>
             <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-gray-900 rounded border border-gray-800">{filteredVideos.length} ITEMS</span>
          </div>
          <div className="flex items-center space-x-8">
             <button onClick={() => setShowMergePanel(!showMergePanel)} className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${mergeQueue.length ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-white'}`}>
               <Layers size={16} /> <span className="text-xs font-bold uppercase tracking-tighter">Export Queue ({mergeQueue.length})</span>
             </button>
             <div className="flex items-center space-x-3 text-gray-500 hover:text-gray-300 transition-colors">
                <Columns size={14} />
                <input type="range" min="2" max="8" value={columnCount} onChange={(e) => setColumnCount(parseInt((e.target as any).value))} className="w-24 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                <span className="text-[10px] font-mono w-4">{columnCount}</span>
             </div>
             <input type="text" value={searchQuery} onChange={(e) => setSearchQuery((e.target as any).value)} placeholder="Filter library..." className="bg-gray-900 border border-gray-800 text-sm rounded-full px-4 py-1.5 w-48 focus:w-64 transition-all outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
          {filteredVideos.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-40">
               <FolderSearch size={64} className="mb-4 text-gray-800" />
               <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-700">Storage Empty</p>
             </div>
          ) : viewMode === ViewMode.GRID ? (
            <div style={{ columnCount: columnCount }} className="gap-5 space-y-5">
              {filteredVideos.map(video => (
                <div 
                  key={video.id} 
                  onClick={() => setSelectedVideoId(video.id)} 
                  onDoubleClick={() => {
                    if(video.url) {
                        setPlayingVideo(null); // 强制重置确保触发 effect
                        setTimeout(() => setPlayingVideo(video), 10);
                    }
                  }} 
                  className={`break-inside-avoid relative bg-gray-900 rounded-xl overflow-hidden border transition-all cursor-pointer group ${selectedVideoId === video.id ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-transparent hover:border-gray-700'}`}
                >
                  <div className="w-full relative">
                    {video.thumbnail && !video.thumbnail.startsWith('blob:') || (video.thumbnail?.startsWith('blob:') && video.url) ? (
                      <img src={video.thumbnail} className="w-full h-auto block transform group-hover:scale-105 transition-transform duration-700" loading="lazy" alt={video.title} />
                    ) : (
                      <div className="aspect-video flex items-center justify-center text-gray-700 bg-gray-900 py-10"><AlertTriangle size={32} /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-4">
                       <div className="flex items-center gap-3">
                         {video.url ? (
                           <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                             <Play size={16} fill="white" className="ml-0.5 text-white" />
                           </div>
                         ) : (
                           <span className="bg-red-500 text-[9px] px-1.5 py-0.5 rounded text-white font-black uppercase">Offline</span>
                         )}
                         <div className="min-w-0"><h3 className="text-xs font-black text-white truncate drop-shadow-md">{video.title}</h3><p className="text-[10px] text-gray-400 font-mono">{video.fileSize}</p></div>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="space-y-1">
               {filteredVideos.map(video => (
                  <div 
                    key={video.id} 
                    onClick={() => setSelectedVideoId(video.id)} 
                    onDoubleClick={() => video.url && setPlayingVideo(video)} 
                    className={`flex items-center p-3 rounded-lg border transition-colors cursor-pointer ${selectedVideoId === video.id ? 'bg-blue-950/20 border-blue-500/50' : 'hover:bg-gray-900 border-transparent'}`}
                  >
                    <div className="w-16 aspect-video bg-black rounded overflow-hidden mr-4"><img src={video.thumbnail} className="w-full h-full object-cover" alt={video.title} /></div>
                    <div className="flex-1 min-w-0"><h4 className="text-sm font-semibold truncate">{video.title}</h4><p className="text-xs text-gray-500 truncate">{video.description}</p></div>
                    <div className="text-[10px] font-mono text-gray-500 uppercase ml-4">{video.fileSize}</div>
                  </div>
               ))}
             </div>
          )}
        </div>
      </main>

      <MetadataPanel video={selectedVideo} onUpdateVideo={handleUpdateVideo} />

      {(playingVideo || previewPlaylist) && (
        <VideoPlayer 
          key={playingVideo?.id || 'playlist'} 
          video={playingVideo || (previewPlaylist ? videos.find(v => v.id === previewPlaylist[0].sourceVideoId) || null : null)} 
          playlist={previewPlaylist || undefined}
          onClose={() => { setPlayingVideo(null); setPreviewPlaylist(null); }} 
          onAddClip={(c) => { setMergeQueue(p => [...p, c]); setShowMergePanel(true); }}
          onNextRandom={playRandom}
        />
      )}

      {showMergePanel && (
        <MergePanel 
          clips={mergeQueue} onRemoveClip={(id) => setMergeQueue(p => p.filter(c => c.id !== id))} 
          onProcess={async (cfg) => {
             setProcessingStatus({ isProcessing: true, progress: 0, stage: 'Engine Initializing...' });
             try {
                const url = await processVideos(mergeQueue, videos, cfg, (p, s) => setProcessingStatus({ isProcessing: true, progress: p, stage: s }));
                const a = ((window as any).document as any).createElement('a'); 
                a.href = url; 
                a.download = `output_${Date.now()}.${cfg.format}`; 
                a.click();
                setProcessingStatus({ isProcessing: false, progress: 100, stage: 'Task Finished' });
             } catch(e: any) { 
               console.error(e);
               setProcessingStatus({ isProcessing: true, progress: 0, stage: 'Critical Error', log: e.message }); 
             }
          }}
          onPreview={() => setPreviewPlaylist([...mergeQueue])}
          status={processingStatus} onClose={() => setShowMergePanel(false)}
        />
      )}

      {showTools && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-300">
           <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-8 space-y-8">
             <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Library Control Center</h2><button onClick={() => setShowTools(false)} className="text-gray-500 hover:text-white"><X/></button></div>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={handleSaveLibrary} className="flex flex-col items-center gap-3 p-6 bg-gray-850 hover:bg-gray-800 rounded-xl border border-gray-800 transition-all group">
                  <Download className="group-hover:translate-y-1 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-widest">Backup Index</span>
                </button>
                <button onClick={() => (loadIndexInputRef.current as any)?.click()} className="flex flex-col items-center gap-3 p-6 bg-gray-850 hover:bg-gray-800 rounded-xl border border-gray-800 transition-all group">
                  <Upload className="group-hover:-translate-y-1 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-widest">Restore Library</span>
                </button>
             </div>
             <p className="text-[10px] text-gray-500 text-center leading-relaxed font-mono opacity-60">Memory persistence is not guaranteed. Scan your root directory to link binary assets to metadata records.</p>
           </div>
         </div>
      )}
    </div>
  );
}
