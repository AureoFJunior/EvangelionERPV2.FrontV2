import { useEffect, useMemo, useRef, useState } from 'react';
import { Bill as BillModel, ErpService, Order as OrderModel } from '../../services/erpService';
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
  const [bills, setBills] = useState<Map<string, BillModel>>(new Map());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const billFetchedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setOrders([]);
      setBills(new Map());
      billFetchedRef.current.clear();
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

  useEffect(() => {
    if (!isAuthenticated || authLoading || orders.length === 0) {
      return;
    }

    const pending = orders.filter(
      (order) => order.id != null && !billFetchedRef.current.has(String(order.id)),
    );

    if (pending.length === 0) {
      return;
    }

    let active = true;

    const loadBills = async () => {
      const fetched = new Map<string, BillModel>();

      for (const order of pending) {
        const key = String(order.id);
        billFetchedRef.current.add(key);

        const response = await erpService.getBillByOrder(order.id);
        if (!active) return;

        if (response.ok && response.data) {
          fetched.set(key, response.data);
        }
      }

      if (active) {
        setBills((prev) => {
          const merged = new Map(prev);
          fetched.forEach((bill, key) => merged.set(key, bill));
          return merged;
        });
      }
    };

    loadBills();

    return () => {
      active = false;
    };
  }, [orders, isAuthenticated, authLoading, erpService]);

  useEffect(() => {
    billFetchedRef.current.clear();
    setBills(new Map());
  }, [pageNumber]);

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
    bills,
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
