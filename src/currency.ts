// ISO 3166-1 alpha-2 country code → ISO 4217 currency code
export const REGION_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', PT: 'EUR', IE: 'EUR', FI: 'EUR',
  GR: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR', LV: 'EUR',
  LT: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK',
  PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON',
  BG: 'BGN', RS: 'RSD', IS: 'ISK', AL: 'ALL', MK: 'MKD',
  RU: 'RUB', UA: 'UAH', TR: 'TRY', BY: 'BYN',
  JP: 'JPY', CN: 'CNY', KR: 'KRW', IN: 'INR',
  ID: 'IDR', TH: 'THB', VN: 'VND', MY: 'MYR',
  PH: 'PHP', SG: 'SGD', HK: 'HKD', TW: 'TWD',
  BD: 'BDT', PK: 'PKR', LK: 'LKR', MM: 'MMK',
  SA: 'SAR', AE: 'AED', QA: 'QAR', KW: 'KWD',
  BH: 'BHD', OM: 'OMR', JO: 'JOD', IQ: 'IQD',
  IR: 'IRR', IL: 'ILS', EG: 'EGP', LB: 'LBP',
  UZ: 'UZS', KZ: 'KZT', AZ: 'AZN', AM: 'AMD', GE: 'GEL',
  MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP',
  CO: 'COP', PE: 'PEN', UY: 'UYU',
  ZA: 'ZAR', NG: 'NGN', KE: 'KES', GH: 'GHS',
  TZ: 'TZS', ET: 'ETB', MA: 'MAD', TN: 'TND', DZ: 'DZD',
};

export const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY', 'KRW', 'UZS', 'IDR', 'VND', 'IRR', 'MMK',
  'RWF', 'BIF', 'GNF', 'ISK', 'PYG', 'CLP',
  'IQD', 'LBP', 'MGA',
]);

export function detectCurrency(): string {
  try {
    const locale = new Intl.Locale(navigator.language).maximize();
    return REGION_CURRENCY[locale.region ?? ''] ?? 'USD';
  } catch {
    return 'USD';
  }
}

export async function detectCurrencyFromEdge(): Promise<string | null> {
  try {
    const res = await fetch('/cdn-cgi/trace');
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/^loc=([A-Z]{2})$/m);
    const country = match?.[1] ?? null;
    return REGION_CURRENCY[country ?? ''] ?? null;
  } catch {
    return null;
  }
}

export function getCurrencySymbolClass(sym: string): string {
  return sym.length <= 2 ? 'text-xs' : 'text-[10px] tracking-tight';
}

export function getCurrencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    const symbol = parts.find((p) => p.type === 'currency')?.value ?? currency;
    // Fall back to ISO code if symbol contains non-Latin/non-ASCII-currency characters
    // (e.g. Cyrillic "сўм" for UZS, Arabic script, etc.)
    if (/[^\u0000-\u024F\u20A0-\u20CF]/.test(symbol)) return currency;
    return symbol;
  } catch {
    return currency;
  }
}

export function formatAmount(value: number, currency: string): string {
  const decimals = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export const COMMON_CURRENCIES: { code: string; name: string }[] = [
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'AMD', name: 'Armenian Dram' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'AZN', name: 'Azerbaijani Manat' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'BYN', name: 'Belarusian Ruble' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'DZD', name: 'Algerian Dinar' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'ETB', name: 'Ethiopian Birr' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'GEL', name: 'Georgian Lari' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'ILS', name: 'Israeli Shekel' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'IRR', name: 'Iranian Rial' },
  { code: 'ISK', name: 'Icelandic Krona' },
  { code: 'JOD', name: 'Jordanian Dinar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'KZT', name: 'Kazakhstani Tenge' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'PEN', name: 'Peruvian Sol' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'TND', name: 'Tunisian Dinar' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'TWD', name: 'Taiwan Dollar' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'UYU', name: 'Uruguayan Peso' },
  { code: 'UZS', name: 'Uzbekistani Som' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'ZAR', name: 'South African Rand' },
];
