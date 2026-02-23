import { useCallback, useEffect, useState } from 'react';
import { ErpService } from '../../services/erpService';

interface UseOrderSummaryParams {
  erpService: ErpService;
  isAuthenticated: boolean;
  authLoading: boolean;
  enterpriseId: string | null;
}

type OrderSummaryMap = Record<string, { count: number; spent: number }>;

const normalizeKey = (value?: string | number | null) => {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text ? text.toLowerCase() : null;
};

export function useOrderSummary({
  erpService,
  isAuthenticated,
  authLoading,
  enterpriseId,
}: UseOrderSummaryParams) {
  const [orderSummary, setOrderSummary] = useState<OrderSummaryMap>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setOrderSummary({});
      setErrorMessage(null);
      return;
    }

    let active = true;

    const loadOrders = async () => {
      const summary: OrderSummaryMap = {};
      const perPage = 200;
      let page = 1;
      let hasMoreOrders = true;

      setOrderSummary({});
      setErrorMessage(null);

      while (hasMoreOrders) {
        const response = await erpService.fetchOrders(page, perPage, false, {
          enterpriseId: enterpriseId ?? undefined,
        });

        if (!active) {
          return;
        }

        if (!response.ok || !response.data) {
          setErrorMessage(response.error ?? 'Unable to load orders');
          break;
        }

        response.data.forEach((order) => {
          const orderKey = normalizeKey(order.customerId) ?? normalizeKey(order.customer);
          if (!orderKey) {
            return;
          }
          const entry = summary[orderKey] ?? { count: 0, spent: 0 };
          const amount = typeof order.totalValue === 'number' ? order.totalValue : order.total;
          entry.count += 1;
          entry.spent += Number.isFinite(amount) ? amount : 0;
          summary[orderKey] = entry;
        });

        hasMoreOrders = response.data.length === perPage;
        page += 1;
        if (page > 20) {
          hasMoreOrders = false;
        }
      }

      if (active) {
        setOrderSummary(summary);
      }
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading, enterpriseId, reloadKey]);

  const reloadOrderSummary = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  return { orderSummary, orderSummaryError: errorMessage, reloadOrderSummary };
}
