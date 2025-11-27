import { createClient } from './client-browser';

const BUCKET_NAME = 'user-media';
const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

/**
 * Get a signed URL for a media file
 * Signed URLs are secure and expire after a set time
 * Only authenticated users can generate signed URLs for their own files
 */
export async function getSignedUrl(filePath: string): Promise<string | null> {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Generate signed URL (expires in 1 hour)
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data?.signedUrl || null;
}

/**
 * Get signed URLs for multiple files
 */
export async function getSignedUrls(filePaths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  
  // Get URLs in parallel
  const urlPromises = filePaths.map(async (path) => {
    const url = await getSignedUrl(path);
    if (url) {
      urls.set(path, url);
    }
  });

  await Promise.all(urlPromises);
  return urls;
}

/**
 * Extract file path from a full URL
 * Handles both public URLs and signed URLs
 */
export function extractFilePath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Extract path after bucket name
    // Format: /storage/v1/object/sign/user-media/path/to/file?...
    // or: /storage/v1/object/public/user-media/path/to/file
    const match = urlObj.pathname.match(/\/user-media\/(.+)$/);
    if (match) {
      return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

