
import { FFmpeg } from 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10';
import { fetchFile, toBlobURL } from 'https://esm.sh/@ffmpeg/util@0.12.1';
import { VideoAsset, VideoClip, ExportConfig } from '../types';

let ffmpeg: any = null;

const loadFFmpeg = async (onProgress: (p: number, s: string) => void) => {
  if (ffmpeg) return ffmpeg;
  try {
    onProgress(2, '正在启动 FFmpeg 引擎...');
    ffmpeg = new FFmpeg();
    const localBase = (window as any).location.origin;
    const cdnBase = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    let coreURL, wasmURL;
    try {
      coreURL = await toBlobURL(`${localBase}/ffmpeg-core.js`, 'text/javascript');
      wasmURL = await toBlobURL(`${localBase}/ffmpeg-core.wasm`, 'application/wasm');
    } catch (e) {
      coreURL = await toBlobURL(`${cdnBase}/ffmpeg-core.js`, 'text/javascript');
      wasmURL = await toBlobURL(`${cdnBase}/ffmpeg-core.wasm`, 'application/wasm');
    }
    
    await ffmpeg.load({ coreURL, wasmURL });
    onProgress(15, '引擎就绪');
    return ffmpeg;
  } catch (e: any) {
    throw new Error(`FFmpeg 加载失败: ${e.message}`);
  }
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
};

/**
 * 核心处理函数
 * 流程：建立 /temp -> 剪切片段 -> 合并至 /output -> 清理 /temp
 */
export const processVideos = async (
  clips: VideoClip[],
  assets: VideoAsset[],
  config: ExportConfig,
  onProgress: (progress: number, stage: string) => void
): Promise<string> => {
  const ff = await loadFFmpeg(onProgress);

  // 1. 准备虚拟环境
  onProgress(16, '初始化临时工作目录 /temp...');
  try {
    await ff.createDir('/temp');
  } catch (e) {
    // 文件夹已存在，清空旧内容
    try {
      const files = await ff.listDir('/temp');
      for (const f of files) {
        if (!f.isDir) await ff.deleteFile(`/temp/${f.name}`);
      }
    } catch (e2) {}
  }

  if (config.overlayText) {
    onProgress(18, '同步字体资源...');
    try {
      const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Regular.ttf';
      await ff.writeFile('font.ttf', await fetchFile(fontUrl));
    } catch (e) { config.overlayText = false; }
  }

  const tempClips: string[] = [];

  // 2. 剪切阶段
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const asset = assets.find(a => a.id === clip.sourceVideoId);
    if (!asset) continue;

    const inputName = `input_src_${i}.mp4`;
    const tempOutput = `/temp/clip_part_${i}.mp4`;
    
    const baseProgress = 20;
    const stepProgress = Math.round((i / clips.length) * 65);
    onProgress(baseProgress + stepProgress, `[阶段 1/2] 正在剪辑片段 ${i + 1}/${clips.length}: ${clip.sourceTitle}`);

    await ff.writeFile(inputName, await fetchFile(asset.url));

    const needsReencode = config.overlayText || config.resolution !== 'original';
    const cmd: string[] = [];

    cmd.push('-ss', formatTime(clip.startTime));
    cmd.push('-to', formatTime(clip.endTime));
    cmd.push('-i', inputName);
    
    if (needsReencode) {
      const filters: string[] = [];
      if (config.resolution !== 'original') {
        const h = config.resolution === '1080p' ? 1080 : config.resolution === '720p' ? 720 : 480;
        filters.push(`scale=-2:${h}`);
      }
      if (config.overlayText) {
        const text = clip.sourceTitle.replace(/'/g, "\\'").replace(/:/g, "\\:");
        filters.push(`drawtext=fontfile=font.ttf:text='${text}':fontcolor=white:fontsize=${config.fontSize}:alpha=${config.fontOpacity}:x=20:y=20:shadowcolor=black:shadowx=2:shadowy=2`);
      }
      if (filters.length > 0) cmd.push('-vf', filters.join(','));
      cmd.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26', '-c:a', 'aac');
    } else {
      cmd.push('-c', 'copy');
    }

    cmd.push(tempOutput);
    await ff.exec(cmd);
    await ff.deleteFile(inputName);
    tempClips.push(tempOutput);
  }

  // 3. 合并阶段
  onProgress(90, `[阶段 2/2] 正在合并所有剪辑片段到最终输出...`);
  const listFile = 'concat_list.txt';
  const listContent = tempClips.map(f => `file '${f}'`).join('\n');
  await ff.writeFile(listFile, listContent);

  const finalFileName = `output_final_${Date.now()}.${config.format}`;
  await ff.exec(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', finalFileName]);

  // 4. 清理阶段
  onProgress(98, '正在清理 /temp 临时文件并导出结果...');
  const resultData = await ff.readFile(finalFileName);
  
  for (const f of tempClips) {
    try { await ff.deleteFile(f); } catch(e) {}
  }
  await ff.deleteFile(listFile);
  await ff.deleteFile(finalFileName);

  onProgress(100, '视频生成成功！');
  return URL.createObjectURL(new Blob([resultData], { type: `video/${config.format}` }));
};
