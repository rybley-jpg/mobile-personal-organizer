import { Priority, RepeatRule, ReminderOffset } from '@/types';
import { toISODate, todayISO } from '@/lib/dateUtils';
import { findAirlineByName, AIRLINES } from '@/lib/airlineData';
import { findAirportByIata, searchAirports } from '@/lib/airportData';

export interface ParsedFlightInfo {
  airline: string | null;
  airlineIata: string | null;
  flightNumber: string | null;
  toLocation: string | null;
  toAirportCode: string | null;
  fromLocation: string | null;
  fromAirportCode: string | null;
  departureDate: string | null;
  departureTime: string | null;
  arrivalDate: string | null;
  arrivalTime: string | null;
  bookingNumber: string | null;
  terminal: string | null;
  gate: string | null;
  seat: string | null;
}

export interface ParsedContactInfo {
  name: string | null;
  phone: string | null;
  phoneAlt: string | null;
  email: string | null;
  organization: string | null;
}

export type ParsedType = 'task' | 'flight' | 'contact' | 'reminder';

export interface ParsedTaskDraft {
  type: ParsedType;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority;
  categoryName: string;
  repeatRule: RepeatRule | null;
  reminderOffset: ReminderOffset | null;
  isFlight: boolean;
  flightInfo: ParsedFlightInfo | null;
  contactInfo: ParsedContactInfo | null;
  rawText: string;
}

const WEEKDAYS = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];

const MONTH_NAMES: Record<string, number> = {
  januar: 0, februar: 1, märz: 2, maerz: 2, april: 3, mai: 4, juni: 5,
  juli: 6, august: 7, september: 8, oktober: 9, november: 10, dezember: 11,
};

const CATEGORY_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'Reise', regex: /\b(flug|flughafen|reise|urlaub|koffer|gepäck|visum|check-?in|reisepass|boarding|airline|sitzplatz|abflug|ankunft)\b/i },
  { name: 'Finanzen', regex: /\b(rechnung|bezahlen|überweisen|überweisung|versicherung|steuer|bank)\b/i },
  { name: 'Familie', regex: /\b(mutter|vater|mama|papa|oma|opa|tochter|sohn|familie|schwester|bruder)\b/i },
  { name: 'Arbeit', regex: /\b(meeting|projekt|kollege|kollegin|büro|chef|präsentation|kunde)\b/i },
  { name: 'Einkaufen', regex: /\b(einkaufen|einkauf|besorgen|supermarkt|lebensmittel)\b/i },
  { name: 'Termine', regex: /\b(termin|friseur|untersuchung|zahnarzt|arzt)\b/i },
  { name: 'Telefon', regex: /\b(anrufen|telefonieren|rückruf|zurückrufen|anruf)\b/i },
];

function stripLeadIn(text: string): string {
  return text
    .replace(/^\s*(erinnere mich( daran)?,?\s*(dass ich)?\s*)/i, '')
    .replace(/^\s*(bitte\s+)/i, '')
    .replace(/^\s*(füge (eine |mir )?(eine )?aufgabe hinzu[:,]?\s*)/i, '')
    .replace(/^\s*(speichere\s+)/i, '')
    .trim();
}

