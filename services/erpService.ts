import { Buffer } from 'buffer';
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
  id: string | number;
  customer: string;
  customerId?: string | number;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  total: number;
  totalValue?: number;
  status: string;
  items: number;
  orderedProduct?: OrderLineItem[];
  isActive?: boolean;
}

export interface OrderUpdatePayload {
  id: string | number;
  customer?: string;
  customerId?: string | number;
  date?: string;
  createdAt?: string;
  total?: number;
  totalValue?: number;
  items?: number;
  orderedProduct?: OrderLineItem[];
  isActive?: boolean;
  enterpriseId?: string;
  payday?: string | null;
  paymentScheduledDate?: string;
  userId?: string | number;
  status: number;
  updatedAt: string;
}

export interface Bill {
  id?: string | number;
  orderId?: string | number;
  bankCode: number;
  ourNumber: string;
  documentNumber: string;
  issueDate?: string;
  dueDate?: string;
  amount: number;
  digitableLine: string;
  barCode: string;
  htmlContent: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayableBill {
  id?: string;
  description: string;
  dueDate: string;
  paidAt?: string | null;
  amount: number;
  isPaid: boolean;
  enterpriseId?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

export interface PayableBillPayload {
  id?: string;
  description: string;
  dueDate: string;
  paidAt?: string | null;
  amount: number;
  isPaid: boolean;
}

export interface CashFlowForecastDay {
  date: string;
  accountsReceivable: number;
  accountsPayable: number;
  projectedBalance: number;
  isRiskDay: boolean;
}

export interface CashFlowForecast {
  horizonInDays: number;
  currentBalance: number;
  finalProjectedBalance: number;
  dailyProjection: CashFlowForecastDay[];
}

export interface ForecastSimulationScenario {
  scenarioName: string;
  receivableDelayInDays: number;
  payableMultiplier: number;
}

export interface RunCashFlowSimulationRequest {
  horizonInDays: number;
  currentBalance: number;
  scenarios: ForecastSimulationScenario[];
}

export interface CashFlowSimulationResult {
  scenarioName: string;
  finalProjectedBalance: number;
  impact: number;
  riskDays: string[];
}

export interface OrderLineItem {
  productId: string | number;
  quantity: number;
  value: number;
  total?: number;
  totalValue?: number;
  product?: Product;
}

export interface OrderCreatePayload {
  customer: string;
  date: string;
  total: number;
  totalValue?: number;
  status: number;
  items: number;
  customerId?: string | number;
  enterpriseId?: string;
  orderedProduct?: OrderLineItem[];
}

export interface Customer {
  id?: string | number;
  name?: string;
  email?: string;
  phoneNumber?: string;
  adress?: string;
  document?: string;
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
  enterpriseId?: string;
}

export interface OrderFilter {
  status?: string;
  customer?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  enterpriseId?: string;
}

export interface CustomerFilter {
  id?: string | number;
  customerId?: string | number;
  customerCode?: string | number;
  name?: string;
  document?: string;
  email?: string;
  status?: string;
  enterpriseId?: string;
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

const ORDER_STATUS_LABELS = ['Pending', 'Processing', 'Shipped', 'Delivered'] as const;

const resolveOrderStatusLabel = (...values: unknown[]) => {
  for (const value of values) {
    const numeric = normalizeNumber(value);
    if (numeric !== null && Number.isInteger(numeric) && numeric >= 0 && numeric < ORDER_STATUS_LABELS.length) {
      return ORDER_STATUS_LABELS[numeric];
    }

    const normalized = normalizeString(value)?.toLowerCase();
    if (!normalized) {
      continue;
    }

    const match = ORDER_STATUS_LABELS.find((entry) => entry.toLowerCase() === normalized);
    if (match) {
      return match;
    }
  }

  return 'Pending';
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

const looksLikeId = (value: string | null) => {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (/^\d+$/.test(trimmed)) {
    return true;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
};

export class ErpService {
  constructor(private readonly client: ApiClient) {}

  async fetchProducts(
    pageNumber = 1,
    pageSize = 25,
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
      const mapped = normalized.map((item) => {
        const normalizedItem = this.normalizeProduct(item as Record<string, any>);
        return {
          ...normalizedItem,
          price: normalizedItem.price ?? normalizedItem.defaultValue ?? 0,
          stock: normalizedItem.stock ?? normalizedItem.storageQuantity ?? 0,
          defaultValue: normalizedItem.defaultValue ?? normalizedItem.price ?? 0,
          storageQuantity: normalizedItem.storageQuantity ?? normalizedItem.stock ?? 0,
        };
      });
      return {
        ...response,
        data: mapped,
      };
    }
    return response;
  }

  async fetchOrders(
    pageNumber = 1,
    pageSize = 25,
    descending = false,
    filter: OrderFilter = {},
  ) {
    const response = await this.client.request<Order[], OrderFilter>({
      path: `/Order/GetOrdersByFilter/${descending}/${pageNumber}/${pageSize}`,
      method: 'POST',
      body: filter,
    });

    if (response.ok) {
      const normalized = this.normalizeList<Order>(response.data);
      const mapped = normalized.map((item) => this.normalizeOrder(item as Record<string, any>));
      return {
        ...response,
        data: mapped,
      };
    }
    return response;
  }

  async createOrder(order: OrderCreatePayload) {
    return this.client.request<Order, OrderCreatePayload>({
      path: '/Order/AddOrder',
      method: 'POST',
      body: order,
    });
  }

  async updateOrder(order: OrderUpdatePayload) {
    const normalizeOrderResponse = (response: {
      ok: boolean;
      data: Order | null;
      status: number;
      error?: string;
      headers: Record<string, string>;
    }) => {
      if (response.ok && response.data) {
        return {
          ...response,
          data: this.normalizeOrder(response.data as Record<string, any>),
        };
      }

      if (response.ok) {
        return {
          ...response,
          data: null,
        };
      }

      return response;
    };

    const response = await this.client.request<Order, OrderUpdatePayload>({
      path: '/Order/UpdateOrder',
      method: 'PUT',
      body: order,
    });

    if (response.ok) {
      return normalizeOrderResponse(response);
    }

    const fallbackPost = await this.client.request<Order, OrderUpdatePayload>({
      path: '/Order/UpdateOrder',
      method: 'POST',
      body: order,
    });

    if (fallbackPost.ok) {
      return normalizeOrderResponse(fallbackPost);
    }
    return fallbackPost;
  }

  async deleteOrder(id: string | number) {
    const response = await this.client.request<void>({
      path: '/Order/DeleteOrder',
      method: 'DELETE',
      query: { id },
    });

    if (response.ok) {
      return response;
    }

    const encodedId = encodeURIComponent(String(id));
    const byPath = await this.client.request<void>({
      path: `/Order/DeleteOrder/${encodedId}`,
      method: 'DELETE',
    });

    if (byPath.ok) {
      return byPath;
    }

    const deleteWithBody = await this.client.request<void, { id: string | number }>({
      path: '/Order/DeleteOrder',
      method: 'DELETE',
      body: { id },
    });

    if (deleteWithBody.ok) {
      return deleteWithBody;
    }

    const deleteWithAltBody = await this.client.request<void, { orderId: string | number }>({
      path: '/Order/DeleteOrder',
      method: 'DELETE',
      body: { orderId: id },
    });

    if (deleteWithAltBody.ok) {
      return deleteWithAltBody;
    }

    const postFallback = await this.client.request<void, { id: string | number }>({
      path: '/Order/DeleteOrder',
      method: 'POST',
      body: { id },
    });

    if (postFallback.ok) {
      return postFallback;
    }

    return this.client.request<void, { orderId: string | number }>({
      path: '/Order/DeleteOrder',
      method: 'POST',
      body: { orderId: id },
    });
  }

  async fetchCustomers(
    pageNumber = 1,
    pageSize = 25,
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

  async fetchCustomerById(customerId: string | number) {
    const encodedId = encodeURIComponent(String(customerId));
    const response = await this.client.request<Customer>({
      path: `/Customer/GetCustomer/${encodedId}`,
      method: 'GET',
    });

    if (response.ok && response.data) {
      const payload =
        Array.isArray(response.data) && response.data.length > 0
          ? response.data[0]
          : response.data;
      const normalized = this.normalizeCustomer(payload as Record<string, any>);
      return {
        ...response,
        data: normalized,
      };
    }

    if (response.ok) {
      const fallback = await this.fetchCustomers(1, 25, false, {
        id: customerId,
        customerId,
        customerCode: customerId,
      });
      if (fallback.ok && fallback.data) {
        const match =
          fallback.data.find(
            (customer) =>
              customer.id !== undefined &&
              customer.id !== null &&
              String(customer.id) === String(customerId),
          ) ?? null;
        return {
          ...fallback,
          data: match,
        };
      }
      return {
        ...fallback,
        data: null,
      };
    }

    return { ...response, data: null };
  }

  async fetchOrderById(orderId: string | number) {
    const encodedId = encodeURIComponent(String(orderId));
    const response = await this.client.request<Order>({
      path: `/Order/GetOrder/${encodedId}`,
      method: 'GET',
    });

    if (response.ok && response.data) {
      const payload =
        Array.isArray(response.data) && response.data.length > 0
          ? response.data[0]
          : response.data;
      const normalized = this.normalizeOrder(payload as Record<string, any>);
      return {
        ...response,
        data: normalized,
      };
    }

    return {
      ...response,
      data: null,
    };
  }

  async getBillByOrder(orderId: string | number) {
    const encodedId = encodeURIComponent(String(orderId));
    const response = await this.client.request<Bill>({
      path: `/Bills/GetByOrder/${encodedId}`,
      method: 'GET',
    });

    if (response.ok && response.data) {
      const normalized = this.normalizeBill(response.data as Record<string, any>);
      return {
        ...response,
        data: normalized,
      };
    }

    if (response.ok) {
      return { ...response, data: null };
    }

    return response;
  }

  async getBillPdf(orderId: string | number) {
    const encodedId = encodeURIComponent(String(orderId));
    const response = await this.client.requestBinary({
      path: `/Bills/Pdf/${encodedId}`,
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
      },
    });

    if (!response.ok || !response.data) {
      return { ...response, data: null };
    }

    const base64 = this.arrayBufferToBase64(response.data);
    return { ...response, data: base64 };
  }

  async generateBill(orderId: string | number) {
    const encodedId = encodeURIComponent(String(orderId));
    const response = await this.client.request<Bill>({
      path: `/Bills/Generate/${encodedId}`,
      method: 'POST',
    });

    if (response.ok && response.data) {
      const normalized = this.normalizeBill(response.data as Record<string, any>);
      return {
        ...response,
        data: normalized,
      };
    }

    if (response.ok) {
      return { ...response, data: null };
    }

    return response;
  }

  async fetchPayableBills(pageNumber = 1, pageSize = 25) {
    const pagedResponse = await this.client.request<PayableBill[]>({
      path: `/PayableBills/GetPayableBills/${pageNumber}/${pageSize}`,
      method: 'GET',
    });

    if (pagedResponse.ok) {
      const normalized = this
        .normalizeList<PayableBill>(pagedResponse.data)
        .map((item) => this.normalizePayableBill(item as Record<string, any>));
      return {
        ...pagedResponse,
        data: normalized,
      };
    }

    const fallbackResponse = await this.client.request<PayableBill[]>({
      path: '/PayableBills/GetPayableBills',
      method: 'GET',
    });

    if (fallbackResponse.ok) {
      const normalized = this
        .normalizeList<PayableBill>(fallbackResponse.data)
        .map((item) => this.normalizePayableBill(item as Record<string, any>));
      return {
        ...fallbackResponse,
        data: normalized,
      };
    }

    return fallbackResponse;
  }

  async createPayableBill(payload: PayableBillPayload) {
    const response = await this.client.request<PayableBill, PayableBillPayload>({
      path: '/PayableBills/AddPayableBill',
      method: 'POST',
      body: payload,
    });

    if (response.ok && response.data) {
      return {
        ...response,
        data: this.normalizePayableBill(response.data as Record<string, any>),
      };
    }

    return response;
  }

  async updatePayableBill(payload: PayableBillPayload) {
    const response = await this.client.request<PayableBill, PayableBillPayload>({
      path: '/PayableBills/UpdatePayableBill',
      method: 'PUT',
      body: payload,
    });

    if (response.ok && response.data) {
      return {
        ...response,
        data: this.normalizePayableBill(response.data as Record<string, any>),
      };
    }

    return response;
  }

  async deletePayableBill(id: string) {
    const encodedId = encodeURIComponent(id);
    return this.client.request<PayableBill>({
      path: `/PayableBills/DeletePayableBill/${encodedId}`,
      method: 'DELETE',
    });
  }

  async getCashFlowForecast(horizonInDays: number, currentBalance: number) {
    const encodedBalance = encodeURIComponent(String(currentBalance));
    const response = await this.client.request<CashFlowForecast>({
      path: `/CashFlowForecast/GetForecast/${horizonInDays}/${encodedBalance}`,
      method: 'GET',
    });

    if (response.ok && response.data) {
      return {
        ...response,
        data: this.normalizeCashFlowForecast(response.data as Record<string, any>),
      };
    }

    return response;
  }

  async runCashFlowSimulation(payload: RunCashFlowSimulationRequest) {
    const response = await this.client.request<CashFlowSimulationResult[], RunCashFlowSimulationRequest>({
      path: '/CashFlowForecast/RunSimulation',
      method: 'POST',
      body: payload,
    });

    if (response.ok && response.data) {
      const normalized = this
        .normalizeList<CashFlowSimulationResult>(response.data)
        .map((item) => this.normalizeCashFlowSimulationResult(item as Record<string, any>));
      return {
        ...response,
        data: normalized,
      };
    }

    return response;
  }

  async createCustomer(customer: Customer) {
    const response = await this.client.request<Customer, Customer>({
      path: '/Customer/AddCustomer',
      method: 'POST',
      body: customer,
    });
    if (response.ok && response.data) {
      return { ...response, data: this.normalizeCustomer(response.data as Record<string, any>) };
    }
    return response;
  }

  async updateCustomer(customer: Customer) {
    const response = await this.client.request<Customer, Customer>({
      path: '/Customer/UpdateCustomer',
      method: 'PUT',
      body: customer,
    });
    if (response.ok && response.data) {
      return { ...response, data: this.normalizeCustomer(response.data as Record<string, any>) };
    }
    return response;
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

  async createProduct(payload: { product: Product; file: string }) {
    return this.client.request<Product, { product: Product; file: string }>({
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
      item.Id ??
      item.customerId ??
      item.CustomerId ??
      item.CustomerID ??
      item.customer_id ??
      item.customerCode ??
      item.CustomerCode ??
      item.customer_code ??
      item.code ??
      item.custId ??
      item.CustId ??
      item.cust_id ??
      item.userId ??
      item.UserId ??
      item.user_id ??
      item.uuid ??
      item.Uuid ??
      item.externalId ??
      item.ExternalId ??
      item.external_id ??
      item.document ??
      item.Document ??
      item.documentNumber ??
      item.DocumentNumber ??
      item.document_number ??
      item.email ??
      item.Email ??
      item.name ??
      item.Name ??
      null;
    const normalizedId =
      typeof idCandidate === 'string' ? idCandidate.trim() : idCandidate;
    const id = normalizedId === '' ? undefined : normalizedId;

    const firstName = pickFirstString(
      item.firstName,
      item.FirstName,
      item.first_name,
      item.givenName,
      item.GivenName,
      item.given_name,
    );
    const lastName = pickFirstString(
      item.lastName,
      item.LastName,
      item.last_name,
      item.surname,
      item.familyName,
      item.FamilyName,
      item.family_name,
    );
    const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const name =
      pickFirstString(
        item.name,
        item.Name,
        item.fullName,
        item.FullName,
        item.full_name,
        item.displayName,
        item.DisplayName,
        item.display_name,
      ) ||
      combinedName ||
      null;

    const email = pickFirstString(
      item.email,
      item.Email,
      item.emailAddress,
      item.EmailAddress,
      item.email_address,
      item.mail,
      item.contactEmail,
      item.ContactEmail,
      item.contact_email,
      item?.contact?.email,
    );

    const phoneNumber = pickFirstString(
      item.phoneNumber,
      item.PhoneNumber,
      item.phone_number,
      item.phone,
      item.Phone,
      item.mobile,
      item.Mobile,
      item.mobileNumber,
      item.MobileNumber,
      item.mobile_number,
      item.contactPhone,
      item.ContactPhone,
      item.contact_phone,
    );

    const adress = pickFirstString(
      item.adress,
      item.Adress,
      item.address,
      item.Address,
      item.addressLine,
      item.AddressLine,
      item.address_line,
      item.street,
      item.Street,
      item.streetAddress,
      item.StreetAddress,
      item.street_address,
      item?.address?.line1,
    );

    const document = pickFirstString(
      item.document,
      item.Document,
      item.documentNumber,
      item.DocumentNumber,
      item.document_number,
      item.taxId,
      item.TaxId,
      item.tax_id,
      item.cpf,
      item.Cpf,
      item.cnpj,
      item.Cnpj,
    );

    const orders = pickFirstNumber(
      item.orders,
      item.Orders,
      item.orderCount,
      item.OrderCount,
      item.ordersCount,
      item.OrdersCount,
      item.orders_count,
      item.totalOrders,
      item.TotalOrders,
      item.total_orders,
      item.totalPurchases,
      item.TotalPurchases,
      item.total_purchases,
      item.purchaseCount,
      item.PurchaseCount,
      item.purchase_count,
    );

    const spent = pickFirstNumber(
      item.spent,
      item.Spent,
      item.totalSpent,
      item.TotalSpent,
      item.total_spent,
      item.totalValue,
      item.TotalValue,
      item.total_value,
      item.totalAmount,
      item.TotalAmount,
      item.total_amount,
      item.total,
      item.Total,
      item.lifetimeValue,
      item.LifetimeValue,
      item.lifetime_value,
    );

    const statusCandidate = pickFirstString(
      item.status,
      item.Status,
      item.customerStatus,
      item.CustomerStatus,
      item.customer_status,
      item.state,
      item.State,
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
      ...item,
      id,
      name: name ?? undefined,
      email: email ?? undefined,
      phoneNumber: phoneNumber ?? undefined,
      adress: adress ?? undefined,
      document: document ?? undefined,
      status: status ?? undefined,
      orders: orders ?? 0,
      spent: spent ?? 0,
      createdAt:
        pickFirstString(
          item.createdAt,
          item.CreatedAt,
          item.created_at,
          item.createdOn,
          item.CreatedOn,
          item.created_on,
        ) ?? undefined,
      updatedAt:
        pickFirstString(
          item.updatedAt,
          item.UpdatedAt,
          item.updated_at,
          item.updatedOn,
          item.UpdatedOn,
          item.updated_on,
        ) ?? undefined,
      isActive: normalizeBoolean(item.isActive ?? item.IsActive ?? item.active ?? item.Active ?? item.is_active),
      isVip: normalizeBoolean(item.isVip ?? item.IsVip ?? item.isVIP ?? item.vip),
      enterpriseId:
        pickFirstString(
          item.enterpriseId,
          item.EnterpriseId,
          item.enterprise_id,
          item.tenantId,
          item.TenantId,
          item.tenant_id,
        ) ??
        undefined,
    };
  }

  private normalizeProduct(item: Record<string, any>): Product {
    const idCandidate =
      item.id ??
      item.Id ??
      item.productId ??
      item.ProductId ??
      item.product_id ??
      item.productCode ??
      item.ProductCode ??
      item.product_code ??
      item.code ??
      item.Code ??
      item.uuid ??
      item.Uuid ??
      item.externalId ??
      item.ExternalId ??
      null;

    const name = pickFirstString(
      item.name,
      item.Name,
      item.productName,
      item.ProductName,
      item.descriptionName,
    );

    const description = pickFirstString(
      item.description,
      item.Description,
      item.details,
      item.Details,
    );

    const defaultValue = pickFirstNumber(
      item.defaultValue,
      item.DefaultValue,
      item.price,
      item.Price,
      item.unitPrice,
      item.UnitPrice,
    );

    const storageQuantity = pickFirstNumber(
      item.storageQuantity,
      item.StorageQuantity,
      item.stock,
      item.Stock,
      item.quantity,
      item.Quantity,
    );

    const unitOfMeasure = pickFirstString(
      item.unitOfMeasure,
      item.UnitOfMeasure,
      item.uom,
      item.Uom,
      item.unit,
      item.Unit,
    );

    const pictureAddress = pickFirstString(
      item.pictureAddress,
      item.PictureAddress,
      item.pictureAdress,
      item.PictureAdress,
      item.picture_url,
      item.pictureUrl,
      item.PictureUrl,
    );

    return {
      ...item,
      id: idCandidate ?? item.id,
      name: name ?? '',
      category: pickFirstString(item.category, item.Category) ?? '',
      price: pickFirstNumber(item.price, item.Price, defaultValue) ?? undefined,
      defaultValue: defaultValue ?? undefined,
      storageQuantity: storageQuantity ?? undefined,
      stock: pickFirstNumber(item.stock, item.Stock, storageQuantity) ?? undefined,
      status: pickFirstString(item.status, item.Status) ?? '',
      description: description ?? undefined,
      pictureAddress: pictureAddress ?? undefined,
      pictureAdress: pictureAddress ?? undefined,
      unitOfMeasure: unitOfMeasure ?? undefined,
      isExternal: normalizeBoolean(item.isExternal ?? item.IsExternal),
      isService: normalizeBoolean(item.isService ?? item.IsService),
      isActive: normalizeBoolean(item.isActive ?? item.IsActive ?? item.active ?? item.Active ?? item.is_active),
      enterpriseId:
        pickFirstString(
          item.enterpriseId,
          item.EnterpriseId,
          item.enterprise_id,
          item.tenantId,
          item.TenantId,
          item.tenant_id,
        ) ?? undefined,
      createdAt:
        pickFirstString(
          item.createdAt,
          item.CreatedAt,
          item.created_at,
          item.createdOn,
          item.CreatedOn,
          item.created_on,
        ) ?? undefined,
      updatedAt:
        pickFirstString(
          item.updatedAt,
          item.UpdatedAt,
          item.updated_at,
          item.updatedOn,
          item.UpdatedOn,
          item.updated_on,
        ) ?? undefined,
      orderedProduct: item.orderedProduct ?? item.OrderedProduct ?? undefined,
    };
  }

  private normalizeOrder(item: Record<string, any>): Order {
    const idNumber = pickFirstNumber(
      item.id,
      item.Id,
      item.orderId,
      item.OrderId,
      item.order_id,
      item.orderCode,
      item.OrderCode,
      item.order_code,
    );
    const idString = pickFirstString(
      item.id,
      item.Id,
      item.orderId,
      item.OrderId,
      item.order_id,
      item.orderCode,
      item.OrderCode,
      item.order_code,
      item.uuid,
      item.Uuid,
      item.guid,
      item.Guid,
    );
    const id = (idNumber ?? idString ?? item.id ?? '') as string | number;

    let customer =
      pickFirstString(
        item.customer,
        item.Customer,
        item.customerName,
        item.CustomerName,
        item.customer_name,
        item.client,
        item.Client,
        item.clientName,
        item.ClientName,
        item.client_name,
        item.buyer,
        item.Buyer,
        item.buyerName,
        item.BuyerName,
        item.buyer_name,
        item?.customer?.name,
        item?.customer?.Name,
        item?.customer?.fullName,
        item?.customer?.FullName,
        item?.customer?.full_name,
        item?.customer?.displayName,
        item?.customer?.DisplayName,
        item?.customer?.display_name,
        item?.customer?.email,
      ) ?? 'Unknown customer';

    let customerId =
      item.customerId ??
      item.CustomerId ??
      item.customerID ??
      item.CustomerID ??
      item.customer_id ??
      item.customerid ??
      item.customerGuid ??
      item.CustomerGuid ??
      item.customer_guid ??
      item.customerUuid ??
      item.CustomerUuid ??
      item.customer_uuid ??
      item.customerCode ??
      item.CustomerCode ??
      item.customer_code ??
      item.custId ??
      item.CustId ??
      item.cust_id ??
      item.clientId ??
      item.ClientId ??
      item.client_id ??
      item.buyerId ??
      item.BuyerId ??
      item.buyer_id ??
      item?.customer?.id ??
      item?.customer?.Id ??
      item?.customer?.customerId ??
      item?.customer?.CustomerId ??
      undefined;

    const createdAt =
      pickFirstString(
        item.createdAt,
        item.CreatedAt,
        item.created_at,
        item.createdOn,
        item.CreatedOn,
        item.created_on,
      ) ??
      undefined;

    const date =
      pickFirstString(
        item.date,
        item.Date,
        item.orderDate,
        item.OrderDate,
        item.order_date,
        item.orderedAt,
        item.OrderedAt,
        item.ordered_at,
        item.payday,
        item.Payday,
        item.paymentScheduledDate,
        item.PaymentScheduledDate,
        createdAt,
      ) ?? '';

    const totalValue = pickFirstNumber(
      item.totalValue,
      item.TotalValue,
      item.total_value,
      item.total,
      item.Total,
      item.orderTotal,
      item.OrderTotal,
      item.order_total,
      item.amount,
      item.Amount,
      item.amountTotal,
      item.AmountTotal,
      item.amount_total,
    );

    const orderedProductCandidate =
      item.orderedProduct ??
      item.OrderedProduct ??
      item.orderedProducts ??
      item.OrderedProducts ??
      item.ordered_product ??
      item.orderdProduct ??
      item.orderProducts ??
      item.OrderProducts ??
      item.orderProduct ??
      item.OrderProduct ??
      item.order_items ??
      item.orderItems ??
      item.OrderItems ??
      item.productItems ??
      item.ProductItems ??
      item.products ??
      item.Products ??
      (Array.isArray(item.items) ? item.items : undefined) ??
      (Array.isArray(item.Items) ? item.Items : undefined) ??
      undefined;

    const orderedProduct = Array.isArray(orderedProductCandidate)
      ? orderedProductCandidate.map((entry) =>
          this.normalizeOrderLineItem(entry as Record<string, any>),
        )
      : undefined;

    const explicitItems = pickFirstNumber(
      item.items,
      item.Items,
      item.itemCount,
      item.ItemCount,
      item.itemsCount,
      item.ItemsCount,
      item.items_count,
      item.totalItems,
      item.TotalItems,
      item.total_items,
    );

    const derivedItems = (() => {
      if (!orderedProduct || orderedProduct.length === 0) {
        return null;
      }
      const quantitySum = orderedProduct.reduce((sum, entry) => {
        const quantity = typeof entry.quantity === 'number' ? entry.quantity : 0;
        return sum + quantity;
      }, 0);
      return quantitySum > 0 ? quantitySum : orderedProduct.length;
    })();

    const items = explicitItems ?? derivedItems ?? 0;

    const status = resolveOrderStatusLabel(
      item.status,
      item.Status,
      item.orderStatus,
      item.OrderStatus,
      item.order_status,
      item.state,
      item.State,
    );

    const updatedAt =
      pickFirstString(
        item.updatedAt,
        item.UpdatedAt,
        item.updated_at,
        item.updatedOn,
        item.UpdatedOn,
        item.updated_on,
      ) ??
      undefined;

    const isActive = normalizeBoolean(
      item.isActive ?? item.IsActive ?? item.active ?? item.Active ?? item.is_active,
    );

    if (!customerId && typeof customer === 'string' && looksLikeId(customer)) {
      customerId = customer;
      customer = 'Unknown customer';
    }

    return {
      id,
      customer,
      customerId,
      date,
      createdAt,
      updatedAt,
      total: totalValue ?? 0,
      totalValue: totalValue ?? undefined,
      status,
      items: items ?? 0,
      orderedProduct,
      isActive,
    };
  }

  private normalizeOrderLineItem(item: Record<string, any>): OrderLineItem {
    const productId =
      item.productId ??
      item.ProductId ??
      item.product_id ??
      item.productCode ??
      item.ProductCode ??
      item.product_code ??
      item.itemId ??
      item.ItemId ??
      item.item_id ??
      item.id ??
      item.Id ??
      item.product?.id ??
      item.product?.Id ??
      item.product?.productId ??
      item.product?.ProductId ??
      item?.product?.product_id ??
      '';

    const quantity =
      pickFirstNumber(
        item.quantity,
        item.Quantity,
        item.qty,
        item.amount,
        item.Amount,
        item.amountQuantity,
        item.AmountQuantity,
        item.amount_quantity,
        item.totalQuantity,
        item.TotalQuantity,
        item.total_quantity,
      ) ?? 0;

    const value =
      pickFirstNumber(
        item.value,
        item.Value,
        item.unitValue,
        item.UnitValue,
        item.unit_value,
        item.unitPrice,
        item.UnitPrice,
        item.unit_price,
        item.price,
        item.Price,
        item.defaultValue,
        item.DefaultValue,
        item.default_value,
        item.product?.defaultValue,
        item.product?.DefaultValue,
        item.product?.price,
        item.product?.Price,
      ) ?? 0;

    const total = pickFirstNumber(
      item.total,
      item.Total,
      item.totalValue,
      item.TotalValue,
      item.total_value,
      item.subtotal,
      item.subTotal,
      item.SubTotal,
      item.lineTotal,
      item.LineTotal,
      item.line_total,
    );

    const totalValue =
      pickFirstNumber(
        item.totalValue,
        item.TotalValue,
        item.total_value,
        item.total,
        item.Total,
        item.subtotal,
        item.subTotal,
        item.SubTotal,
        item.lineTotal,
        item.LineTotal,
        item.line_total,
      ) ?? total ?? undefined;

    const product =
      item.product ??
      item.productDetails ??
      item.product_detail ??
      item.item ??
      item.details ??
      undefined;

    return {
      productId,
      quantity,
      value,
      total: total ?? undefined,
      totalValue,
      product,
    };
  }

  private normalizeBill(item: Record<string, any>): Bill {
    const id = item.id ?? item.Id ?? item.boletoId ?? item.BoletoId ?? item.boleto_id ?? undefined;
    const orderId =
      item.orderId ?? item.OrderId ?? item.order_id ?? item.orderID ?? item.OrderID ?? undefined;
    const bankCode =
      pickFirstNumber(item.bankCode, item.BankCode, item.bank_code, item.bank, item.bankId, item.BankId) ?? 0;
    const ourNumber =
      pickFirstString(item.ourNumber, item.OurNumber, item.nossoNumero, item.nosso_numero) ?? '';
    const documentNumber =
      pickFirstString(item.documentNumber, item.DocumentNumber, item.numeroDocumento, item.numero_documento) ?? '';
    const issueDate =
      pickFirstString(
        item.issueDate,
        item.IssueDate,
        item.issue_date,
        item.dataEmissao,
        item.DataEmissao,
        item.data_emissao,
      ) ?? undefined;
    const dueDate =
      pickFirstString(
        item.dueDate,
        item.DueDate,
        item.due_date,
        item.dataVencimento,
        item.DataVencimento,
        item.data_vencimento,
      ) ?? undefined;
    const amount =
      pickFirstNumber(
        item.amount,
        item.Amount,
        item.valor,
        item.valorTitulo,
        item.valor_titulo,
      ) ?? 0;
    const digitableLine =
      pickFirstString(
        item.digitableLine,
        item.DigitableLine,
        item.linhaDigitavel,
        item.linha_digitavel,
      ) ?? '';
    const barCode =
      pickFirstString(
        item.barCode,
        item.BarCode,
        item.barcode,
        item.codigoBarras,
        item.codigo_barras,
      ) ?? '';
    const htmlContent = pickFirstString(item.htmlContent, item.HtmlContent, item.html, item.html_content) ?? '';

    return {
      id,
      orderId,
      bankCode,
      ourNumber,
      documentNumber,
      issueDate,
      dueDate,
      amount,
      digitableLine,
      barCode,
      htmlContent,
      createdAt: pickFirstString(item.createdAt, item.CreatedAt, item.created_at) ?? undefined,
      updatedAt: pickFirstString(item.updatedAt, item.UpdatedAt, item.updated_at) ?? undefined,
    };
  }

  private normalizePayableBill(item: Record<string, any>): PayableBill {
    return {
      id:
        pickFirstString(
          item.id,
          item.Id,
          item.payableBillId,
          item.PayableBillId,
          item.payable_bill_id,
        ) ?? undefined,
      description:
        pickFirstString(item.description, item.Description, item.name, item.Name, item.title, item.Title) ?? '',
      dueDate:
        pickFirstString(item.dueDate, item.DueDate, item.due_date, item.expireAt, item.ExpireAt) ??
        new Date().toISOString(),
      paidAt:
        pickFirstString(item.paidAt, item.PaidAt, item.paid_at, item.paymentDate, item.PaymentDate) ??
        null,
      amount: pickFirstNumber(item.amount, item.Amount, item.value, item.Value, item.total, item.Total) ?? 0,
      isPaid:
        normalizeBoolean(item.isPaid ?? item.IsPaid ?? item.paid ?? item.Paid ?? item.is_paid) ??
        false,
      enterpriseId:
        pickFirstString(item.enterpriseId, item.EnterpriseId, item.enterprise_id, item.tenantId, item.TenantId) ??
        undefined,
      createdAt:
        pickFirstString(item.createdAt, item.CreatedAt, item.created_at, item.createdOn, item.CreatedOn) ??
        undefined,
      updatedAt:
        pickFirstString(item.updatedAt, item.UpdatedAt, item.updated_at, item.updatedOn, item.UpdatedOn) ??
        undefined,
      isActive: normalizeBoolean(item.isActive ?? item.IsActive ?? item.active ?? item.Active ?? item.is_active),
    };
  }

  private normalizeCashFlowForecastDay(item: Record<string, any>): CashFlowForecastDay {
    const rawDate = pickFirstString(item.date, item.Date) ?? '';
    const parsedDate = normalizeDate(rawDate);
    return {
      date: parsedDate?.toISOString() ?? rawDate,
      accountsReceivable:
        pickFirstNumber(
          item.accountsReceivable,
          item.AccountsReceivable,
          item.receivables,
          item.Receivables,
        ) ?? 0,
      accountsPayable:
        pickFirstNumber(
          item.accountsPayable,
          item.AccountsPayable,
          item.payables,
          item.Payables,
        ) ?? 0,
      projectedBalance:
        pickFirstNumber(
          item.projectedBalance,
          item.ProjectedBalance,
          item.balance,
          item.Balance,
        ) ?? 0,
      isRiskDay:
        normalizeBoolean(item.isRiskDay ?? item.IsRiskDay ?? item.riskDay ?? item.RiskDay) ??
        false,
    };
  }

  private normalizeCashFlowForecast(item: Record<string, any>): CashFlowForecast {
    const projectionPayload =
      item.dailyProjection ?? item.DailyProjection ?? item.projection ?? item.Projection ?? [];
    const projection = this
      .normalizeList<CashFlowForecastDay>(projectionPayload)
      .map((day) => this.normalizeCashFlowForecastDay(day as Record<string, any>));

    return {
      horizonInDays: pickFirstNumber(item.horizonInDays, item.HorizonInDays, item.horizon, item.Horizon) ?? 30,
      currentBalance:
        pickFirstNumber(item.currentBalance, item.CurrentBalance, item.balance, item.Balance) ?? 0,
      finalProjectedBalance:
        pickFirstNumber(
          item.finalProjectedBalance,
          item.FinalProjectedBalance,
          item.projectedBalance,
          item.ProjectedBalance,
          item.finalBalance,
          item.FinalBalance,
        ) ?? 0,
      dailyProjection: projection,
    };
  }

  private normalizeCashFlowSimulationResult(item: Record<string, any>): CashFlowSimulationResult {
    const riskDaysPayload =
      item.riskDays ?? item.RiskDays ?? item.risk_dates ?? item.riskDates ?? [];
    const riskDays = Array.isArray(riskDaysPayload)
      ? riskDaysPayload
          .map((entry) => {
            if (typeof entry === 'string' && entry.trim()) {
              return entry;
            }
            if (entry instanceof Date) {
              return entry.toISOString();
            }
            return null;
          })
          .filter((entry): entry is string => Boolean(entry))
      : [];

    return {
      scenarioName: pickFirstString(item.scenarioName, item.ScenarioName, item.name, item.Name) ?? '',
      finalProjectedBalance:
        pickFirstNumber(
          item.finalProjectedBalance,
          item.FinalProjectedBalance,
          item.projectedBalance,
          item.ProjectedBalance,
        ) ?? 0,
      impact: pickFirstNumber(item.impact, item.Impact, item.delta, item.Delta) ?? 0,
      riskDays,
    };
  }

  private arrayBufferToBase64(buffer: ArrayBuffer) {
    return Buffer.from(new Uint8Array(buffer)).toString('base64');
  }

  private normalizeList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) {
      return payload as T[];
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).items)) {
      return (payload as any).items as T[];
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).Items)) {
      return (payload as any).Items as T[];
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).data)) {
      return (payload as any).data as T[];
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).Data)) {
      return (payload as any).Data as T[];
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
      return (payload as any).results as T[];
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).Results)) {
      return (payload as any).Results as T[];
    }
    return [];
  }
}
