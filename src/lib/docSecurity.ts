const PIN_KEY = 'klarly-docs-pin';
const BIOMETRIC_KEY = 'klarly-docs-biometric-enabled';

export function isDocPinSet(): boolean {
  return !!localStorage.getItem(PIN_KEY);
}

export function setDocPin(pin: string): void {
  localStorage.setItem(PIN_KEY, pin);
}

export function clearDocPin(): void {
  localStorage.removeItem(PIN_KEY);
}

export function verifyDocPin(pin: string): boolean {
  const stored = localStorage.getItem(PIN_KEY);
  return stored !== null && stored === pin;
}

export function isBiometricEnabled(): boolean {
  return localStorage.getItem(BIOMETRIC_KEY) === 'true';
}

export function setBiometricEnabled(enabled: boolean): void {
  if (enabled) localStorage.setItem(BIOMETRIC_KEY, 'true');
  else localStorage.removeItem(BIOMETRIC_KEY);
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometric(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Reisemappe' },
        user: {
          id: new Uint8Array(16),
          name: 'docs-lock',
          displayName: 'Reisemappen-Schutz',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;
    return !!cred;
  } catch {
    return false;
  }
}

export async function verifyBiometric(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}