function extractDate(text: string, reference: Date): { iso: string; remainder: string } | null {
  let match: RegExpMatchArray | null;

  match = text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})?\b/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = match[3] ? parseInt(match[3], 10) : reference.getFullYear();
    if (year < 100) year += 2000;
    const date = new Date(year, month, day);
    if (!match[3] && date.getTime() < reference.getTime() - 86400000) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return { iso: toISODate(date), remainder: text.replace(match[0], ' ') };
  }

  match = text.match(/\b(\d{1,2})\.?\s*(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/i);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = MONTH_NAMES[match[2].toLowerCase()];
    const date = new Date(reference.getFullYear(), month, day);
    if (date.getTime() < reference.getTime() - 86400000) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return { iso: toISODate(date), remainder: text.replace(match[0], ' ') };
  }

  if (/\bübermorgen\b/i.test(text)) {
    const date = new Date(reference);
    date.setDate(date.getDate() + 2);
    return { iso: toISODate(date), remainder: text.replace(/\bübermorgen\b/i, ' ') };
  }

  if (/\bheute\b/i.test(text)) {
    return { iso: toISODate(reference), remainder: text.replace(/\bheute\b/i, ' ') };
  }

  if (/\bmorgen\b/i.test(text)) {
    const date = new Date(reference);
    date.setDate(date.getDate() + 1);
    return { iso: toISODate(date), remainder: text.replace(/\bmorgen\b/i, ' ') };
  }

  match = text.match(/\bin\s+(\d+)\s+tagen\b/i);
  if (match) {
    const date = new Date(reference);
    date.setDate(date.getDate() + parseInt(match[1], 10));
    return { iso: toISODate(date), remainder: text.replace(match[0], ' ') };
  }

  if (/\b(nächste woche|in einer woche)\b/i.test(text)) {
    const date = new Date(reference);
    date.setDate(date.getDate() + 7);
    return { iso: toISODate(date), remainder: text.replace(/\b(nächste woche|in einer woche)\b/i, ' ') };
  }

  match = text.match(/\b(?:am\s+)?(sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag)\b/i);
  if (match) {
    const targetDow = WEEKDAYS.indexOf(match[1].toLowerCase());
    const date = new Date(reference);
    let diff = (targetDow - date.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    date.setDate(date.getDate() + diff);
    return { iso: toISODate(date), remainder: text.replace(match[0], ' ') };
  }

  return null;
}

function extractTime(text: string): { time: string; remainder: string } | null {
  let match: RegExpMatchArray | null = null;
  if (!match) match = text.match(/\bum\s+(\d{1,2})(?:[:.](\d{2}))?\s*uhr\b/i);
  if (!match) match = text.match(/\b(\d{1,2})[:.](\d{2})\s*uhr\b/i);
  if (!match) match = text.match(/\b(\d{1,2})\s*uhr\b/i);
  if (!match) match = text.match(/\b(\d{1,2}):(\d{2})\b/);

  if (match) {
    const hour = String(Math.min(23, parseInt(match[1], 10))).padStart(2, '0');
    const minute = String(match[2] ? parseInt(match[2], 10) : 0).padStart(2, '0');
    return { time: `${hour}:${minute}`, remainder: text.replace(match[0], ' ') };
  }
  return null;
}

function extractPriority(text: string): { priority: Priority; remainder: string } {
  if (/\b(wichtig|dringend|höchste priorität|hohe priorität|sofort)\b/i.test(text)) {
    return { priority: 'hoch', remainder: text.replace(/,?\s*\b(wichtig|dringend|höchste priorität|hohe priorität|sofort)\b/gi, ' ') };
  }
  if (/\b(niedrige priorität|unwichtig|nicht dringend|irgendwann)\b/i.test(text)) {
    return { priority: 'niedrig', remainder: text.replace(/,?\s*\b(niedrige priorität|unwichtig|nicht dringend|irgendwann)\b/gi, ' ') };
  }
  return { priority: 'normal', remainder: text };
}

function extractRepeat(text: string): { repeat: RepeatRule | null; remainder: string } {
  const rules: { regex: RegExp; rule: RepeatRule }[] = [
    { regex: /\b(täglich|jeden tag)\b/i, rule: 'taeglich' },
    { regex: /\b(wöchentlich|jede woche)\b/i, rule: 'woechentlich' },
    { regex: /\b(monatlich|jeden monat)\b/i, rule: 'monatlich' },
    { regex: /\b(jährlich|jedes jahr)\b/i, rule: 'jaehrlich' },
  ];
  for (const { regex, rule } of rules) {
    if (regex.test(text)) {
      return { repeat: rule, remainder: text.replace(regex, ' ') };
    }
  }
  return { repeat: null, remainder: text };
}

