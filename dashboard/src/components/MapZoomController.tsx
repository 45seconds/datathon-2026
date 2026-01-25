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
          // Get the center of the country and fly to it with a fixed zoom level
          const center = bounds.getCenter();
          const UNIVERSAL_ZOOM_LEVEL = 5; // Consistent zoom for all countries
          map.flyTo(center, UNIVERSAL_ZOOM_LEVEL, { duration: 1.5 });
        }
      } catch (error) {
        console.error('Error zooming to country:', error);
      }
    }
  }, [zoomToCountry, geoData, map]);

  return null;
}
