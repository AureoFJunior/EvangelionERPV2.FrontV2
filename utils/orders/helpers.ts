import {
  Customer as CustomerModel,
  Order as OrderModel,
  Product as ProductModel,
} from '../../services/erpService';
import { formatUsDate, parseDateValue } from '../datetime';

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
  if (parsed <= 0) {
    return 'Must be greater than 0';
  }
  return null;
};

export const getValueError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Required';
  }
  const parsed = parseNumber(trimmed);
  if (parsed === null) {
    return 'Enter a number';
  }
  if (parsed < 0) {
    return 'Must be 0 or more';
  }
  return null;
};

export const formatDateLabel = (value: Date | null) => formatUsDate(value);

export const parseOrderDateValue = (value?: string | null) => {
  return parseDateValue(value);
};

export const sanitizeQuantityInput = (value: string, unit?: string | null) => {
  if (unitAllowsDecimal(unit)) {
    return sanitizeNumericInput(value);
  }
  return value.replace(/\D/g, '');
};

export const looksLikeId = (value: string) =>
  /^\d+$/.test(value) ||
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const toIdKey = (value: string | number) => String(value).trim().toLowerCase();

export const resolveOrderCustomerId = (order: OrderModel) => {
  if (order.customerId !== undefined && order.customerId !== null) {
    return order.customerId;
  }
  if (order.customer && looksLikeId(order.customer)) {
    return order.customer;
  }
  return null;
};

export const resolveOrderItems = (order: OrderModel) => {
  if (typeof order.items === 'number' && order.items > 0) {
    return order.items;
  }
  if (order.orderedProduct && order.orderedProduct.length > 0) {
    const quantitySum = order.orderedProduct.reduce((sum, item) => {
      const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
      return sum + quantity;
    }, 0);
    return quantitySum > 0 ? quantitySum : order.orderedProduct.length;
  }
  return order.items ?? 0;
};

export const resolveCustomerLabel = (customer: CustomerModel | null) => {
  if (!customer) {
    return '';
  }
  return customer.name ?? customer.email ?? String(customer.id ?? '').trim();
};

export const resolveProductValue = (product: ProductModel) =>
  product.defaultValue ?? product.price ?? 0;

export const matchesSearchWithinEnterprise = (
  tokens: Array<string | number | undefined | null>,
  searchTerm: string,
  enterpriseId: string | null,
  itemEnterpriseId?: string,
) => {
  if (enterpriseId && itemEnterpriseId && String(itemEnterpriseId) !== String(enterpriseId)) {
    return false;
  }
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return tokens
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).toLowerCase())
    .join(' ')
    .includes(normalized);
};
