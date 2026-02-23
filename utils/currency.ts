const currencySymbols: Record<string, string> = {
  BRL: 'R$',
  USD: '$',
  EUR: 'EUR',
  GBP: 'GBP',
  CAD: 'CAD',
  AUD: 'AUD',
  JPY: 'JPY',
  CNY: 'CNY',
  CHF: 'CHF',
  MXN: 'MXN',
  ARS: 'ARS',
  CLP: 'CLP',
  COP: 'COP',
  PEN: 'PEN',
  UYU: 'UYU',
};

export const normalizeCurrencyCode = (value?: string | null) => {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
};

export const getCurrencySymbol = (currency?: string | null) => {
  const code = normalizeCurrencyCode(currency) ?? 'BRL';
  return currencySymbols[code] ?? code;
};

export const formatCurrency = (amount: number, currency?: string | null) => {
  const numeric = Number.isFinite(amount) ? amount : 0;
  const code = normalizeCurrencyCode(currency) ?? 'BRL';
  const symbol = getCurrencySymbol(code);
  const formatted = numeric.toFixed(2);
  if (symbol === code) {
    return `${code} ${formatted}`;
  }
  return `${symbol}${formatted}`;
};
