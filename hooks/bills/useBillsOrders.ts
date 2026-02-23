import { useEffect, useMemo, useState } from 'react';
import { ErpService, Order as OrderModel } from '../../services/erpService';
import { filterOrdersBySearch } from '../../utils/bills/helpers';

interface UseBillsOrdersParams {
  erpService: ErpService;
  isAuthenticated: boolean;
  authLoading: boolean;
  enterpriseId: string | null;
  pageSize?: number;
}

export function useBillsOrders({
  erpService,
  isAuthenticated,
  authLoading,
  enterpriseId,
  pageSize = 25,
}: UseBillsOrdersParams) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<OrderModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setOrders([]);
      return;
    }

    let active = true;

    const loadOrders = async () => {
      setLoading(true);
      setErrorMessage(null);

      const response = await erpService.fetchOrders(pageNumber, pageSize, false, {
        isActive: true,
        enterpriseId: enterpriseId ?? undefined,
      });

      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        setOrders(response.data);
        setHasMore(response.data.length === pageSize);
      } else {
        setErrorMessage(response.error ?? 'Unable to load orders');
      }

      setLoading(false);
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading, pageNumber, pageSize, enterpriseId]);

  const filteredOrders = useMemo(() => filterOrdersBySearch(orders, searchTerm), [orders, searchTerm]);

  const goPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goNextPage = () => {
    if (hasMore) {
      setPageNumber((prev) => prev + 1);
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    orders,
    setOrders,
    loading,
    errorMessage,
    setErrorMessage,
    pageNumber,
    setPageNumber,
    hasMore,
    goPrevPage,
    goNextPage,
    filteredOrders,
  };
}
