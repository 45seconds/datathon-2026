'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { CountryCrisisMetrics } from '@/types';
import { getCitiesForCountries, City } from '@/lib/cities';
import { getCountryFlag } from '@/lib/flags';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Layer, PathOptions } from 'leaflet';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then((mod) => mod.Tooltip),
  { ssr: false }
);
const MapZoomController = dynamic(
  () => import('./MapZoomController').then((mod) => ({ default: mod.MapZoomController })),
  { ssr: false }
);

type UNLanguage = 'en' | 'fr' | 'es' | 'ru' | 'ar' | 'zh';

const MAP_I18N: Record<
  UNLanguage,
  {
    population: string;
    inNeed: string;
    needRate: string;
    coverage: string;
    usdPerPerson: string;
    viewFullDetails: string;
    legendNeedRate: string;
    legendCoverage: string;
    legendUsdPerPerson: string;
    legendMismatch: string;
    low: string;
    high: string;
    capital: string;
    majorCity: string;
    loadingMap: string;
  }
> = {
  en: {
    population: 'Population',
    inNeed: 'In Need',
    needRate: 'Need Rate',
    coverage: 'Coverage',
    usdPerPerson: 'USD/Person',
    viewFullDetails: 'View Full Details',
    legendNeedRate: 'Need Rate (% of population)',
    legendCoverage: 'Coverage Rate (targeted / need)',
    legendUsdPerPerson: 'USD per Person in Need',
    legendMismatch: 'Mismatch Score',
    low: 'Low',
    high: 'High',
    capital: 'Capital',
    majorCity: 'Major city',
    loadingMap: 'Loading map...',
  },
  fr: {
    population: 'Population',
    inNeed: 'Dans le besoin',
    needRate: 'Taux de besoin',
    coverage: 'Couverture',
    usdPerPerson: 'USD/personne',
    viewFullDetails: 'Voir les détails',
    legendNeedRate: 'Taux de besoin (% de la population)',
    legendCoverage: 'Taux de couverture (ciblés / besoin)',
    legendUsdPerPerson: 'USD par personne dans le besoin',
    legendMismatch: "Score d'écart",
    low: 'Faible',
    high: 'Élevé',
    capital: 'Capitale',
    majorCity: 'Grande ville',
    loadingMap: 'Chargement de la carte...',
  },
  es: {
    population: 'Población',
    inNeed: 'En necesidad',
    needRate: 'Tasa de necesidad',
    coverage: 'Cobertura',
    usdPerPerson: 'USD/persona',
    viewFullDetails: 'Ver detalles',
    legendNeedRate: 'Tasa de necesidad (% de la población)',
    legendCoverage: 'Tasa de cobertura (objetivo / necesidad)',
    legendUsdPerPerson: 'USD por persona en necesidad',
    legendMismatch: 'Puntuación de desajuste',
    low: 'Bajo',
    high: 'Alto',
    capital: 'Capital',
    majorCity: 'Ciudad principal',
    loadingMap: 'Cargando mapa...',
  },
  ru: {
    population: 'Население',
    inNeed: 'Нуждающиеся',
    needRate: 'Уровень нуждаемости',
    coverage: 'Охват',
    usdPerPerson: 'USD/чел.',
    viewFullDetails: 'Подробнее',
    legendNeedRate: 'Уровень нуждаемости (% населения)',
    legendCoverage: 'Охват (целевые / нуждающиеся)',
    legendUsdPerPerson: 'USD на человека в нужде',
    legendMismatch: 'Показатель несоответствия',
    low: 'Низкий',
    high: 'Высокий',
    capital: 'Столица',
    majorCity: 'Крупный город',
    loadingMap: 'Загрузка карты...',
  },
  ar: {
    population: 'السكان',
    inNeed: 'المحتاجون',
    needRate: 'معدل الاحتياج',
    coverage: 'التغطية',
    usdPerPerson: 'دولار/فرد',
    viewFullDetails: 'عرض التفاصيل',
    legendNeedRate: 'معدل الاحتياج (% من السكان)',
    legendCoverage: 'معدل التغطية (المستهدفون / المحتاجون)',
    legendUsdPerPerson: 'دولار لكل شخص محتاج',
    legendMismatch: 'مؤشر عدم التطابق',
    low: 'منخفض',
    high: 'مرتفع',
    capital: 'العاصمة',
    majorCity: 'مدينة رئيسية',
    loadingMap: 'جارٍ تحميل الخريطة...',
  },
  zh: {
    population: '人口',
    inNeed: '需要援助',
    needRate: '需求率',
    coverage: '覆盖率',
    usdPerPerson: '美元/人',
    viewFullDetails: '查看详情',
    legendNeedRate: '需求率（占人口百分比）',
    legendCoverage: '覆盖率（目标/需求）',
    legendUsdPerPerson: '每位需求者的美元',
    legendMismatch: '不匹配得分',
    low: '低',
    high: '高',
    capital: '首都',
    majorCity: '主要城市',
    loadingMap: '正在加载地图...',
  },
};

