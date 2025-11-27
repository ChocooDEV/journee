'use client';

import { useState } from 'react';
import type { PinWithMedia } from '@/types';
import { useSignedUrl } from '@/hooks/useSignedUrls';
import FullScreenMediaViewer from './FullScreenMediaViewer';

interface PinDetailsViewProps {
  pin: PinWithMedia;
  onClose: () => void;
}

function MediaThumbnail({
  media,
  onClick,
}: {
  media: PinWithMedia['media'][0];
  onClick: () => void;
}) {
  const thumbnailUrl = useSignedUrl(media.thumbnail_url || media.media_url);

  if (!thumbnailUrl) {
    return (
      <div
        className="w-full h-full bg-gray-200 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onClick}
      >
        <span className="text-2xl">
          {media.media_type === 'video' ? '🎥' : '📷'}
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full cursor-pointer hover:opacity-90 transition-opacity overflow-hidden rounded-lg"
      onClick={onClick}
    >
      {media.media_type === 'video' ? (
        <>
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
            <svg
              className="w-12 h-12 text-white drop-shadow-lg"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </>
      ) : (
        <img
          src={thumbnailUrl}
          alt="Photo"
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}

export default function PinDetailsView({ pin, onClose }: PinDetailsViewProps) {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (pin.media.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2 text-gray-900">
              {pin.title || 'Untitled Pin'}
            </h2>
            <p className="text-gray-600 mb-4">{formatDate(pin.date_taken)}</p>
            {pin.description && (
              <p className="text-gray-900 whitespace-pre-wrap">{pin.description}</p>
            )}
            <p className="text-gray-500 mt-4">No media available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 max-h-[70vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-semibold text-gray-900">
                {pin.title || 'Untitled Pin'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <p className="text-gray-600">{formatDate(pin.date_taken)}</p>
            {pin.description && (
              <p className="text-gray-900 mt-2 whitespace-pre-wrap">
                {pin.description}
              </p>
            )}
          </div>

          {/* Media Grid */}
          <div className="grid grid-cols-3 gap-2">
            {pin.media.map((media, index) => (
              <div
                key={media.id}
                className="aspect-square"
              >
                <MediaThumbnail
                  media={media}
                  onClick={() => setSelectedMediaIndex(index)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Screen Media Viewer */}
      {selectedMediaIndex !== null && (
        <FullScreenMediaViewer
          media={pin.media}
          initialIndex={selectedMediaIndex}
          isOpen={true}
          onClose={() => setSelectedMediaIndex(null)}
        />
      )}
    </>
  );
}

