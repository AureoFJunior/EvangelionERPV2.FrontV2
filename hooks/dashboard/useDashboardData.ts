import { useEffect, useState } from 'react';
import {
  Customer as CustomerModel,
  ErpService,
  Order as OrderModel,
  Product as ProductModel,
} from '../../services/erpService';

interface UseDashboardDataParams {
  erpService: ErpService;
  isAuthenticated: boolean;
  authLoading: boolean;
  enterpriseId: string | null;
}

export function useDashboardData({
  erpService,
  isAuthenticated,
  authLoading,
  enterpriseId,
}: UseDashboardDataParams) {
  const DASHBOARD_PAGE_SIZE = 100;
  const DASHBOARD_MAX_PAGES = 25;
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [orders, setOrders] = useState<OrderModel[]>([]);
  const [customers, setCustomers] = useState<CustomerModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      return;
    }

    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setErrorMessage(null);

      const fetchAllPages = async <T extends { id?: string | number | null }>(
        fetchPage: (pageNumber: number, pageSize: number) => Promise<{
          ok: boolean;
          data: T[] | null;
          error?: string;
        }>,
      ) => {
        const allRows: T[] = [];
        const seenKeys = new Set<string>();
        for (let page = 1; page <= DASHBOARD_MAX_PAGES; page += 1) {
          const response = await fetchPage(page, DASHBOARD_PAGE_SIZE);
          if (!response.ok) {
            return { ok: false as const, data: null, error: response.error };
          }

          const rows = response.data ?? [];
          if (rows.length === 0) {
            break;
          }

          let addedRows = 0;
          rows.forEach((row, index) => {
            const rawId = row?.id;
            const key =
              rawId !== undefined && rawId !== null && String(rawId).trim() !== ''
                ? String(rawId)
                : `page:${page}:idx:${index}`;

            if (seenKeys.has(key)) {
              return;
            }

            seenKeys.add(key);
            allRows.push(row);
            addedRows += 1;
          });

          // Some backends cap page size silently; stop only when a page yields no new rows.
          if (addedRows === 0) {
            break;
          }
        }

        return { ok: true as const, data: allRows };
      };

      const [productsResponse, ordersResponse, customersResponse] = await Promise.all([
        fetchAllPages<ProductModel>((pageNumber, pageSize) =>
          erpService.fetchProducts(pageNumber, pageSize, false, {
            isActive: true,
            name: '',
            enterpriseId: enterpriseId ?? undefined,
          }),
        ),
        fetchAllPages<OrderModel>((pageNumber, pageSize) =>
          erpService.fetchOrders(pageNumber, pageSize, false, {
            isActive: true,
            enterpriseId: enterpriseId ?? undefined,
          }),
        ),
        fetchAllPages<CustomerModel>((pageNumber, pageSize) =>
          erpService.fetchCustomers(pageNumber, pageSize, false, {
            isActive: true,
            enterpriseId: enterpriseId ?? undefined,
          }),
        ),
      ]);

      if (!active) {
        return;
      }

      let nextError: string | null = null;

      if (productsResponse.ok && productsResponse.data) {
        setProducts(productsResponse.data.filter((product) => product.isActive === true));
      } else {
        setProducts([]);
        nextError = productsResponse.error ?? 'Unable to load products';
      }

      if (ordersResponse.ok && ordersResponse.data) {
        setOrders(ordersResponse.data.filter((order) => order.isActive === true));
      } else {
        setOrders([]);
        if (!nextError) {
          nextError = ordersResponse.error ?? 'Unable to load orders';
        }
      }

      if (customersResponse.ok && customersResponse.data) {
        setCustomers(customersResponse.data.filter((customer) => customer.isActive === true));
      } else {
        setCustomers([]);
        if (!nextError) {
          nextError = customersResponse.error ?? 'Unable to load customers';
        }
      }

      setErrorMessage(nextError);
      setLoading(false);
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading, enterpriseId]);

  return { products, orders, customers, loading, errorMessage };
}
