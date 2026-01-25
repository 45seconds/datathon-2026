'use client';

import { useEffect, useRef } from 'react';
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

// Calculate center from geometry coordinates
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
  const countryCentersRef = useRef<Map<string, [number, number]>>(new Map());
  const lastZoomTargetRef = useRef<string | null>(null);
  const isAnimatingRef = useRef(false);

  // Build country centers cache once when geoData loads (using ref to avoid re-renders)
  useEffect(() => {
    if (!geoData) return;
    
    const centers = new Map<string, [number, number]>();
    
    geoData.features.forEach((f) => {
      const iso3 = f.properties['ISO3166-1-Alpha-3'];
      if (!iso3 || centers.has(iso3)) return;
      
      if (f.geometry) {
        const center = calculateCenter(f.geometry);
        if (center) {
          centers.set(iso3, center);
        }
      }
    });
    
    countryCentersRef.current = centers;
  }, [geoData]);

  // Handle zoom - only zoom if target changed and not already animating
  useEffect(() => {
    if (!zoomToCountry || zoomToCountry === lastZoomTargetRef.current) return;
    if (isAnimatingRef.current) return;

    const center = countryCentersRef.current.get(zoomToCountry);
    
    if (center) {
      lastZoomTargetRef.current = zoomToCountry;
      isAnimatingRef.current = true;
      
      const UNIVERSAL_ZOOM_LEVEL = 5;
      
      // Disable map interactions during animation for smoother experience
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      
      map.flyTo(center, UNIVERSAL_ZOOM_LEVEL, { 
        duration: 1.0,
        easeLinearity: 0.25
      });
      
      // Re-enable interactions after animation completes
      setTimeout(() => {
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
        isAnimatingRef.current = false;
      }, 1100);
    }
  }, [zoomToCountry, map]);

  // Also listen for custom events (avoids React re-render cycle entirely)
  useEffect(() => {
    const handleZoomEvent = (e: CustomEvent<string>) => {
      if (isAnimatingRef.current) return;
      
      const iso3 = e.detail;
      const center = countryCentersRef.current.get(iso3);
      
      if (center) {
        isAnimatingRef.current = true;
        
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        
        map.flyTo(center, 5, { 
          duration: 1.0,
          easeLinearity: 0.25
        });
        
        setTimeout(() => {
          map.dragging.enable();
          map.touchZoom.enable();
          map.doubleClickZoom.enable();
          map.scrollWheelZoom.enable();
          isAnimatingRef.current = false;
        }, 1100);
      }
    };

    window.addEventListener('zoomToCountry', handleZoomEvent as EventListener);
    return () => window.removeEventListener('zoomToCountry', handleZoomEvent as EventListener);
  }, [map]);

  return null;
}
