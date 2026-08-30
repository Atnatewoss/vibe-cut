import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface ImportedMedia {
  id: string;
  name: string;
  kind: 'video' | 'image' | 'audio';
  file: File;
  objectUrl: string;
  playbackUrl: string; // Same as objectUrl initially, proxy when ready
  thumbnail: string;
  duration?: number;
  width?: number;
  height?: number;
  proxyReady: boolean; // Proxy generation complete (background, non-blocking)
}

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) return ffmpegInstance;

  ffmpegInstance = new FFmpeg();

  ffmpegInstance.on('log', ({ message }) => {
    console.log('[ffmpeg]', message);
  });

  try {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegLoaded = true;
  } catch (err) {
    console.error('Failed to load ffmpeg.wasm:', err);
    throw err;
  }

  return ffmpegInstance;
}

/**
 * Generate thumbnail from video by capturing a frame at 1s.
 */
function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          resolve('');
        }
      } catch {
        resolve('');
      }
      URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };

    // Fallback timeout
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve('');
    }, 5000);
  });
}

function generateImageThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = Math.round((img.height / img.width) * 320);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } else {
        resolve('');
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}

function generateAudioThumbnail(_file: File): string {
  // Audio files don't have visual thumbnails, return placeholder
  return 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect fill="#1a1a2e" width="320" height="180"/><text fill="#888" font-family="system-ui" font-size="24" text-anchor="middle" x="160" y="95">♪ Audio</text></svg>`);
}

function getMediaDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      resolve(undefined);
      return;
    }

    const url = URL.createObjectURL(file);
    const media = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
    media.preload = 'metadata';
    media.src = url;

    media.onloadedmetadata = () => {
      resolve(media.duration);
      URL.revokeObjectURL(url);
    };

    media.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(url);
    };

    setTimeout(() => {
      resolve(undefined);
      URL.revokeObjectURL(url);
    }, 3000);
  });
}

/**
 * Generate proxy in background (non-blocking).
 * Updates the playbackUrl when ready.
 */
async function generateProxyInBackground(
  file: File,
  onProxyReady: (proxyUrl: string) => void
): Promise<void> {
  try {
    const ffmpeg = await getFFmpeg();
    const inputName = `input_${Date.now()}${getExtension(file.name)}`;
    const outputName = `proxy_${Date.now()}.mp4`;

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    await ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '28',
      '-vf', 'scale=-2:720',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: 'video/mp4' });
    const proxyUrl = URL.createObjectURL(blob);

    // Cleanup
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    onProxyReady(proxyUrl);
  } catch (err) {
    console.warn('Proxy generation failed, using original file:', err);
    // Fallback: just use the original file (it works for most formats)
  }
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx) : '.mp4';
}

/**
 * Import a file — returns immediately with original file for playback.
 * Proxy generation runs in background (non-blocking).
 */
export async function importFile(
  file: File,
  onProxyReady?: (proxyUrl: string) => void
): Promise<ImportedMedia> {
  const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const objectUrl = URL.createObjectURL(file);

  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  // Generate thumbnail and duration in parallel
  const [thumbnail, duration] = await Promise.all([
    isVideo ? generateVideoThumbnail(file)
      : isImage ? generateImageThumbnail(file)
      : Promise.resolve(generateAudioThumbnail(file)),
    getMediaDuration(file),
  ]);

  const media: ImportedMedia = {
    id,
    name: file.name,
    kind: isVideo ? 'video' : isImage ? 'image' : 'audio',
    file,
    objectUrl,
    playbackUrl: objectUrl, // Play original immediately
    thumbnail,
    duration,
    proxyReady: false,
  };

  // Generate proxy in background for videos (non-blocking)
  if (isVideo && onProxyReady) {
    generateProxyInBackground(file, (proxyUrl) => {
      onProxyReady(proxyUrl);
    });
  }

  return media;
}

/**
 * Format seconds into MM:SS display.
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Clean up object URLs when media is removed.
 */
export function cleanupMedia(media: ImportedMedia): void {
  URL.revokeObjectURL(media.objectUrl);
}

/** Alias for cleanupMedia */
export const revokeMedia = cleanupMedia;
