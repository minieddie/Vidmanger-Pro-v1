
import { VideoAsset } from './types';

export const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.ts', '.rmvb', '.avi', '.flv'];
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];

// Generate thumbnail from video file (Random Frame)
export const generateThumbnail = (videoUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    // Added (window as any).document casting to handle environments with missing DOM type definitions
    const video = ((window as any).document as any).createElement('video');
    video.preload = 'metadata';
    video.src = videoUrl;
    video.muted = true;
    
    // Safety timeout - fails faster to avoid blocking UI
    const timeout = setTimeout(() => {
        video.remove();
        resolve(''); 
    }, 4000);

    video.onloadedmetadata = () => {
        // Randomly seek between 10% and 90% of the video to get a meaningful frame
        // avoiding black screens at the very start or credits at the end
        const min = video.duration * 0.1;
        const max = video.duration * 0.9;
        let seekTime = Math.random() * (max - min) + min;
        
        if (!isFinite(seekTime)) seekTime = 1;
        video.currentTime = seekTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        // Added (window as any).document casting to handle environments with missing DOM type definitions
        const canvas = ((window as any).document as any).createElement('canvas');
        // 16:9 Aspect Ratio
        canvas.width = 480;
        canvas.height = 270;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
        } else {
            resolve('');
        }
      } catch (e) {
        resolve('');
      } finally {
        video.remove();
      }
    };
    
    video.onerror = () => {
        clearTimeout(timeout);
        video.remove();
        resolve('');
    }
  });
};

// Parse NFO (XML) content
export const parseNFO = async (file: File): Promise<Partial<VideoAsset>> => {
  try {
    const text = await file.text();
    // Casting DOMParser access to window to bypass missing global type
    const parser = new (window as any).DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    
    // Try standard NFO/Kodi fields
    const title = xml.querySelector('title')?.textContent || 
                  xml.querySelector('originaltitle')?.textContent;
    
    const plot = xml.querySelector('plot')?.textContent || 
                 xml.querySelector('overview')?.textContent || 
                 xml.querySelector('outline')?.textContent;

    const tags: string[] = [];
    xml.querySelectorAll('genre').forEach(el => {
        if(el.textContent) tags.push(el.textContent.trim());
    });
    xml.querySelectorAll('tag').forEach(el => {
        if(el.textContent) tags.push(el.textContent.trim());
    });

    return {
      title: title || undefined,
      description: plot || undefined,
      tags: tags.length > 0 ? tags : undefined,
      nfoContent: text
    };
  } catch (e) {
    console.error("Error parsing NFO", e);
    return {};
  }
};

// Generate NFO XML string from asset
export const generateNFOString = (video: VideoAsset): string => {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<movie>
  <title>${video.title}</title>
  <originaltitle>${video.title}</originaltitle>
  <plot>${video.description || ''}</plot>
  <userrating>0</userrating>
  ${video.tags.map(tag => `<genre>${tag}</genre>`).join('\n  ')}
  <dateadded>${video.createdAt.toISOString()}</dateadded>
  <fileinfo>
    <streamdetails>
      <video>
        <durationinseconds>${video.duration}</durationinseconds>
      </video>
    </streamdetails>
  </fileinfo>
</movie>`;
};