export interface Airline {
  name: string;
  iata: string;
  icao: string;
  website: string | null;
  checkinUrl: string | null;
}

export const AIRLINES: Airline[] = [
  { name: 'Lufthansa', iata: 'LH', icao: 'DLH', website: 'https://www.lufthansa.com', checkinUrl: 'https://www.lufthansa.com/de/de/online-check-in' },
  { name: 'Ethiopian Airlines', iata: 'ET', icao: 'ETH', website: 'https://www.ethiopianairlines.com', checkinUrl: 'https://www.ethiopianairlines.com/de/online-check-in' },
  { name: 'Emirates', iata: 'EK', icao: 'UAE', website: 'https://www.emirates.com', checkinUrl: 'https://www.emirates.com/de/english/manage-booking/online-check-in/' },
  { name: 'Qatar Airways', iata: 'QR', icao: 'QTR', website: 'https://www.qatarairways.com', checkinUrl: 'https://www.qatarairways.com/de-de/online-check-in.html' },
  { name: 'Turkish Airlines', iata: 'TK', icao: 'THY', website: 'https://www.turkishairlines.com', checkinUrl: 'https://www.turkishairlines.com/de-de/online-services/online-check-in' },
  { name: 'Eurowings', iata: 'EW', icao: 'EWG', website: 'https://www.eurowings.com', checkinUrl: 'https://www.eurowings.com/de/information/service/online-check-in.html' },
  { name: 'Condor', iata: 'DE', icao: 'CFG', website: 'https://www.condor.com', checkinUrl: 'https://www.condor.com/de/online-check-in' },
  { name: 'Ryanair', iata: 'FR', icao: 'RYR', website: 'https://www.ryanair.com', checkinUrl: 'https://www.ryanair.com/de/de/online-check-in' },
  { name: 'easyJet', iata: 'U2', icao: 'EZY', website: 'https://www.easyjet.com', checkinUrl: 'https://www.easyjet.com/de/online-check-in' },
  { name: 'British Airways', iata: 'BA', icao: 'BAW', website: 'https://www.britishairways.com', checkinUrl: 'https://www.britishairways.com/de-de/online-checkin' },
  { name: 'SWISS', iata: 'LX', icao: 'SWR', website: 'https://www.swiss.com', checkinUrl: 'https://www.swiss.com/de/online-check-in' },
  { name: 'KLM', iata: 'KL', icao: 'KLM', website: 'https://www.klm.com', checkinUrl: 'https://www.klm.com/de/de/information/check-in/online-check-in' },
  { name: 'Air France', iata: 'AF', icao: 'AFR', website: 'https://www.airfrance.de', checkinUrl: 'https://www.airfrance.de/de/online-check-in' },
  { name: 'Austrian Airlines', iata: 'OS', icao: 'AUA', website: 'https://www.austrian.com', checkinUrl: 'https://www.austrian.com/de/de/online-check-in' },
  { name: 'United Airlines', iata: 'UA', icao: 'UAL', website: 'https://www.united.com', checkinUrl: 'https://www.united.com/de/de/check-in' },
  { name: 'Delta Air Lines', iata: 'DL', icao: 'DAL', website: 'https://www.delta.com', checkinUrl: 'https://www.delta.com/standalone/check-in' },
  { name: 'Singapore Airlines', iata: 'SQ', icao: 'SIA', website: 'https://www.singaporeair.com', checkinUrl: 'https://www.singaporeair.com/de-de/plan-travel/check-in/online-check-in' },
  { name: 'Korean Air', iata: 'KE', icao: 'KAL', website: 'https://www.koreanair.com', checkinUrl: 'https://www.koreanair.com/de/de/plan-travel/check-in/online-check-in' },
  { name: 'Thai Airways', iata: 'TG', icao: 'THA', website: 'https://www.thaiairways.com', checkinUrl: 'https://www.thaiairways.com/de/de/check-in/online-check-in.page' },
  { name: 'Iberia', iata: 'IB', icao: 'IBE', website: 'https://www.iberia.com', checkinUrl: 'https://www.iberia.com/de/online-check-in' },
  { name: 'Alitalia / ITA Airways', iata: 'AZ', icao: 'ITY', website: 'https://www.itaspa.com', checkinUrl: 'https://www.itaspa.com/de/de/online-check-in' },
  { name: 'Scandinavian Airlines', iata: 'SK', icao: 'SAS', website: 'https://www.flysas.com', checkinUrl: 'https://www.flysas.com/de/online-check-in' },
  { name: 'TAP Air Portugal', iata: 'TP', icao: 'TAP', website: 'https://www.flytap.com', checkinUrl: 'https://www.flytap.com/de-de/online-check-in' },
  { name: 'Aeroflot', iata: 'SU', icao: 'AFL', website: 'https://www.aeroflot.ru', checkinUrl: 'https://www.aeroflot.ru/de-de/information/checkin/online' },
  { name: 'EgyptAir', iata: 'MS', icao: 'MSR', website: 'https://www.egyptair.com', checkinUrl: 'https://www.egyptair.com/de/pages/online-check-in.aspx' },
  { name: 'Kenya Airways', iata: 'KQ', icao: 'KQA', website: 'https://www.kenya-airways.com', checkinUrl: 'https://www.kenya-airways.com/de/online-check-in' },
  { name: 'South African Airways', iata: 'SA', icao: 'SAA', website: 'https://www.flysaa.com', checkinUrl: 'https://www.flysaa.com/de/de/onlinecheckin.action' },
  { name: 'Air Namibia', iata: 'SW', icao: 'NMB', website: 'https://www.airnamibia.com.na', checkinUrl: null },
  { name: 'Eurowings Discover', iata: '4Y', icao: 'EWG', website: 'https://www.eurowings.com', checkinUrl: 'https://www.eurowings.com/de/information/service/online-check-in.html' },
  { name: 'Norwegian Air Shuttle', iata: 'DY', icao: 'NAX', website: 'https://www.norwegian.com', checkinUrl: 'https://www.norwegian.com/de/online-check-in' },
  { name: 'Vueling', iata: 'VY', icao: 'VLG', website: 'https://www.vueling.com', checkinUrl: 'https://www.vueling.com/de/online-check-in' },
  { name: 'Wizz Air', iata: 'W6', icao: 'WZZ', website: 'https://wizzair.com', checkinUrl: 'https://wizzair.com/de-de/information-and-services/check-in/online-check-in' },
  { name: 'Air Canada', iata: 'AC', icao: 'ACA', website: 'https://www.aircanada.com', checkinUrl: 'https://www.aircanada.com/de/de/aco/home/plan/check-in/online-check-in.html' },
  { name: 'Qantas', iata: 'QF', icao: 'QFA', website: 'https://www.qantas.com', checkinUrl: 'https://www.qantas.com/de/en/manage-booking/online-check-in.html' },
  { name: 'Air Berlin', iata: 'AB', icao: 'BER', website: null, checkinUrl: null },
];

const AIRLINE_LOWER_MAP: Map<string, Airline> = new Map();
for (const a of AIRLINES) {
  AIRLINE_LOWER_MAP.set(a.name.toLowerCase(), a);
  if (a.iata) AIRLINE_LOWER_MAP.set(a.iata.toLowerCase(), a);
}

export function findAirlineByName(name: string): Airline | null {
  const lower = name.toLowerCase().trim();
  if (AIRLINE_LOWER_MAP.has(lower)) return AIRLINE_LOWER_MAP.get(lower)!;
  for (const [key, airline] of AIRLINE_LOWER_MAP) {
    if (key.includes(lower) || lower.includes(key)) return airline;
  }
  return null;
}

export function findAirlineByIata(iata: string): Airline | null {
  return AIRLINE_LOWER_MAP.get(iata.toLowerCase()) ?? null;
}

export function searchAirlines(query: string): Airline[] {
  if (!query.trim()) return AIRLINES;
  const q = query.toLowerCase().trim();
  return AIRLINES.filter(
    (a) => a.name.toLowerCase().includes(q) || a.iata.toLowerCase().includes(q)
  );
}
