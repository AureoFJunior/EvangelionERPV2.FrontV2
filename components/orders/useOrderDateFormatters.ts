import { useMemo } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { parseDateValue } from '../../utils/datetime';

export function useOrderDateFormatters() {
  const { language } = useI18n();

  const dateTimeLocale = useMemo(() => {
    if (language === 'pt') {
      return 'pt-BR';
    }
    if (language === 'es') {
      return 'es-ES';
    }
    if (language === 'ja') {
      return 'ja-JP';
    }
    return 'en-US';
  }, [language]);

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(dateTimeLocale, {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: language === 'en',
      }),
    [dateTimeLocale, language],
  );

  const dateOnlyFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(dateTimeLocale, {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }),
    [dateTimeLocale],
  );

  const formatOrderDateTime = (value: string | number | Date | null | undefined, fallback = '--') => {
    const parsed = parseDateValue(value);
    if (!parsed) {
      return fallback;
    }
    return dateTimeFormatter.format(parsed);
  };

  const formatOrderDate = (value: string | number | Date | null | undefined, fallback = '--') => {
    const parsed = parseDateValue(value);
    if (!parsed) {
      return fallback;
    }
    return dateOnlyFormatter.format(parsed);
  };

  return { formatOrderDateTime, formatOrderDate };
}
