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

export interface ProductFilter {
  isActive?: boolean;
  name?: string;
}

export interface OrderFilter {
  status?: string;
  customer?: string;
}

export interface Report {
  id: number;
  title: string;
  description: string;
  date: string;
  type: string;
  icon: string;
}

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
