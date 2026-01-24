// Capital cities and major cities for countries in humanitarian crisis data
// Sources: Various public datasets

export interface City {
  name: string;
  iso3: string;
  lat: number;
  lng: number;
  type: 'capital' | 'major';
  population?: number;
}

export const CITIES: City[] = [
  // Afghanistan
  { name: 'Kabul', iso3: 'AFG', lat: 34.5553, lng: 69.2075, type: 'capital', population: 4600000 },
  { name: 'Kandahar', iso3: 'AFG', lat: 31.6257, lng: 65.7101, type: 'major', population: 614000 },
  { name: 'Herat', iso3: 'AFG', lat: 34.3529, lng: 62.2040, type: 'major', population: 556000 },
  
  // Burkina Faso
  { name: 'Ouagadougou', iso3: 'BFA', lat: 12.3714, lng: -1.5197, type: 'capital', population: 2865000 },
  { name: 'Bobo-Dioulasso', iso3: 'BFA', lat: 11.1771, lng: -4.2979, type: 'major', population: 903000 },
  
  // Central African Republic
  { name: 'Bangui', iso3: 'CAF', lat: 4.3947, lng: 18.5582, type: 'capital', population: 889000 },
  
  // Cameroon
  { name: 'Yaoundé', iso3: 'CMR', lat: 3.8480, lng: 11.5021, type: 'capital', population: 4100000 },
  { name: 'Douala', iso3: 'CMR', lat: 4.0511, lng: 9.7679, type: 'major', population: 3700000 },
  
  // DR Congo
  { name: 'Kinshasa', iso3: 'COD', lat: -4.4419, lng: 15.2663, type: 'capital', population: 17000000 },
  { name: 'Lubumbashi', iso3: 'COD', lat: -11.6647, lng: 27.4794, type: 'major', population: 2000000 },
  { name: 'Goma', iso3: 'COD', lat: -1.6771, lng: 29.2285, type: 'major', population: 670000 },
  
  // Colombia
  { name: 'Bogotá', iso3: 'COL', lat: 4.7110, lng: -74.0721, type: 'capital', population: 7900000 },
  { name: 'Medellín', iso3: 'COL', lat: 6.2476, lng: -75.5658, type: 'major', population: 2500000 },
  
  // Ethiopia
  { name: 'Addis Ababa', iso3: 'ETH', lat: 9.0320, lng: 38.7469, type: 'capital', population: 5200000 },
  { name: 'Dire Dawa', iso3: 'ETH', lat: 9.5931, lng: 41.8661, type: 'major', population: 440000 },
  
  // Haiti
  { name: 'Port-au-Prince', iso3: 'HTI', lat: 18.5944, lng: -72.3074, type: 'capital', population: 2800000 },
  { name: 'Cap-Haïtien', iso3: 'HTI', lat: 19.7577, lng: -72.2039, type: 'major', population: 274000 },
  
  // Iraq
  { name: 'Baghdad', iso3: 'IRQ', lat: 33.3152, lng: 44.3661, type: 'capital', population: 7500000 },
  { name: 'Basra', iso3: 'IRQ', lat: 30.5085, lng: 47.7804, type: 'major', population: 2100000 },
  { name: 'Mosul', iso3: 'IRQ', lat: 36.3350, lng: 43.1189, type: 'major', population: 1800000 },
  
  // Kenya
  { name: 'Nairobi', iso3: 'KEN', lat: -1.2921, lng: 36.8219, type: 'capital', population: 4400000 },
  { name: 'Mombasa', iso3: 'KEN', lat: -4.0435, lng: 39.6682, type: 'major', population: 1200000 },
  
  // Libya
  { name: 'Tripoli', iso3: 'LBY', lat: 32.8872, lng: 13.1913, type: 'capital', population: 1100000 },
  { name: 'Benghazi', iso3: 'LBY', lat: 32.1194, lng: 20.0868, type: 'major', population: 632000 },
  
  // Mali
  { name: 'Bamako', iso3: 'MLI', lat: 12.6392, lng: -8.0029, type: 'capital', population: 2700000 },
  { name: 'Sikasso', iso3: 'MLI', lat: 11.3175, lng: -5.6664, type: 'major', population: 226000 },
  
  // Myanmar
  { name: 'Naypyidaw', iso3: 'MMR', lat: 19.7633, lng: 96.0785, type: 'capital', population: 1160000 },
  { name: 'Yangon', iso3: 'MMR', lat: 16.8661, lng: 96.1951, type: 'major', population: 5400000 },
  { name: 'Mandalay', iso3: 'MMR', lat: 21.9588, lng: 96.0891, type: 'major', population: 1200000 },
  
  // Mozambique
  { name: 'Maputo', iso3: 'MOZ', lat: -25.9692, lng: 32.5732, type: 'capital', population: 1100000 },
  { name: 'Beira', iso3: 'MOZ', lat: -19.8436, lng: 34.8389, type: 'major', population: 533000 },
  
  // Niger
  { name: 'Niamey', iso3: 'NER', lat: 13.5137, lng: 2.1098, type: 'capital', population: 1300000 },
  { name: 'Zinder', iso3: 'NER', lat: 13.8053, lng: 8.9880, type: 'major', population: 322000 },
  
  // Nigeria
  { name: 'Abuja', iso3: 'NGA', lat: 9.0579, lng: 7.4951, type: 'capital', population: 3600000 },
  { name: 'Lagos', iso3: 'NGA', lat: 6.5244, lng: 3.3792, type: 'major', population: 15400000 },
  { name: 'Kano', iso3: 'NGA', lat: 12.0022, lng: 8.5920, type: 'major', population: 4100000 },
  { name: 'Maiduguri', iso3: 'NGA', lat: 11.8311, lng: 13.1510, type: 'major', population: 800000 },
  
  // Pakistan
  { name: 'Islamabad', iso3: 'PAK', lat: 33.6844, lng: 73.0479, type: 'capital', population: 1100000 },
  { name: 'Karachi', iso3: 'PAK', lat: 24.8607, lng: 67.0011, type: 'major', population: 16100000 },
  { name: 'Lahore', iso3: 'PAK', lat: 31.5204, lng: 74.3587, type: 'major', population: 13000000 },
  
  // Palestine
  { name: 'Ramallah', iso3: 'PSE', lat: 31.9038, lng: 35.2034, type: 'capital', population: 38000 },
  { name: 'Gaza City', iso3: 'PSE', lat: 31.5017, lng: 34.4668, type: 'major', population: 590000 },
  
  // Sudan
  { name: 'Khartoum', iso3: 'SDN', lat: 15.5007, lng: 32.5599, type: 'capital', population: 5800000 },
  { name: 'Omdurman', iso3: 'SDN', lat: 15.6445, lng: 32.4777, type: 'major', population: 2400000 },
  { name: 'Port Sudan', iso3: 'SDN', lat: 19.6158, lng: 37.2164, type: 'major', population: 490000 },
  
  // Somalia
  { name: 'Mogadishu', iso3: 'SOM', lat: 2.0469, lng: 45.3182, type: 'capital', population: 2600000 },
  { name: 'Hargeisa', iso3: 'SOM', lat: 9.5600, lng: 44.0650, type: 'major', population: 760000 },
  
  // South Sudan
  { name: 'Juba', iso3: 'SSD', lat: 4.8594, lng: 31.5713, type: 'capital', population: 525000 },
  { name: 'Wau', iso3: 'SSD', lat: 7.7028, lng: 27.9878, type: 'major', population: 151000 },
  
  // Syria
  { name: 'Damascus', iso3: 'SYR', lat: 33.5138, lng: 36.2765, type: 'capital', population: 2500000 },
  { name: 'Aleppo', iso3: 'SYR', lat: 36.2021, lng: 37.1343, type: 'major', population: 2100000 },
  { name: 'Homs', iso3: 'SYR', lat: 34.7324, lng: 36.7137, type: 'major', population: 775000 },
  
  // Chad
  { name: "N'Djamena", iso3: 'TCD', lat: 12.1348, lng: 15.0557, type: 'capital', population: 1600000 },
  { name: 'Moundou', iso3: 'TCD', lat: 8.5667, lng: 16.0833, type: 'major', population: 152000 },
  
  // Ukraine
  { name: 'Kyiv', iso3: 'UKR', lat: 50.4501, lng: 30.5234, type: 'capital', population: 2900000 },
  { name: 'Kharkiv', iso3: 'UKR', lat: 49.9935, lng: 36.2304, type: 'major', population: 1400000 },
  { name: 'Odesa', iso3: 'UKR', lat: 46.4825, lng: 30.7233, type: 'major', population: 1000000 },
  { name: 'Dnipro', iso3: 'UKR', lat: 48.4647, lng: 35.0462, type: 'major', population: 980000 },
  
  // Venezuela
  { name: 'Caracas', iso3: 'VEN', lat: 10.4806, lng: -66.9036, type: 'capital', population: 2900000 },
  { name: 'Maracaibo', iso3: 'VEN', lat: 10.6544, lng: -71.6371, type: 'major', population: 2700000 },
  
  // Yemen
  { name: "Sana'a", iso3: 'YEM', lat: 15.3694, lng: 44.1910, type: 'capital', population: 3900000 },
  { name: 'Aden', iso3: 'YEM', lat: 12.7855, lng: 45.0187, type: 'major', population: 800000 },
  { name: 'Taiz', iso3: 'YEM', lat: 13.5789, lng: 44.0219, type: 'major', population: 615000 },
  
  // Zimbabwe
  { name: 'Harare', iso3: 'ZWE', lat: -17.8252, lng: 31.0335, type: 'capital', population: 1500000 },
  { name: 'Bulawayo', iso3: 'ZWE', lat: -20.1325, lng: 28.5851, type: 'major', population: 699000 },
];

export function getCitiesByCountry(iso3: string): City[] {
  return CITIES.filter(city => city.iso3 === iso3);
}

export function getCitiesForCountries(iso3Codes: string[]): City[] {
  return CITIES.filter(city => iso3Codes.includes(city.iso3));
}
