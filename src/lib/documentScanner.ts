import { Capacitor } from '@capacitor/core';
import type { Result } from '@/lib/permissions';

export interface ScannedFile {
  uri: string;
  name: string;
  mime: string;
}

export const SCAN_CANCELLED = 'Vorgang abgebrochen.';
const PERMISSION_DENIED = 'Kamera-Zugriff verweigert. Bitte erlaube die Kamera in den Einstellungen.';
const PLUGIN_MISSING = 'Der Scanner ist in dieser Version der App nicht verfügbar. Bitte aktualisiere die App.';
const SCAN_FAILED = 'Der Scan ist fehlgeschlagen. Bitte versuche es erneut.';
const MODULE_INSTALLING = 'Der Scanner wird gerade von Google Play Dienste eingerichtet. Bitte versuche es in einer Minute erneut.';
const NO_QR_FOUND = 'Kein QR-Code erkannt. Bitte versuche es erneut.';

export function isNativeScanAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

function describeError(err: unknown): string {
  const message = (err as { message?: string })?.message?.toLowerCase() ?? '';
  if (message.includes('cancel')) return SCAN_CANCELLED;
  if (message.includes('permission')) return PERMISSION_DENIED;
  return SCAN_FAILED;
}

export async function scanDocumentNative(): Promise<Result<ScannedFile>> {
  let plugin: typeof import('@capacitor-mlkit/document-scanner');
  try {
    plugin = await import('@capacitor-mlkit/document-scanner');
  } catch {
    return { ok: false, error: PLUGIN_MISSING };
  }
  try {
    const { DocumentScanner } = plugin;
    const availability = await DocumentScanner.isGoogleDocumentScannerModuleAvailable();
    if (!availability.available) {
      await DocumentScanner.installGoogleDocumentScannerModule();
      return { ok: false, error: MODULE_INSTALLING };
    }
    const result = await DocumentScanner.scanDocument({
      galleryImportAllowed: true,
      pageLimit: 10,
      resultFormats: 'PDF',
      scannerMode: 'FULL',
    });
    const uri = result.pdf?.uri;
    if (!uri) return { ok: false, error: SCAN_FAILED };
    return { ok: true, data: { uri, name: `Scan-${Date.now()}.pdf`, mime: 'application/pdf' } };
  } catch (err) {
    return { ok: false, error: describeError(err) };
  }
}

export async function scanQrCodeNative(): Promise<Result<string>> {
  let plugin: typeof import('@capacitor-mlkit/barcode-scanning');
  try {
    plugin = await import('@capacitor-mlkit/barcode-scanning');
  } catch {
    return { ok: false, error: PLUGIN_MISSING };
  }
  try {
    const { BarcodeScanner, BarcodeFormat } = plugin;
    const availability = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (!availability.available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule();
      return { ok: false, error: MODULE_INSTALLING };
    }
    const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode], autoZoom: true });
    const value = barcodes[0]?.rawValue ?? barcodes[0]?.displayValue;
    if (!value) return { ok: false, error: NO_QR_FOUND };
    return { ok: true, data: value };
  } catch (err) {
    return { ok: false, error: describeError(err) };
  }
}
