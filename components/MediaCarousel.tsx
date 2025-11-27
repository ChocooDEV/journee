'use client';

import { useState } from 'react';
import type { PinMedia } from '@/types';
import { useSignedUrl } from '@/hooks/useSignedUrls';

interface MediaCarouselProps {
  media: PinMedia[];
}

function ThumbnailImage({ 
  thumbnailPath, 
  mediaType, 
  index 
}: { 
  thumbnailPath: string | null; 
  mediaType: 'image' | 'video';
  index: number;
}) {
  const signedUrl = useSignedUrl(thumbnailPath);
  
  if (!signedUrl) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <span className="text-xs text-gray-500">
          {mediaType === 'video' ? '🎥' : '📷'}
        </span>
      </div>
    );
  }
  
  return (
    <img
      src={signedUrl}
      alt={`Thumbnail ${index + 1}`}
      className="w-full h-full object-cover"
    />
  );
}

export default function MediaCarousel({ media }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (media.length === 0) return null;

  const currentMedia = media[currentIndex];
  const mediaUrl = useSignedUrl(currentMedia.media_url);
  const thumbnailUrl = useSignedUrl(currentMedia.thumbnail_url || currentMedia.media_url);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full">
      {/* Main Media Display */}
      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
        {!mediaUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : currentMedia.media_type === 'video' ? (
          <video
            src={mediaUrl}
            controls
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={mediaUrl}
            alt={`Media ${currentIndex + 1}`}
            className="w-full h-full object-contain"
          />
        )}

        {/* Navigation Arrows */}
        {media.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all"
              aria-label="Previous"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all"
              aria-label="Next"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Dots */}
      {media.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {media.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-blue-600 w-8'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to media ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Thumbnail Strip (Alternative) */}
      {media.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {media.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-blue-600'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <ThumbnailImage 
                thumbnailPath={item.thumbnail_url || item.media_url}
                mediaType={item.media_type}
                index={index}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