function extractReminder(text: string): { offset: ReminderOffset | null; remainder: string } {
  const patterns: { regex: RegExp; offset: ReminderOffset }[] = [
    { regex: /\b(erinnere mich(.*?)?)?\s*(\d+)\s+stunden?\s+(vorher|davor|vor)\b/i, offset: '2h' },
    { regex: /\b(\d+)\s+stunden?\s+(vorher|davor|vor)\b/i, offset: '2h' },
    { regex: /\b1\s+stunde\s+(vorher|davor|vor)\b/i, offset: '1h' },
    { regex: /\beine\s+stunde\s+(vorher|davor|vor)\b/i, offset: '1h' },
    { regex: /\b15\s+minuten\s+(vorher|davor|vor)\b/i, offset: '15m' },
    { regex: /\b(\d+)\s+tag(?:e)?\s+(vorher|davor|vor)\b/i, offset: '1d' },
    { regex: /\beinen\s+tag\s+(vorher|davor|vor)\b/i, offset: '1d' },
    { regex: /\b1\s+tag\s+(vorher|davor|vor)\b/i, offset: '1d' },
    { regex: /\b3\s+tage\s+(vorher|davor|vor)\b/i, offset: '3d' },
    { regex: /\b7\s+tage\s+(vorher|davor|vor)\b/i, offset: '7d' },
    { regex: /\b(eine\s+)?woche\s+(vorher|davor|vor)\b/i, offset: '7d' },
    { regex: /\bzum\s+zeitpunkt\b/i, offset: 'at_time' },
    { regex: /\brechtzeitig\b/i, offset: '1h' },
  ];

  const lowerText = text.toLowerCase();

  const hourMatch = lowerText.match(/(\d+)\s+stunden?\s+(vorher|davor|vor)/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    let offset: ReminderOffset = '2h';
    if (hours <= 1) offset = '1h';
    else if (hours <= 2) offset = '2h';
    else if (hours <= 24) offset = '1d';
    else if (hours <= 72) offset = '3d';
    else offset = '7d';
    return { offset, remainder: text.replace(new RegExp(hourMatch[0], 'i'), ' ') };
  }

  const dayMatch = lowerText.match(/(\d+)\s+tag(?:e)?\s+(vorher|davor|vor)/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    let offset: ReminderOffset = '1d';
    if (days <= 1) offset = '1d';
    else if (days <= 3) offset = '3d';
    else offset = '7d';
    return { offset, remainder: text.replace(new RegExp(dayMatch[0], 'i'), ' ') };
  }

  for (const { regex, offset } of patterns) {
    if (regex.test(text)) {
      return { offset, remainder: text.replace(regex, ' ') };
    }
  }

  if (/\berinnere/i.test(text)) {
    return { offset: '1h', remainder: text };
  }

  return { offset: null, remainder: text };
}

function extractPhoneNumber(text: string): { phone: string | null; remainder: string } {
  const match = text.match(/\b(\+?\d[\d\s/().-]{6,}\d)\b/);
  if (match) {
    const phone = match[1].replace(/\s+/g, ' ').trim();
    return { phone, remainder: text.replace(match[0], ' ') };
  }
  return { phone: null, remainder: text };
}

function extractEmail(text: string): { email: string | null; remainder: string } {
  const match = text.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/);
  if (match) {
    return { email: match[0], remainder: text.replace(match[0], ' ') };
  }
  return { email: null, remainder: text };
}

function extractAirportCode(text: string): { code: string; name: string; remainder: string } | null {
  const matches = text.matchAll(/\b([A-Z]{3})\b/g);
  for (const m of matches) {
    const airport = findAirportByIata(m[1]);
    if (airport) {
      return { code: airport.iata, name: airport.city, remainder: text.replace(m[0], ' ') };
    }
  }
  return null;
}

