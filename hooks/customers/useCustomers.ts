import { useEffect, useRef, useState } from 'react';
import { Customer as CustomerModel, CustomerFilter, ErpService } from '../../services/erpService';

interface UseCustomersParams {
  erpService: ErpService;
  isAuthenticated: boolean;
  authLoading: boolean;
  pageSize?: number;
}

export function useCustomers({
  erpService,
  isAuthenticated,
  authLoading,
  pageSize = 25,
}: UseCustomersParams) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<CustomerModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const customerRequestRef = useRef({ id: 0, key: '' });

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    let active = true;
    const trimmedSearch = searchTerm.trim();
    const requestId = customerRequestRef.current.id + 1;
    const requestKey = `${trimmedSearch}|${pageNumber}|${pageSize}|${refreshKey}`;
    customerRequestRef.current = { id: requestId, key: requestKey };

    const loadCustomers = async () => {
      setLoading(true);
      setErrorMessage(null);

      const digitsOnlySearch = trimmedSearch.replace(/\D/g, '');
      const searchFilter: CustomerFilter =
        trimmedSearch.length === 0
          ? {}
          : digitsOnlySearch.length >= 3
            ? { document: trimmedSearch }
            : { name: trimmedSearch };

      const response = await erpService.fetchCustomers(
        pageNumber,
        pageSize,
        true,
        searchFilter,
      );
      if (!active) {
        return;
      }

      const current = customerRequestRef.current;
      if (current.id !== requestId || current.key !== requestKey) {
        return;
      }

      if (response.ok && response.data) {
        setCustomers(response.data);
        setHasMore(response.data.length === pageSize);
      } else {
        setErrorMessage(response.error ?? 'Unable to load customers');
      }

      setLoading(false);
    };

    loadCustomers();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading, pageNumber, pageSize, searchTerm, refreshKey]);

  const refresh = () => setRefreshKey((prev) => prev + 1);

  return {
    searchTerm,
    setSearchTerm,
    customers,
    setCustomers,
    loading,
    errorMessage,
    setErrorMessage,
    pageNumber,
    setPageNumber,
    pageSize,
    hasMore,
    refresh,
  };
}
