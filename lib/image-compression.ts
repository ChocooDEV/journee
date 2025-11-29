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
    maxSizeMB = 2,
    maxWidthOrHeight = 1920,
    useWebWorker = true,
    fileType = file.type,
  } = options;

  if (!file.type.startsWith('image/')) {
    return file;
  }

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker,
      fileType,
      initialQuality: 0.85,
    });

    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
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
      onProgress?.(i + 1, files.length);
      const compressed = await compressImage(file);
      compressedFiles.push(compressed);
    } else {
      compressedFiles.push(file);
    }
  }

  return compressedFiles;
}

