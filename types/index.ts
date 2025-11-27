export interface User {
  id: string;
  created_at: string;
}

export interface Pin {
  id: string;
  user_id: string | null;
  lat: number;
  lng: number;
  title: string | null;
  description: string | null;
  date_taken: string | null; // ISO date string
  created_at: string;
}

export interface PinMedia {
  id: string;
  pin_id: string;
  media_url: string;
  thumbnail_url: string | null;
  media_type: 'image' | 'video';
  sort_order: number;
  created_at: string;
}

export interface PinWithThumbnail extends Pin {
  thumbnail_url?: string | null;
  first_media_type?: 'image' | 'video' | null;
}

export interface PinWithMedia extends Pin {
  media: PinMedia[];
}

export interface CreatePinData {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  dateTaken: string; // ISO date string
  files: File[];
  videoThumbnails?: Map<File, File>; // Map of video file to its thumbnail
}

