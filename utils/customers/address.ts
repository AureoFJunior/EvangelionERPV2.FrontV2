import { formatPostalCode, normalizeDigits, normalizeStateCode, CustomerFormValues } from './validation';

export const buildAddress = (payload: Pick<CustomerFormValues, 'street' | 'number' | 'complement' | 'neighborhood' | 'city' | 'state' | 'postalCode'>) => {
  const parts = [
    payload.street.trim(),
    payload.number.trim(),
    payload.complement.trim(),
    payload.neighborhood.trim(),
    payload.city.trim(),
    normalizeStateCode(payload.state),
  ].filter(Boolean);
  const postal = formatPostalCode(payload.postalCode);
  if (postal) {
    parts.push(`CEP ${postal}`);
  }
  return parts.length > 0 ? parts.join(', ') : undefined;
};

export const parseAddress = (value?: string | null) => {
  const empty = {
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
  };

  if (!value || typeof value !== 'string') {
    return empty;
  }

  const raw = value.trim();
  if (!raw) {
    return empty;
  }

  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return { ...empty, street: raw };
  }

  const remaining: string[] = [];
  let postalCode = '';
  let state = '';

  parts.forEach((part) => {
    const cepDigits = normalizeDigits(part);
    if (!postalCode && (/\bcep\b/i.test(part) || /\d{5}-?\d{3}/.test(part))) {
      postalCode = cepDigits;
      return;
    }
    if (!state && /^[A-Za-z]{2}$/.test(part)) {
      state = part.toUpperCase();
      return;
    }
    remaining.push(part);
  });

  const [street, number, complement, neighborhood, city] = remaining;
  return {
    street: street ?? '',
    number: number ?? '',
    complement: complement ?? '',
    neighborhood: neighborhood ?? '',
    city: city ?? '',
    state,
    postalCode,
  };
};
