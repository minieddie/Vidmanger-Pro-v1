export interface VideoAsset {
  id: string;
  title: string;
  description: string;
  tags: string[];
  url: string; // Blob URL (temporary in browser) or File Path (in Electron)
  path?: string; // Stored path (relative or absolute) for re-linking
  thumbnail?: string;
  duration?: string;
  fileSize?: string;
  createdAt: Date;
  type: 'local' | 'remote';
  collectionId?: string; // Link to a collection
  nfoContent?: string;
}

export interface Collection {
  id: string;
  name: string;
}

export interface LibraryData {
  version: number;
  collections: Collection[];
  videos: VideoAsset[];
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
}

export enum ViewMode {
  GRID = 'GRID',
  LIST = 'LIST',
}

export interface VideoClip {
  id: string;
  sourceVideoId: string;
  sourceTitle: string;
  thumbnail?: string;
  startTime: number;
  endTime: number;
}

export interface ExportConfig {
  resolution: '1080p' | '720p' | '480p' | 'original';
  format: 'mp4' | 'mkv'; 
  codec: 'libx264' | 'libx265';
  overlayText: boolean;
  fontSize: number;
  fontOpacity: number;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  progress: number; 
  stage: string; 
  log?: string;
}