'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { FeatureCollection, Geometry } from 'geojson';
import L from 'leaflet';

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

export function MapZoomController({ zoomToCountry, geoData }: MapZoomControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!zoomToCountry || !geoData) return;

    // Find the country feature
    const feature = geoData.features.find(
      (f) => f.properties['ISO3166-1-Alpha-3'] === zoomToCountry
    );

    if (feature && feature.geometry) {
      try {
        const geoJsonLayer = L.geoJSON(feature);
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          const center = bounds.getCenter();
          const UNIVERSAL_ZOOM_LEVEL = 5;
          // Slow, constant speed animation
          map.flyTo(center, UNIVERSAL_ZOOM_LEVEL, { 
            duration: 3.5,
            easeLinearity: 1.0  // 1.0 = linear/constant speed
          });
        }
      } catch (error) {
        console.error('Error zooming to country:', error);
      }
    }
  }, [zoomToCountry, geoData, map]);

  return null;
}
