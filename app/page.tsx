'use client';

import { useEffect, useState } from 'react';
import MapView from '@/components/MapView';
import AddPinButton from '@/components/AddPinButton';
import AddPinModal from '@/components/AddPinModal';
import PinDetailsModal from '@/components/PinDetailsModal';
import YearRecapControls from '@/components/YearRecapControls';
import YearRecapOverlay from '@/components/YearRecapOverlay';
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
  const [recapIndex, setRecapIndex] = useState(0);
  const [isRecapPlaying, setIsRecapPlaying] = useState(false);
  const [recentMedia, setRecentMedia] = useState<PinMedia[]>([]);
  const [mapViewState, setMapViewState] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 10,
  });

  // Check auth status and load pins
  useEffect(() => {
    checkAuth();
  }, []);

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

  const loadPins = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const userPins = await getPinsForUser();
      setPins(userPins);
      
      // Load recent media
      const recent = await getRecentMedia(20);
      setRecentMedia(recent);
      
      // Update map view to show all pins if we have any
      if (userPins.length > 0) {
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

  const handlePinClick = async (pinId: string) => {
    try {
      const pinWithMedia = await getPinWithMedia(pinId);
      if (pinWithMedia) {
        setSelectedPin(pinWithMedia);
        setIsPinDetailsOpen(true);
      }
    } catch (error) {
      console.error('Error loading pin details:', error);
    }
  };

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
      setRecapIndex(0);
      setIsRecapMode(true);
      setIsRecapPlaying(true);
    } catch (error) {
      console.error('Error loading recap pins:', error);
      alert('Failed to load recap data');
    }
  };

  const handleRecapIndexChange = (newIndex: number) => {
    setRecapIndex(newIndex);
    setIsRecapPlaying(false); // Pause when manually navigating
  };

  const handleCloseRecap = () => {
    setIsRecapMode(false);
    setIsRecapPlaying(false);
    setRecapPins([]);
    setRecapIndex(0);
  };

  // Get polyline points - show route for all pins or recap pins
  const polylinePoints: [number, number][] | undefined = isRecapMode
    ? recapPins.map((pin) => [pin.lng, pin.lat])
    : pins.length > 0
    ? pins.map((pin) => [pin.lng, pin.lat])
    : undefined;

  // Get highlighted pin ID for recap mode
  const highlightedPinId = isRecapMode && recapPins[recapIndex]
    ? recapPins[recapIndex].id
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
      {/* Status Bar (for mobile) */}
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
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Add Your Memories</h1>
        <button
          onClick={() => {
            setSelectedYear(new Date().getFullYear());
            handleStartRecap();
          }}
          className="text-blue-600 font-medium text-sm hover:text-blue-700"
        >
          View Year
        </button>
      </div>

      {/* Map View */}
      <div className={`absolute left-0 right-0 ${
        recentMedia.length > 0 ? 'top-[73px] bottom-[200px]' : 'top-[73px] bottom-[120px]'
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
            highlightedPinId={highlightedPinId}
            polylinePoints={polylinePoints}
            initialViewState={mapViewState}
            onViewStateChange={setMapViewState}
          />
        )}
      </div>

      {/* Add Pin Button */}
      {!isRecapMode && user && (
        <AddPinButton 
          onClick={() => setIsAddPinOpen(true)}
        />
      )}

      {/* Recent Media */}
      {!isRecapMode && user && recentMedia.length > 0 && (
        <RecentMedia 
          media={recentMedia} 
          onMediaClick={handleRecentMediaClick}
        />
      )}


      {/* Add Pin Modal */}
      <AddPinModal
        isOpen={isAddPinOpen}
        onClose={() => setIsAddPinOpen(false)}
        onSubmit={handleAddPin}
        initialLocation={{
          lat: mapViewState.latitude,
          lng: mapViewState.longitude,
        }}
      />

      {/* Pin Details Modal */}
      <PinDetailsModal
        pin={selectedPin}
        media={selectedPin?.media || []}
        isOpen={isPinDetailsOpen}
        onClose={() => {
          setIsPinDetailsOpen(false);
          setSelectedPin(null);
        }}
      />

      {/* Year Recap Overlay */}
      {isRecapMode && recapPins.length > 0 && (
        <YearRecapOverlay
          pins={recapPins}
          currentIndex={recapIndex}
          isPlaying={isRecapPlaying}
          onIndexChange={handleRecapIndexChange}
          onPlayPause={() => setIsRecapPlaying(!isRecapPlaying)}
          onClose={handleCloseRecap}
        />
      )}
    </div>
  );
}
