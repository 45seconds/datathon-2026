'use client';

import { useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import type { FeatureCollection, Geometry, Position } from 'geojson';

interface CountryProperties {
  name: string;
  'ISO3166-1-Alpha-3': string;
  [key: string]: unknown;
}

type GeoJSONData = FeatureCollection<Geometry, CountryProperties>;

interface MapZoomControllerProps {
  zoomToCountry: string | null;
  geoData: GeoJSONData | null;
}

// Pre-calculate country centers from coordinates (faster than creating GeoJSON layers)
function calculateCenter(geometry: Geometry): [number, number] | null {
  try {
    const coords: Position[] = [];
    
    const extractCoords = (c: unknown): void => {
      if (!Array.isArray(c)) return;
      if (c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
        coords.push(c as Position);
      } else {
        c.forEach(extractCoords);
      }
    };
    
    if ('coordinates' in geometry) {
      extractCoords(geometry.coordinates);
    }
    
    if (coords.length === 0) return null;
    
    // Calculate centroid
    let sumLat = 0, sumLng = 0;
    coords.forEach(([lng, lat]) => {
      sumLng += lng;
      sumLat += lat;
    });
    
    return [sumLat / coords.length, sumLng / coords.length];
  } catch {
    return null;
  }
}

export function MapZoomController({ zoomToCountry, geoData }: MapZoomControllerProps) {
  const map = useMap();

  // Pre-calculate centers for all countries (only recalculate when geoData changes)
  const countryCenters = useMemo(() => {
    if (!geoData) return new Map<string, [number, number]>();
    
    const centers = new Map<string, [number, number]>();
    
    // Only process original features (skip world copies with shifted coordinates)
    geoData.features.forEach((f) => {
      const iso3 = f.properties['ISO3166-1-Alpha-3'];
      if (!iso3 || centers.has(iso3)) return; // Skip duplicates
      
      if (f.geometry) {
        const center = calculateCenter(f.geometry);
        if (center) {
          centers.set(iso3, center);
        }
      }
    });
    
    return centers;
  }, [geoData]);

  useEffect(() => {
    if (!zoomToCountry) return;

    const center = countryCenters.get(zoomToCountry);
    
    if (center) {
      const UNIVERSAL_ZOOM_LEVEL = 5;
      // Smooth animation with easing
      map.flyTo(center, UNIVERSAL_ZOOM_LEVEL, { 
        duration: 1.2,
        easeLinearity: 0.2  // Lower = more curved easing (smoother start/end)
      });
    }
  }, [zoomToCountry, countryCenters, map]);

  return null;
}
