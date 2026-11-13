import { fetchExchangeRates, getCachedRates } from '@/lib/currencyApi';
import type { RateStatus } from '@/types';

export interface EurRates {
  date: string;
  rates: Record<string, number>;
  status: Exclude<RateStatus, 'missing'>;
}

export interface EurConversion {
  amountEur: number | null;
  exchangeRate: number | null;
  rateDate: string | null;
  status: RateStatus;
}

export async function loadEurRates(): Promise<EurRates | null> {
  try {
    const fresh = await fetchExchangeRates('EUR');
    return { date: fresh.date, rates: fresh.rates, status: 'ok' };
  } catch {
    const cached = getCachedRates('EUR');
    return cached ? { date: cached.date, rates: cached.rates, status: 'cached' } : null;
  }
}

export function convertToEur(amount: number, currency: string, rates: EurRates | null): EurConversion {
  if (currency === 'EUR') {
    return { amountEur: amount, exchangeRate: 1, rateDate: null, status: 'ok' };
  }
  const perEur = rates?.rates[currency];
  if (!rates || !perEur) {
    return { amountEur: null, exchangeRate: null, rateDate: null, status: 'missing' };
  }
  return {
    amountEur: Math.round((amount / perEur) * 100) / 100,
    exchangeRate: 1 / perEur,
    rateDate: rates.date,
    status: rates.status,
  };
}
