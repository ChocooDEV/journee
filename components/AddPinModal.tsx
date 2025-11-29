'use client';

import { useState, useRef, useEffect } from 'react';
import type { CreatePinData } from '@/types';
import { compressImages } from '@/lib/image-compression';
import { validateVideoDuration, processVideos, processVideoWithThumbnail } from '@/lib/video-processing';

interface AddPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePinData) => Promise<void>;
  initialLocation?: { lat: number; lng: number };
}

export default function AddPinModal({
  isOpen,
  onClose,
  onSubmit,
  initialLocation,
}: AddPinModalProps) {
  const [lat, setLat] = useState(initialLocation?.lat || 48.8566);
  const [lng, setLng] = useState(initialLocation?.lng || 2.3522);
  const [locationName, setLocationName] = useState('');
  const [hasTriedAutoLocation, setHasTriedAutoLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [caption, setCaption] = useState('');
  const [dateTaken, setDateTaken] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [files, setFiles] = useState<File[]>([]);
  const [videoThumbnails, setVideoThumbnails] = useState<Map<File, File>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0 });
  const [videoProcessingProgress, setVideoProcessingProgress] = useState({ 
    current: 0, 
    total: 0, 
    fileName: '',
    stage: 'loading' as 'loading' | 'processing' | 'thumbnail' | 'complete',
    progress: 0 // 0-100 percentage
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      setIsLoadingLocation(true);
      const response = await fetch(
        `/api/mapbox/api/geocoding/v5/mapbox.places/${longitude},${latitude}.json`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        try {
          const cityFeature = data.features.find((feature: any) => feature.id.startsWith('place'));
          const countryFeature = data.features.find((feature: any) => feature.id.startsWith('country'));
          
          const city = cityFeature ? cityFeature.text : null;
          const country = countryFeature ? countryFeature.text : null;
          
          if (city && country) {
            setLocationName(`${city}, ${country}`);
          } else if (city) {
            setLocationName(city);
          } else if (data.features[0].place_name) {
            setLocationName(data.features[0].place_name.split(',')[0]);
          } else {
            setLocationName('Unknown Location');
          }
        } catch (exceptionVar) {
          console.error('Error extracting city and country:', exceptionVar);
          setLocationName(data.features[0].text || 'Unknown Location');
        }
      } else {
        setLocationName('Unknown Location');
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setLocationName('Unknown Location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const searchLocations = async (query: string) => {
    if (!query || query.length < 2) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `/api/mapbox/api/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=place,locality,neighborhood,address&limit=5`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        setAutocompleteSuggestions(data.features);
        setShowAutocomplete(true);
      } else {
        setAutocompleteSuggestions([]);
        setShowAutocomplete(false);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationName(value);
    setIsUserTyping(true);
    
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }
    
    autocompleteTimeoutRef.current = setTimeout(() => {
      searchLocations(value);
      setIsUserTyping(false);
    }, 300);
  };

  const handleSelectSuggestion = (feature: any) => {
    const [longitude, latitude] = feature.center;
    setLng(longitude);
    setLat(latitude);
    setLocationName(feature.place_name || feature.text);
    setShowAutocomplete(false);
    setAutocompleteSuggestions([]);
  };

  useEffect(() => {
    if (lat && lng && !isUserTyping) {
      reverseGeocode(lat, lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && initialLocation) {
      setLat(initialLocation.lat);
      setLng(initialLocation.lng);
      reverseGeocode(initialLocation.lat, initialLocation.lng);
    }
  }, [isOpen, initialLocation]);

  useEffect(() => {
    if (isOpen && !hasTriedAutoLocation && navigator.geolocation) {
      const isDefaultLocation = 
        !initialLocation || 
        (initialLocation.lat === 37.7749 && initialLocation.lng === -122.4194) ||
        (initialLocation.lat === 48.8566 && initialLocation.lng === 2.3522);
      
      if (isDefaultLocation) {
        setHasTriedAutoLocation(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setLat(latitude);
            setLng(longitude);
            await reverseGeocode(latitude, longitude);
          },
          () => {
            setIsLoadingLocation(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 2000,
            maximumAge: 60000,
          }
        );
      } else {
        setHasTriedAutoLocation(true);
      }
    }
    
    if (!isOpen) {
      setHasTriedAutoLocation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasTriedAutoLocation]);

  const handleCleanup = () => {
    isCancelledRef.current = true;
    setIsCompressing(false);
    setIsProcessingVideo(false);
    setCompressionProgress({ current: 0, total: 0 });
    setVideoProcessingProgress({ current: 0, total: 0, fileName: '', stage: 'loading', progress: 0 });
    
    setFiles([]);
    setVideoThumbnails(new Map());
    setCaption('');
    setDateTaken(new Date().toISOString().split('T')[0]);
    setLocationName('');
    setAutocompleteSuggestions([]);
    setShowAutocomplete(false);
    setIsUserTyping(false);
    setIsSearching(false);
    setIsLoadingLocation(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (locationInputRef.current) {
      locationInputRef.current.value = '';
    }
    
    if (initialLocation) {
      setLat(initialLocation.lat);
      setLng(initialLocation.lng);
    }
  };

  const handleClose = () => {
    handleCleanup();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      isCancelledRef.current = true;
      handleCleanup();
    } else {
      isCancelledRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Reset cancellation flag at start of new operation
    isCancelledRef.current = false;
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length === 0) return;

    // Validate files first (before processing to save time)
    const { validateFiles } = await import('@/lib/supabase/storage-utils');
    const validation = validateFiles(selectedFiles);
    if (!validation.valid) {
      alert(`Please fix the following issues:\n\n${validation.errors.join('\n')}`);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate video durations
    const videoFiles = selectedFiles.filter(f => f.type.startsWith('video/'));
    if (videoFiles.length > 0) {
      const videoValidationErrors: string[] = [];
      for (const videoFile of videoFiles) {
        const result = await validateVideoDuration(videoFile);
        if (!result.valid) {
          videoValidationErrors.push(result.error || 'Video validation failed');
        }
      }
      
      if (videoValidationErrors.length > 0) {
        alert(`Video validation failed:\n\n${videoValidationErrors.join('\n')}\n\nVideos will be automatically trimmed to 10 seconds.`);
      }
    }

    let processedFiles = selectedFiles;
    const hasImages = selectedFiles.some(file => file.type.startsWith('image/'));
    const hasVideos = selectedFiles.some(file => file.type.startsWith('video/'));

    if (hasImages && !isCancelledRef.current) {
      setIsCompressing(true);
      setCompressionProgress({ current: 0, total: selectedFiles.length });
      
      try {
        processedFiles = await compressImages(
          processedFiles,
          (current, total) => {
            if (isCancelledRef.current) {
              throw new Error('Processing cancelled');
            }
            setCompressionProgress({ current, total });
          }
        );
      } catch (error: any) {
        if (error.message === 'Processing cancelled') {
          setIsCompressing(false);
          setCompressionProgress({ current: 0, total: 0 });
          return;
        }
        console.error('Error compressing images:', error);
      } finally {
        if (!isCancelledRef.current) {
          setIsCompressing(false);
          setCompressionProgress({ current: 0, total: 0 });
        }
      }
    }
    
    if (isCancelledRef.current) {
      return;
    }

    if (hasVideos && !isCancelledRef.current) {
      setIsProcessingVideo(true);
      const videoFiles = processedFiles.filter(f => f.type.startsWith('video/'));
      
      setVideoProcessingProgress({ 
        current: 0, 
        total: videoFiles.length, 
        fileName: '',
        stage: 'loading',
        progress: 0
      });
      
      try {
        const newThumbnails = new Map<File, File>();
        
        for (let i = 0; i < videoFiles.length; i++) {
          const videoFile = videoFiles[i];
          
          if (isCancelledRef.current) {
            throw new Error('Processing cancelled');
          }
          
          if (i === 0) {
            setVideoProcessingProgress({ 
              current: i + 1, 
              total: videoFiles.length, 
              fileName: videoFile.name,
              stage: 'loading',
              progress: 5
            });
          }
          
          setVideoProcessingProgress({ 
            current: i + 1, 
            total: videoFiles.length, 
            fileName: videoFile.name,
            stage: 'processing',
            progress: 10 + (i / videoFiles.length) * 60
          });
          
          const { video, thumbnail } = await processVideoWithThumbnail(videoFile);
          
          setVideoProcessingProgress({ 
            current: i + 1, 
            total: videoFiles.length, 
            fileName: videoFile.name,
            stage: 'thumbnail',
            progress: 70 + (i / videoFiles.length) * 25
          });
          
          const videoIndex = processedFiles.indexOf(videoFile);
          if (videoIndex !== -1) {
            processedFiles[videoIndex] = video;
          }
          
          if (thumbnail) {
            newThumbnails.set(video, thumbnail);
          }
          
          setVideoProcessingProgress({ 
            current: i + 1, 
            total: videoFiles.length, 
            fileName: videoFile.name,
            stage: 'complete',
            progress: 95 + ((i + 1) / videoFiles.length) * 5
          });
        }
        
        setVideoThumbnails(prev => {
          const updated = new Map(prev);
          newThumbnails.forEach((thumb, video) => {
            updated.set(video, thumb);
          });
          return updated;
        });
      } catch (error: any) {
        if (error.message === 'Processing cancelled') {
          setIsProcessingVideo(false);
          setVideoProcessingProgress({ current: 0, total: 0, fileName: '', stage: 'loading', progress: 0 });
          return;
        }
        console.error('Error processing videos:', error);
        if (!isCancelledRef.current) {
          alert('Video processing failed. Please try uploading a shorter video or a different format.');
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setIsProcessingVideo(false);
        setVideoProcessingProgress({ current: 0, total: 0, fileName: '', stage: 'loading', progress: 0 });
        return;
      } finally {
        if (!isCancelledRef.current) {
          setIsProcessingVideo(false);
          setVideoProcessingProgress({ current: 0, total: 0, fileName: '', stage: 'loading', progress: 0 });
        }
      }
    }
    
    if (!isCancelledRef.current) {
      setFiles((prev) => [...prev, ...processedFiles]);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!lat || !lng) {
      alert('Please select a location');
      return;
    }

    if (files.length === 0) {
      alert('Please add at least one photo or video');
      return;
    }

    const { validateFiles } = await import('@/lib/supabase/storage-utils');
    const validation = validateFiles(files);
    if (!validation.valid) {
      alert(`Please fix the following issues:\n\n${validation.errors.join('\n')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        lat,
        lng,
        title: locationName || undefined,
        description: caption || undefined,
        dateTaken: dateTaken || new Date().toISOString().split('T')[0],
        files,
        videoThumbnails,
      });

      setCaption('');
      setDateTaken(new Date().toISOString().split('T')[0]);
      setFiles([]);
      onClose();
    } catch (error) {
      console.error('Error creating pin:', error);
      alert('Failed to create pin. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLat(latitude);
          setLng(longitude);
          await reverseGeocode(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLoadingLocation(false);
          alert('Could not get your location. Please try again.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="fixed top-[45px] bottom-0 left-0 right-0 z-[65] bg-white overflow-y-auto text-gray-900">
      {/* Form Content */}
      <div className="pb-24 px-4">
        <div className="max-w-md mx-auto space-y-6 pt-6">
          {/* Close Button */}
          <div className="flex justify-start mb-4">
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow"
              disabled={isSubmitting}
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Cancel</span>
            </button>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Location
            </label>
            <div className="relative">
              <input
                ref={locationInputRef}
                type="text"
                value={isLoadingLocation ? 'Loading...' : locationName}
                onChange={handleLocationInputChange}
                onFocus={() => {
                  if (autocompleteSuggestions.length > 0) {
                    setShowAutocomplete(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding autocomplete to allow clicking on suggestions
                  setTimeout(() => setShowAutocomplete(false), 200);
                }}
                className="w-full px-3 py-2 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                placeholder="Enter location"
              />
              <button
                onClick={getCurrentLocation}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-blue-600 font-medium text-sm hover:text-blue-700 whitespace-nowrap"
              >
                <svg
                  className="w-4 h-4 text-gray-700"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-blue-600">Use My Location</span>
              </button>
              
              {/* Autocomplete Dropdown */}
              {showAutocomplete && autocompleteSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {autocompleteSuggestions.map((feature, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSuggestion(feature)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      <div className="font-medium text-gray-900">{feature.text}</div>
                      <div className="text-sm text-gray-600">{feature.place_name}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {isSearching && (
                <div className="absolute right-36 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Photo */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Photo
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            {files.length === 0 ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing || isProcessingVideo}
                className="w-full px-4 py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCompressing ? (
                  <>
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-600 font-medium">
                      Compressing images... ({compressionProgress.current}/{compressionProgress.total})
                    </span>
                  </>
                ) : isProcessingVideo ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 font-medium">
                          {videoProcessingProgress.stage === 'loading' && 'Loading FFmpeg...'}
                          {videoProcessingProgress.stage === 'processing' && 'Processing video...'}
                          {videoProcessingProgress.stage === 'thumbnail' && 'Extracting thumbnail...'}
                          {videoProcessingProgress.stage === 'complete' && 'Finalizing...'}
                        </span>
                        <span className="text-gray-500">
                          {videoProcessingProgress.current}/{videoProcessingProgress.total}
                        </span>
                      </div>
                      {videoProcessingProgress.fileName && (
                        <div className="text-xs text-gray-500 truncate">
                          {videoProcessingProgress.fileName}
                        </div>
                      )}
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${videoProcessingProgress.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 text-center">
                        {Math.round(videoProcessingProgress.progress)}%
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-sm text-gray-600 font-medium">Tap to upload</span>
                    <span className="text-xs text-gray-500">Videos will be trimmed to 10 seconds</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {files.map((file, index) => (
                    <div key={index} className="relative aspect-square">
                      {file.type.startsWith('video/') ? (
                        <video
                          src={URL.createObjectURL(file)}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing || isProcessingVideo}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCompressing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                      Compressing... ({compressionProgress.current}/{compressionProgress.total})
                    </span>
                  ) : isProcessingVideo ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                      Processing... ({videoProcessingProgress.current}/{videoProcessingProgress.total})
                    </span>
                  ) : (
                    'Add More Photos'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Caption
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Enter a caption"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Date
            </label>
            <input
              type="date"
              value={dateTaken}
              onChange={(e) => setDateTaken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <p className="text-xs text-gray-600">{formatDate(dateTaken)}</p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-4">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || files.length === 0}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
        >
          {isSubmitting ? 'Adding...' : 'Add'}
        </button>
      </div>
    </div>
  );
}
