import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Contacts as ContactsPlugin, type Contact } from '@capacitor/contacts';

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export interface Coordinates {
  lat: number;
  lon: number;
}

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 };

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function webPosition(): Promise<Result<Coordinates>> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false, error: 'GPS wird auf diesem Gerät nicht unterstützt.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ ok: true, data: { lat: position.coords.latitude, lon: position.coords.longitude } }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ ok: false, error: 'Standortzugriff verweigert. Bitte erlaube den GPS-Zugriff in den Einstellungen.' });
        } else if (err.code === err.TIMEOUT) {
          resolve({ ok: false, error: 'Standortermittlung hat zu lange gedauert. Versuche es erneut.' });
        } else {
          resolve({ ok: false, error: 'Standort konnte nicht ermittelt werden.' });
        }
      },
      GEO_OPTIONS,
    );
  });
}

export async function getPosition(): Promise<Result<Coordinates>> {
  if (!isOnline()) {
    return { ok: false, error: 'Du bist offline. Der Standort kann gerade nicht ermittelt werden.' };
  }
  if (!Capacitor.isNativePlatform()) return webPosition();
  try {
    const permission = await Geolocation.requestPermissions({ permissions: ['location'] });
    if (permission.location !== 'granted') {
      return { ok: false, error: 'Standortzugriff verweigert. Bitte erlaube den GPS-Zugriff in den Einstellungen.' };
    }
    const position = await Geolocation.getCurrentPosition(GEO_OPTIONS);
    return { ok: true, data: { lat: position.coords.latitude, lon: position.coords.longitude } };
  } catch {
    return webPosition();
  }
}

export async function requestContacts(): Promise<Result<undefined>> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, error: 'Adressbuch-Zugriff nur auf dem Handy verfügbar.' };
  }
  return { ok: true, data: undefined };
}

export async function pickContact(): Promise<Result<Contact>> {
  try {
    return { ok: true, data: await ContactsPlugin.pickContact() };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'OS-PLUG-CONT-0006') {
      return { ok: false, error: 'Auswahl abgebrochen.' };
    }
    return { ok: false, error: 'Kontakt konnte nicht ausgewählt werden. Bitte prüfe den Zugriff auf deine Kontakte.' };
  }
}

export async function requestCamera(): Promise<Result<undefined>> {
  if (!Capacitor.isNativePlatform()) return { ok: true, data: undefined };
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: 'Kamera ist auf diesem Gerät nicht verfügbar.' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: 'Kamera-Zugriff verweigert. Bitte erlaube die Kamera in den Einstellungen.' };
  }
}