interface CrisisMapProps {
  data: CountryCrisisMetrics[];
  colorBy: 'needRate' | 'coverageRate' | 'usdPerPersonInNeed' | 'mismatch';
  showCities: boolean;
  year: number;
  onCountrySelect?: (iso3: string) => void;
  onCountryClick?: (iso3: string) => void;
  zoomToCountry?: string | null;
  language?: UNLanguage;
}

interface CountryProperties {
  name: string;
  'ISO3166-1-Alpha-3': string;
  'ISO3166-1-Alpha-2': string;
  [key: string]: unknown;
}

type CountryFeature = Feature<Geometry, CountryProperties>;
type GeoJSONData = FeatureCollection<Geometry, CountryProperties>;

function shiftCoords(coords: unknown, deltaLng: number): unknown {
  if (!Array.isArray(coords)) return coords;
  // Coordinate pair: [lng, lat]
  if (coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    return [coords[0] + deltaLng, coords[1]];
  }
  return coords.map((c) => shiftCoords(c, deltaLng));
}

function withWorldCopies(geo: GeoJSONData): GeoJSONData {
  const shifts = [360, -360];
  const copies = shifts.flatMap((delta) =>
    geo.features.map((f) => {
      if (!f.geometry) return f;
      return {
        ...f,
        geometry: {
          ...f.geometry,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          coordinates: shiftCoords((f.geometry as any).coordinates, delta) as any,
        },
      };
    })
  );

  return {
    ...geo,
    features: [...geo.features, ...copies],
  };
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function getFlagFromISO2(iso2: string | undefined): string {
  if (!iso2 || iso2.length !== 2) return '';
  const codePoints = iso2
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

function getColor(value: number, metric: string): string {
  if (metric === 'needRate') {
    if (value > 0.6) return '#7f1d1d';
    if (value > 0.5) return '#991b1b';
    if (value > 0.4) return '#b91c1c';
    if (value > 0.3) return '#dc2626';
    if (value > 0.2) return '#ef4444';
    if (value > 0.1) return '#f87171';
    return '#fca5a5';
  }
  if (metric === 'coverageRate') {
    if (value > 0.9) return '#14532d';
    if (value > 0.8) return '#166534';
    if (value > 0.7) return '#15803d';
    if (value > 0.6) return '#16a34a';
    if (value > 0.5) return '#22c55e';
    if (value > 0.4) return '#4ade80';
    return '#86efac';
  }
  if (metric === 'usdPerPersonInNeed') {
    if (value > 200) return '#1e3a8a';
    if (value > 150) return '#1e40af';
    if (value > 100) return '#1d4ed8';
    if (value > 75) return '#2563eb';
    if (value > 50) return '#3b82f6';
    if (value > 25) return '#60a5fa';
    return '#93c5fd';
  }
  if (value > 0.3) return '#9a3412';
  if (value > 0.2) return '#c2410c';
  if (value > 0.1) return '#ea580c';
  if (value > 0) return '#f97316';
  if (value > -0.1) return '#a855f7';
  if (value > -0.2) return '#9333ea';
  return '#7c3aed';
}

export function CrisisMap({
  data,
  colorBy,
  showCities,
  year,
  onCountrySelect,
  onCountryClick,
  zoomToCountry,
  language = 'en',
}: CrisisMapProps) {
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const t = MAP_I18N[language] || MAP_I18N.en;

  useEffect(() => {
    fetch('/geo/countries.geojson')
      .then((res) => res.json())
      .then((data) => setGeoData(withWorldCopies(data)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setMapReady(true);
  }, []);

  const dataByIso3 = useMemo(() => {
    const map = new Map<string, CountryCrisisMetrics>();
    data.forEach((d) => map.set(d.iso3, d));
    return map;
  }, [data]);

  const cities = useMemo(() => {
    const iso3Codes = data.map((d) => d.iso3);
    return getCitiesForCountries(iso3Codes);
  }, [data]);

  const style = (feature: CountryFeature | undefined): PathOptions => {
    if (!feature) {
      return { fillColor: '#e4e4e7', weight: 0.5, opacity: 1, color: '#a1a1aa', fillOpacity: 0.3 };
    }

    const iso3 = feature.properties['ISO3166-1-Alpha-3'];
    const countryData = dataByIso3.get(iso3);

    if (!countryData) {
      return { fillColor: '#e4e4e7', weight: 0.5, opacity: 1, color: '#d4d4d8', fillOpacity: 0.2 };
    }

    const value = countryData[colorBy] ?? 0;
    return { fillColor: getColor(value, colorBy), weight: 1, opacity: 1, color: '#71717a', fillOpacity: 0.75 };
  };

  const onEachFeature = (feature: CountryFeature, layer: Layer) => {
    const iso3 = feature.properties['ISO3166-1-Alpha-3'];
    const iso2 = feature.properties['ISO3166-1-Alpha-2'];
    const countryData = dataByIso3.get(iso3);

    if (countryData) {
      const flag = getFlagFromISO2(iso2) || getCountryFlag(iso3);
      // Keep original (English) country names from our GeoJSON
      const countryName = feature.properties.name || countryData.country;

      layer.bindPopup(`
        <div style="min-width: 240px; font-family: system-ui, -apple-system, sans-serif;">
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">
            ${flag} ${countryName}
          </div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 16px;">${iso3} · ${year}</div>
          <div style="display: grid; gap: 8px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #71717a;">${t.population}</span>
              <span style="font-weight: 600;">${formatNumber(countryData.population)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #71717a;">${t.inNeed}</span>
              <span style="font-weight: 600;">${formatNumber(countryData.inNeed)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #71717a;">${t.needRate}</span>
              <span style="font-weight: 600; color: #dc2626;">${(countryData.needRate * 100).toFixed(1)}%</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #71717a;">${t.coverage}</span>
              <span style="font-weight: 600; color: #16a34a;">${(countryData.coverageRate * 100).toFixed(1)}%</span>
            </div>
            ${countryData.usdPerPersonInNeed > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #71717a;">${t.usdPerPerson}</span>
              <span style="font-weight: 600;">$${countryData.usdPerPersonInNeed.toFixed(0)}</span>
            </div>
            ` : ''}
          </div>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('selectCountry', {detail: '${iso3}'}))"
            style="margin-top: 16px; width: 100%; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;"
          >
            ${t.viewFullDetails}
          </button>
        </div>
      `);
      
      // Trigger zoom when country is clicked
      layer.on('click', () => {
        if (onCountryClick) {
          onCountryClick(iso3);
        }
      });
    }
  };

  if (!mapReady) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <span className="text-sm text-zinc-400">{t.loadingMap}</span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[20, 0]}
        zoom={2.5}
        minZoom={2}
        maxZoom={8}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        worldCopyJump={true}
        className="z-0"
      >
        <MapZoomController zoomToCountry={zoomToCountry || null} geoData={geoData} />
        {/* English labels base map from CartoDB */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        {geoData && (
          <GeoJSON
            key={`${colorBy}-${year}-${language}`}
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
        {showCities &&
          cities.map((city: City) => (
            <CircleMarker
              key={`${city.iso3}-${city.name}`}
              center={[city.lat, city.lng]}
              radius={city.type === 'capital' ? 7 : 5}
              pathOptions={{
                fillColor: city.type === 'capital' ? '#f59e0b' : '#3b82f6',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <span className="text-sm font-medium">
                  {city.name}
                  {city.type === 'capital' && ` (${t.capital})`}
                  {city.population && ` · ${formatNumber(city.population)}`}
                </span>
              </Tooltip>
            </CircleMarker>
          ))}
        {/* Basemap labels overlay (few labels at low zoom, more as you zoom in) */}
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png" />
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-[1000] rounded-lg bg-white p-4 shadow-lg dark:bg-zinc-900">
        <div className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {colorBy === 'needRate' && t.legendNeedRate}
          {colorBy === 'coverageRate' && t.legendCoverage}
          {colorBy === 'usdPerPersonInNeed' && t.legendUsdPerPerson}
          {colorBy === 'mismatch' && t.legendMismatch}
        </div>
        <div className="flex">
          {colorBy === 'needRate' && (
            <>
              <div className="h-4 w-8 rounded-l" style={{ background: '#fca5a5' }} />
              <div className="h-4 w-8" style={{ background: '#f87171' }} />
              <div className="h-4 w-8" style={{ background: '#ef4444' }} />
              <div className="h-4 w-8" style={{ background: '#dc2626' }} />
              <div className="h-4 w-8" style={{ background: '#b91c1c' }} />
              <div className="h-4 w-8 rounded-r" style={{ background: '#7f1d1d' }} />
            </>
          )}
          {colorBy === 'coverageRate' && (
            <>
              <div className="h-4 w-8 rounded-l" style={{ background: '#86efac' }} />
              <div className="h-4 w-8" style={{ background: '#4ade80' }} />
              <div className="h-4 w-8" style={{ background: '#22c55e' }} />
              <div className="h-4 w-8" style={{ background: '#16a34a' }} />
              <div className="h-4 w-8" style={{ background: '#15803d' }} />
              <div className="h-4 w-8 rounded-r" style={{ background: '#14532d' }} />
            </>
          )}
          {colorBy === 'usdPerPersonInNeed' && (
            <>
              <div className="h-4 w-8 rounded-l" style={{ background: '#93c5fd' }} />
              <div className="h-4 w-8" style={{ background: '#60a5fa' }} />
              <div className="h-4 w-8" style={{ background: '#3b82f6' }} />
              <div className="h-4 w-8" style={{ background: '#2563eb' }} />
              <div className="h-4 w-8" style={{ background: '#1d4ed8' }} />
              <div className="h-4 w-8 rounded-r" style={{ background: '#1e3a8a' }} />
            </>
          )}
          {colorBy === 'mismatch' && (
            <>
              <div className="h-4 w-8 rounded-l" style={{ background: '#7c3aed' }} />
              <div className="h-4 w-8" style={{ background: '#a855f7' }} />
              <div className="h-4 w-8" style={{ background: '#f97316' }} />
              <div className="h-4 w-8" style={{ background: '#ea580c' }} />
              <div className="h-4 w-8" style={{ background: '#c2410c' }} />
              <div className="h-4 w-8 rounded-r" style={{ background: '#9a3412' }} />
            </>
          )}
        </div>
        <div className="mt-1 flex justify-between text-xs text-zinc-500">
          <span>{t.low}</span>
          <span>{t.high}</span>
        </div>
        {showCities && (
          <div className="mt-4 flex items-center gap-4 border-t border-zinc-200 pt-3 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-xs text-zinc-500">{t.capital}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-xs text-zinc-500">{t.majorCity}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
