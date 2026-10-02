const COUNTRY_TIMEZONES: Record<string, { tz: string; label: string }> = {
  'Deutschland': { tz: 'Europe/Berlin', label: 'Deutschland' },
  'Schweiz': { tz: 'Europe/Zurich', label: 'Schweiz' },
  'Österreich': { tz: 'Europe/Vienna', label: 'Österreich' },
  'Großbritannien': { tz: 'Europe/London', label: 'Großbritannien' },
  'Irland': { tz: 'Europe/Dublin', label: 'Irland' },
  'Frankreich': { tz: 'Europe/Paris', label: 'Frankreich' },
  'Spanien': { tz: 'Europe/Madrid', label: 'Spanien' },
  'Portugal': { tz: 'Europe/Lisbon', label: 'Portugal' },
  'Italien': { tz: 'Europe/Rome', label: 'Italien' },
  'Niederlande': { tz: 'Europe/Amsterdam', label: 'Niederlande' },
  'Belgien': { tz: 'Europe/Brussels', label: 'Belgien' },
  'Luxemburg': { tz: 'Europe/Luxembourg', label: 'Luxemburg' },
  'Dänemark': { tz: 'Europe/Copenhagen', label: 'Dänemark' },
  'Schweden': { tz: 'Europe/Stockholm', label: 'Schweden' },
  'Norwegen': { tz: 'Europe/Oslo', label: 'Norwegen' },
  'Island': { tz: 'Atlantic/Reykjavik', label: 'Island' },
  'Finnland': { tz: 'Europe/Helsinki', label: 'Finnland' },
  'Lettland': { tz: 'Europe/Riga', label: 'Lettland' },
  'Estland': { tz: 'Europe/Tallinn', label: 'Estland' },
  'Litauen': { tz: 'Europe/Vilnius', label: 'Litauen' },
  'Polen': { tz: 'Europe/Warsaw', label: 'Polen' },
  'Tschechien': { tz: 'Europe/Prague', label: 'Tschechien' },
  'Slowakei': { tz: 'Europe/Bratislava', label: 'Slowakei' },
  'Ungarn': { tz: 'Europe/Budapest', label: 'Ungarn' },
  'Rumänien': { tz: 'Europe/Bucharest', label: 'Rumänien' },
  'Bulgarien': { tz: 'Europe/Sofia', label: 'Bulgarien' },
  'Kroatien': { tz: 'Europe/Zagreb', label: 'Kroatien' },
  'Bosnien und Herzegowina': { tz: 'Europe/Sarajevo', label: 'Bosnien' },
  'Serbien': { tz: 'Europe/Belgrade', label: 'Serbien' },
  'Montenegro': { tz: 'Europe/Podgorica', label: 'Montenegro' },
  'Albanien': { tz: 'Europe/Tirane', label: 'Albanien' },
  'Nordmazedonien': { tz: 'Europe/Skopje', label: 'Nordmazedonien' },
  'Slowenien': { tz: 'Europe/Ljubljana', label: 'Slowenien' },
  'Moldau': { tz: 'Europe/Chisinau', label: 'Moldau' },
  'Griechenland': { tz: 'Europe/Athens', label: 'Griechenland' },
  'Türkei': { tz: 'Europe/Istanbul', label: 'Türkei' },
  'Zypern': { tz: 'Asia/Nicosia', label: 'Zypern' },
  'Russland': { tz: 'Europe/Moscow', label: 'Russland' },
  'Ukraine': { tz: 'Europe/Kyiv', label: 'Ukraine' },
  'Belarus': { tz: 'Europe/Minsk', label: 'Belarus' },
  'VAE': { tz: 'Asia/Dubai', label: 'VAE' },
  'Katar': { tz: 'Asia/Qatar', label: 'Katar' },
  'Saudi-Arabien': { tz: 'Asia/Riyadh', label: 'Saudi-Arabien' },
  'Jordanien': { tz: 'Asia/Amman', label: 'Jordanien' },
  'Libanon': { tz: 'Asia/Beirut', label: 'Libanon' },
  'Syrien': { tz: 'Asia/Damascus', label: 'Syrien' },
  'Israel': { tz: 'Asia/Jerusalem', label: 'Israel' },
  'Kuwait': { tz: 'Asia/Kuwait', label: 'Kuwait' },
  'Bahrain': { tz: 'Asia/Bahrain', label: 'Bahrain' },
  'Oman': { tz: 'Asia/Muscat', label: 'Oman' },
  'Irak': { tz: 'Asia/Baghdad', label: 'Irak' },
  'Iran': { tz: 'Asia/Tehran', label: 'Iran' },
  'Äthiopien': { tz: 'Africa/Addis_Ababa', label: 'Äthiopien' },
  'Namibia': { tz: 'Africa/Windhoek', label: 'Namibia' },
  'Südafrika': { tz: 'Africa/Johannesburg', label: 'Südafrika' },
  'Ägypten': { tz: 'Africa/Cairo', label: 'Ägypten' },
  'Kenia': { tz: 'Africa/Nairobi', label: 'Kenia' },
  'Ghana': { tz: 'Africa/Accra', label: 'Ghana' },
  'Nigeria': { tz: 'Africa/Lagos', label: 'Nigeria' },
  'Marokko': { tz: 'Africa/Casablanca', label: 'Marokko' },
  'Tunesien': { tz: 'Africa/Tunis', label: 'Tunesien' },
  'Algerien': { tz: 'Africa/Algiers', label: 'Algerien' },
  'Tansania': { tz: 'Africa/Dar_es_Salaam', label: 'Tansania' },
  'Ruanda': { tz: 'Africa/Kigali', label: 'Ruanda' },
  'DR Kongo': { tz: 'Africa/Kinshasa', label: 'DR Kongo' },
  'Kamerun': { tz: 'Africa/Douala', label: 'Kamerun' },
  'Mosambik': { tz: 'Africa/Maputo', label: 'Mosambik' },
  'Sambia': { tz: 'Africa/Lusaka', label: 'Sambia' },
  'Simbabwe': { tz: 'Africa/Harare', label: 'Simbabwe' },
  'Senegal': { tz: 'Africa/Dakar', label: 'Senegal' },
  'Elfenbeinküste': { tz: 'Africa/Abidjan', label: 'Elfenbeinküste' },
  'Somalia': { tz: 'Africa/Mogadishu', label: 'Somalia' },
  'Sudan': { tz: 'Africa/Khartoum', label: 'Sudan' },
  'Madagaskar': { tz: 'Indian/Antananarivo', label: 'Madagaskar' },
  'Mauritius': { tz: 'Indian/Mauritius', label: 'Mauritius' },
  'Réunion': { tz: 'Indian/Reunion', label: 'Réunion' },
  'Seychellen': { tz: 'Indian/Mahe', label: 'Seychellen' },
  'China': { tz: 'Asia/Shanghai', label: 'China' },
  'Hongkong': { tz: 'Asia/Hong_Kong', label: 'Hongkong' },
  'Macao': { tz: 'Asia/Macau', label: 'Macao' },
  'Taiwan': { tz: 'Asia/Taipei', label: 'Taiwan' },
  'Japan': { tz: 'Asia/Tokyo', label: 'Japan' },
  'Südkorea': { tz: 'Asia/Seoul', label: 'Südkorea' },
  'Singapur': { tz: 'Asia/Singapore', label: 'Singapur' },
  'Thailand': { tz: 'Asia/Bangkok', label: 'Thailand' },
  'Malaysia': { tz: 'Asia/Kuala_Lumpur', label: 'Malaysia' },
  'Philippinen': { tz: 'Asia/Manila', label: 'Philippinen' },
  'Indonesien': { tz: 'Asia/Jakarta', label: 'Indonesien' },
  'Vietnam': { tz: 'Asia/Ho_Chi_Minh', label: 'Vietnam' },
  'Indien': { tz: 'Asia/Kolkata', label: 'Indien' },
  'Australien': { tz: 'Australia/Sydney', label: 'Australien' },
  'Neuseeland': { tz: 'Pacific/Auckland', label: 'Neuseeland' },
  'Fidschi': { tz: 'Pacific/Fiji', label: 'Fidschi' },
  'USA': { tz: 'America/New_York', label: 'USA (Ostküste)' },
  'Kanada': { tz: 'America/Toronto', label: 'Kanada' },
  'Mexiko': { tz: 'America/Mexico_City', label: 'Mexiko' },
  'Brasilien': { tz: 'America/Sao_Paulo', label: 'Brasilien' },
  'Argentinien': { tz: 'America/Argentina/Buenos_Aires', label: 'Argentinien' },
  'Chile': { tz: 'America/Santiago', label: 'Chile' },
  'Peru': { tz: 'America/Lima', label: 'Peru' },
  'Kolumbien': { tz: 'America/Bogota', label: 'Kolumbien' },
  'Kuba': { tz: 'America/Havana', label: 'Kuba' },
  'Dominikanische Republik': { tz: 'America/Santo_Domingo', label: 'Dominikanische Republik' },
  'Jamaika': { tz: 'America/Jamaica', label: 'Jamaika' },
  'Kap Verde': { tz: 'Atlantic/Cape_Verde', label: 'Kap Verde' },
};

