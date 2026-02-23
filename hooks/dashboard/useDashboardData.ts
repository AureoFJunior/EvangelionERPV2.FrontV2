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

      const [productsResponse, ordersResponse, customersResponse] = await Promise.all([
        erpService.fetchProducts(1, 200, false, {
          isActive: true,
          name: '',
          enterpriseId: enterpriseId ?? undefined,
        }),
        erpService.fetchOrders(1, 200, false, {
          enterpriseId: enterpriseId ?? undefined,
        }),
        erpService.fetchCustomers(1, 200, false, {
          enterpriseId: enterpriseId ?? undefined,
        }),
      ]);

      if (!active) {
        return;
      }

      let nextError: string | null = null;

      if (productsResponse.ok && productsResponse.data) {
        setProducts(productsResponse.data);
      } else {
        setProducts([]);
        nextError = productsResponse.error ?? 'Unable to load products';
      }

      if (ordersResponse.ok && ordersResponse.data) {
        setOrders(ordersResponse.data);
      } else {
        setOrders([]);
        if (!nextError) {
          nextError = ordersResponse.error ?? 'Unable to load orders';
        }
      }

      if (customersResponse.ok && customersResponse.data) {
        setCustomers(customersResponse.data);
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
