import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const MAX_VIDEO_DURATION = 10; // 10 seconds
const MAX_VIDEO_SIZE_MB = 50; // Compress to max 50MB (down from 100MB)

let ffmpegInstance: FFmpeg | null = null;
let isFFmpegLoaded = false;
let isFFmpegLoading = false;

/**
 * Get or initialize FFmpeg instance
 * Note: First load downloads ~10MB of FFmpeg core files (one-time per session)
 */
async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && isFFmpegLoaded) {
    return ffmpegInstance;
  }

  // Prevent multiple simultaneous loads
  if (isFFmpegLoading) {
    // Wait for existing load to complete
    while (isFFmpegLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpegInstance && isFFmpegLoaded) {
      return ffmpegInstance;
    }
  }

  isFFmpegLoading = true;
  const ffmpeg = new FFmpeg();
  
  try {
    // Load FFmpeg core (first time: downloads ~10MB, subsequent: uses cache)
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    isFFmpegLoaded = true;
    return ffmpeg;
  } finally {
    isFFmpegLoading = false;
  }
}

/**
 * Get video duration using HTML5 video element
 */
export function getVideoDuration(file: File): Promise<number> {
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
export async function validateVideoDuration(file: File): Promise<{ valid: boolean; duration?: number; error?: string }> {
  if (!file.type.startsWith('video/')) {
    return { valid: true }; // Not a video, skip validation
  }

  try {
    const duration = await getVideoDuration(file);
    if (duration > MAX_VIDEO_DURATION) {
      return {
        valid: false,
        duration,
        error: `Video is ${duration.toFixed(1)} seconds. Maximum allowed: ${MAX_VIDEO_DURATION} seconds.`,
      };
    }
    return { valid: true, duration };
  } catch (error) {
    console.error('Error validating video duration:', error);
    return {
      valid: false,
      error: 'Could not read video duration. Please try a different video file.',
    };
  }
}

/**
 * Trim video to first 10 seconds and compress
 */
export async function processVideo(file: File): Promise<File> {
  if (!file.type.startsWith('video/')) {
    return file; // Not a video, return as-is
  }

  try {
    const duration = await getVideoDuration(file);
    
    // If video is already <= 10 seconds and small enough, return as-is
    if (duration <= MAX_VIDEO_DURATION && file.size <= MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      return file;
    }

    console.log(`Processing video: ${(file.size / (1024 * 1024)).toFixed(2)}MB, ${duration.toFixed(1)}s`);

    const ffmpeg = await getFFmpeg();
    const inputFileName = 'input.' + file.name.split('.').pop();
    const outputFileName = 'output.mp4';

    // Write input file to FFmpeg
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // Build FFmpeg command
    // -t 10: limit to 10 seconds
    // -c:v libx264: use H.264 codec (good compression)
    // -crf 28: quality setting (lower = better quality, higher = smaller file)
    // -preset fast: encoding speed
    // -c:a aac: audio codec
    // -b:a 128k: audio bitrate
    const durationArg = duration > MAX_VIDEO_DURATION ? `-t ${MAX_VIDEO_DURATION}` : '';
    
    await ffmpeg.exec([
      '-i', inputFileName,
      ...(durationArg ? durationArg.split(' ') : []),
      '-c:v', 'libx264',
      '-crf', '28',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart', // Web optimization
      outputFileName,
    ]);

    // Read output file
    const data = await ffmpeg.readFile(outputFileName);
    const blob = new Blob([data], { type: 'video/mp4' });
    
    // Clean up
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);

    // Create new File object
    const processedFile = new File(
      [blob],
      file.name.replace(/\.[^/.]+$/, '.mp4'), // Replace extension with .mp4
      { type: 'video/mp4' }
    );

    const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const processedSizeMB = (processedFile.size / (1024 * 1024)).toFixed(2);
    const reduction = ((1 - processedFile.size / file.size) * 100).toFixed(1);
    
    console.log(
      `Video processed: ${originalSizeMB}MB → ${processedSizeMB}MB (${reduction}% reduction), trimmed to ${Math.min(duration, MAX_VIDEO_DURATION).toFixed(1)}s`
    );

    return processedFile;
  } catch (error) {
    console.error('Error processing video:', error);
    // If processing fails, return original file
    // User will get validation error if it's too long
    return file;
  }
}

/**
 * Extract a thumbnail frame from a video
 * Returns a File object with the thumbnail image
 */
export async function extractVideoThumbnail(file: File): Promise<File | null> {
  if (!file.type.startsWith('video/')) {
    return null; // Not a video
  }

  try {
    const ffmpeg = await getFFmpeg();
    const inputFileName = 'input.' + file.name.split('.').pop();
    const thumbnailFileName = 'thumbnail.jpg';

    // Write input file to FFmpeg
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // Extract frame at 1 second (or middle if video is shorter)
    // -ss 1: seek to 1 second
    // -vframes 1: extract 1 frame
    // -q:v 2: high quality JPEG
    await ffmpeg.exec([
      '-i', inputFileName,
      '-ss', '00:00:01', // Extract frame at 1 second
      '-vframes', '1',
      '-q:v', '2', // High quality
      thumbnailFileName,
    ]);

    // Read thumbnail
    const thumbnailData = await ffmpeg.readFile(thumbnailFileName);
    const thumbnailBlob = new Blob([thumbnailData], { type: 'image/jpeg' });

    // Clean up
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(thumbnailFileName);

    // Create File object
    const thumbnailFile = new File(
      [thumbnailBlob],
      file.name.replace(/\.[^/.]+$/, '_thumb.jpg'),
      { type: 'image/jpeg' }
    );

    return thumbnailFile;
  } catch (error) {
    console.error('Error extracting video thumbnail:', error);
    // If thumbnail extraction fails, return null (we'll handle this gracefully)
    return null;
  }
}

/**
 * Process video and extract thumbnail
 * Returns both the processed video and thumbnail
 * Thumbnail is extracted from the processed video
 */
export async function processVideoWithThumbnail(
  file: File
): Promise<{ video: File; thumbnail: File | null }> {
  // First process the video (trim and compress)
  const video = await processVideo(file);
  
  // Then extract thumbnail from the processed video
  // Use the original file for thumbnail extraction if video wasn't changed
  const thumbnailSource = video === file ? file : video;
  const thumbnail = await extractVideoThumbnail(thumbnailSource);
  
  return { video, thumbnail };
}

/**
 * Process multiple videos
 */
export async function processVideos(
  files: File[],
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<File[]> {
  const processedFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (file.type.startsWith('video/')) {
      onProgress?.(i + 1, files.length, file.name);
      const processed = await processVideo(file);
      processedFiles.push(processed);
    } else {
      // Pass through non-video files unchanged
      processedFiles.push(file);
    }
  }

  return processedFiles;
}

