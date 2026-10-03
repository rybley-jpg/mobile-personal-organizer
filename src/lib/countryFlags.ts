const COUNTRY_TO_ISO: Record<string, string> = {
  'deutschland': 'DE', 'germany': 'DE',
  'österreich': 'AT', 'austria': 'AT', 'osterreich': 'AT',
  'schweiz': 'CH', 'switzerland': 'CH',
  'frankreich': 'FR', 'france': 'FR',
  'italien': 'IT', 'italy': 'IT',
  'spanien': 'ES', 'spain': 'ES',
  'portugal': 'PT',
  'niederlande': 'NL', 'netherlands': 'NL', 'holland': 'NL',
  'belgien': 'BE', 'belgium': 'BE',
  'großbritannien': 'GB', 'uk': 'GB', 'england': 'GB', 'united kingdom': 'GB', 'grossbritannien': 'GB',
  'irland': 'IE', 'ireland': 'IE',
  'usa': 'US', 'vereinigte staaten': 'US', 'united states': 'US',
  'kanada': 'CA', 'canada': 'CA',
  'japan': 'JP',
  'china': 'CN',
  'indien': 'IN', 'india': 'IN',
  'australien': 'AU', 'australia': 'AU',
  'neuseeland': 'NZ', 'new zealand': 'NZ',
  'griechenland': 'GR', 'greece': 'GR',
  'türkei': 'TR', 'turkey': 'TR', 'tuerkei': 'TR',
  'polen': 'PL', 'poland': 'PL',
  'tschechien': 'CZ', 'czech republic': 'CZ', 'czechia': 'CZ',
  'ungarn': 'HU', 'hungary': 'HU',
  'kroatien': 'HR', 'croatia': 'HR',
  'slowenien': 'SI', 'slovenia': 'SI',
  'slowakei': 'SK', 'slovakia': 'SK',
  'russland': 'RU', 'russia': 'RU',
  'schweden': 'SE', 'sweden': 'SE',
  'norwegen': 'NO', 'norway': 'NO',
  'dänemark': 'DK', 'denmark': 'DK', 'daenemark': 'DK',
  'finnland': 'FI', 'finland': 'FI',
  'luxemburg': 'LU', 'luxembourg': 'LU',
  'litauen': 'LT', 'lithuania': 'LT',
  'lettland': 'LV', 'latvia': 'LV',
  'estland': 'EE', 'estonia': 'EE',
  'bulgarien': 'BG', 'bulgaria': 'BG',
  'rumänien': 'RO', 'romania': 'RO', 'rumanien': 'RO',
  'serbien': 'RS', 'serbia': 'RS',
  'montenegro': 'ME',
  'albanien': 'AL', 'albania': 'AL',
  'bosnien': 'BA', 'bosnia': 'BA',
  'mazedonien': 'MK', 'north macedonia': 'MK',
  'malta': 'MT',
  'zypern': 'CY', 'cyprus': 'CY',
  'ägypten': 'EG', 'egypt': 'EG', 'aegypten': 'EG',
  'marokko': 'MA', 'morocco': 'MA',
  'tunesien': 'TN', 'tunisia': 'TN',
  'südafrika': 'ZA', 'south africa': 'ZA', 'suedafrika': 'ZA',
  'thailand': 'TH',
  'vietnam': 'VN',
  'kambodscha': 'KH', 'cambodia': 'KH',
  'singapur': 'SG', 'singapore': 'SG',
  'indonesien': 'ID', 'indonesia': 'ID',
  'malaysia': 'MY',
  'philippinen': 'PH', 'philippines': 'PH',
  'südkorea': 'KR', 'south korea': 'KR', 'suedkorea': 'KR',
  'nordkorea': 'KP', 'north korea': 'KP',
  'mexiko': 'MX', 'mexico': 'MX',
  'brasilien': 'BR', 'brazil': 'BR',
  'argentinien': 'AR', 'argentina': 'AR',
  'chile': 'CL',
  'peru': 'PE',
  'kolumbien': 'CO', 'colombia': 'CO',
  'kuba': 'CU', 'cuba': 'CU',
  'dominikanische republik': 'DO', 'dominican republic': 'DO',
  'vereinigte arabische emirate': 'AE', 'uae': 'AE',
  'saudi-arabien': 'SA', 'saudi arabia': 'SA',
  'israel': 'IL',
  'jordanien': 'JO', 'jordan': 'JO',
  'libanon': 'LB', 'lebanon': 'LB',
  'georgien': 'GE', 'georgia': 'GE',
  'armenien': 'AM', 'armenia': 'AM',
  'aserbaidschan': 'AZ', 'azerbaijan': 'AZ',
};

function isoToFlagEmoji(iso: string): string {
  const upper = iso.toUpperCase();
  if (upper.length !== 2) return '';
  const chars = upper.split('').map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...chars);
}

export function getCountryFlag(destination: string | null | undefined): string {
  if (!destination) return '';
  const normalized = destination.trim().toLowerCase();

  const direct = COUNTRY_TO_ISO[normalized];
  if (direct) return isoToFlagEmoji(direct);

  for (const [key, iso] of Object.entries(COUNTRY_TO_ISO)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return isoToFlagEmoji(iso);
    }
  }

  const parts = normalized.split(/[\s,/-]+/).filter(Boolean);
  for (const part of parts) {
    const match = COUNTRY_TO_ISO[part];
    if (match) return isoToFlagEmoji(match);
  }

  if (parts.length >= 1 && parts[0].length === 2) {
    const flag = isoToFlagEmoji(parts[0]);
    if (flag) return flag;
  }

  return '';
}
