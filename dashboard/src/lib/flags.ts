// ISO3 to ISO2 mapping for flag emojis
const ISO3_TO_ISO2: Record<string, string> = {
  AFG: 'AF',
  BFA: 'BF',
  CAF: 'CF',
  CMR: 'CM',
  COD: 'CD',
  COL: 'CO',
  ETH: 'ET',
  HTI: 'HT',
  IRQ: 'IQ',
  KEN: 'KE',
  LBY: 'LY',
  MLI: 'ML',
  MMR: 'MM',
  MOZ: 'MZ',
  NER: 'NE',
  NGA: 'NG',
  PAK: 'PK',
  PSE: 'PS',
  SDN: 'SD',
  SOM: 'SO',
  SSD: 'SS',
  SYR: 'SY',
  TCD: 'TD',
  UKR: 'UA',
  VEN: 'VE',
  YEM: 'YE',
  ZWE: 'ZW',
  BGD: 'BD',
  BDI: 'BI',
  DJI: 'DJ',
  EGY: 'EG',
  GIN: 'GN',
  HND: 'HN',
  JOR: 'JO',
  LBN: 'LB',
  MWI: 'MW',
  NIC: 'NI',
  PHL: 'PH',
  RWA: 'RW',
  TZA: 'TZ',
  UGA: 'UG',
  VNM: 'VN',
  ZMB: 'ZM',
};

export function getISO2FromISO3(iso3: string): string | null {
  return ISO3_TO_ISO2[iso3] ?? null;
}

export function getCountryFlag(iso3: string): string {
  const iso2 = ISO3_TO_ISO2[iso3];
  if (!iso2) return '';
  
  // Convert ISO2 to flag emoji using regional indicator symbols
  const codePoints = iso2
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  
  return String.fromCodePoint(...codePoints);
}

export function getFlagUrl(iso3: string): string {
  const iso2 = ISO3_TO_ISO2[iso3]?.toLowerCase();
  if (!iso2) return '';
  return `https://flagcdn.com/24x18/${iso2}.png`;
}
