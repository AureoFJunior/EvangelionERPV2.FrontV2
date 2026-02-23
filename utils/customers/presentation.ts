import { Customer as CustomerModel } from '../../services/erpService';
import {
  CustomerFormValues,
  formatPostalCode,
  normalizeCustomerStatus,
  normalizeStateCode,
} from './validation';
import { parseAddress } from './address';

export type CustomerFilterOption = 'all' | 'active' | 'inactive';

export type OrderSummaryMap = Record<string, { count: number; spent: number }>;

export type CustomerCardData = {
  key: string | number;
  customer: CustomerModel;
  displayName: string;
  displayEmail: string;
  displayPhone: string | null;
  displayDocument: string | null;
  status: 'Active' | 'Inactive';
  orderCount: number;
  spentTotal: number;
};

export const resolveText = (value?: string | null) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const resolveBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }
  }
  return undefined;
};

const resolveCustomerText = (customer: CustomerModel, ...keys: string[]) => {
  const raw = customer as Record<string, unknown>;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value !== 'string') {
      continue;
    }
    const text = resolveText(value);
    if (text) {
      return text;
    }
  }
  return null;
};

const normalizeKey = (value?: string | number | null) => {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text ? text.toLowerCase() : null;
};

export const getCustomerStatus = (customer: CustomerModel) => {
  const rawCustomer = customer as Record<string, unknown>;
  const statusRaw =
    resolveText(customer.status) ??
    (typeof rawCustomer.Status === 'string' ? rawCustomer.Status : null);
  const isActiveRaw =
    rawCustomer.IsActive ??
    rawCustomer.isActive ??
    rawCustomer.active ??
    customer.isActive;

  return normalizeCustomerStatus(statusRaw, resolveBoolean(isActiveRaw));
};

export const toCustomerFormValues = (customer: CustomerModel): CustomerFormValues => {
  const name =
    resolveText(customer.name) ??
    resolveCustomerText(customer, 'Name', 'fullName', 'FullName', 'displayName', 'DisplayName') ??
    '';
  const email =
    resolveText(customer.email) ??
    resolveCustomerText(customer, 'Email', 'emailAddress', 'EmailAddress') ??
    '';
  const phone =
    resolveText(customer.phoneNumber) ??
    resolveCustomerText(customer, 'PhoneNumber', 'phone', 'Phone', 'mobile', 'Mobile') ??
    '';
  const address =
    resolveText(customer.adress) ??
    resolveCustomerText(customer, 'Adress', 'Address', 'address', 'addressLine', 'AddressLine') ??
    '';
  const document =
    resolveText(customer.document) ??
    resolveCustomerText(customer, 'Document', 'documentNumber', 'DocumentNumber') ??
    '';

  const parsedAddress = parseAddress(address);

  return {
    name,
    email,
    phone,
    street: parsedAddress.street,
    number: parsedAddress.number,
    neighborhood: parsedAddress.neighborhood,
    city: parsedAddress.city,
    state: normalizeStateCode(parsedAddress.state),
    postalCode: formatPostalCode(parsedAddress.postalCode),
    complement: parsedAddress.complement,
    document,
    status: getCustomerStatus(customer),
  };
};

export const filterCustomers = (
  customers: CustomerModel[],
  searchTerm: string,
  filterStatus: CustomerFilterOption,
) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const normalizedSearchDigits = normalizedSearch.replace(/\D/g, '');

  return customers.filter((customer) => {
    const nameValue =
      resolveText(customer.name) ??
      resolveCustomerText(customer, 'Name', 'fullName', 'FullName', 'displayName', 'DisplayName') ??
      '';
    const emailValue =
      resolveText(customer.email) ??
      resolveCustomerText(customer, 'Email', 'emailAddress', 'EmailAddress') ??
      '';
    const documentValue =
      resolveText(customer.document) ??
      resolveCustomerText(customer, 'Document', 'documentNumber', 'DocumentNumber') ??
      '';
    const documentDigits = documentValue.replace(/\D/g, '');
    const matchesDocumentDigits =
      normalizedSearchDigits.length > 0 &&
      documentDigits.includes(normalizedSearchDigits);
    const matchesSearch =
      normalizedSearch.length === 0 ||
      nameValue.toLowerCase().includes(normalizedSearch) ||
      emailValue.toLowerCase().includes(normalizedSearch) ||
      documentValue.toLowerCase().includes(normalizedSearch) ||
      matchesDocumentDigits;

    const statusValue = getCustomerStatus(customer).toLowerCase();
    const matchesStatus = filterStatus === 'all' || statusValue === filterStatus;

    return matchesSearch && matchesStatus;
  });
};

export const mapCustomersToCardData = (
  customers: CustomerModel[],
  orderSummary: OrderSummaryMap,
): CustomerCardData[] => {
  return customers.map((customer, index) => {
    const displayName =
      resolveText(customer.name) ??
      resolveCustomerText(customer, 'Name', 'fullName', 'FullName', 'displayName', 'DisplayName') ??
      resolveText(customer.email) ??
      resolveCustomerText(customer, 'Email', 'emailAddress', 'EmailAddress') ??
      'Unknown customer';

    const displayEmail =
      resolveText(customer.email) ??
      resolveCustomerText(customer, 'Email', 'emailAddress', 'EmailAddress') ??
      'No email on file';

    const displayPhone =
      resolveText(customer.phoneNumber) ??
      resolveCustomerText(customer, 'PhoneNumber', 'phone', 'Phone', 'mobile', 'Mobile') ??
      null;

    const displayDocument =
      resolveText(customer.document) ??
      resolveCustomerText(customer, 'Document', 'documentNumber', 'DocumentNumber') ??
      null;

    const status = getCustomerStatus(customer);

    const orderKeyCandidates = [
      normalizeKey(customer.id),
      normalizeKey(customer.email),
      normalizeKey(customer.name),
    ];

    const orderStats = orderKeyCandidates
      .map((key) => (key ? orderSummary[key] : undefined))
      .find((entry) => entry !== undefined);

    const orderCount =
      orderStats?.count ??
      (typeof customer.orders === 'number' && Number.isFinite(customer.orders)
        ? customer.orders
        : 0);
    const spentTotal =
      orderStats?.spent ??
      (typeof customer.spent === 'number' && Number.isFinite(customer.spent)
        ? customer.spent
        : 0);

    return {
      key: customer.id ?? customer.email ?? customer.name ?? index,
      customer,
      displayName,
      displayEmail,
      displayPhone,
      displayDocument,
      status,
      orderCount,
      spentTotal,
    };
  });
};

export const getCustomerStats = (customers: CustomerModel[]) => {
  const total = customers.length;
  const active = customers.filter((customer) => getCustomerStatus(customer) === 'Active').length;
  const inactive = total - active;

  return { total, active, inactive };
};
