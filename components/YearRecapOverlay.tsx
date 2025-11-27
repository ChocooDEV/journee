'use client';

import { useEffect, useState } from 'react';
import type { PinWithMedia } from '@/types';
import { useSignedUrl } from '@/hooks/useSignedUrls';

interface YearRecapOverlayProps {
  pins: PinWithMedia[];
  currentIndex: number;
  isPlaying: boolean;
  onIndexChange: (index: number) => void;
  onPlayPause: () => void;
  onClose: () => void;
}

function MediaThumbnail({ 
  media, 
  alt 
}: { 
  media: PinWithMedia['media'][0] | undefined;
  alt: string;
}) {
  const thumbnailUrl = useSignedUrl(media?.thumbnail_url || media?.media_url);
  
  if (!media || !thumbnailUrl) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <span className="text-xs text-gray-500">
          {media?.media_type === 'video' ? '🎥' : '📷'}
        </span>
      </div>
    );
  }

  if (media.media_type === 'video') {
    return (
      <video
        src={thumbnailUrl}
        className="w-full h-full object-cover"
        muted
      />
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt={alt}
      className="w-full h-full object-cover"
    />
  );
}

export default function YearRecapOverlay({
  pins,
  currentIndex,
  isPlaying,
  onIndexChange,
  onPlayPause,
  onClose,
}: YearRecapOverlayProps) {
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);

  const currentPin = pins[currentIndex];
  const totalPins = pins.length;

  // Auto-advance logic
  useEffect(() => {
    if (isPlaying && currentPin) {
      const timer = setTimeout(() => {
        if (currentIndex < totalPins - 1) {
          onIndexChange(currentIndex + 1);
        } else {
          // Reached the end, stop auto-play
          onPlayPause();
        }
      }, 2000); // 2 seconds per pin

      setAutoAdvanceTimer(timer);

      return () => {
        if (timer) clearTimeout(timer);
      };
    } else {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        setAutoAdvanceTimer(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentIndex, totalPins, currentPin?.id]);

  if (!currentPin) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const firstMedia = currentPin.media[0];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-white rounded-lg shadow-xl p-4 border border-gray-200">
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>
              {currentIndex + 1} of {totalPins}
            </span>
            <span>{formatDate(currentPin.date_taken)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalPins) * 100}%` }}
            />
          </div>
        </div>

        {/* Pin Info Card */}
        <div className="flex gap-3 mb-3">
          {firstMedia && (
            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
              <MediaThumbnail 
                media={firstMedia}
                alt={currentPin.title || 'Pin'}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {currentPin.title || 'Untitled Pin'}
            </h3>
            {currentPin.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {currentPin.description}
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={onPlayPause}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={() => onIndexChange(Math.min(totalPins - 1, currentIndex + 1))}
            disabled={currentIndex === totalPins - 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

