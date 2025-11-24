'use client';

import { useState } from 'react';
import type { Pin, PinMedia } from '@/types';
import MediaCarousel from './MediaCarousel';

interface PinDetailsModalProps {
  pin: Pin | null;
  media: PinMedia[];
  isOpen: boolean;
  onClose: () => void;
}

export default function PinDetailsModal({
  pin,
  media,
  isOpen,
  onClose,
}: PinDetailsModalProps) {
  if (!isOpen || !pin) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black bg-opacity-50 sm:items-center sm:justify-center">
      <div className="w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold">
            {pin.title || 'Untitled Pin'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
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

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Media Carousel */}
          {media.length > 0 && <MediaCarousel media={media} />}

          {/* Details */}
          <div className="space-y-3">
            {pin.title && (
              <div>
                <h3 className="text-lg font-semibold">{pin.title}</h3>
              </div>
            )}
            <div className="text-sm text-gray-600">
              {formatDate(pin.date_taken)}
            </div>
            {pin.description && (
              <div className="text-gray-700 whitespace-pre-wrap">
                {pin.description}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

