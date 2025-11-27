import { createClient } from './client-browser';
import type { Pin, PinMedia, PinWithMedia, PinWithThumbnail } from '@/types';
import {
  validateFiles,
  generateFileName,
  getFileMetadata,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} from './storage-utils';

const BUCKET_NAME = 'user-media';

/**
 * Get all pins for the current authenticated user with first media thumbnail
 */
export async function getPinsForUser(): Promise<PinWithThumbnail[]> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  
  const { data: pins, error } = await supabase
    .from('pins')
    .select(`
      *,
      pin_media (
        id,
        media_url,
        thumbnail_url,
        media_type,
        sort_order
      )
    `)
    .eq('user_id', user.id)
    .order('date_taken', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pins:', error);
    throw error;
  }

  return (pins || []).map((pin: any) => {
    const media = pin.pin_media || [];
    const firstMedia = media.sort((a: PinMedia, b: PinMedia) => a.sort_order - b.sort_order)[0];
    
    return {
      ...pin,
      thumbnail_url: firstMedia?.thumbnail_url || firstMedia?.media_url || null,
      first_media_type: firstMedia?.media_type || null,
    };
  });
}

/**
 * Get a single pin with all its media
 */
export async function getPinWithMedia(pinId: string): Promise<PinWithMedia | null> {
  const supabase = createClient();
  
  const { data: pin, error: pinError } = await supabase
    .from('pins')
    .select('*')
    .eq('id', pinId)
    .single();

  if (pinError) {
    console.error('Error fetching pin:', pinError);
    throw pinError;
  }

  if (!pin) return null;

  const { data: media, error: mediaError } = await supabase
    .from('pin_media')
    .select('*')
    .eq('pin_id', pinId)
    .order('sort_order', { ascending: true });

  if (mediaError) {
    console.error('Error fetching media:', mediaError);
    throw mediaError;
  }

  return {
    ...pin,
    media: media || [],
  };
}

/**
 * Get pins for a specific year, ordered chronologically
 */
export async function getPinsForYear(year: number): Promise<PinWithMedia[]> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: pins, error } = await supabase
    .from('pins')
    .select(`
      *,
      pin_media (
        id,
        media_url,
        thumbnail_url,
        media_type,
        sort_order
      )
    `)
    .eq('user_id', user.id)
    .gte('date_taken', startDate)
    .lte('date_taken', endDate)
    .order('date_taken', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pins for year:', error);
    throw error;
  }

  return (pins || []).map((pin: any) => ({
    ...pin,
    media: (pin.pin_media || []).sort((a: PinMedia, b: PinMedia) => a.sort_order - b.sort_order),
  }));
}

/**
 * Create a pin with media files
 */
export async function createPinWithMedia({
  lat,
  lng,
  title,
  description,
  dateTaken,
  files,
  videoThumbnails,
}: {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  dateTaken: string;
  files: File[];
  videoThumbnails?: Map<File, File>;
}): Promise<PinWithMedia> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create pins');
  }
  
  // 1. Create the pin
  const { data: pin, error: pinError } = await supabase
    .from('pins')
    .insert({
      user_id: user.id,
      lat,
      lng,
      title: title || null,
      description: description || null,
      date_taken: dateTaken,
    })
    .select()
    .single();

  if (pinError) {
    console.error('Error creating pin:', pinError);
    throw pinError;
  }

  if (!pin) {
    throw new Error('Failed to create pin');
  }

  // 2. Validate all files before uploading
  const validation = validateFiles(files);
  if (!validation.valid) {
    // Delete the pin if validation fails
    await supabase.from('pins').delete().eq('id', pin.id);
    throw new Error(`File validation failed:\n${validation.errors.join('\n')}`);
  }

  // 3. Upload files and create media records
  const mediaRecords: PinMedia[] = [];
  const uploadedFiles: string[] = []; // Track uploaded files for cleanup on error

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const metadata = getFileMetadata(file);
      const fileName = generateFileName(pin.id, i, file);

      // Upload file with better options
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        
        // Provide helpful error message for common issues
        let errorMessage = uploadError.message;
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
          errorMessage = `Storage bucket '${BUCKET_NAME}' not found. Please create it in your Supabase dashboard: Storage → New bucket → Name: "${BUCKET_NAME}" → Make it PRIVATE. See docs/SECURE_STORAGE_SETUP.md for setup instructions.`;
        }
        
        // If upload fails, we'll clean up uploaded files
        throw new Error(`Failed to upload ${file.name}: ${errorMessage}`);
      }

      uploadedFiles.push(fileName);

      // Store the file path (not a URL) in the database
      // We'll generate signed URLs when needed for security
      const mediaUrl = fileName; // Store path, not URL
      
      // For videos, check if we have a thumbnail
      let thumbnailUrl: string | null = null;
      if (metadata.type === 'video' && videoThumbnails) {
        const thumbnail = videoThumbnails.get(file);
        if (thumbnail) {
          // Upload thumbnail
          const thumbnailFileName = generateFileName(pin.id, i, thumbnail);
          const { error: thumbnailError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(thumbnailFileName, thumbnail, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg',
            });
          
          if (!thumbnailError) {
            thumbnailUrl = thumbnailFileName;
            uploadedFiles.push(thumbnailFileName);
          } else {
            console.error('Error uploading thumbnail:', thumbnailError);
          }
        }
      } else if (metadata.type === 'image') {
        // For images, use the image itself as thumbnail
        thumbnailUrl = fileName;
      }

      // Create media record
      const { data: media, error: mediaError } = await supabase
        .from('pin_media')
        .insert({
          pin_id: pin.id,
          media_url: mediaUrl,
          thumbnail_url: thumbnailUrl,
          media_type: metadata.type,
          sort_order: i,
        })
        .select()
        .single();

      if (mediaError) {
        console.error('Error creating media record:', mediaError);
        // Clean up uploaded file if DB insert fails
        await supabase.storage.from(BUCKET_NAME).remove([fileName]);
        throw new Error(`Failed to create media record for ${file.name}: ${mediaError.message}`);
      }

      if (media) {
        mediaRecords.push(media);
      }
    }
  } catch (error) {
    // Cleanup: Remove all uploaded files if something went wrong
    if (uploadedFiles.length > 0) {
      await supabase.storage.from(BUCKET_NAME).remove(uploadedFiles);
    }
    // Delete the pin if no media was successfully created
    if (mediaRecords.length === 0) {
      await supabase.from('pins').delete().eq('id', pin.id);
    }
    throw error;
  }

  return {
    ...pin,
    media: mediaRecords,
  };
}

/**
 * Get recent media items from all pins, ordered by creation date
 */
export async function getRecentMedia(limit: number = 20): Promise<PinMedia[]> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  
  // Get all pins for the user
  const { data: pins, error: pinsError } = await supabase
    .from('pins')
    .select('id')
    .eq('user_id', user.id);

  if (pinsError || !pins) {
    console.error('Error fetching pins:', pinsError);
    return [];
  }

  const pinIds = pins.map(p => p.id);

  if (pinIds.length === 0) {
    return [];
  }

  // Get recent media from all pins
  const { data: media, error: mediaError } = await supabase
    .from('pin_media')
    .select('*')
    .in('pin_id', pinIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (mediaError) {
    console.error('Error fetching recent media:', mediaError);
    return [];
  }

  return media || [];
}

