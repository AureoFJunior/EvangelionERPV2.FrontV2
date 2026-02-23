import { PayableBill } from '../../services/erpService';
import { formatUsDateTime, parseDateValue } from '../datetime';

export const filterPayableBillsBySearch = (bills: PayableBill[], searchTerm: string) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return bills;
  }

  return bills.filter((bill) => {
    const id = bill.id?.toLowerCase() ?? '';
    const description = bill.description.toLowerCase();
    const dueDate = bill.dueDate.toLowerCase();
    const dueDateFormatted = formatUsDateTime(bill.dueDate).toLowerCase();
    return (
      id.includes(normalizedSearch) ||
      description.includes(normalizedSearch) ||
      dueDate.includes(normalizedSearch) ||
      dueDateFormatted.includes(normalizedSearch)
    );
  });
};

export const parseAmountInput = (value: string) => {
  const sanitized = value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');

  if (!sanitized) {
    return null;
  }

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatDateLabel = (value?: string | null) => {
  return formatUsDateTime(value);
};

export const formatDateInput = (value?: string | null) => {
  const date = parseDateValue(value);
  if (!date) {
    return '';
  }
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

export const toIsoFromDateInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseDateValue(trimmed);
  if (!parsed) {
    return null;
  }
  return parsed.toISOString();
};
