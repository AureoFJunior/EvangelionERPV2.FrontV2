import { useCallback, useEffect, useState } from 'react';
import { Customer as CustomerModel, ErpService } from '../../services/erpService';
import { getCustomerStats } from '../../utils/customers/presentation';

const STATS_PAGE_SIZE = 100;
const STATS_MAX_PAGES = 50;

interface UseCustomerStatsParams {
  erpService: ErpService;
  isAuthenticated: boolean;
  authLoading: boolean;
  enterpriseId: string | null;
}

export function useCustomerStats({
  erpService,
  isAuthenticated,
  authLoading,
  enterpriseId,
}: UseCustomerStatsParams) {
  const [stats, setStats] = useState(() => getCustomerStats([]));
  const [reloadKey, setReloadKey] = useState(0);

  const refreshStats = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setStats(getCustomerStats([]));
      return;
    }

    let active = true;

    const run = async () => {
      let page = 1;
      const allCustomers: CustomerModel[] = [];
      const seenIds = new Set<string>();

      while (active && page <= STATS_MAX_PAGES) {
        const response = await erpService.fetchCustomers(page, STATS_PAGE_SIZE, true, {
          enterpriseId: enterpriseId ?? undefined,
        });

        if (!response.ok) {
          break;
        }

        const rows = response.data ?? [];
        if (rows.length === 0) {
          break;
        }

        let addedRows = 0;
        rows.forEach((customer, index) => {
          const rawId = customer.id;
          const key =
            rawId !== undefined && rawId !== null && String(rawId).trim() !== ''
              ? String(rawId)
              : `page:${page}:idx:${index}`;

          if (seenIds.has(key)) {
            return;
          }

          seenIds.add(key);
          allCustomers.push(customer);
          addedRows += 1;
        });

        // Backends that ignore page parameters can repeat rows forever; stop once a page adds nothing new.
        if (addedRows === 0) {
          break;
        }

        page += 1;
      }

      if (active) {
        setStats(getCustomerStats(allCustomers));
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading, enterpriseId, reloadKey]);

  return { stats, refreshStats };
}