function detectFlight(text: string): { isFlight: boolean; info: ParsedFlightInfo | null } {
  const lower = text.toLowerCase();

  let airlineName: string | null = null;
  let airlineIata: string | null = null;

  for (const a of AIRLINES) {
    if (lower.includes(a.name.toLowerCase())) {
      airlineName = a.name;
      airlineIata = a.iata;
      break;
    }
  }

  if (!airlineName) {
    const airlineRef = findAirlineByName(text);
    if (airlineRef) {
      airlineName = airlineRef.name;
      airlineIata = airlineRef.iata;
    }
  }

  const hasFlightWord = /\b(flug|fliege|abflug|ankunft|boarding|gate|terminal|sitzplatz|buchen|buchung)\b/i.test(text);
  const hasAirportCode = /\b([A-Z]{3})\b/.test(text) && extractAirportCode(text) !== null;

  if (!airlineName && !hasFlightWord && !hasAirportCode) {
    return { isFlight: false, info: null };
  }

  let flightNumber: string | null = null;
  const flightNumberMatch = text.match(/\b([a-z]{2})\s?-?(\d{2,4})\b/i);
  if (flightNumberMatch) {
    flightNumber = `${flightNumberMatch[1].toUpperCase()}${flightNumberMatch[2]}`;
  }

  let toLocation: string | null = null;
  let toAirportCode: string | null = null;
  let fromLocation: string | null = null;
  let fromAirportCode: string | null = null;

  const routeMatch = text.match(/\bnach\s+([A-ZÄÖÜa-zäöüß]+(?:\s[A-ZÄÖÜa-zäöüß]+)?)/i);
  if (routeMatch) {
    toLocation = routeMatch[1].replace(/-flug$/i, '');
    const airport = searchAirports(toLocation)[0];
    if (airport) {
      toAirportCode = airport.iata;
      toLocation = airport.city;
    }
  }

  const fromMatch = text.match(/\bvon\s+([A-ZÄÖÜa-zäöüß]+(?:\s[A-ZÄÖÜa-zäöüß]+)?)\s+nach\b/i);
  if (fromMatch) {
    fromLocation = fromMatch[1];
    const airport = searchAirports(fromLocation)[0];
    if (airport) {
      fromAirportCode = airport.iata;
      fromLocation = airport.city;
    }
  }

  if (!toAirportCode || !fromAirportCode) {
    const codeSearch = text.matchAll(/\b([A-Z]{3})\b/g);
    const foundCodes: { code: string; name: string; index: number }[] = [];
    for (const m of codeSearch) {
      const ap = findAirportByIata(m[1]);
      if (ap) foundCodes.push({ code: ap.iata, name: ap.city, index: m.index ?? 0 });
    }
    if (foundCodes.length >= 2) {
      if (!fromAirportCode) {
        fromAirportCode = foundCodes[0].code;
        fromLocation = fromLocation ?? foundCodes[0].name;
      }
      if (!toAirportCode) {
        toAirportCode = foundCodes[foundCodes.length - 1].code;
        toLocation = toLocation ?? foundCodes[foundCodes.length - 1].name;
      }
    } else if (foundCodes.length === 1) {
      if (!toAirportCode) {
        toAirportCode = foundCodes[0].code;
        toLocation = toLocation ?? foundCodes[0].name;
      }
    }
  }

  const bookingMatch = text.match(/\b(buchung(?:snummer)?|booking)\s*[:#]?\s*([A-Z0-9-]{4,})\b/i);
  const bookingNumber = bookingMatch ? bookingMatch[2] : null;

  const terminalMatch = text.match(/\bterminal\s*([A-Z0-9]+)\b/i);
  const terminal = terminalMatch ? terminalMatch[1] : null;

  const gateMatch = text.match(/\bgate\s*([A-Z0-9]+)\b/i);
  const gate = gateMatch ? gateMatch[1] : null;

  const seatMatch = text.match(/\b(sitz|seat|platz)\s*([A-Z0-9]+)\b/i);
  const seat = seatMatch ? seatMatch[2] : null;

  return {
    isFlight: true,
    info: {
      airline: airlineName,
      airlineIata,
      flightNumber,
      toLocation,
      toAirportCode,
      fromLocation,
      fromAirportCode,
      departureDate: null,
      departureTime: null,
      arrivalDate: null,
      arrivalTime: null,
      bookingNumber,
      terminal,
      gate,
      seat,
    },
  };
}

function detectContact(text: string): { isContact: boolean; info: ParsedContactInfo | null } {
  const hasContactWord = /\b(kontakt|telefonnummer|handynummer|rufnummer|email|e-mail|adresse|speichere.*nummer)\b/i.test(text);
  const hasPhone = /\b(\+?\d[\d\s/().-]{6,}\d)\b/.test(text);
  const hasEmail = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/.test(text);

  if (!hasContactWord && !hasPhone && !hasEmail) {
    return { isContact: false, info: null };
  }

  if (hasPhone || hasEmail) {
    let remainder = text;
    const phoneResult = extractPhoneNumber(remainder);
    const phone = phoneResult.phone;
    remainder = phoneResult.remainder;

    const emailResult = extractEmail(remainder);
    const email = emailResult.email;
    remainder = emailResult.remainder;

    const nameMatch = remainder.match(/\b(?:von|von meinem|von meiner|meiner|meinem|mein)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s[A-ZÄÖÜ][a-zäöüß]+)?)\b/);
    let name = nameMatch ? nameMatch[1] : null;

    if (!name) {
      const nameMatch2 = remainder.match(/\b(?:speichere|kontakt)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s[A-ZÄÖÜ][a-zäöüß]+)?)\b/);
      name = nameMatch2 ? nameMatch2[1] : null;
    }

    const orgMatch = remainder.match(/\b(?:von|bei|aus)\s+(?:der|dem|die|das)?\s*([A-ZÄÖÜ][a-zäöüß]+(?:\s[A-ZÄÖÜ][a-zäöüß]+)*)\b/);

    const isExplicitContact = hasContactWord || (hasPhone && hasEmail);

    if (isExplicitContact || (hasPhone && name)) {
      return {
        isContact: true,
        info: {
          name,
          phone,
          phoneAlt: null,
          email,
          organization: orgMatch ? orgMatch[1] : null,
        },
      };
    }
  }

  return { isContact: false, info: null };
}

