import { ApiClient } from './apiClient';

export interface Product {
  id: string | number;
  name: string;
  category: string;
  price?: number;
  stock?: number;
  defaultValue?: number;
  storageQuantity?: number;
  status: string;
  description?: string;
  pictureAddress?: string;
  pictureAdress?: string;
  isActive?: boolean;
  unitOfMeasure?: string;
  isExternal?: boolean;
  isService?: boolean;
  enterpriseId?: string;
  createdAt?: string;
  updatedAt?: string;
  orderedProduct?: unknown[];
}

export interface Order {
  id: number;
  customer: string;
  date: string;
  total: number;
  status: string;
  items: number;
}

export interface Customer {
  id?: string | number;
  name?: string;
  email?: string;
  status?: string;
  orders?: number;
  spent?: number;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  isVip?: boolean;
  enterpriseId?: string;
}

export interface ProductFilter {
  isActive?: boolean;
  name?: string;
}

export interface OrderFilter {
  status?: string;
  customer?: string;
}

export interface CustomerFilter {
  name?: string;
  email?: string;
  status?: string;
}

export interface Report {
  id: number;
  title: string;
  description: string;
  date: string;
  type: string;
  icon: string;
}

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const pickFirstString = (...values: unknown[]) => {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
};

const normalizeNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const pickFirstNumber = (...values: unknown[]) => {
  for (const value of values) {
    const normalized = normalizeNumber(value);
    if (normalized !== null) {
      return normalized;
    }
  }
  return null;
};

