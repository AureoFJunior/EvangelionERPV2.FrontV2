import { useEffect, useMemo, useState } from 'react';
import { ErpService, Report as ReportModel } from '../../services/erpService';

interface UseReportsDataParams {
  erpService: ErpService;
  isAuthenticated: boolean;
  authLoading: boolean;
}

const isSameMonth = (date: Date, now: Date) =>
  date.getFullYear() === now.getFullYear() &&
  date.getMonth() === now.getMonth();

const isSameDay = (date: Date, now: Date) =>
  isSameMonth(date, now) &&
  date.getDate() === now.getDate();

export function useReportsData({ erpService, isAuthenticated, authLoading }: UseReportsDataParams) {
  const [reports, setReports] = useState<ReportModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setReports([]);
      return;
    }

    let active = true;

    const loadReports = async () => {
      setLoading(true);
      setErrorMessage(null);

      const response = await erpService.fetchReports();
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        setReports(response.data);
      } else {
        setErrorMessage(response.error ?? 'Unable to load reports');
      }

      setLoading(false);
    };

    loadReports();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading]);

  const reportsThisMonth = useMemo(() => {
    const now = new Date();
    return reports.filter((report) => {
      const reportDate = new Date(report.date);
      return isSameMonth(reportDate, now);
    }).length;
  }, [reports]);

  const reportsToday = useMemo(() => {
    const now = new Date();
    return reports.filter((report) => {
      const reportDate = new Date(report.date);
      return isSameDay(reportDate, now);
    }).length;
  }, [reports]);

  return { reports, loading, errorMessage, reportsThisMonth, reportsToday };
}
