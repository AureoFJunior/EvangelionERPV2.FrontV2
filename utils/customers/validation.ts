export type CustomerStatusOption = 'Active' | 'Inactive';

export type CustomerFormValues = {
  name: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  complement: string;
  document: string;
  status: CustomerStatusOption;
};

export type CustomerFormErrors = {
  name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  required: string | null;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeDigits = (value: string) => value.replace(/\D/g, '');

export const normalizeStateCode = (value: string) =>
  value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);

export const formatPostalCode = (value: string) => {
  const digits = normalizeDigits(value).slice(0, 8);
  if (!digits) {
    return '';
  }
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

export const normalizeCustomerStatus = (
  status?: string | null,
  isActive?: boolean,
): CustomerStatusOption => {
  const normalized = status?.trim().toLowerCase();
  if (normalized === 'inactive' || normalized === 'disabled' || normalized === 'blocked') {
    return 'Inactive';
  }
  if (normalized === 'active') {
    return 'Active';
  }
  if (isActive === false) {
    return 'Inactive';
  }
  return 'Active';
};

export const getNameError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length < 2 ? 'Name is too short' : null;
};

export const getEmailError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return emailPattern.test(trimmed) ? null : 'Enter a valid email address';
};

export const getPhoneError = (value: string) => {
  const digits = normalizeDigits(value);
  if (!digits) {
    return null;
  }
  return digits.length < 10 || digits.length > 15 ? 'Enter a valid phone number' : null;
};

const isRepeatedDigits = (digits: string) => digits.split('').every((digit) => digit === digits[0]);

const isValidCpf = (digits: string) => {
  if (digits.length !== 11 || isRepeatedDigits(digits)) {
    return false;
  }
  const numbers = digits.split('').map((digit) => Number(digit));
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += numbers[i] * (10 - i);
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (numbers[9] !== firstDigit) {
    return false;
  }
  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += numbers[i] * (11 - i);
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  return numbers[10] === secondDigit;
};

const isValidCnpj = (digits: string) => {
  if (digits.length !== 14 || isRepeatedDigits(digits)) {
    return false;
  }
  const numbers = digits.split('').map((digit) => Number(digit));
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += numbers[i] * weights1[i];
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (numbers[12] !== firstDigit) {
    return false;
  }
  sum = 0;
  for (let i = 0; i < 13; i += 1) {
    sum += numbers[i] * weights2[i];
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  return numbers[13] === secondDigit;
};

const isValidNif = (digits: string) => {
  if (digits.length !== 9) {
    return false;
  }
  if (!['1', '2', '3', '5', '6', '8', '9'].includes(digits[0])) {
    return false;
  }
  const numbers = digits.split('').map((digit) => Number(digit));
  let sum = 0;
  for (let i = 0; i < 8; i += 1) {
    sum += numbers[i] * (9 - i);
  }
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;
  return numbers[8] === checkDigit;
};

export const getDocumentError = (value: string) => {
  const digits = normalizeDigits(value);
  if (!digits) {
    return null;
  }
  if (digits.length === 11) {
    return isValidCpf(digits) ? null : 'Enter a valid CPF';
  }
  if (digits.length === 14) {
    return isValidCnpj(digits) ? null : 'Enter a valid CNPJ';
  }
  if (digits.length === 9) {
    return isValidNif(digits) ? null : 'Enter a valid NIF';
  }
  return 'Enter a valid CPF, CNPJ, or NIF';
};

export const getCityError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length < 2 ? 'City name is too short' : null;
};

export const getStateError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return /^[A-Za-z]{2}$/.test(trimmed) ? null : 'Use a 2-letter state code';
};

export const getPostalCodeError = (value: string) => {
  const digits = normalizeDigits(value);
  if (!digits) {
    return null;
  }
  return digits.length === 8 ? null : 'Enter a valid CEP';
};

export const getCustomerFormErrors = (values: CustomerFormValues): CustomerFormErrors => {
  const required = !values.name.trim() && !values.email.trim()
    ? 'Name or email is required.'
    : null;

  return {
    name: getNameError(values.name),
    email: getEmailError(values.email),
    phone: getPhoneError(values.phone),
    document: getDocumentError(values.document),
    city: getCityError(values.city),
    state: getStateError(values.state),
    postalCode: getPostalCodeError(values.postalCode),
    required,
  };
};

export const hasCustomerFormErrors = (errors: CustomerFormErrors) =>
  Boolean(
    errors.name ||
      errors.email ||
      errors.phone ||
      errors.document ||
      errors.city ||
      errors.state ||
      errors.postalCode ||
      errors.required,
  );

export const emptyCustomerFormValues = (): CustomerFormValues => ({
  name: '',
  email: '',
  phone: '',
  street: '',
  number: '',
  neighborhood: '',
  city: '',
  state: '',
  postalCode: '',
  complement: '',
  document: '',
  status: 'Active',
});