const normalizeBoolean = (value: unknown) => {
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

const normalizeDate = (value: unknown) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export class ErpService {
  constructor(private readonly client: ApiClient) {}

  async fetchProducts(
    pageNumber = 1,
    pageSize = 50,
    descending = false,
    filter: ProductFilter = { isActive: true, name: '' },
  ) {
    const response = await this.client.request<Product[], ProductFilter>({
      path: `/Product/GetProductsByFilter/${descending}/${pageNumber}/${pageSize}`,
      method: 'POST',
      body: filter,
    });

    if (response.ok) {
      const normalized = this.normalizeList<Product>(response.data);
      const mapped = normalized.map((item) => ({
        ...item,
        price: item.price ?? item.defaultValue ?? 0,
        stock: item.stock ?? item.storageQuantity ?? 0,
        defaultValue: item.defaultValue ?? item.price ?? 0,
        storageQuantity: item.storageQuantity ?? item.stock ?? 0,
      }));
      return {
        ...response,
        data: mapped,
      };
    }
    return response;
  }

  async fetchOrders(
    pageNumber = 1,
    pageSize = 50,
    descending = false,
    filter: OrderFilter = {},
  ) {
    const response = await this.client.request<Order[], OrderFilter>({
      path: `/Order/GetOrdersByFilter/${descending}/${pageNumber}/${pageSize}`,
      method: 'POST',
      body: filter,
    });

    if (response.ok) {
      return {
        ...response,
        data: this.normalizeList<Order>(response.data),
      };
    }
    return response;
  }

  async fetchCustomers(
    pageNumber = 1,
    pageSize = 50,
    descending = false,
    filter: CustomerFilter = {},
  ) {
    const response = await this.client.request<Customer[], CustomerFilter>({
      path: `/Customer/GetCustomersByFilter/${descending}/${pageNumber}/${pageSize}`,
      method: 'POST',
      body: filter,
    });

    if (response.ok) {
      const normalized = this.normalizeList<Customer>(response.data);
      const mapped = normalized.map((item) => this.normalizeCustomer(item as Record<string, any>));
      return {
        ...response,
        data: mapped,
      };
    }
    return response;
  }

  async createCustomer(customer: Customer) {
    return this.client.request<Customer, Customer>({
      path: '/Customer/AddCustomer',
      method: 'POST',
      body: customer,
    });
  }

  async updateCustomer(customer: Customer) {
    return this.client.request<Customer, Customer>({
      path: '/Customer/UpdateCustomer',
      method: 'PUT',
      body: customer,
    });
  }

  async deactivateCustomer(id: string | number) {
    const encodedId = encodeURIComponent(String(id));
    return this.client.request<void>({
      path: `/Customer/DeleteCustomer/${encodedId}`,
      method: 'DELETE',
    });
  }

  async updateProduct(product: Product) {
    return this.client.request<Product, Product>({
      path: '/Product/UpdateProduct',
      method: 'PUT',
      body: product,
    });
  }

  async createProduct(payload: { product: Product; file?: string }) {
    return this.client.request<Product, { product: Product; file?: string }>({
      path: '/Product/AddProduct',
      method: 'POST',
      body: payload,
    });
  }

  async deleteProduct(id: string | number) {
    return this.client.request<void>({
      path: '/Product/DeleteProduct',
      method: 'DELETE',
      query: { id },
    });
  }

  fetchReports() {
    return this.client.request<Report[]>({
      path: '/reports',
      method: 'GET',
    });
  }

  private normalizeCustomer(item: Record<string, any>): Customer {
    const idCandidate =
      item.id ??
      item.customerId ??
      item.customer_id ??
      item.customerCode ??
      item.customer_code ??
      item.code ??
      item.custId ??
      item.cust_id ??
      item.userId ??
      item.user_id ??
      item.uuid ??
      item.externalId ??
      item.external_id ??
      item.document ??
      item.documentNumber ??
      item.document_number ??
      item.email ??
      item.name ??
      null;
    const normalizedId =
      typeof idCandidate === 'string' ? idCandidate.trim() : idCandidate;
    const id = normalizedId === '' ? undefined : normalizedId;

    const firstName = pickFirstString(
      item.firstName,
      item.first_name,
      item.givenName,
      item.given_name,
    );
    const lastName = pickFirstString(
      item.lastName,
      item.last_name,
      item.surname,
      item.familyName,
      item.family_name,
    );
    const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const name =
      pickFirstString(
        item.name,
        item.fullName,
        item.full_name,
        item.displayName,
        item.display_name,
      ) ||
      combinedName ||
      null;

    const email = pickFirstString(
      item.email,
      item.emailAddress,
      item.email_address,
      item.mail,
      item.contactEmail,
      item.contact_email,
      item?.contact?.email,
    );

    const orders = pickFirstNumber(
      item.orders,
      item.orderCount,
      item.ordersCount,
      item.orders_count,
      item.totalOrders,
      item.total_orders,
      item.totalPurchases,
      item.total_purchases,
      item.purchaseCount,
      item.purchase_count,
    );

    const spent = pickFirstNumber(
      item.spent,
      item.totalSpent,
      item.total_spent,
      item.totalValue,
      item.total_value,
      item.totalAmount,
      item.total_amount,
      item.total,
      item.lifetimeValue,
      item.lifetime_value,
    );

    const statusCandidate = pickFirstString(
      item.status,
      item.customerStatus,
      item.customer_status,
      item.state,
    );
    const statusNormalized = statusCandidate?.toLowerCase();
    const isActive = normalizeBoolean(item.isActive ?? item.active ?? item.is_active);
    const status =
      statusNormalized === 'inactive' ||
      statusNormalized === 'disabled' ||
      statusNormalized === 'blocked' ||
      isActive === false
        ? 'Inactive'
        : 'Active';

    return {
      id,
      name: name ?? undefined,
      email: email ?? undefined,
      status: status ?? undefined,
      orders: orders ?? 0,
      spent: spent ?? 0,
      createdAt: pickFirstString(item.createdAt, item.created_at, item.createdOn, item.created_on) ?? undefined,
      updatedAt: pickFirstString(item.updatedAt, item.updated_at, item.updatedOn, item.updated_on) ?? undefined,
      isActive: normalizeBoolean(item.isActive ?? item.active ?? item.is_active),
      isVip: normalizeBoolean(item.isVip ?? item.isVIP ?? item.vip),
      enterpriseId:
        pickFirstString(item.enterpriseId, item.enterprise_id, item.tenantId, item.tenant_id) ??
        undefined,
    };
  }

  private normalizeList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) {
      return payload as T[];
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).items)) {
      return (payload as any).items as T[];
    }
    return [];
  }
}
