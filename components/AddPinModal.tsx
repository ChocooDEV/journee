'use client';

import { useState, useRef, useEffect } from 'react';
import type { CreatePinData } from '@/types';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format date for display (e.g., "Mar 20, 2024")
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  // Reverse geocode coordinates to get location name (city and country)
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      setIsLoadingLocation(true);
      const response = await fetch(
        `/api/mapbox/api/geocoding/v5/mapbox.places/${longitude},${latitude}.json`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        try {
          // Extract city and country from the place_name
          const cityFeature = data.features.find((feature: any) => feature.id.startsWith('place'));
          const countryFeature = data.features.find((feature: any) => feature.id.startsWith('country'));
          
          const city = cityFeature ? cityFeature.text : null;
          const country = countryFeature ? countryFeature.text : null;
          
          if (city && country) {
            setLocationName(`${city}, ${country}`);
          } else if (city) {
            setLocationName(city);
          } else if (data.features[0].place_name) {
            // Fallback to first part of place_name
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

  // Autocomplete search for locations
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

  // Handle location input change with debounced autocomplete
  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationName(value);
    setIsUserTyping(true);
    
    // Clear existing timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }
    
    // Debounce the search
    autocompleteTimeoutRef.current = setTimeout(() => {
      searchLocations(value);
      setIsUserTyping(false);
    }, 300);
  };

  // Handle selecting an autocomplete suggestion
  const handleSelectSuggestion = (feature: any) => {
    const [longitude, latitude] = feature.center;
    setLng(longitude);
    setLat(latitude);
    setLocationName(feature.place_name || feature.text);
    setShowAutocomplete(false);
    setAutocompleteSuggestions([]);
  };

  // Update location name when coordinates change (only if not typing)
  useEffect(() => {
    if (lat && lng && !isUserTyping) {
      reverseGeocode(lat, lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, []);

  // Update location when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setLat(initialLocation.lat);
      setLng(initialLocation.lng);
    }
  }, [initialLocation]);

  // Try to get user's current location when modal opens (if permission already granted)
  // Only if we don't have a good initialLocation (i.e., it's the default map center)
  useEffect(() => {
    if (isOpen && !hasTriedAutoLocation && navigator.geolocation) {
      // Check if initialLocation looks like a default/center location (not user's actual location)
      const isDefaultLocation = 
        !initialLocation || 
        (initialLocation.lat === 37.7749 && initialLocation.lng === -122.4194) || // San Francisco default
        (initialLocation.lat === 48.8566 && initialLocation.lng === 2.3522); // Paris default
      
      if (isDefaultLocation) {
        setHasTriedAutoLocation(true);
        // Try to get location without showing permission prompt (if already granted)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLat(latitude);
            setLng(longitude);
          },
          () => {
            // If permission not granted or error, use initialLocation or default
            // Don't show error, just silently fail
          },
          {
            enableHighAccuracy: true,
            timeout: 2000, // Short timeout to fail fast if permission not granted
            maximumAge: 60000, // Accept location up to 1 minute old
          }
        );
      } else {
        // We have a good initialLocation, mark as tried so we don't override it
        setHasTriedAutoLocation(true);
      }
    }
    
    // Reset flag when modal closes
    if (!isOpen) {
      setHasTriedAutoLocation(false);
    }
  }, [isOpen, hasTriedAutoLocation, initialLocation]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
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

    setIsSubmitting(true);
    try {
      await onSubmit({
        lat,
        lng,
        title: locationName || undefined,
        description: caption || undefined,
        dateTaken: dateTaken || new Date().toISOString().split('T')[0],
        files,
      });

      // Reset form
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
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Please try again.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto text-gray-900">
      {/* Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 h-6 bg-white flex items-center justify-between px-4 text-xs text-gray-600">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.076 13.308-5.076 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="absolute top-6 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-blue-600 font-medium text-base hover:text-blue-700"
        >
          Cancel
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Add Photo</h1>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Form Content */}
      <div className="pt-[73px] pb-24 px-4">
        <div className="max-w-md mx-auto space-y-6 pt-6">
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
                className="w-full px-4 py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-3"
              >
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
                >
                  Add More Photos
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
