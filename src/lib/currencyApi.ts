export interface ExchangeRateResponse {
  base: string;
  rates: Record<string, number>;
  date: string;
}

export async function fetchExchangeRates(baseCurrency: string): Promise<ExchangeRateResponse> {
  const url = `https://api.frankfurter.app/latest?base=${encodeURIComponent(baseCurrency)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(
      `Network error while fetching exchange rates: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch exchange rates (HTTP ${response.status}). The base currency "${baseCurrency}" may not be supported.`,
    );
  }

  let data: ExchangeRateResponse;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(
      `Failed to parse exchange rate response: ${err instanceof Error ? err.message : 'invalid JSON'}`,
    );
  }

  if (!data.base || !data.rates || typeof data.rates !== 'object') {
    throw new Error('Received malformed exchange rate data from the API.');
  }

  return data;
}

const FALLBACK_RATES: Record<string, number> = {
  EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.95, NAD: 20.5, ZAR: 20.5,
  JPY: 162, CNY: 7.85, AUD: 1.65, CAD: 1.47, NZD: 1.78, INR: 90.5,
  BRL: 5.95, MXN: 19.8, TRY: 35.2, AED: 3.97, SGD: 1.45, HKD: 8.42,
  THB: 38.5, SEK: 11.4, NOK: 11.8, DKK: 7.46, PLN: 4.30, CZK: 25.2,
  HUF: 389, RON: 4.97,
};

export function getFallbackRates(base: string): ExchangeRateResponse {
  return {
    base,
    rates: FALLBACK_RATES,
    date: new Date().toISOString().slice(0, 10),
  };
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number | null {
  if (from === to) return amount;
  if (!(from in rates) || !(to in rates)) return null;
  return (amount * rates[to]) / rates[from];
}

export const SUPPORTED_CURRENCIES: { code: string; name: string }[] = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'US-Dollar' },
  { code: 'GBP', name: 'Britisches Pfund' },
  { code: 'CHF', name: 'Schweizer Franken' },
  { code: 'NAD', name: 'Namibia-Dollar' },
  { code: 'ZAR', name: 'Südafrikanischer Rand' },
  { code: 'JPY', name: 'Japanischer Yen' },
  { code: 'CNY', name: 'Chinesischer Yuan' },
  { code: 'AUD', name: 'Australischer Dollar' },
  { code: 'CAD', name: 'Kanadischer Dollar' },
  { code: 'NZD', name: 'Neuseeland-Dollar' },
  { code: 'INR', name: 'Indische Rupie' },
  { code: 'BRL', name: 'Brasilianischer Real' },
  { code: 'MXN', name: 'Mexikanischer Peso' },
  { code: 'TRY', name: 'Türkische Lira' },
  { code: 'AED', name: 'VAE-Dirham' },
  { code: 'SGD', name: 'Singapur-Dollar' },
  { code: 'HKD', name: 'Hongkong-Dollar' },
  { code: 'THB', name: 'Thailändischer Baht' },
  { code: 'SEK', name: 'Schwedische Krone' },
  { code: 'NOK', name: 'Norwegische Krone' },
  { code: 'DKK', name: 'Dänische Krone' },
  { code: 'PLN', name: 'Polnischer Złoty' },
  { code: 'CZK', name: 'Tschechische Krone' },
  { code: 'HUF', name: 'Ungarischer Forint' },
  { code: 'RON', name: 'Rumänischer Leu' },
];
