import { Product as ProductModel } from '../../services/erpService';

export const getStorageQuantity = (product: ProductModel) =>
  product.storageQuantity ?? product.stock ?? 0;

export const getStockStatus = (quantity: number) => {
  if (quantity <= 0) {
    return 'Out of Stock';
  }
  if (quantity <= 10) {
    return 'Low Stock';
  }
  return 'In Stock';
};

export const getStatusColor = (
  quantity: number,
  colors: { accentOrange: string; neonGreen: string },
) => {
  if (quantity <= 0) {
    return '#f72585';
  }
  if (quantity <= 10) {
    return colors.accentOrange;
  }
  return colors.neonGreen;
};

export const parseNumber = (value: string) => {
  const normalized = value.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const sanitizeNumericInput = (value: string) => {
  const normalized = value.replace(',', '.');
  let result = '';
  let hasDot = false;

  for (const char of normalized) {
    if (char >= '0' && char <= '9') {
      result += char;
    } else if (char === '.' && !hasDot) {
      result += char;
      hasDot = true;
    }
  }

  return result;
};

export const normalizeUnit = (unit?: string | null) => (unit ?? '').trim().toUpperCase();

export const unitAllowsDecimal = (unit?: string | null) => {
  const normalized = normalizeUnit(unit);
  return normalized === 'KG' || normalized === 'L' || normalized === 'M' || normalized === 'CM';
};

export const sanitizeQuantityInput = (value: string, unit?: string | null) => {
  if (unitAllowsDecimal(unit)) {
    return sanitizeNumericInput(value);
  }
  return value.replace(/\D/g, '');
};

export const getQuantityError = (value: string, unit?: string | null) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Required';
  }
  const parsed = parseNumber(trimmed);
  if (parsed === null) {
    return 'Enter a number';
  }
  if (!unitAllowsDecimal(unit) && !Number.isInteger(parsed)) {
    return 'Whole numbers only';
  }
  return parsed < 0 ? 'Must be 0 or more' : null;
};

export const getNumberError = (
  value: string,
  { required = false, allowZero = true }: { required?: boolean; allowZero?: boolean } = {},
) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? 'Required' : null;
  }
  const parsed = parseNumber(trimmed);
  if (parsed === null) {
    return 'Enter a number';
  }
  if (allowZero) {
    return parsed < 0 ? 'Must be 0 or more' : null;
  }
  return parsed <= 0 ? 'Must be greater than 0' : null;
};

export const resolvePictureUri = (product: ProductModel) => {
  const uri = product.pictureAddress ?? product.pictureAdress ?? '';
  if (!uri) {
    return null;
  }
  if (uri.startsWith('http') || uri.startsWith('data:')) {
    return uri;
  }
  return null;
};

export const resolveFileSource = (product: ProductModel) => {
  const candidate =
    (product as any).fileUrl ??
    (product as any).fileAddress ??
    (product as any).fileAdress ??
    (product as any).file ??
    '';
  return typeof candidate === 'string' && candidate ? candidate : null;
};
