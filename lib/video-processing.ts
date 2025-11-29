import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const MAX_VIDEO_DURATION = 10;

let ffmpegInstance: FFmpeg | null = null;
let isFFmpegLoading = false;

/**
 * Get or initialize FFmpeg instance
 */
async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  if (isFFmpegLoading) {
    while (isFFmpegLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpegInstance) {
      return ffmpegInstance;
    }
  }

  isFFmpegLoading = true;
  try {
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  } finally {
    isFFmpegLoading = false;
  }
}

/**
 * Get video duration in seconds
 */
async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Validate video duration
 */
export async function validateVideoDuration(file: File): Promise<{ valid: boolean; error?: string }> {
  if (!file.type.startsWith('video/')) {
    return { valid: true };
  }

  try {
    const duration = await getVideoDuration(file);
    if (duration > MAX_VIDEO_DURATION) {
      return {
        valid: false,
        error: `${file.name} is ${duration.toFixed(1)}s (max ${MAX_VIDEO_DURATION}s)`,
      };
    }
    return { valid: true };
  } catch (error) {
    console.error('Error validating video duration:', error);
    return {
      valid: false,
      error: `Failed to read video duration for ${file.name}`,
    };
  }
}

/**
 * Process a video: trim to 10s, compress, and convert to MP4
 */
export async function processVideo(file: File): Promise<File> {
  if (!file.type.startsWith('video/')) {
    return file;
  }

  try {
    const duration = await getVideoDuration(file);
    
    if (duration <= MAX_VIDEO_DURATION && file.size < 10 * 1024 * 1024) {
      return file;
    }

    const ffmpeg = await getFFmpeg();
    const inputFileName = 'input.' + file.name.split('.').pop();
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    const trimDuration = Math.min(duration, MAX_VIDEO_DURATION);
    
    await ffmpeg.exec([
      '-i', inputFileName,
      '-t', String(trimDuration),
      '-c:v', 'libx264',
      '-crf', '28',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      'output.mp4',
    ]);

    const data = await ffmpeg.readFile('output.mp4');
    const blob = new Blob([data as BlobPart], { type: 'video/mp4' });
    
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile('output.mp4');

    const outputFileName = file.name.replace(/\.[^/.]+$/, '') + '.mp4';
    return new File([blob], outputFileName, { type: 'video/mp4' });
  } catch (error) {
    console.error('Error processing video:', error);
    return file;
  }
}

/**
 * Extract thumbnail from video
 */
async function extractThumbnail(file: File, ffmpeg: FFmpeg): Promise<File | null> {
  try {
    const inputFileName = 'input.' + file.name.split('.').pop();
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // Extract frame at 1 second (or start if video is shorter)
    await ffmpeg.exec([
      '-i', inputFileName,
      '-ss', '00:00:01',
      '-vframes', '1',
      '-vf', 'scale=320:-1',
      '-y',
      'thumbnail.jpg',
    ]);

    const data = await ffmpeg.readFile('thumbnail.jpg');
    const blob = new Blob([data as BlobPart], { type: 'image/jpeg' });
    
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile('thumbnail.jpg');

    return new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
  } catch (error) {
    console.error('Error extracting thumbnail:', error);
    return null;
  }
}

/**
 * Process video and extract thumbnail
 */
export async function processVideoWithThumbnail(file: File): Promise<{ video: File; thumbnail: File | null }> {
  if (!file.type.startsWith('video/')) {
    return { video: file, thumbnail: null };
  }

  try {
    const ffmpeg = await getFFmpeg();
    const processedVideo = await processVideo(file);
    const thumbnail = await extractThumbnail(file, ffmpeg);
    
    return { video: processedVideo, thumbnail };
  } catch (error) {
    console.error('Error processing video with thumbnail:', error);
    return { video: file, thumbnail: null };
  }
}

/**
 * Process multiple videos
 */
export async function processVideos(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<File[]> {
  const videoFiles = files.filter(f => f.type.startsWith('video/'));
  const nonVideoFiles = files.filter(f => !f.type.startsWith('video/'));
  
  if (videoFiles.length === 0) {
    return files;
  }

  const processedVideos: File[] = [];
  
  for (let i = 0; i < videoFiles.length; i++) {
    if (onProgress) {
      onProgress(i + 1, videoFiles.length);
    }
    
    const processed = await processVideo(videoFiles[i]);
    processedVideos.push(processed);
  }

  // Combine processed videos with non-video files
  return [...nonVideoFiles, ...processedVideos];
}

