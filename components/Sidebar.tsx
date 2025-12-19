import React, { useState } from 'react';
import { LayoutGrid, List, Settings, Film, FolderOpen, HardDrive, PlayCircle, Plus, Folder, Trash2 } from 'lucide-react';
import { ViewMode, Collection } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  onImportClick: () => void;
  onScanClick: () => void;
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  onRandomPlay: () => void;
  collections: Collection[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onCreateCollection: (name: string) => void;
  onDeleteCollection: (id: string) => void;
  onOpenTools: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  onImportClick, 
  onScanClick,
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags,
  onRandomPlay,
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onDeleteCollection,
  onOpenTools
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCollectionName.trim()) {
      onCreateCollection(newCollectionName.trim());
      setNewCollectionName('');
      setIsCreating(false);
    }
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full flex-shrink-0">
      <div className="p-6 flex items-center space-x-2 border-b border-gray-800">
        <Film className="text-blue-500" size={24} />
        <span className="text-xl font-bold tracking-tight text-white">VidManager<span className="text-blue-500">Pro</span></span>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Playback Actions */}
        <div>
          <button 
             onClick={onRandomPlay}
             className="w-full flex items-center justify-center space-x-2 px-2 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-md transition-all shadow-lg active:scale-95 group"
           >
            <PlayCircle size={20} className="group-hover:animate-pulse"/>
            <span className="font-semibold">
                {selectedCollectionId ? 'Random (Container)' : 'Random Play (All)'}
            </span>
          </button>
        </div>

        {/* Collections / Containers */}
        <div>
           <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Collections</h3>
              <button 
                onClick={() => setIsCreating(true)} 
                className="text-gray-400 hover:text-white transition-colors"
                title="Create Collection"
              >
                <Plus size={14} />
              </button>
           </div>
           
           {isCreating && (
             <form onSubmit={handleCreateSubmit} className="px-2 mb-2">
               <input
                 autoFocus
                 type="text"
                 value={newCollectionName}
                 // Casting e.target to any to access value
                 onChange={(e) => setNewCollectionName((e.target as any).value)}
                 onBlur={() => { if(!newCollectionName) setIsCreating(false); }}
                 placeholder="Collection Name..."
                 className="w-full bg-gray-800 border border-blue-500 rounded px-2 py-1 text-xs text-white outline-none"
               />
             </form>
           )}

           <div className="space-y-1">
              <button 
                 onClick={() => onSelectCollection(null)}
                 className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md transition-colors ${
                   selectedCollectionId === null ? 'bg-gray-800 text-white font-medium' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                 }`}
              >
                <LayoutGrid size={16} />
                <span className="text-sm truncate">All Videos</span>
              </button>

              {collections.map(col => (
                <div key={col.id} className="group relative flex items-center">
                   <button 
                      onClick={() => onSelectCollection(col.id)}
                      className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md transition-colors pr-8 ${
                        selectedCollectionId === col.id ? 'bg-blue-900/30 text-blue-400 border border-blue-900/50' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                      }`}
                   >
                     <Folder size={16} className={selectedCollectionId === col.id ? 'fill-blue-900/50' : ''} />
                     <span className="text-sm truncate">{col.name}</span>
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); onDeleteCollection(col.id); }}
                     className="absolute right-2 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity p-1"
                   >
                     <Trash2 size={12} />
                   </button>
                </div>
              ))}
           </div>
        </div>

        {/* View Actions */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Actions</h3>
          <div className="space-y-1">
             <button 
               onClick={onImportClick}
               className="w-full flex items-center space-x-3 px-2 py-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
             >
              <FolderOpen size={18} />
              <span className="text-sm font-medium">Import Video</span>
            </button>
            <button 
              onClick={onScanClick}
              className="w-full flex items-center space-x-3 px-2 py-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <HardDrive size={18} />
              <span className="text-sm font-medium">Scan Drive</span>
            </button>
          </div>
        </div>

        {/* Tags Section */}
        {allTags.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags Filter</h3>
              {selectedTags.length > 0 && (
                <button onClick={onClearTags} className="text-[10px] text-blue-400 hover:text-blue-300">Clear</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 px-2">
              {allTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md' 
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={onOpenTools}
          className="w-full flex items-center space-x-3 px-2 py-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <Settings size={18} />
          <span className="text-sm font-medium">Tools / Settings</span>
        </button>
      </div>
    </aside>
  );
};