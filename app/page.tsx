'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import MapView from '@/components/MapView';
import AddPinButton from '@/components/AddPinButton';
import AddPinModal from '@/components/AddPinModal';
import PinDetailsView from '@/components/PinDetailsView';
import YearRecapControls from '@/components/YearRecapControls';
import YearRecap from '@/components/YearRecap';
import LandingPage from '@/components/LandingPage';
import { getPinsForUser, getPinWithMedia, createPinWithMedia, getPinsForYear, getRecentMedia } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/client-browser';
import type { PinWithThumbnail, PinWithMedia, CreatePinData, PinMedia } from '@/types';
import type { User } from '@supabase/supabase-js';
import RecentMedia from '@/components/RecentMedia';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [pins, setPins] = useState<PinWithThumbnail[]>([]);
  const [selectedPin, setSelectedPin] = useState<PinWithMedia | null>(null);
  const [isAddPinOpen, setIsAddPinOpen] = useState(false);
  const [isPinDetailsOpen, setIsPinDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isRecapMode, setIsRecapMode] = useState(false);
  const [recapPins, setRecapPins] = useState<PinWithMedia[]>([]);
  const [recentMedia, setRecentMedia] = useState<PinMedia[]>([]);
  const [mapViewState, setMapViewState] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 10,
  });
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const hasCenteredOnUserLocationRef = useRef(false);

  // Check auth status and load pins
  useEffect(() => {
    checkAuth();
  }, []);

  // Request location permission and center map when user logs in
  useEffect(() => {
    if (user && !hasRequestedLocation) {
      requestUserLocation();
      setHasRequestedLocation(true);
    }
  }, [user, hasRequestedLocation]);

  // Center map on user location when it becomes available
  // This takes priority over pin centering
  // Use a ref to track if we've already centered on user location to avoid multiple updates
  useEffect(() => {
    if (userLocation && hasUserLocation) {
      // Mark that we've centered on user location - this prevents pin centering
      hasCenteredOnUserLocationRef.current = true;
      // Force update the map view state to center on user location
      setMapViewState({
        longitude: userLocation.longitude,
        latitude: userLocation.latitude,
        zoom: 12, // Closer zoom for current location
      });
    }
  }, [userLocation, hasUserLocation]);

  // Prevent pin centering if user location is available or being requested
  // This ensures user location always takes priority

  // Load pins when user changes
  useEffect(() => {
    if (user) {
      loadPins();
    } else {
      setPins([]);
      setIsLoading(false);
    }
  }, [user]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  };

  const requestUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Store user location for marker
          setUserLocation({ latitude, longitude });
          setHasUserLocation(true);
          // Map centering will be handled by the useEffect that watches userLocation
        },
        (error) => {
          console.error('Error getting location:', error);
          // If permission denied or error, keep default location
          // Don't show alert as it might be annoying
          setHasUserLocation(false);
          setUserLocation(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0, // Always get fresh location
        }
      );
    }
  };

  const loadPins = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const userPins = await getPinsForUser();
      setPins(userPins);
      
      // Extract available years from pins
      const years = new Set<number>();
      userPins.forEach((pin) => {
        if (pin.date_taken) {
          const year = new Date(pin.date_taken).getFullYear();
          years.add(year);
        }
      });
      const sortedYears = Array.from(years).sort((a, b) => b - a); // Most recent first
      setAvailableYears(sortedYears);
      
      // Set selected year to most recent year if available
      if (sortedYears.length > 0 && !availableYears.includes(selectedYear)) {
        setSelectedYear(sortedYears[0]);
      }
      
      // Load recent media
      const recent = await getRecentMedia(20);
      setRecentMedia(recent);
      
      // Don't center on pins if user location is available or being requested
      // User location should always take priority
      // Only center on pins if we haven't centered on user location and location is not being requested
      if (userPins.length > 0 && !hasCenteredOnUserLocationRef.current && !hasRequestedLocation) {
        const avgLat = userPins.reduce((sum, p) => sum + p.lat, 0) / userPins.length;
        const avgLng = userPins.reduce((sum, p) => sum + p.lng, 0) / userPins.length;
        setMapViewState({
          longitude: avgLng,
          latitude: avgLat,
          zoom: 10,
        });
      }
    } catch (error) {
      console.error('Error loading pins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinClick = useCallback(async (pinId: string) => {
    try {
      const pinWithMedia = await getPinWithMedia(pinId);
      if (pinWithMedia) {
        setSelectedPin(pinWithMedia);
        setIsPinDetailsOpen(true);
      }
    } catch (error) {
      console.error('Error loading pin details:', error);
    }
  }, []);

  const handleAddPin = async (data: CreatePinData) => {
    try {
      await createPinWithMedia(data);
      await loadPins(); // Reload pins and recent media
      setIsAddPinOpen(false);
    } catch (error) {
      console.error('Error creating pin:', error);
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleRecentMediaClick = async (media: PinMedia) => {
    try {
      const pinWithMedia = await getPinWithMedia(media.pin_id);
      if (pinWithMedia) {
        setSelectedPin(pinWithMedia);
        setIsPinDetailsOpen(true);
      }
    } catch (error) {
      console.error('Error loading pin details:', error);
    }
  };

  const handleStartRecap = async () => {
    if (!user) return;
    
    try {
      const yearPins = await getPinsForYear(selectedYear);
      if (yearPins.length === 0) {
        alert(`No pins found for ${selectedYear}`);
        return;
      }
      setRecapPins(yearPins);
      setIsRecapMode(true);
    } catch (error) {
      console.error('Error loading recap pins:', error);
      alert('Failed to load recap data');
    }
  };

  const handleCloseRecap = () => {
    setIsRecapMode(false);
    setRecapPins([]);
  };

  // Get polyline points - show route for all pins
  const polylinePoints: [number, number][] | undefined = pins.length > 0
    ? pins.map((pin) => [pin.lng, pin.lat])
    : undefined;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  // Show landing page if user is not authenticated
  if (!user) {
    return (
      <LandingPage
        onGetStarted={() => {
          checkAuth();
        }}
      />
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white">
      {/* Navigation Bar - Hide when pin details or recap is open */}
      {!isPinDetailsOpen && !isRecapMode && (
        <div className="absolute top-2 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {availableYears.length > 0 ? (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              disabled={isRecapMode}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-1.5 text-sm text-gray-500">No pins yet</div>
          )}
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Add Your Memories</h1>
        <button
          onClick={() => {
            handleStartRecap();
          }}
          disabled={isRecapMode || availableYears.length === 0}
          className="text-blue-600 font-medium text-sm hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          View Recap
        </button>
      </div>
      )}

      {/* Map View - Hide when recap is open */}
      {!isRecapMode && (
        <div className={`absolute left-0 right-0 ${
          recentMedia.length > 0 ? 'top-[73px] bottom-[160px]' : 'top-[73px] bottom-[120px]'
        }`}>
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-4 text-gray-600">Loading your places...</p>
              </div>
            </div>
          ) : (
            <MapView
              pins={pins}
              onPinClick={handlePinClick}
              polylinePoints={polylinePoints}
              userLocation={userLocation || undefined}
              initialViewState={mapViewState}
              onViewStateChange={setMapViewState}
            />
          )}
        </div>
      )}

      {/* Recent Media - Hide when pin details is open */}
      {!isRecapMode && !isPinDetailsOpen && user && recentMedia.length > 0 && (
        <RecentMedia 
          media={recentMedia} 
          onMediaClick={handleRecentMediaClick}
        />
      )}

      {/* Add Pin Button - Hide when pin details is open */}
      {!isRecapMode && !isPinDetailsOpen && user && (
        <AddPinButton 
          onClick={() => setIsAddPinOpen(true)}
          hasRecentMedia={recentMedia.length > 0}
        />
      )}

      {/* Pin Details View Overlay */}
      {isPinDetailsOpen && selectedPin && (
        <PinDetailsView
          pin={selectedPin}
          onClose={() => {
            setIsPinDetailsOpen(false);
            setSelectedPin(null);
          }}
        />
      )}


      {/* Add Pin Modal */}
      <AddPinModal
        isOpen={isAddPinOpen}
        onClose={() => setIsAddPinOpen(false)}
        onSubmit={handleAddPin}
        initialLocation={
          userLocation
            ? {
                lat: userLocation.latitude,
                lng: userLocation.longitude,
              }
            : {
                lat: mapViewState.latitude,
                lng: mapViewState.longitude,
              }
        }
      />


      {/* Year Recap */}
      {isRecapMode && recapPins.length > 0 && (
        <YearRecap
          pins={recapPins}
          year={selectedYear}
          onClose={handleCloseRecap}
        />
      )}
    </div>
  );
}
