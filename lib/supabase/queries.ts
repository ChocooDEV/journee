import { createClient } from './client-browser';
import type { Pin, PinMedia, PinWithMedia, PinWithThumbnail } from '@/types';

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
}: {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  dateTaken: string;
  files: File[];
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

  // 2. Upload files and create media records
  const mediaRecords: PinMedia[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileExt = file.name.split('.').pop();
    const fileName = `${pin.id}/${Date.now()}-${i}.${fileExt}`;
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const mediaUrl = urlData.publicUrl;

    // For videos, we could generate a thumbnail later, but for now just use the URL
    const thumbnailUrl = mediaType === 'video' ? null : mediaUrl;

    // Create media record
    const { data: media, error: mediaError } = await supabase
      .from('pin_media')
      .insert({
        pin_id: pin.id,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        media_type: mediaType,
        sort_order: i,
      })
      .select()
      .single();

    if (mediaError) {
      console.error('Error creating media record:', mediaError);
      continue;
    }

    if (media) {
      mediaRecords.push(media);
    }
  }

  return {
    ...pin,
    media: mediaRecords,
  };
}

