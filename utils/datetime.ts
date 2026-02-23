export type DateInput = string | number | Date | null | undefined;

const buildDate = (year: number, monthIndex: number, day: number) => {
  const parsed = new Date(year, monthIndex, day, 0, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== monthIndex ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

export const parseDateValue = (value: DateInput) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return buildDate(Number(year), Number(month) - 1, Number(day));
  }

  const slashDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDateMatch) {
    const first = Number(slashDateMatch[1]);
    const second = Number(slashDateMatch[2]);
    const year = Number(slashDateMatch[3]);

    if (!Number.isFinite(first) || !Number.isFinite(second) || !Number.isFinite(year)) {
      return null;
    }

    // Default slash dates to US format (MM/DD/YYYY). If the first part is > 12,
    // fallback to DD/MM/YYYY to preserve unambiguous legacy values.
    const month = first;
    const day = second;
    if (month > 12 && day <= 12) {
      return buildDate(year, day - 1, month);
    }
    return buildDate(year, month - 1, day);
  }

  return null;
};

const usDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
});

const usDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

export const formatUsDate = (value: DateInput, fallback = '--') => {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return fallback;
  }
  return usDateFormatter.format(parsed);
};

export const formatUsDateTime = (value: DateInput, fallback = '--') => {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return fallback;
  }
  return usDateTimeFormatter.format(parsed);
};
