'use client';

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

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [
        initialViewState?.longitude || -122.4194,
        initialViewState?.latitude || 37.7749,
      ],
      zoom: initialViewState?.zoom || 10,
      accessToken: 'pk.proxy_placeholder_token_will_be_replaced_by_server',
      transformRequest: (url: string, resourceType?: string) => {
        if (url.includes('api.mapbox.com') || url.includes('events.mapbox.com')) {
          try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            const pathname = urlObj.pathname;
            
            let basePath = '';
            if (hostname.includes('events.mapbox.com')) {
              basePath = 'events';
            } else if (hostname.includes('api.mapbox.com')) {
              basePath = 'api';
            }
            
            let path = pathname.startsWith('/') ? pathname.slice(1) : pathname;
            
            let fullPath: string;
            if (hostname.includes('events.mapbox.com')) {
              fullPath = path;
            } else if (hostname.includes('api.mapbox.com')) {
              if (path.startsWith('api/')) {
                fullPath = path;
              } else {
                fullPath = `api/${path}`;
              }
            } else {
              fullPath = path;
            }
            
            urlObj.searchParams.delete('access_token');
            const queryString = urlObj.searchParams.toString();
            
            const proxyPath = `/api/mapbox/${fullPath}${queryString ? `?${queryString}` : ''}`;
            const proxyUrl = typeof window !== 'undefined' 
              ? `${window.location.origin}${proxyPath}`
              : proxyPath;
            return {
              url: proxyUrl,
            };
          } catch (e) {
            console.error('Error transforming Mapbox URL:', e, url);
            return { url };
          }
        }
        
        return { url };
      },
    });

    map.current.on('load', () => {
      setIsMapLoaded(true);
    });

    const handlePointerDown = () => {
      isDragging.current = true;
    };

    const handlePointerUp = () => {
      isDragging.current = false;
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

    pointerHandlersRef.current = {
      handlePointerDown,
      handlePointerUp,
    };

    const container = mapContainer.current;
    if (container) {
      container.addEventListener('pointerdown', handlePointerDown);
      container.addEventListener('pointerup', handlePointerUp);
      container.addEventListener('pointercancel', handlePointerUp);
    }

    map.current.on('move', () => {
      if (map.current && onViewStateChange && !isProgrammaticUpdate.current && !isDragging.current) {
        if (moveTimeoutRef.current) {
          clearTimeout(moveTimeoutRef.current);
        }
        
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

  const prevViewStateRef = useRef<{ longitude: number; latitude: number; zoom: number } | null>(null);

  useEffect(() => {
    if (map.current && initialViewState && isMapLoaded) {
      const hasChanged = !prevViewStateRef.current ||
        prevViewStateRef.current.longitude !== initialViewState.longitude ||
        prevViewStateRef.current.latitude !== initialViewState.latitude ||
        prevViewStateRef.current.zoom !== initialViewState.zoom;

      if (hasChanged) {
        isProgrammaticUpdate.current = true;
        map.current.flyTo({
          center: [initialViewState.longitude, initialViewState.latitude],
          zoom: initialViewState.zoom,
          duration: 1000,
        });
        prevViewStateRef.current = {
          longitude: initialViewState.longitude,
          latitude: initialViewState.latitude,
          zoom: initialViewState.zoom,
        };
        setTimeout(() => {
          isProgrammaticUpdate.current = false;
        }, 1100);
      }
    }
  }, [initialViewState, isMapLoaded]);

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
        setTimeout(() => {
          isProgrammaticUpdate.current = false;
        }, 1100);
      }
    }
  }, [highlightedPinId, pins]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const createMarkers = async () => {
      const { getSignedUrl } = await import('@/lib/supabase/storage-urls');
      
      for (const pin of pins) {
        const el = document.createElement('div');
        el.className = 'cursor-pointer';
        el.style.pointerEvents = 'auto';
        el.style.zIndex = '10';
        
        const isHighlighted = highlightedPinId === pin.id;
        
        let thumbnailUrl: string | null = null;
        if (pin.thumbnail_url) {
          if (pin.thumbnail_url.startsWith('http://') || pin.thumbnail_url.startsWith('https://')) {
            thumbnailUrl = pin.thumbnail_url;
          } else {
            thumbnailUrl = await getSignedUrl(pin.thumbnail_url);
          }
        }
        
        el.innerHTML = `
          <div class="relative transition-transform hover:scale-110 ${
            isHighlighted ? 'scale-125 z-10' : ''
          }">
            <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
              isHighlighted ? 'bg-blue-600' : 'bg-blue-500'
            }">
              ${
                thumbnailUrl
                  ? `<img src="${thumbnailUrl}" alt="${pin.title || 'Pin'}" class="w-full h-full rounded-full object-cover" />`
                  : ''
              }
            </div>
          </div>
        `;

        const handleClick = (e: MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
          onPinClick(pin.id);
        };
        
        el.addEventListener('click', handleClick);
        el.addEventListener('mousedown', (e) => e.stopPropagation());

        if (map.current && map.current.getCanvasContainer()) {
          const marker = new mapboxgl.Marker(el)
            .setLngLat([pin.lng, pin.lat])
            .addTo(map.current);

          markersRef.current.push(marker);
        }
      }
    };

    createMarkers();
  }, [pins, highlightedPinId, isMapLoaded, onPinClick]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
      userLocationMarkerRef.current = null;
    }

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

  useEffect(() => {
    if (!map.current || !isMapLoaded || !polylinePoints || polylinePoints.length < 2) {
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
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: polylinePoints,
        },
      });
    } else {
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