const IATA_TIMEZONE_OVERRIDES: Record<string, string> = {
  LAX: 'America/Los_Angeles',
  SFO: 'America/Los_Angeles',
  SEA: 'America/Los_Angeles',
  LAS: 'America/Los_Angeles',
  PHX: 'America/Phoenix',
  DEN: 'America/Denver',
  DFW: 'America/Chicago',
  ORD: 'America/Chicago',
  IAH: 'America/Chicago',
  ATL: 'America/New_York',
  MIA: 'America/New_York',
  BOS: 'America/New_York',
  PHL: 'America/New_York',
  YYZ: 'America/Toronto',
  YVR: 'America/Vancouver',
  HNL: 'Pacific/Honolulu',
  ANC: 'America/Anchorage',
  PER: 'Australia/Perth',
  ADL: 'Australia/Adelaide',
  DRW: 'Australia/Darwin',
  BNE: 'Australia/Brisbane',
  MEL: 'Australia/Melbourne',
  AKL: 'Pacific/Auckland',
  CHC: 'Pacific/Auckland',
  NAN: 'Pacific/Fiji',
  GUM: 'Pacific/Guam',
  CPT: 'Africa/Johannesburg',
  JNB: 'Africa/Johannesburg',
  WDH: 'Africa/Windhoek',
};

