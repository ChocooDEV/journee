/**
 * Storage utilities for safe and efficient file handling
 */

// File size limits (in bytes)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB (before compression)
export const MAX_VIDEO_DURATION = 10; // 10 seconds

// Allowed file types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
];

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: `File type not supported. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')} or ${ALLOWED_VIDEO_TYPES.join(', ')}`,
    };
  }

  // Check file size
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const file of files) {
    const result = validateFile(file);
    if (!result.valid && result.error) {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a safe filename
 */
export function generateFileName(pinId: string, index: number, originalFile: File): string {
  const timestamp = Date.now();
  const fileExt = originalFile.name.split('.').pop()?.toLowerCase() || 'bin';
  // Sanitize filename: only alphanumeric, dash, underscore
  const sanitizedExt = fileExt.replace(/[^a-z0-9]/gi, '');
  return `${pinId}/${timestamp}-${index}.${sanitizedExt}`;
}

/**
 * Get file metadata
 */
export function getFileMetadata(file: File): {
  type: 'image' | 'video';
  size: number;
  mimeType: string;
} {
  const isVideo = file.type.startsWith('video/');
  return {
    type: isVideo ? 'video' : 'image',
    size: file.size,
    mimeType: file.type,
  };
}

