'use client';

import type { PinMedia } from '@/types';
import { useSignedUrl } from '@/hooks/useSignedUrls';

interface RecentMediaProps {
  media: PinMedia[];
  onMediaClick?: (media: PinMedia) => void;
}

function MediaThumbnail({ item }: { item: PinMedia }) {
  const thumbnailUrl = useSignedUrl(item.thumbnail_url || item.media_url);
  
  if (!thumbnailUrl) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <span className="text-xs text-gray-500">
          {item.media_type === 'video' ? '🎥' : '📷'}
        </span>
      </div>
    );
  }

  if (item.media_type === 'video') {
    return (
      <>
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt="Photo"
      className="w-full h-full object-cover"
    />
  );
}

export default function RecentMedia({ media, onMediaClick }: RecentMediaProps) {
  if (media.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-[80px] left-0 right-0 z-30 bg-white border-t border-gray-200">
      <div className="px-4 py-3">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Recent Photos or Videos</h3>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {media.map((item) => (
            <button
              key={item.id}
              onClick={() => onMediaClick?.(item)}
              className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 relative group"
            >
              <MediaThumbnail item={item} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