import { AIRPORTS } from '@/lib/airportData';

export function getCountryTimezone(country: string): { tz: string; label: string } | null {
  return COUNTRY_TIMEZONES[country] ?? null;
}

export function getAirportTimezone(iata: string): { tz: string; label: string } | null {
  if (IATA_TIMEZONE_OVERRIDES[iata]) {
    return { tz: IATA_TIMEZONE_OVERRIDES[iata], label: iata };
  }
  const airport = AIRPORTS.find((a) => a.iata === iata);
  if (airport) {
    return getCountryTimezone(airport.country);
  }
  return null;
}

export function getCityTimezone(cityOrCountry: string): { tz: string; label: string } | null {
  if (COUNTRY_TIMEZONES[cityOrCountry]) return COUNTRY_TIMEZONES[cityOrCountry];
  const airport = AIRPORTS.find((a) => a.city === cityOrCountry);
  if (airport) {
    return getCountryTimezone(airport.country);
  }
  return null;
}

export function formatTimeInZone(tz: string): { time: string; date: string; offset: string } {
  const now = new Date();
  const timeFmt = new Intl.DateTimeFormat('de-DE', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const dateFmt = new Intl.DateTimeFormat('de-DE', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = timeFmt.format(now);
  const date = dateFmt.format(now);

  const offsetFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
  });
  const parts = offsetFmt.formatToParts(now);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName');
  const offset = offsetPart?.value ?? '';

  return { time, date, offset };
}
