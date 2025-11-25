'use client';

// Import proxy interceptor FIRST, before mapbox-gl
import '@/lib/mapbox-proxy';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { PinWithThumbnail } from '@/types';

interface MapViewProps {
  pins: PinWithThumbnail[];
  onPinClick: (pinId: string) => void;
  highlightedPinId?: string;
  polylinePoints?: [number, number][];
  userLocation?: { latitude: number; longitude: number };
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  onViewStateChange?: (viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  }) => void;
}

export default function MapView({
  pins,
  onPinClick,
  highlightedPinId,
  polylinePoints,
  userLocation,
  initialViewState,
  onViewStateChange,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const isProgrammaticUpdate = useRef(false);
  const isDragging = useRef(false);
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointerHandlersRef = useRef<{
    handlePointerDown: () => void;
    handlePointerUp: () => void;
  } | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Use a style URL that will be proxied through our API
    // mapbox-gl will convert mapbox:// URLs to https://api.mapbox.com URLs
    // We use transformRequest to route all Mapbox requests through our proxy
    // We use a placeholder token that looks valid - it will be replaced by our proxy with the real server-side token
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [
        initialViewState?.longitude || -122.4194,
        initialViewState?.latitude || 37.7749,
      ],
      zoom: initialViewState?.zoom || 10,
      // Placeholder token - must be valid format (pk.*) to pass mapbox-gl validation
      // All requests will be intercepted and routed through /api/mapbox/* which adds the real token server-side
      accessToken: 'pk.proxy_placeholder_token_will_be_replaced_by_server',
      // Transform all Mapbox requests to go through our proxy
      transformRequest: (url: string, resourceType?: string) => {
        // Only transform Mapbox API requests
        if (url.includes('api.mapbox.com') || url.includes('events.mapbox.com')) {
          try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            const pathname = urlObj.pathname;
            
            // Determine the base path based on domain
            let basePath = '';
            if (hostname.includes('events.mapbox.com')) {
              basePath = 'events';
            } else if (hostname.includes('api.mapbox.com')) {
              basePath = 'api';
            }
            
            // Extract the path after the domain
            let path = pathname.startsWith('/') ? pathname.slice(1) : pathname;
            
            // Build the full path
            let fullPath: string;
            if (hostname.includes('events.mapbox.com')) {
              // Events domain: path is already "events/v2", use as-is
              fullPath = path;
            } else if (hostname.includes('api.mapbox.com')) {
              // API domain: add "api/" prefix if not already present
              if (path.startsWith('api/')) {
                fullPath = path;
              } else {
                fullPath = `api/${path}`;
              }
            } else {
              fullPath = path;
            }
            
            // Remove access_token from query params
            urlObj.searchParams.delete('access_token');
            const queryString = urlObj.searchParams.toString();
            
            // Return the proxied URL as an absolute URL (required by Request constructor)
            const proxyPath = `/api/mapbox/${fullPath}${queryString ? `?${queryString}` : ''}`;
            const proxyUrl = typeof window !== 'undefined' 
              ? `${window.location.origin}${proxyPath}`
              : proxyPath;
            return {
              url: proxyUrl,
            };
          } catch (e) {
            console.error('Error transforming Mapbox URL:', e, url);
            // If transformation fails, return original URL
            return { url };
          }
        }
        
        // For non-Mapbox URLs, return as-is
        return { url };
      },
    });

    map.current.on('load', () => {
      setIsMapLoaded(true);
    });

    // Track pointer events to detect dragging
    const handlePointerDown = () => {
      isDragging.current = true;
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      // Update state immediately when drag ends
      if (map.current && onViewStateChange && !isProgrammaticUpdate.current) {
        const center = map.current.getCenter();
        const zoom = map.current.getZoom();
        onViewStateChange({
          longitude: center.lng,
          latitude: center.lat,
          zoom,
        });
      }
    };

    // Store handlers in ref for cleanup
    pointerHandlersRef.current = {
      handlePointerDown,
      handlePointerUp,
    };

    // Add pointer event listeners to the map container
    const container = mapContainer.current;
    if (container) {
      container.addEventListener('pointerdown', handlePointerDown);
      container.addEventListener('pointerup', handlePointerUp);
      container.addEventListener('pointercancel', handlePointerUp);
    }

    // Debounce move events to avoid interrupting drag
    map.current.on('move', () => {
      // Only call onViewStateChange if this is a user-initiated move, not programmatic
      // And only if not currently dragging (to allow continuous drag)
      if (map.current && onViewStateChange && !isProgrammaticUpdate.current && !isDragging.current) {
        // Clear any pending timeout
        if (moveTimeoutRef.current) {
          clearTimeout(moveTimeoutRef.current);
        }
        
        // Debounce the state update
        moveTimeoutRef.current = setTimeout(() => {
          if (map.current && !isDragging.current) {
            const center = map.current.getCenter();
            const zoom = map.current.getZoom();
            onViewStateChange({
              longitude: center.lng,
              latitude: center.lat,
              zoom,
            });
          }
        }, 100);
      }
    });

    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
      // Remove pointer event listeners
      const container = mapContainer.current;
      const handlers = pointerHandlersRef.current;
      if (container && handlers) {
        container.removeEventListener('pointerdown', handlers.handlePointerDown);
        container.removeEventListener('pointerup', handlers.handlePointerUp);
        container.removeEventListener('pointercancel', handlers.handlePointerUp);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map center when initialViewState changes
  useEffect(() => {
    if (map.current && initialViewState) {
      isProgrammaticUpdate.current = true;
      map.current.setCenter([
        initialViewState.longitude,
        initialViewState.latitude,
      ]);
      map.current.setZoom(initialViewState.zoom);
      // Reset flag after a short delay to allow move event to fire
      setTimeout(() => {
        isProgrammaticUpdate.current = false;
      }, 100);
    }
  }, [initialViewState]);

  // Pan to highlighted pin
  useEffect(() => {
    if (highlightedPinId && map.current) {
      const pin = pins.find((p) => p.id === highlightedPinId);
      if (pin) {
        isProgrammaticUpdate.current = true;
        map.current.flyTo({
          center: [pin.lng, pin.lat],
          zoom: 12,
          duration: 1000,
        });
        // Reset flag after animation completes
        setTimeout(() => {
          isProgrammaticUpdate.current = false;
        }, 1100);
      }
    }
  }, [highlightedPinId, pins]);

  // Update markers when pins change
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    pins.forEach((pin) => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer';
      
      const isHighlighted = highlightedPinId === pin.id;
      
      el.innerHTML = `
        <div class="relative transition-transform hover:scale-110 ${
          isHighlighted ? 'scale-125 z-10' : ''
        }">
          <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
            isHighlighted ? 'bg-blue-600' : 'bg-blue-500'
          }">
            ${
              pin.thumbnail_url
                ? `<img src="${pin.thumbnail_url}" alt="${pin.title || 'Pin'}" class="w-full h-full rounded-full object-cover" />`
                : ''
            }
          </div>
        </div>
      `;

      el.addEventListener('click', () => onPinClick(pin.id));

      const marker = new mapboxgl.Marker(el)
        .setLngLat([pin.lng, pin.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [pins, highlightedPinId, isMapLoaded, onPinClick]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Remove existing user location marker
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
      userLocationMarkerRef.current = null;
    }

    // Add user location marker if location is available
    if (userLocation) {
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.innerHTML = `
        <div class="relative">
          <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg"></div>
          <div class="absolute inset-0 w-4 h-4 rounded-full bg-blue-600 opacity-30 animate-ping"></div>
        </div>
      `;

      userLocationMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map.current);
    }

    return () => {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
    };
  }, [userLocation, isMapLoaded]);

  // Update polyline when polylinePoints change
  useEffect(() => {
    if (!map.current || !isMapLoaded || !polylinePoints || polylinePoints.length < 2) {
      // Remove polyline if it exists
      if (map.current?.getSource('polyline')) {
        if (map.current.getLayer('polyline-layer')) {
          map.current.removeLayer('polyline-layer');
        }
        map.current.removeSource('polyline');
      }
      return;
    }

    const source = map.current.getSource('polyline') as mapboxgl.GeoJSONSource;

    if (source) {
      // Update existing source
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: polylinePoints,
        },
      });
    } else {
      // Create new source and layer
      map.current.addSource('polyline', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: polylinePoints,
          },
        },
      });

      map.current.addLayer({
        id: 'polyline-layer',
        type: 'line',
        source: 'polyline',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2],
        },
      });
    }
  }, [polylinePoints, isMapLoaded]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}
