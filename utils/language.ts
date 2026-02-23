export type AppLanguage = 'en' | 'pt' | 'es' | 'ja';

const enumLanguageByIndex: Record<number, AppLanguage> = {
  0: 'en',
  1: 'pt',
  2: 'es',
  3: 'ja',
};

const enumIndexByLanguage: Record<AppLanguage, number> = {
  en: 0,
  pt: 1,
  es: 2,
  ja: 3,
};

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const normalizeLanguageCode = (value?: unknown): AppLanguage | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return enumLanguageByIndex[value] ?? null;
  }

  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) {
    return enumLanguageByIndex[numeric] ?? null;
  }

  const short = normalized.split('-')[0];
  if (short === 'en' || short === 'pt' || short === 'es' || short === 'ja') {
    return short;
  }

  if (normalized === 'english' || normalized === 'ingles' || normalized === 'inglês') {
    return 'en';
  }
  if (normalized === 'portuguese' || normalized === 'portugues' || normalized === 'português') {
    return 'pt';
  }
  if (normalized === 'spanish' || normalized === 'espanol' || normalized === 'español') {
    return 'es';
  }
  if (normalized === 'japanese' || normalized === 'japones' || normalized === 'japonês' || normalized === 'japonese') {
    return 'ja';
  }

  return null;
};

export const languageToEnumValue = (value?: unknown): number | null => {
  const normalized = normalizeLanguageCode(value);
  if (!normalized) {
    return null;
  }
  return enumIndexByLanguage[normalized] ?? null;
};
