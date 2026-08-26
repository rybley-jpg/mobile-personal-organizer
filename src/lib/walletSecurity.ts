const STORAGE_KEY = 'klarly-wallet-pin';

export function isWalletPinSet(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

export function setWalletPin(pin: string): void {
  localStorage.setItem(STORAGE_KEY, pin);
}

export function clearWalletPin(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function verifyWalletPin(pin: string): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== null && stored === pin;
}
