import type { PinWithMedia } from '@/types';

export interface RecapStats {
  placesVisited: number;
  daysTraveled: number;
  countriesExplored: number;
  continentsVisited: number;
  mediaUploaded: number;
  kilometersTraveled: number;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extract country from pin title or use reverse geocoding fallback
 * For now, we'll use a simple heuristic based on common patterns
 */
function extractCountry(pin: PinWithMedia): string | null {
  // Try to extract from title if it contains a comma (e.g., "Paris, France")
  if (pin.title) {
    const parts = pin.title.split(',').map((p) => p.trim());
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
  }
  // Could add reverse geocoding here, but for now return null
  return null;
}

/**
 * Determine continent from coordinates
 * Uses approximate boundaries for each continent
 */
function getContinentFromCoordinates(lat: number, lng: number): string {
  // North America
  if (lat >= 7.0 && lat <= 83.0 && lng >= -180.0 && lng <= -52.0) {
    return 'North America';
  }
  // South America
  if (lat >= -56.0 && lat <= 12.0 && lng >= -82.0 && lng <= -34.0) {
    return 'South America';
  }
  // Europe
  if (lat >= 35.0 && lat <= 71.0 && lng >= -10.0 && lng <= 40.0) {
    return 'Europe';
  }
  // Africa
  if (lat >= -35.0 && lat <= 37.0 && lng >= -18.0 && lng <= 52.0) {
    return 'Africa';
  }
  // Asia
  if (lat >= -11.0 && lat <= 81.0 && lng >= 26.0 && lng <= 180.0) {
    return 'Asia';
  }
  // Australia/Oceania
  if (lat >= -47.0 && lat <= -10.0 && lng >= 112.0 && lng <= 180.0) {
    return 'Oceania';
  }
  // Antarctica
  if (lat < -60.0) {
    return 'Antarctica';
  }
  
  // Fallback: try to determine from longitude ranges
  if (lng >= -180.0 && lng <= -34.0) {
    return lat >= 7.0 ? 'North America' : 'South America';
  }
  if (lng >= -10.0 && lng <= 40.0 && lat >= 35.0) {
    return 'Europe';
  }
  if (lng >= 26.0 && lng <= 180.0) {
    return 'Asia';
  }
  
  // Default fallback
  return 'Unknown';
}

/**
 * Calculate recap statistics from pins
 */
export function calculateRecapStats(
  pins: PinWithMedia[],
  year: number
): RecapStats {
  if (pins.length === 0) {
    return {
      placesVisited: 0,
      daysTraveled: 0,
      countriesExplored: 0,
      continentsVisited: 0,
      mediaUploaded: 0,
      kilometersTraveled: 0,
    };
  }

  // Places visited = unique pin locations (using lat/lng rounded to 3 decimals)
  const uniquePlaces = new Set<string>();
  pins.forEach((pin) => {
    const key = `${pin.lat.toFixed(3)},${pin.lng.toFixed(3)}`;
    uniquePlaces.add(key);
  });

  // Days traveled = unique dates (using UTC to avoid timezone issues)
  const uniqueDates = new Set<string>();
  pins.forEach((pin) => {
    if (pin.date_taken) {
      const date = new Date(pin.date_taken);
      // Use UTC to ensure consistent date calculation regardless of timezone
      const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      uniqueDates.add(dateKey);
    }
  });

  // Countries explored = unique countries
  const countries = new Set<string>();
  pins.forEach((pin) => {
    const country = extractCountry(pin);
    if (country) {
      countries.add(country);
    }
  });

  // Continents visited = unique continents (determined from coordinates)
  const continents = new Set<string>();
  pins.forEach((pin) => {
    const continent = getContinentFromCoordinates(pin.lat, pin.lng);
    if (continent && continent !== 'Unknown') {
      continents.add(continent);
    }
  });

  // Media uploaded = total media items
  const mediaCount = pins.reduce((sum, pin) => sum + pin.media.length, 0);

  // Kilometers traveled = sum of distances between consecutive pins
  let totalKm = 0;
  for (let i = 0; i < pins.length - 1; i++) {
    const pin1 = pins[i];
    const pin2 = pins[i + 1];
    const distance = calculateDistance(pin1.lat, pin1.lng, pin2.lat, pin2.lng);
    totalKm += distance;
  }

  return {
    placesVisited: uniquePlaces.size,
    daysTraveled: uniqueDates.size,
    countriesExplored: countries.size || 1, // Default to 1 if we can't determine
    continentsVisited: continents.size || 1, // Default to 1 if we can't determine
    mediaUploaded: mediaCount,
    kilometersTraveled: Math.round(totalKm),
  };
}

