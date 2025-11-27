'use client';

import { useState, useEffect } from 'react';
import { getSignedUrl } from '@/lib/supabase/storage-urls';

/**
 * Hook to get signed URL for a media file path
 * Automatically refreshes when URL expires
 */
export function useSignedUrl(filePath: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setSignedUrl(null);
      return;
    }

    // Check if it's already a full URL (for backward compatibility)
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      setSignedUrl(filePath);
      return;
    }

    // Get signed URL
    let isMounted = true;
    getSignedUrl(filePath).then((url) => {
      if (isMounted) {
        setSignedUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [filePath]);

  return signedUrl;
}

/**
 * Hook to get signed URLs for multiple media files
 */
export function useSignedUrls(filePaths: (string | null | undefined)[]): Map<string, string> {
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const validPaths = filePaths.filter((path): path is string => 
      path !== null && path !== undefined && !path.startsWith('http')
    );

    if (validPaths.length === 0) {
      setSignedUrls(new Map());
      return;
    }

    let isMounted = true;
    
    Promise.all(
      validPaths.map(async (path) => {
        const url = await getSignedUrl(path);
        return url ? [path, url] as const : null;
      })
    ).then((results) => {
      if (isMounted) {
        const urlMap = new Map<string, string>();
        results.forEach((result) => {
          if (result) {
            urlMap.set(result[0], result[1]);
          }
        });
        setSignedUrls(urlMap);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [filePaths.join(',')]); // Re-run when paths change

  return signedUrls;
}

