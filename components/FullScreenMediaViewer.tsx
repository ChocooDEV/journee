'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PinMedia } from '@/types';
import { useSignedUrl } from '@/hooks/useSignedUrls';

interface FullScreenMediaViewerProps {
  media: PinMedia[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function FullScreenMediaViewer({
  media,
  initialIndex,
  isOpen,
  onClose,
}: FullScreenMediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  }, [media.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  }, [media.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext]);

  if (!isOpen || media.length === 0) return null;

  const currentMedia = media[currentIndex];
  const mediaUrl = useSignedUrl(currentMedia.media_url);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
        aria-label="Close"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Media container - prevent click propagation */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {!mediaUrl ? (
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : currentMedia.media_type === 'video' ? (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            src={mediaUrl}
            alt={`Media ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Navigation arrows */}
        {media.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-75 transition-all"
              aria-label="Previous"
            >
              <svg
                className="w-6 h-6"
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
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-75 transition-all"
              aria-label="Next"
            >
              <svg
                className="w-6 h-6"
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

        {/* Index indicator */}
        {media.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
            {currentIndex + 1} / {media.length}
          </div>
        )}
      </div>
    </div>
  );
}

