'use client';

import { useEffect, useState } from 'react';
import MapView from '@/components/MapView';
import AddPinButton from '@/components/AddPinButton';
import AddPinModal from '@/components/AddPinModal';
import PinDetailsModal from '@/components/PinDetailsModal';
import YearRecapControls from '@/components/YearRecapControls';
import YearRecapOverlay from '@/components/YearRecapOverlay';
import LandingPage from '@/components/LandingPage';
import { getPinsForUser, getPinWithMedia, createPinWithMedia, getPinsForYear } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/client-browser';
import type { PinWithThumbnail, PinWithMedia, CreatePinData } from '@/types';
import type { User } from '@supabase/supabase-js';

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
      await loadPins(); // Reload pins
      setIsAddPinOpen(false);
    } catch (error) {
      console.error('Error creating pin:', error);
      throw error; // Re-throw so modal can handle it
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

  // Get polyline points for recap mode
  const polylinePoints: [number, number][] | undefined = isRecapMode
    ? recapPins.map((pin) => [pin.lng, pin.lat])
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
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Journee</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
          >
            Sign Out
          </button>
          <YearRecapControls
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            onStartRecap={handleStartRecap}
            isRecapActive={isRecapMode}
          />
        </div>
      </div>

      {/* Map View */}
      <div className="absolute top-14 bottom-0 left-0 right-0">
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
        <AddPinButton onClick={() => setIsAddPinOpen(true)} />
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