function detectCategory(text: string, isFlight: boolean, isContact: boolean): string {
  if (isFlight) return 'Reise';
  if (isContact) return 'Telefon';
  const found = CATEGORY_PATTERNS.find((p) => p.regex.test(text));
  return found ? found.name : 'Privat';
}

function cleanupTitle(text: string): string {
  let cleaned = text
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .replace(/^(dass ich|dass|am|um|für den|für die|für das|für)\s+/i, '')
    .replace(/^(muss ich|ich muss)\s+/i, '')
    .trim();

  if (!cleaned) cleaned = 'Neue Aufgabe';
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cleaned;
}

export function parseVoiceInput(rawText: string, reference: Date = new Date()): ParsedTaskDraft {
  const text = stripLeadIn(rawText.trim());

  const flightResult = detectFlight(text);
  const contactResult = detectContact(text);

  let remainder = text;

  const dateResult = extractDate(remainder, reference);
  if (dateResult) remainder = dateResult.remainder;

  const timeResult = extractTime(remainder);
  if (timeResult) remainder = timeResult.remainder;

  const priorityResult = extractPriority(remainder);
  remainder = priorityResult.remainder;

  const repeatResult = extractRepeat(remainder);
  remainder = repeatResult.remainder;

  const reminderResult = extractReminder(remainder);
  remainder = reminderResult.remainder;

  const categoryName = detectCategory(text, flightResult.isFlight, contactResult.isContact);

  const title = cleanupTitle(remainder);

  let parsedType: ParsedType = 'task';
  if (flightResult.isFlight) parsedType = 'flight';
  else if (contactResult.isContact) parsedType = 'contact';

  if (flightResult.info && dateResult) {
    flightResult.info.departureDate = dateResult.iso;
  }
  if (flightResult.info && timeResult) {
    flightResult.info.departureTime = timeResult.time;
  }

  return {
    type: parsedType,
    title,
    dueDate: dateResult?.iso ?? null,
    dueTime: timeResult?.time ?? null,
    priority: priorityResult.priority,
    categoryName,
    repeatRule: repeatResult.repeat,
    reminderOffset: reminderResult.offset,
    isFlight: flightResult.isFlight,
    flightInfo: flightResult.info,
    contactInfo: contactResult.info,
    rawText,
  };
}

export function suggestedDueDateFallback(): string {
  return todayISO();
}
