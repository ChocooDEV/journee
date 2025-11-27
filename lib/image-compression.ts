import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
}

/**
 * Compress an image file before upload
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 2, // Target 2MB (we allow up to 10MB, but compress to save space)
    maxWidthOrHeight = 1920, // Max dimension (good for web display)
    useWebWorker = true,
    fileType = file.type,
  } = options;

  // Only compress images, not videos
  if (!file.type.startsWith('image/')) {
    return file;
  }

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker,
      fileType,
      initialQuality: 0.85, // Good balance between quality and size
    });

    // Log compression results
    const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
    const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    
    console.log(
      `Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB (${reduction}% reduction)`
    );

    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // If compression fails, return original file
    return file;
  }
}

/**
 * Compress multiple image files
 * @param files - Array of files to compress
 * @param onProgress - Optional progress callback
 * @returns Array of compressed files (videos pass through unchanged)
 */
export async function compressImages(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<File[]> {
  const compressedFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (file.type.startsWith('image/')) {
      // Compress images
      onProgress?.(i + 1, files.length);
      const compressed = await compressImage(file);
      compressedFiles.push(compressed);
    } else {
      // Pass through videos unchanged
      compressedFiles.push(file);
    }
  }

  return compressedFiles;
}

