'use client';

import React, { useEffect, useState } from 'react';
import type { PinWithMedia } from '@/types';
import { calculateRecapStats, type RecapStats } from '@/lib/recap-stats';
import { useSignedUrl } from '@/hooks/useSignedUrls';

interface YearRecapProps {
  pins: PinWithMedia[];
  year: number;
  onClose: () => void;
}

type RecapPhase = 'intro' | 'places' | 'days' | 'countries' | 'continents' | 'media' | 'km' | 'pins' | 'summary';

export default function YearRecap({ pins, year, onClose }: YearRecapProps) {
  const [phase, setPhase] = useState<RecapPhase>('intro');
  const [pinIndex, setPinIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Calculate stats once and memoize to ensure consistency
  const stats = React.useMemo(() => calculateRecapStats(pins, year), [pins, year]);

  // Initialize and play audio
  useEffect(() => {
    const audio = new Audio('/recap.mp3');
    audio.loop = true;
    audio.volume = 0.7; // Start at 70% volume
    audioRef.current = audio;

    // Play audio when component mounts
    audio.play().catch((error) => {
      // Ignore AbortError - it's common in React strict mode when component unmounts quickly
      if (error.name !== 'AbortError') {
        console.error('Error playing audio:', error);
      }
    });

    return () => {
      // Cleanup: stop and remove audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []);

  // Fade out audio when reaching summary phase
  useEffect(() => {
    if (phase === 'summary' && audioRef.current) {
      const audio = audioRef.current;
      const fadeDuration = 2000; // 2 seconds fade
      const fadeSteps = 20;
      const volumeStep = audio.volume / fadeSteps;
      const stepDuration = fadeDuration / fadeSteps;

      fadeIntervalRef.current = setInterval(() => {
        if (audio.volume > 0) {
          audio.volume = Math.max(0, audio.volume - volumeStep);
        } else {
          audio.pause();
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
        }
      }, stepDuration);
    }

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    };
  }, [phase]);

  // Auto-advance through phases
  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => setPhase('places'), 2500);
      return () => clearTimeout(timer);
    } else if (phase === 'places') {
      // Wait for animation to complete (2000ms animation + 500ms buffer)
      const timer = setTimeout(() => setPhase('days'), 3500);
      return () => clearTimeout(timer);
    } else if (phase === 'days') {
      const timer = setTimeout(() => setPhase('countries'), 3500);
      return () => clearTimeout(timer);
    } else if (phase === 'countries') {
      const timer = setTimeout(() => setPhase('continents'), 3500);
      return () => clearTimeout(timer);
    } else if (phase === 'continents') {
      const timer = setTimeout(() => setPhase('media'), 3500);
      return () => clearTimeout(timer);
    } else if (phase === 'media') {
      const timer = setTimeout(() => setPhase('km'), 3500);
      return () => clearTimeout(timer);
    } else if (phase === 'km') {
      const timer = setTimeout(() => setPhase('pins'), 3500);
      return () => clearTimeout(timer);
    } else if (phase === 'pins') {
      // Auto-advance through pins - give more time for media to load
      if (pinIndex < pins.length - 1) {
        const timer = setTimeout(() => {
          setIsAnimating(true);
          setTimeout(() => {
            setPinIndex(pinIndex + 1);
            setIsAnimating(false);
          }, 500);
        }, 4000); // Increased from 3000 to allow media to load
        return () => clearTimeout(timer);
      } else {
        // All pins shown, go to summary - give extra time for last pin media
        const timer = setTimeout(() => setPhase('summary'), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, pinIndex, pins.length]);

  // Animation trigger
  useEffect(() => {
    if (phase !== 'intro' && phase !== 'pins' && phase !== 'summary') {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [phase]);

  const currentPin = pins[pinIndex];
  const currentMedia = currentPin?.media[0];

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(to bottom right, #2563EB, #1D4ED8, #1E40AF)' }}
    >
      {/* Close button */}
      <button
        onClick={() => {
          // Stop audio when closing
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
          onClose();
        }}
        className="absolute top-4 right-4 z-10 text-white hover:text-gray-200 transition-colors p-2"
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

      {/* Intro Phase */}
      {phase === 'intro' && (
        <div className={`text-center transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4">
            {year} Recap
          </h1>
          <p className="text-xl md:text-2xl text-blue-100">
            Your journey in numbers
          </p>
        </div>
      )}

      {/* Stats Phases */}
      {phase === 'places' && (
        <StatSlide
          isAnimating={isAnimating}
          number={stats.placesVisited}
          label="PLACES VISITED"
          icon="📍"
        />
      )}

      {phase === 'days' && (
        <StatSlide
          isAnimating={isAnimating}
          number={stats.daysTraveled}
          label="DAYS TRAVELED"
          icon="📅"
        />
      )}

      {phase === 'countries' && (
        <StatSlide
          isAnimating={isAnimating}
          number={stats.countriesExplored}
          label="COUNTRIES EXPLORED"
          icon="🌍"
        />
      )}

      {phase === 'continents' && (
        <StatSlide
          isAnimating={isAnimating}
          number={stats.continentsVisited}
          label="CONTINENTS VISITED"
          icon="🌏"
        />
      )}

      {phase === 'media' && (
        <StatSlide
          isAnimating={isAnimating}
          number={stats.mediaUploaded}
          label="PHOTOS & VIDEOS"
          icon="📸"
        />
      )}

      {phase === 'km' && (
        <StatSlide
          isAnimating={isAnimating}
          number={stats.kilometersTraveled}
          label="KILOMETERS TRAVELED"
          icon="🗺️"
        />
      )}

      {/* Pins Phase */}
      {phase === 'pins' && currentPin && (
        <PinSlide
          pin={currentPin}
          index={pinIndex}
          total={pins.length}
          isAnimating={isAnimating}
        />
      )}

      {/* Summary Phase */}
      {phase === 'summary' && (
        <SummarySlide 
          stats={stats} 
          year={year}
        />
      )}
    </div>
  );
}

function StatSlide({
  isAnimating,
  number,
  label,
  icon,
}: {
  isAnimating: boolean;
  number: number;
  label: string;
  icon: string;
}) {
  const [displayNumber, setDisplayNumber] = React.useState(0);
  const animationRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (isAnimating) {
      // Reset when animating out
      setDisplayNumber(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      startTimeRef.current = null;
      return;
    }

    // Reset to 0 first
    setDisplayNumber(0);
    startTimeRef.current = null;
    
    // Small delay to ensure smooth transition, then start animation
    const startTimer = setTimeout(() => {
      const duration = 2000; // 2 seconds for smooth counting
      const startTime = performance.now();
      startTimeRef.current = startTime;
      
      // Calculate how many steps we need - ensure we show every integer
      const maxSteps = Math.min(number, 100); // Cap at 100 steps for very large numbers
      const stepDuration = duration / maxSteps;
      let lastDisplayed = 0;
      
      const animate = (currentTime: number) => {
        if (!startTimeRef.current) return;
        
        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        
        // Linear interpolation for smooth counting
        const targetValue = number * progress;
        
        // Only update if we've moved to the next integer
        const currentInt = Math.floor(targetValue);
        if (currentInt !== lastDisplayed && currentInt <= number) {
          setDisplayNumber(currentInt);
          lastDisplayed = currentInt;
        }
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Ensure we end at the exact number
          setDisplayNumber(number);
          animationRef.current = null;
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }, 100);
    
    return () => {
      clearTimeout(startTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      startTimeRef.current = null;
    };
  }, [number, isAnimating]);

  return (
    <div className={`text-center transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      <div className="text-8xl mb-6">{icon}</div>
      <div className="text-7xl md:text-9xl font-bold text-yellow-300 mb-4 min-h-[120px] flex items-center justify-center">
        {displayNumber.toLocaleString()}
      </div>
      <div className="text-2xl md:text-3xl text-white font-medium">
        {label}
      </div>
    </div>
  );
}

const PinSlide = ({
  pin,
  index,
  total,
  isAnimating,
}: {
  pin: PinWithMedia;
  index: number;
  total: number;
  isAnimating: boolean;
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={`w-full max-w-4xl px-6 transition-all duration-500 ${isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">
          {pin.title || 'Untitled Pin'}
        </h2>
        <p className="text-xl text-blue-100">{formatDate(pin.date_taken)}</p>
      </div>

      {pin.media.length > 0 && (
        <div className={`grid gap-3 mb-6 ${
          pin.media.length === 1 ? 'grid-cols-1' :
          pin.media.length === 2 ? 'grid-cols-2' :
          pin.media.length === 3 ? 'grid-cols-3' :
          'grid-cols-2 md:grid-cols-3'
        }`}>
          {pin.media.map((media, mediaIndex) => (
            <MediaItem key={media.id} media={media} pinTitle={pin.title} />
          ))}
        </div>
      )}

      <div className="text-center">
        <div className="text-white text-lg">
          {index + 1} of {total}
        </div>
        <div className="w-full max-w-md mx-auto mt-2 bg-white/20 rounded-full h-2">
          <div
            className="bg-yellow-300 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function MediaItem({
  media,
  pinTitle,
}: {
  media: PinWithMedia['media'][0];
  pinTitle: string | null;
}) {
  const mediaUrl = useSignedUrl(media.media_url);
  const thumbnailUrl = useSignedUrl(media.thumbnail_url || media.media_url);

  if (!mediaUrl && !thumbnailUrl) {
    return (
      <div className="aspect-square bg-gray-800 rounded-xl flex items-center justify-center">
        <span className="text-4xl">
          {media.media_type === 'video' ? '🎥' : '📷'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden shadow-xl">
      {media.media_type === 'video' ? (
        <>
          {/* Thumbnail image - shown during capture, hidden when video is playing */}
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={pinTitle || 'Video thumbnail'}
              className="w-full h-full object-cover absolute inset-0 z-10"
              style={{ display: 'none' }}
              crossOrigin="anonymous"
            />
          )}
          <video
            src={mediaUrl || undefined}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            crossOrigin="anonymous"
          />
        </>
      ) : (
        <img
          src={mediaUrl || thumbnailUrl || undefined}
          alt={pinTitle || 'Pin media'}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
        />
      )}
      {media.media_type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <svg
            className="w-12 h-12 text-white drop-shadow-lg"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}

function SummarySlide({
  stats,
  year,
}: {
  stats: RecapStats;
  year: number;
}) {
  return (
    <div className="w-full max-w-4xl px-6 text-center">
      <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
        Your {year} Journey
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <StatCard number={stats.placesVisited} label="Places" icon="📍" />
        <StatCard number={stats.daysTraveled} label="Days" icon="📅" />
        <StatCard number={stats.countriesExplored} label="Countries" icon="🧭" />
        <StatCard number={stats.continentsVisited} label="Continents" icon="🌏" />
        <StatCard number={stats.mediaUploaded} label="Media" icon="📸" />
        <StatCard number={stats.kilometersTraveled} label="Kilometers" icon="🗺️" />
      </div>
    </div>
  );
}

function StatCard({
  number,
  label,
  icon,
}: {
  number: number;
  label: string;
  icon: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-4xl font-bold text-yellow-300 mb-1">{number}</div>
      <div className="text-white text-sm uppercase tracking-wide">{label}</div>
    </div>
  );
}

