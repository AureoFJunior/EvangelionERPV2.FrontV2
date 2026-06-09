import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBadge } from './StatusBadge';
import { SegmentedControl } from './SegmentedControl';
import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr';
import {
  Button,
  HelperText,
  IconButton,
  Searchbar,
  TextInput as PaperTextInput,
  TouchableRipple,
} from './ui/Paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { API_CONFIG } from '../constants/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { formatCurrency } from '../utils/currency';
import {
  Customer as CustomerModel,
  ErpService,
  Order as OrderModel,
  OrderCreatePayload,
  OrderUpdatePayload,
  OrderLineItem,
  Product as ProductModel,
} from '../services/erpService';
import { NervLoader } from './NervLoader';
import { useResponsive } from '../hooks/useResponsive';
import {
  formatDateLabel,
  getQuantityError,
  getValueError,
  looksLikeId,
  matchesSearchWithinEnterprise,
  parseOrderDateValue,
  parseNumber,
  resolveCustomerLabel,
  resolveOrderCustomerId,
  resolveOrderItems,
  resolveProductValue,
  sanitizeNumericInput,
  sanitizeQuantityInput,
  toIdKey,
  unitAllowsDecimal,
} from '../utils/orders/helpers';
import { getStorageQuantity } from '../utils/products/form';
import { parseDateValue } from '../utils/datetime';
import { hasManagementAccess } from '../utils/access';
import { useToast } from '../contexts/ToastContext';

const orderStatusOptions = ['Pending', 'Processing', 'Paid', 'Shipped', 'Delivered', 'Finished'] as const;
type OrderStatusOption = (typeof orderStatusOptions)[number];
const statuses = ['all', ...orderStatusOptions];
const UNKNOWN_CUSTOMER = 'Unknown customer';
const LOADING_CUSTOMER = 'Loading customer...';
const ORDER_OPTIONS_PAGE_SIZE = 100;
const ORDER_OPTIONS_MAX_PAGES = 50;
const orderStatusEnumValue: Record<OrderStatusOption, number> = {
  Pending: 0,
  Processing: 1,
  Paid: 2,
  Shipped: 3,
  Delivered: 4,
  Finished: 5,
};
const resolveStatusOption = (value?: string | null): OrderStatusOption => {
  const normalized = (value ?? '').trim().toLowerCase();
  const match = orderStatusOptions.find((status) => status.toLowerCase() === normalized);
  return match ?? 'Pending';
};
const shouldShowPaidAt = (status?: string | null) => {
  const normalized = resolveStatusOption(status);
  return normalized === 'Paid' || normalized === 'Shipped' || normalized === 'Delivered' || normalized === 'Finished';
};
const resolveItemsFromOrderedProducts = (order: OrderModel) => {
  if (!order.orderedProduct || order.orderedProduct.length === 0) {
    return resolveOrderItems(order);
  }
  const quantitySum = order.orderedProduct.reduce((sum, item) => {
    const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
    return sum + quantity;
  }, 0);
  return quantitySum > 0 ? quantitySum : order.orderedProduct.length;
};

type SelectedOrderItem = {
  product: ProductModel;
  quantity: string;
  value: string;
};

export function Orders() {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { client, token, isAuthenticated, loading: authLoading, enterpriseId, currency, user } = useAuth();
  const { showToast } = useToast();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const canManageOrders = hasManagementAccess(user?.role);
  const managementDeniedMessage = t('Only Admin, Manager, and Supervisor can edit or delete orders.');
  const { width, isCompact, isTablet, contentPadding } = useResponsive();
  const dateTimeLocale = useMemo(() => {
    if (language === 'pt') {
      return 'pt-BR';
    }
    if (language === 'es') {
      return 'es-ES';
    }
    if (language === 'ja') {
      return 'ja-JP';
    }
    return 'en-US';
  }, [language]);
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(dateTimeLocale, {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: language === 'en',
      }),
    [dateTimeLocale, language],
  );
  const formatOrderDateTime = (value: string | number | Date | null | undefined, fallback = '--') => {
    const parsed = parseDateValue(value);
    if (!parsed) {
      return fallback;
    }
    return dateTimeFormatter.format(parsed);
  };
  const dateOnlyFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(dateTimeLocale, {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }),
    [dateTimeLocale],
  );
  const formatOrderDate = (value: string | number | Date | null | undefined, fallback = '--') => {
    const parsed = parseDateValue(value);
    if (!parsed) {
      return fallback;
    }
    return dateOnlyFormatter.format(parsed);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState<Date | null>(null);
  const [endDateFilter, setEndDateFilter] = useState<Date | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const hasDateFilter = startDateFilter !== null || endDateFilter !== null;
  const [refreshKey, setRefreshKey] = useState(0);
  const [orders, setOrders] = useState<OrderModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<OrderModel | null>(null);
  const [detailsCustomer, setDetailsCustomer] = useState<CustomerModel | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<OrderStatusOption | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<OrderModel | null>(null);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const customerRequestsRef = useRef(new Set<string>());
  const orderDetailsRequestRef = useRef<string | null>(null);
  const orderPrefetchRef = useRef(new Set<string>());
  const [deletingId, setDeletingId] = useState<OrderModel['id'] | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(25);
  const [hasMore, setHasMore] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const [createVisible, setCreateVisible] = useState(false);
  const [orderDateLabel, setOrderDateLabel] = useState('');
  const [paymentDatePickerVisible, setPaymentDatePickerVisible] = useState(false);
  const [scheduledPaymentDate, setScheduledPaymentDate] = useState<Date | null>(null);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerModel | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedOrderItem[]>([]);
  const [customers, setCustomers] = useState<CustomerModel[]>([]);
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [customerOptionsEnterpriseId, setCustomerOptionsEnterpriseId] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState<OrderStatusOption>('Pending');
  const [creating, setCreating] = useState(false);
  const ordersHubUrl = useMemo(() => {
    const envUrl =
      process.env.EXPO_PUBLIC_SIGNALR_ORDERS_HUB_URL ??
      process.env.EXPO_PUBLIC_ORDERS_HUB_URL;
    if (envUrl) {
      return envUrl;
    }
    const base = API_CONFIG.baseUrl.replace(/\/$/, '');
    const trimmed = base.replace(/\/api\/v1\/?$/i, '');
    return `${trimmed}/orderHub`;
  }, []);
  const orderEventNames = useMemo(() => {
    const raw = process.env.EXPO_PUBLIC_SIGNALR_ORDERS_EVENTS ?? '';
    const entries = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    const merged = ['ReceiveOrderUpdate', ...entries];
    return Array.from(new Set(merged));
  }, []);
  const datePresets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    return [
      { label: t('Today'), start: new Date(today), end: new Date(today) },
      { label: t('This Week'), start: startOfWeek, end: endOfWeek },
      { label: t('This Month'), start: startOfMonth, end: endOfMonth },
      { label: t('Last Month'), start: startOfLastMonth, end: endOfLastMonth },
    ];
  }, [t]);

  const activePresetLabel = useMemo(() => {
    if (!startDateFilter || !endDateFilter) return null;
    const match = datePresets.find(
      (p) =>
        p.start.toDateString() === startDateFilter.toDateString() &&
        p.end.toDateString() === endDateFilter.toDateString(),
    );
    return match?.label ?? null;
  }, [startDateFilter, endDateFilter, datePresets]);

  const orderFilter = useMemo(() => {
    if (!startDateFilter && !endDateFilter) {
      return { isActive: true };
    }
    const start = startDateFilter ? new Date(startDateFilter) : null;
    if (start) {
      start.setHours(0, 0, 0, 0);
    }
    const end = endDateFilter ? new Date(endDateFilter) : null;
    if (end) {
      end.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 1);
    }
    return {
      isActive: true,
      startDate: start ? start.toISOString() : undefined,
      endDate: end ? end.toISOString() : undefined,
    };
  }, [startDateFilter, endDateFilter]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    let active = true;

    const loadOrders = async () => {
      setLoading(true);


      const response = await erpService.fetchOrders(pageNumber, pageSize, false, orderFilter);
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        const activeOrders = response.data.filter((order) => order.isActive === true);
        setOrders(activeOrders);
        setHasMore(response.data.length === pageSize);
      } else {
        showToast(response.error ?? t('Unable to load orders'));
      }

      setLoading(false);
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading, pageNumber, pageSize, orderFilter, refreshKey]);

  useEffect(() => {
    if (!isAuthenticated || authLoading || !ordersHubUrl || !token) {
      return;
    }

    let active = true;
    const tokenValue = token;

    const connection = new HubConnectionBuilder()
      .withUrl(ordersHubUrl, {
        accessTokenFactory: () => tokenValue,
        withCredentials: false,
        transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Information)
      .build();

    const handleOrderEvent = (orderId?: string, status?: string) => {
      if (!active) {
        return;
      }
      if (orderId) {
        const normalizedStatus = typeof status === 'string' ? status.trim().toLowerCase() : '';
        const nextStatus = orderStatusOptions.find((entry) => entry.toLowerCase() === normalizedStatus);
        if (nextStatus) {
          setOrders((prev) =>
            prev.map((order) =>
              String(order.id) === String(orderId)
                ? { ...order, status: nextStatus }
                : order,
            ),
          );
          setDetailsOrder((current) =>
            current && String(current.id) === String(orderId)
              ? { ...current, status: nextStatus }
              : current,
          );
        }
      }
      setPageNumber(1);
      setRefreshKey((prev) => prev + 1);
    };

    orderEventNames.forEach((eventName) => {
      connection.on(eventName, handleOrderEvent);
    });

    connection.onreconnected(handleOrderEvent);

    connection.start().catch((error) => {
      if (!active) {
        return;
      }
      showToast(
        t('Live updates unavailable: {message}', {
          message: error?.message ?? t('unable to connect to SignalR'),
        }),
      );
    });

    return () => {
      active = false;
      orderEventNames.forEach((eventName) => {
        connection.off(eventName, handleOrderEvent);
      });
      connection.stop();
    };
  }, [isAuthenticated, authLoading, ordersHubUrl, orderEventNames, token]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCustomerOptionsEnterpriseId(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!createVisible || !isAuthenticated || authLoading) {
      return;
    }

    let active = true;

    const loadAllCustomerOptions = async () => {
      const allCustomers: CustomerModel[] = [];
      const seenCustomers = new Set<string>();

      for (let page = 1; page <= ORDER_OPTIONS_MAX_PAGES; page += 1) {
        const response = await erpService.fetchCustomers(page, ORDER_OPTIONS_PAGE_SIZE, false, {
          enterpriseId: enterpriseId ?? undefined,
        });

        if (!response.ok) {
          if (allCustomers.length > 0) {
            return { ok: false as const, data: allCustomers, error: response.error };
          }
          return { ok: false as const, data: null, error: response.error };
        }

        const rows = response.data ?? [];
        if (rows.length === 0) {
          break;
        }

        let addedRows = 0;
        rows.forEach((customer, index) => {
          const hasId =
            customer.id !== undefined &&
            customer.id !== null &&
            String(customer.id).trim() !== '';
          const emailKey =
            typeof customer.email === 'string'
              ? customer.email.trim().toLowerCase()
              : '';
          const key = hasId
            ? `id:${toIdKey(customer.id as string | number)}`
            : emailKey
              ? `email:${emailKey}`
              : `page:${page}:idx:${index}`;

          if (seenCustomers.has(key)) {
            return;
          }

          seenCustomers.add(key);
          allCustomers.push(customer);
          addedRows += 1;
        });

        // Backends that ignore page parameters can repeat rows forever; stop once a page adds nothing new.
        if (addedRows === 0) {
          break;
        }
      }

      return { ok: true as const, data: allCustomers, error: undefined };
    };

    const loadOptions = async () => {
      setOptionsLoading(true);

      const shouldLoadCustomers = customerOptionsEnterpriseId !== (enterpriseId ?? null);
      const shouldLoadProducts = products.length === 0;

      const [customersResponse, productsResponse] = await Promise.all([
        shouldLoadCustomers
          ? loadAllCustomerOptions()
          : Promise.resolve({ ok: true, data: customers, error: undefined }),
        shouldLoadProducts
          ? erpService.fetchProducts(1, 25)
          : Promise.resolve({ ok: true, data: products, error: undefined }),
      ]);

      if (!active) {
        setOptionsLoading(false);
        return;
      }

      if (customersResponse.data && shouldLoadCustomers) {
        setCustomers(customersResponse.data);
      }

      if (customersResponse.ok && shouldLoadCustomers) {
        setCustomerOptionsEnterpriseId(enterpriseId ?? null);
      }

      if (productsResponse.ok && productsResponse.data && shouldLoadProducts) {
        setProducts(productsResponse.data);
      }

      if (!customersResponse.ok || !productsResponse.ok) {
        const fallbackError =
          customersResponse.error ??
          productsResponse.error ??
          t('Unable to load order options');
        showToast(fallbackError);
      }

      setOptionsLoading(false);
    };

    loadOptions();

    return () => {
      active = false;
      setOptionsLoading(false);
    };
  }, [createVisible, isAuthenticated, authLoading, erpService, enterpriseId]);

  const goPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goNextPage = () => {
    if (hasMore) {
      setPageNumber((prev) => prev + 1);
    }
  };

  const openDatePicker = () => {
    /* toast clears automatically */
    setDatePickerVisible(true);
  };

  const closeDatePicker = () => {
    setDatePickerVisible(false);
  };

  const openPaymentDatePicker = () => {
    /* toast clears automatically */
    setPaymentDatePickerVisible(true);
  };

  const closePaymentDatePicker = () => {
    setPaymentDatePickerVisible(false);
  };

  const handlePaymentDateConfirm = ({ date }: { date: Date | undefined }) => {
    setScheduledPaymentDate(date ?? null);
    setPaymentDatePickerVisible(false);
  };

  const clearScheduledPaymentDate = () => {
    setScheduledPaymentDate(null);
  };

  const handleDateConfirm = ({
    startDate,
    endDate,
  }: {
    startDate?: Date;
    endDate?: Date;
  }) => {
    if (startDate && endDate && endDate < startDate) {
      showToast(t('End date must be after the start date.'), 'warning');
      return;
    }
    /* toast clears automatically */
    setStartDateFilter(startDate ?? null);
    setEndDateFilter(endDate ?? null);
    setPageNumber(1);
    setDatePickerVisible(false);
  };

  const clearDateFilter = () => {
    setStartDateFilter(null);
    setEndDateFilter(null);
    setPageNumber(1);
  };


  const toggleCustomerDropdown = () => {
    setCustomerDropdownOpen((prev) => {
      const next = !prev;
      if (next) {
        setProductDropdownOpen(false);
      }
      return next;
    });
  };

  const toggleProductDropdown = () => {
    setProductDropdownOpen((prev) => {
      const next = !prev;
      if (next) {
        setCustomerDropdownOpen(false);
      }
      return next;
    });
  };

  const customerDirectory = useMemo(() => {
    const map = new Map<string, CustomerModel>();
    customers.forEach((customer) => {
      if (customer.id !== undefined && customer.id !== null) {
        map.set(toIdKey(customer.id), customer);
      }
    });
    return map;
  }, [customers]);

  useEffect(() => {
    if (!isAuthenticated || authLoading || customerLookupLoading || orders.length === 0) {
      return;
    }

    const pendingOrders = orders.filter((order) => {
      if (order.id === undefined || order.id === null) {
        return false;
      }
      const orderKey = String(order.id);
      if (customerRequestsRef.current.has(orderKey)) {
        return false;
      }
      const customerId = resolveOrderCustomerId(order);
      if (!customerId) {
        return false;
      }
      const hasName =
        order.customer &&
        order.customer !== UNKNOWN_CUSTOMER &&
        !looksLikeId(order.customer);
      return !hasName;
    });

    if (pendingOrders.length === 0) {
      return;
    }

    let active = true;

    const loadCustomers = async () => {
      setCustomerLookupLoading(true);

      for (const order of pendingOrders) {
        const orderKey = String(order.id);
        customerRequestsRef.current.add(orderKey);
        const customerId = resolveOrderCustomerId(order);
        if (!customerId) {
          continue;
        }
        const response = await erpService.fetchCustomerById(customerId);
        if (!active) {
          return;
        }
        if (response.ok && response.data) {
          const resolvedName = response.data.name ?? response.data.email ?? UNKNOWN_CUSTOMER;
          setCustomers((prev) => {
            if (response.data?.id === undefined || response.data?.id === null) {
              return prev;
            }
            const exists = prev.some(
              (customer) =>
                customer.id !== undefined &&
                customer.id !== null &&
                toIdKey(customer.id) === toIdKey(response.data?.id ?? customerId),
            );
            if (exists) {
              return prev;
            }
            return [...prev, response.data];
          });
          setOrders((prev) =>
            prev.map((current) =>
              String(current.id) === String(order.id)
                ? { ...current, customer: resolvedName, customerId }
                : current,
            ),
          );
        } else if (response.error) {
          showToast(response.error);
        }
      }

      if (active) {
        setCustomerLookupLoading(false);
      }
    };

    loadCustomers();

    return () => {
      active = false;
      setCustomerLookupLoading(false);
    };
  }, [
    orders,
    isAuthenticated,
    authLoading,
    customerLookupLoading,
    erpService,
  ]);

  useEffect(() => {
    if (!isAuthenticated || authLoading || orders.length === 0) {
      return;
    }

    const pendingOrderIds = orders
      .filter((order) => order.id !== undefined && order.id !== null)
      .filter((order) => {
        const key = String(order.id);
        if (orderPrefetchRef.current.has(key)) {
          return false;
        }
        const missingCustomerId = order.customerId === undefined || order.customerId === null;
        const missingLines = !order.orderedProduct || order.orderedProduct.length === 0;
        return missingCustomerId || missingLines;
      })
      .map((order) => order.id as string | number);

    if (pendingOrderIds.length === 0) {
      return;
    }

    let active = true;

    const loadOrderDetails = async () => {
      for (const orderId of pendingOrderIds) {
        const key = String(orderId);
        orderPrefetchRef.current.add(key);
        const response = await erpService.fetchOrderById(orderId);
        if (!active) {
          return;
        }
        if (response.ok && response.data) {
          setOrders((prev) =>
            prev.map((order) =>
              String(order.id) === String(orderId)
                ? {
                    ...order,
                    ...response.data,
                    items:
                      typeof order.items === 'number' && order.items > 0
                        ? order.items
                        : resolveOrderItems(response.data),
                    status: order.status,
                    payday: response.data.payday ?? order.payday,
                    paymentDate: response.data.paymentDate ?? order.paymentDate,
                    customer:
                      response.data.customer &&
                      response.data.customer !== UNKNOWN_CUSTOMER &&
                      !looksLikeId(response.data.customer)
                        ? response.data.customer
                        : order.customer,
                    customerId: response.data.customerId ?? order.customerId,
                    isActive: response.data.isActive ?? order.isActive,
                  }
                : order,
            ),
          );
        } else if (response.error) {
          showToast(response.error);
        }
      }
    };

    loadOrderDetails();

    return () => {
      active = false;
    };
  }, [orders, isAuthenticated, authLoading, erpService]);

  const resolveOrderCustomerNameRaw = (order: OrderModel) => {
    const customerId = resolveOrderCustomerId(order);
    if (customerId !== null) {
      const match = customerDirectory.get(toIdKey(customerId));
      if (match) {
        return match.name ?? match.email ?? UNKNOWN_CUSTOMER;
      }
      if (customerLookupLoading) {
        return LOADING_CUSTOMER;
      }
    }
    if (order.customer && order.customer !== UNKNOWN_CUSTOMER && !looksLikeId(order.customer)) {
      return order.customer;
    }
    return UNKNOWN_CUSTOMER;
  };

  const resolveOrderCustomerName = (order: OrderModel) => {
    const raw = resolveOrderCustomerNameRaw(order);
    if (raw === UNKNOWN_CUSTOMER || raw === LOADING_CUSTOMER) {
      return t(raw);
    }
    return raw;
  };

  const resolveOrderDateSource = (order: OrderModel) => {
    return order.date ?? order.createdAt ?? null;
  };

  const resolveOrderScheduledPaymentDateSource = (order: OrderModel) => {
    return order.paymentScheduledDate ?? null;
  };

  const resolveOrderPaydaySource = (order: OrderModel) => {
    return order.payday ?? order.paymentDate ?? null;
  };

  useEffect(() => {
    if (!detailsVisible || !detailsOrder?.id) {
      orderDetailsRequestRef.current = null;
      setDetailsLoading(false);
      return;
    }

    const orderIdKey = String(detailsOrder.id);
    if (orderDetailsRequestRef.current === orderIdKey) {
      return;
    }

    orderDetailsRequestRef.current = orderIdKey;
    let active = true;

    const loadOrderDetails = async () => {
      setDetailsLoading(true);
      const response = await erpService.fetchOrderById(detailsOrder.id);
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        setDetailsOrder((current) => {
          if (!current) {
            return response.data;
          }
          const mergedCustomer =
            response.data.customer &&
            response.data.customer !== UNKNOWN_CUSTOMER &&
            !looksLikeId(response.data.customer)
              ? response.data.customer
              : current.customer;
          return {
            ...current,
            ...response.data,
            items:
              typeof current.items === 'number' && current.items > 0
                ? current.items
                : resolveOrderItems(response.data),
            status: current.status,
            payday: response.data.payday ?? current.payday,
            paymentDate: response.data.paymentDate ?? current.paymentDate,
            customer: mergedCustomer,
            customerId: response.data.customerId ?? current.customerId,
          };
        });
      } else if (response.error) {
        showToast(response.error);
      }
      setDetailsLoading(false);
    };

    loadOrderDetails();

    return () => {
      active = false;
    };
  }, [detailsVisible, detailsOrder?.id, erpService]);

  useEffect(() => {
    if (!detailsVisible || !detailsOrder) {
      setDetailsCustomer(null);
      return;
    }
    const customerId = resolveOrderCustomerId(detailsOrder);
    if (!customerId) {
      setDetailsCustomer(null);
      return;
    }
    const match = customerDirectory.get(toIdKey(customerId));
    setDetailsCustomer(match ?? null);
  }, [detailsVisible, detailsOrder, customerDirectory]);

  const openCreate = () => {
    if (!isAuthenticated || authLoading) {
      showToast(t('Authenticate to manage orders.'), 'warning');
      return;
    }
    /* toast clears automatically */
    setOrderDateLabel(formatOrderDateTime(new Date()));
    setCustomerDropdownOpen(false);
    setProductDropdownOpen(false);
    setCustomerSearch('');
    setSelectedCustomer(null);
    setProductSearch('');
    setSelectedItems([]);
    setPaymentDatePickerVisible(false);
    setScheduledPaymentDate(null);
    setCreateStatus('Pending');
    setCreateVisible(true);
  };

  const closeCreate = () => {
    setCreateVisible(false);
    setOrderDateLabel('');
    setCustomerDropdownOpen(false);
    setProductDropdownOpen(false);
    setCustomerSearch('');
    setSelectedCustomer(null);
    setProductSearch('');
    setSelectedItems([]);
    setPaymentDatePickerVisible(false);
    setScheduledPaymentDate(null);
    setCreateStatus('Pending');
    setCreating(false);
  };

  const openDetails = (order: OrderModel) => {
    orderDetailsRequestRef.current = null;
    setStatusUpdating(false);
    setPendingStatusChange(null);
    setDetailsOrder(order);
    setDetailsLoading(true);
    setDetailsVisible(true);
  };

  const closeDetails = () => {
    orderDetailsRequestRef.current = null;
    setDetailsVisible(false);
    setDetailsOrder(null);
    setDetailsCustomer(null);
    setDetailsLoading(false);
    setStatusUpdating(false);
    setPendingStatusChange(null);
  };

  const closeDeleteConfirm = () => {
    setConfirmDeleteVisible(false);
    setConfirmDeleteOrder(null);
  };

  const confirmDelete = async () => {
    if (!canManageOrders) {
      showToast(managementDeniedMessage, 'warning');
      closeDeleteConfirm();
      return;
    }

    if (!confirmDeleteOrder || confirmDeleteOrder.id === undefined || confirmDeleteOrder.id === null) {
      closeDeleteConfirm();
      return;
    }

    setDeletingId(confirmDeleteOrder.id);
    /* toast clears automatically */

    const response = await erpService.deleteOrder(confirmDeleteOrder.id);
    if (response.ok) {
      setOrders((prev) =>
        prev.filter((item) => String(item.id) !== String(confirmDeleteOrder.id)),
      );
      if (detailsOrder?.id === confirmDeleteOrder.id) {
        closeDetails();
      }
    } else {
      showToast(response.error ?? t('Unable to delete order'));
    }

    setDeletingId(null);
    closeDeleteConfirm();
  };

  const requestDelete = (order: OrderModel) => {
    if (!isAuthenticated || authLoading) {
      showToast(t('Authenticate to manage orders.'), 'warning');
      return;
    }
    if (!canManageOrders) {
      showToast(managementDeniedMessage, 'warning');
      return;
    }
    if (order.id === undefined || order.id === null) {
      showToast(t('Order id missing.'));
      return;
    }

    setConfirmDeleteOrder(order);
    setConfirmDeleteVisible(true);
  };

  const addProduct = (product: ProductModel) => {
    const stock = getStorageQuantity(product);
    if (!product.isService && stock <= 0) {
      showToast(t('{name} is out of stock.', { name: product.name ?? t('Product') }));
      return;
    }
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) => {
          if (item.product.id !== product.id) {
            return item;
          }
          const currentQuantity = parseNumber(item.quantity) ?? 0;
          const allowDecimal = unitAllowsDecimal(item.product.unitOfMeasure);
          const nextQuantity = allowDecimal
            ? currentQuantity + 1
            : Math.round(currentQuantity + 1);
          if (!item.product.isService) {
            const maxStock = getStorageQuantity(item.product);
            if (nextQuantity > maxStock) {
              showToast(t('Max stock: {stock}', { stock: String(maxStock) }), 'warning');
              return item;
            }
          }
          return {
            ...item,
            quantity: String(Math.max(allowDecimal ? 0 : 1, nextQuantity)),
          };
        });
      }
      return [
        ...prev,
        {
          product,
          quantity: '1',
          value: String(resolveProductValue(product)),
        },
      ];
    });
  };

  const updateLineItem = (productId: string | number, field: 'quantity' | 'value', value: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }
        const sanitized =
          field === 'quantity'
            ? sanitizeQuantityInput(value, item.product.unitOfMeasure)
            : sanitizeNumericInput(value);
        return { ...item, [field]: sanitized };
      }),
    );
  };

  const removeLineItem = (productId: string | number) => {
    setSelectedItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) =>
      matchesSearchWithinEnterprise(
        [customer.name, customer.email, customer.id],
        customerSearch,
        enterpriseId,
        customer.enterpriseId,
      ),
    );
  }, [customers, customerSearch, enterpriseId]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      matchesSearchWithinEnterprise(
        [product.name, product.category, product.id],
        productSearch,
        enterpriseId,
        product.enterpriseId,
      ),
    );
  }, [products, productSearch, enterpriseId]);

  const computedItems = useMemo(
    () =>
      selectedItems.reduce((sum, item) => sum + (parseNumber(item.quantity) ?? 0), 0),
    [selectedItems],
  );
  const hasDecimalItems = useMemo(
    () => selectedItems.some((item) => unitAllowsDecimal(item.product.unitOfMeasure)),
    [selectedItems],
  );

  const computedTotal = useMemo(
    () =>
      selectedItems.reduce((sum, item) => {
        const quantity = parseNumber(item.quantity) ?? 0;
        const value = parseNumber(item.value) ?? 0;
        return sum + quantity * value;
      }, 0),
    [selectedItems],
  );

  const getStockError = (item: SelectedOrderItem): string | null => {
    if (item.product.isService) return null;
    const stock = getStorageQuantity(item.product);
    if (stock <= 0) return t('Out of Stock');
    const qty = parseNumber(item.quantity);
    if (qty !== null && qty > stock) return t('Max stock: {stock}', { stock: String(stock) });
    return null;
  };

  const hasLineItemErrors = useMemo(
    () =>
      selectedItems.some(
        (item) =>
          getQuantityError(item.quantity, item.product.unitOfMeasure) ||
          getValueError(item.value) ||
          getStockError(item),
      ),
    [selectedItems],
  );

  const createDisabled =
    creating || !selectedCustomer || selectedItems.length === 0 || hasLineItemErrors;

  const handleCreate = async () => {
    if (creating) {
      return;
    }
    if (!isAuthenticated || authLoading) {
      showToast(t('Authenticate to manage orders.'), 'warning');
      return;
    }
    if (!enterpriseId) {
      showToast(t('Enterprise not found for this user.'));
      return;
    }

    if (!selectedCustomer) {
      showToast(t('Select a customer.'));
      return;
    }

    if (selectedItems.length === 0) {
      showToast(t('Add at least one product.'));
      return;
    }

    const orderLineItems: OrderLineItem[] = [];
    let totalItems = 0;
    let totalValue = 0;
    for (const item of selectedItems) {
      const quantityError = getQuantityError(item.quantity, item.product.unitOfMeasure);
      if (quantityError) {
        showToast(
          t('{name} quantity: {message}.', {
            name: item.product.name ?? t('Product'),
            message: t(quantityError),
          }),
        );
        return;
      }
      const valueError = getValueError(item.value);
      if (valueError) {
        showToast(
          t('{name} value: {message}.', {
            name: item.product.name ?? t('Product'),
            message: t(valueError),
          }),
        );
        return;
      }
      const quantity = parseNumber(item.quantity);
      const value = parseNumber(item.value);
      if (quantity === null || value === null) {
        showToast(
          t('{name} has invalid quantity or value.', {
            name: item.product.name ?? t('Product'),
          }),
        );
        return;
      }

      if (!item.product.isService) {
        const availableStock = getStorageQuantity(item.product);
        if (availableStock <= 0) {
          showToast(
            t('{name} is out of stock.', { name: item.product.name ?? t('Product') }),
          );
          return;
        }
        if (quantity > availableStock) {
          showToast(
            t('{name} quantity ({qty}) exceeds available stock ({stock}).', {
              name: item.product.name ?? t('Product'),
              qty: String(quantity),
              stock: String(availableStock),
            }),
          );
          return;
        }
      }

      const resolvedQuantity = quantity;
      const lineTotal = resolvedQuantity * value;
      orderLineItems.push({
        productId: item.product.id,
        quantity: resolvedQuantity,
        value,
        total: lineTotal,
        totalValue: lineTotal,
      });
      totalItems += resolvedQuantity;
      totalValue += lineTotal;
    }

    const customer = resolveCustomerLabel(selectedCustomer);
    if (!customer) {
      showToast(t('Customer name is required.'));
      return;
    }

    const now = new Date();
    const dateValue = now.toISOString();
    const normalizedScheduledPaymentDate = scheduledPaymentDate
      ? (() => {
          const value = new Date(scheduledPaymentDate);
          value.setHours(12, 0, 0, 0);
          return value.toISOString();
        })()
      : null;
    setOrderDateLabel(formatOrderDateTime(now));

    setCreating(true);
    /* toast clears automatically */

    const payload: OrderCreatePayload = {
      customer,
      date: dateValue,
      total: totalValue,
      totalValue,
      status: orderStatusEnumValue[createStatus],
      items: totalItems,
      payday: null,
      paymentScheduledDate: normalizedScheduledPaymentDate,
      PaymentScheduledDate: normalizedScheduledPaymentDate,
      customerId: selectedCustomer?.id,
      enterpriseId: enterpriseId ?? undefined,
      paymentDate: null,
      PaymentDate: null,
      orderedProduct: orderLineItems,
    };

    const response = await erpService.createOrder(payload);
    if (response.ok) {
      const fallbackOrder: OrderModel = {
        id: response.data?.id ?? Date.now(),
        customer,
        customerId: selectedCustomer?.id,
        date: dateValue,
        payday: null,
        paymentScheduledDate: normalizedScheduledPaymentDate,
        paymentDate: null,
        createdAt: dateValue,
        total: totalValue,
        totalValue,
        status: createStatus,
        items: totalItems,
        isActive: true,
      };
      const nextOrder = response.data ?? fallbackOrder;
      const hydratedOrder = {
        ...nextOrder,
        isActive: nextOrder.isActive ?? true,
      };
      setOrders((prev) => [hydratedOrder, ...prev]);
      closeCreate();
    } else {
      showToast(response.error ?? t('Unable to create order'));
    }

    setCreating(false);
  };

  const requestStatusChange = (nextStatus: OrderStatusOption) => {
    if (statusUpdating || !detailsOrder || detailsOrder.id === undefined || detailsOrder.id === null) {
      return;
    }

    const currentStatus = resolveStatusOption(detailsOrder.status);
    if (currentStatus === nextStatus) {
      return;
    }

    if (!isAuthenticated || authLoading) {
      showToast(t('Authenticate to manage orders.'), 'warning');
      return;
    }
    if (!canManageOrders) {
      showToast(managementDeniedMessage, 'warning');
      return;
    }

    setPendingStatusChange(nextStatus);
  };

  const cancelPendingStatusChange = () => {
    setPendingStatusChange(null);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) {
      return;
    }

    const nextStatus = pendingStatusChange;
    setPendingStatusChange(null);
    await handleManualStatusChange(nextStatus);
  };

  const handleManualStatusChange = async (nextStatus: OrderStatusOption) => {
    if (statusUpdating || !detailsOrder || detailsOrder.id === undefined || detailsOrder.id === null) {
      return;
    }

    if (resolveStatusOption(detailsOrder.status) === nextStatus) {
      return;
    }

    if (!isAuthenticated || authLoading) {
      showToast(t('Authenticate to manage orders.'), 'warning');
      return;
    }
    if (!canManageOrders) {
      showToast(managementDeniedMessage, 'warning');
      return;
    }

    setStatusUpdating(true);
    /* toast clears automatically */
    try {
      const fullOrderResponse = await erpService.fetchOrderById(detailsOrder.id);
      const sourceOrder = fullOrderResponse.ok && fullOrderResponse.data
        ? fullOrderResponse.data
        : detailsOrder;

      const safeOrderedProduct = (sourceOrder.orderedProduct ?? [])
        .map((item) => ({
          productId: item.productId ?? item.product?.id,
          quantity: typeof item.quantity === 'number' ? item.quantity : 0,
          value: typeof item.value === 'number' ? item.value : 0,
          total: typeof item.total === 'number' ? item.total : undefined,
          totalValue:
            typeof item.totalValue === 'number'
              ? item.totalValue
              : typeof item.total === 'number'
                ? item.total
                : undefined,
        }))
        .filter((item) => item.productId !== undefined && item.productId !== null);

      if (safeOrderedProduct.length === 0) {
        showToast(t('Order must have Ordered Products.'));
        return;
      }

      const updatedAt = new Date().toISOString();
      const nextPayday = nextStatus === 'Paid' ? updatedAt : sourceOrder.payday ?? null;
      const safeCustomer = resolveOrderCustomerNameRaw(sourceOrder) || UNKNOWN_CUSTOMER;
      const safeDate = sourceOrder.date ?? sourceOrder.createdAt ?? new Date().toISOString();
      const safeScheduledPaymentDate = sourceOrder.paymentScheduledDate ?? null;
      const safeTotal =
        typeof sourceOrder.total === 'number'
          ? sourceOrder.total
          : typeof sourceOrder.totalValue === 'number'
            ? sourceOrder.totalValue
            : 0;
      const safeCustomerId = resolveOrderCustomerId(sourceOrder);

      const payload: OrderUpdatePayload = {
        id: sourceOrder.id,
        updatedAt,
        status: orderStatusEnumValue[nextStatus],
        customer: safeCustomer,
        customerId: safeCustomerId ?? sourceOrder.customerId,
        date: safeDate,
        createdAt: sourceOrder.createdAt ?? undefined,
        total: safeTotal,
        totalValue: sourceOrder.totalValue ?? safeTotal,
        items: resolveItemsFromOrderedProducts(sourceOrder),
        orderedProduct: safeOrderedProduct,
        isActive: sourceOrder.isActive ?? true,
        enterpriseId: enterpriseId ?? undefined,
        payday: nextPayday,
        paymentScheduledDate: safeScheduledPaymentDate,
        PaymentScheduledDate: safeScheduledPaymentDate,
        paymentDate: null,
        PaymentDate: null,
      };

      const response = await erpService.updateOrder(payload);
      if (response.ok) {
        setDetailsOrder((current) =>
          current && String(current.id) === String(payload.id)
            ? {
                ...current,
                updatedAt,
                status: nextStatus,
                payday: nextPayday,
              }
            : current,
        );
        setOrders((prev) =>
          prev.map((order) =>
            String(order.id) === String(payload.id)
              ? {
                  ...order,
                  updatedAt,
                  status: nextStatus,
                  payday: nextPayday,
                }
              : order,
          ),
        );

        const refreshed = await erpService.fetchOrderById(payload.id);
        if (refreshed.ok && refreshed.data) {
          const fresh = refreshed.data;
          setDetailsOrder((current) =>
            current && String(current.id) === String(payload.id)
              ? {
                  ...current,
                  ...fresh,
                  status: nextStatus,
                  payday: fresh.payday ?? current.payday,
                  paymentDate: fresh.paymentDate ?? current.paymentDate,
                }
              : current,
          );
          setOrders((prev) =>
            prev.map((order) =>
              String(order.id) === String(payload.id)
                ? {
                    ...order,
                    ...fresh,
                    status: nextStatus,
                    payday: fresh.payday ?? order.payday,
                    paymentDate: fresh.paymentDate ?? order.paymentDate,
                  }
                : order,
            ),
          );
        }
      } else {
        showToast(response.error ?? t('Unable to update order status'));
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  const badgeTone = (accent: string) => ({ text: accent, bg: `${accent}1A`, border: `${accent}40` });
  const statusBadgeColors: Record<string, { text: string; bg: string; border: string }> = {
    pending:    badgeTone(colors.accentOrange),
    processing: badgeTone(colors.secondaryPurple),
    paid:       badgeTone(colors.neonGreen),
    shipped:    badgeTone(colors.neonGreen),
    delivered:  badgeTone(colors.neonGreen),
    finished:   badgeTone(colors.neonGreen),
  };

  const renderStatusOptions = (
    selected: OrderStatusOption,
    onSelect: (status: OrderStatusOption) => void,
    disabled = false,
  ) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.statusPillRow}>
        {orderStatusOptions.map((status) => {
          const isActive = status === selected;
          const key = status.toLowerCase();
          const badgeColor = statusBadgeColors[key] ?? badgeTone(colors.textMuted);
          return (
            <Pressable
              key={status}
              onPress={() => !disabled && onSelect(status)}
              style={(state: any) => [
                styles.statusPill,
                {
                  backgroundColor: isActive ? badgeColor.bg : 'transparent',
                  borderColor: isActive ? badgeColor.border : colors.cardBorder,
                },
                !isActive && state.hovered && { backgroundColor: `${badgeColor.bg}`, borderColor: badgeColor.border },
                disabled && { opacity: 0.5 },
              ]}
            >
              {isActive && <View style={[styles.statusPillDot, { backgroundColor: badgeColor.text }]} />}
              <Text
                style={[
                  styles.statusPillText,
                  { color: isActive ? badgeColor.text : colors.textMuted },
                ]}
              >
                {t(status)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );

  const filteredOrders = orders.filter((order) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const customer = resolveOrderCustomerName(order).toLowerCase();
    const idString = (order.id ?? '').toString();
    const statusValue = (order.status ?? '').toLowerCase();
    const isActive = order.isActive === true;

    const matchesSearch =
      normalizedSearch.length === 0 ||
      customer.includes(normalizedSearch) ||
      idString.includes(normalizedSearch);
    const matchesStatus =
      filterStatus === 'all' || statusValue === filterStatus.toLowerCase();

    const orderDate = parseOrderDateValue(resolveOrderDateSource(order));
    const hasValidOrderDate = Boolean(orderDate);
    const startBoundary = startDateFilter ? new Date(startDateFilter) : null;
    const endBoundary = endDateFilter ? new Date(endDateFilter) : null;
    if (startBoundary) {
      startBoundary.setHours(0, 0, 0, 0);
    }
    if (endBoundary) {
      endBoundary.setHours(23, 59, 59, 999);
    }
    let matchesDate = true;
    if (startBoundary || endBoundary) {
      if (!hasValidOrderDate || !orderDate) {
        matchesDate = false;
      } else {
        matchesDate =
          (!startBoundary || orderDate >= startBoundary) &&
          (!endBoundary || orderDate <= endBoundary);
      }
    }

    return matchesSearch && matchesStatus && matchesDate && isActive;
  });


  if (loading) {
    return (
      <NervLoader
        variant="orders"
        fullScreen
        label={t('Loading')}
        subtitle={t('Fetching order data...')}
      />
    );
  }

  const effectiveWidth = contentWidth > 0 ? contentWidth : width;
  const useCardLayout = effectiveWidth < 980;
  const useDenseMobileLayout = effectiveWidth < 420;
  const rowActionIconSize = useCardLayout ? (useDenseMobileLayout ? 22 : 24) : 16;

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
        <View
          style={[styles.content, { padding: contentPadding, backgroundColor: colors.appBg }]}
          onLayout={(event) => {
            const nextWidth = Math.round(event.nativeEvent.layout.width);
            if (nextWidth > 0 && nextWidth !== contentWidth) {
              setContentWidth(nextWidth);
            }
          }}
        >
          {/* Header */}
          <View style={[styles.header, !isCompact && styles.headerRow]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }, isCompact && styles.titleCompact]}>
                {t('Orders')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }, isCompact && styles.subtitleCompact]}>
                {t('Purchase & sales order management')}
              </Text>
            </View>
            {!isCompact && (
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => setFilterPanelOpen((prev) => !prev)}
                  style={(state: any) => [
                    styles.filterBtn,
                    {
                      borderColor: filterPanelOpen ? colors.primaryPurple : (hasDateFilter ? `${colors.primaryPurple}40` : colors.cardBorder),
                      backgroundColor: filterPanelOpen ? `${colors.primaryPurple}0C` : 'transparent',
                    },
                    state.hovered && { backgroundColor: filterPanelOpen ? `${colors.primaryPurple}18` : 'rgba(255,255,255,0.05)' },
                  ]}
                >
                  {(state: any) => (
                    <>
                      <Feather
                        name="filter"
                        size={14}
                        color={filterPanelOpen || hasDateFilter ? colors.primaryPurple : (state.hovered ? colors.textPrimary : colors.textMuted)}
                      />
                      <Text
                        style={[
                          styles.filterBtnText,
                          { color: filterPanelOpen || hasDateFilter ? colors.primaryPurple : (state.hovered ? colors.textPrimary : colors.textMuted) },
                        ]}
                      >
                        {t('Filter')}
                      </Text>
                      {hasDateFilter && (
                        <View style={[styles.filterActiveDot, { backgroundColor: colors.primaryPurple }]} />
                      )}
                    </>
                  )}
                </Pressable>
                {canManageOrders && (
                  <Button
                    mode="contained"
                    onPress={openCreate}
                    icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
                    buttonColor={colors.primaryPurple}
                    textColor="#fff"
                    style={styles.headerBtn}
                    contentStyle={styles.headerBtnContent}
                  >
                    {t('New Order')}
                  </Button>
                )}
              </View>
            )}
          </View>

          {!isAuthenticated && !authLoading && (
            <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
              <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                {t('Authenticate to load live orders.')}
              </Text>
            </View>
          )}

          {/* Search and Actions */}
          <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
            <Searchbar
              placeholder={t('Search orders...')}
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={[styles.searchBar, { backgroundColor: colors.inputBgFrom, borderColor: colors.cardBorder }]}
              iconColor={colors.textMuted}
              inputStyle={[styles.searchInput, { color: colors.textPrimary }]}
              placeholderTextColor={colors.textMuted}
              elevation={0}
            />
            {isCompact && (
              <View style={styles.compactActionRow}>
                <Pressable
                  onPress={() => setFilterPanelOpen((prev) => !prev)}
                  style={(state: any) => [
                    styles.filterBtn,
                    {
                      borderColor: filterPanelOpen ? colors.primaryPurple : (hasDateFilter ? `${colors.primaryPurple}40` : colors.cardBorder),
                      backgroundColor: filterPanelOpen ? `${colors.primaryPurple}0C` : 'transparent',
                    },
                    state.hovered && { backgroundColor: filterPanelOpen ? `${colors.primaryPurple}18` : 'rgba(255,255,255,0.05)' },
                  ]}
                >
                  <Feather name="filter" size={14} color={filterPanelOpen || hasDateFilter ? colors.primaryPurple : colors.textMuted} />
                  <Text style={[styles.filterBtnText, { color: filterPanelOpen || hasDateFilter ? colors.primaryPurple : colors.textMuted }]}>
                    {t('Filter')}
                  </Text>
                  {hasDateFilter && (
                    <View style={[styles.filterActiveDot, { backgroundColor: colors.primaryPurple }]} />
                  )}
                </Pressable>
                {canManageOrders && (
                  <Button
                    mode="contained"
                    onPress={() => setCreateVisible(true)}
                    disabled={!isAuthenticated || authLoading}
                    icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
                    buttonColor={colors.primaryPurple}
                    textColor="#fff"
                    style={[styles.addButton, (!isAuthenticated || authLoading) && styles.buttonDisabled]}
                    contentStyle={styles.addButtonContent}
                  >
                    {t('New Order')}
                  </Button>
                )}
              </View>
            )}
          </View>

          {!loading && filteredOrders.length === 0 && (
            <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
              <Feather name="shopping-cart" size={20} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('No orders yet')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {t('Orders will appear here as soon as they are placed.')}
              </Text>
            </View>
          )}

          {/* Status Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll}>
            <View style={[styles.tabBar, { backgroundColor: `${colors.cardBgFrom}80` }]}>
              {statuses.map((status) => {
                const isSelected = filterStatus === status;
                const label = status === 'all' ? t('All') : t(status.charAt(0).toUpperCase() + status.slice(1));
                return (
                  <Pressable
                    key={status}
                    onPress={() => setFilterStatus(status)}
                    style={(state: any) => [
                      styles.tabItem,
                      isSelected && [{ backgroundColor: colors.cardBgFrom }, styles.tabItemActive],
                      !isSelected && state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
                    ]}
                  >
                    {(state: any) => (
                      <Text style={[styles.tabLabel, { color: isSelected ? colors.textPrimary : (state.hovered ? colors.textPrimary : colors.textMuted) }]}>
                        {label}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {filterPanelOpen && (
            <View style={[styles.filterPanel, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
              <View style={styles.filterPanelLabelRow}>
                <Feather name="calendar" size={14} color={colors.primaryPurple} />
                <Text style={[styles.filterPanelLabel, { color: colors.textSecondary }]}>
                  {t('Date Range')}
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
                <View style={styles.presetPills}>
                  {datePresets.map((preset) => {
                    const isActive = activePresetLabel === preset.label;
                    return (
                      <Pressable
                        key={preset.label}
                        onPress={() => {
                          setStartDateFilter(preset.start);
                          setEndDateFilter(preset.end);
                          setPageNumber(1);
                        }}
                        style={(state: any) => [
                          styles.presetPill,
                          { borderColor: isActive ? colors.primaryPurple : colors.cardBorder },
                          isActive && { backgroundColor: `${colors.primaryPurple}18` },
                          !isActive && state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: `${colors.primaryPurple}40` },
                        ]}
                      >
                        <Text style={[styles.presetPillText, { color: isActive ? colors.primaryPurple : colors.textSecondary }]}>
                          {preset.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={[styles.filterPanelRow, isCompact && styles.filterPanelRowCompact]}>
                <View style={[styles.filterDateDisplay, { backgroundColor: colors.inputBgFrom, borderColor: hasDateFilter ? `${colors.primaryPurple}40` : colors.cardBorder }]}>
                  <Feather name="calendar" size={14} color={hasDateFilter ? colors.primaryPurple : colors.textMuted} />
                  <Text
                    style={[
                      styles.filterDateText,
                      { color: hasDateFilter ? colors.textPrimary : colors.textMuted },
                    ]}
                  >
                    {hasDateFilter
                      ? `${formatDateLabel(startDateFilter ?? endDateFilter)} — ${formatDateLabel(endDateFilter ?? startDateFilter)}`
                      : t('All dates')}
                  </Text>
                </View>
                <View style={styles.filterPanelActions}>
                  <Pressable
                    onPress={openDatePicker}
                    style={(state: any) => [
                      styles.filterPanelBtn,
                      { borderColor: `${colors.primaryPurple}40`, backgroundColor: `${colors.primaryPurple}08` },
                      state.hovered && { backgroundColor: `${colors.primaryPurple}18` },
                    ]}
                  >
                    <Feather name="calendar" size={14} color={colors.primaryPurple} />
                    <Text style={[styles.filterPanelBtnText, { color: colors.primaryPurple }]}>
                      {hasDateFilter ? t('Change') : t('Custom range')}
                    </Text>
                  </Pressable>
                  {hasDateFilter && (
                    <Pressable
                      onPress={clearDateFilter}
                      style={(state: any) => [
                        styles.filterPanelBtn,
                        { borderColor: colors.cardBorder },
                        state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
                      ]}
                    >
                      <Feather name="x" size={14} color={colors.textMuted} />
                      <Text style={[styles.filterPanelBtnText, { color: colors.textMuted }]}>
                        {t('Clear')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          )}

          <View style={[styles.paginationRow, isCompact && styles.paginationRowCompact]}>
            <Button
              mode="outlined"
              onPress={goPrevPage}
              disabled={pageNumber === 1}
              icon={({ size }) => <Feather name="chevron-left" size={size} color={colors.textMuted} />}
              textColor={colors.textMuted}
              style={[
                styles.paginationButton,
                { borderColor: colors.cardBorder },
                pageNumber === 1 && styles.paginationButtonDisabled,
              ]}
              contentStyle={styles.paginationButtonContent}
            >
              {t('Prev')}
            </Button>
            <Text style={[styles.pageIndicator, { color: colors.textPrimary }]}>{t('Page {page}', { page: pageNumber })}</Text>
            <Button
              mode="outlined"
              onPress={goNextPage}
              disabled={!hasMore}
              icon={({ size }) => <Feather name="chevron-right" size={size} color={colors.textMuted} />}
              textColor={colors.textMuted}
              style={[
                styles.paginationButton,
                { borderColor: colors.cardBorder },
                !hasMore && styles.paginationButtonDisabled,
              ]}
              contentStyle={styles.paginationButtonContent}
            >
              {t('Next')}
            </Button>
          </View>

          {/* Order List */}
          {useCardLayout ? (
            <View style={styles.orderList}>
              {filteredOrders.map((order) => {
                const safeId = order.id ?? '-';
                const safeStatus = resolveStatusOption(order.status);
                const safeCustomer = resolveOrderCustomerName(order);
                const safeDate = formatOrderDateTime(resolveOrderDateSource(order));
                const safeScheduledPaymentDate = resolveOrderScheduledPaymentDateSource(order);
                const safePayday = resolveOrderPaydaySource(order);
                const showPaidAt = shouldShowPaidAt(safeStatus);
                const safeItems = resolveOrderItems(order);
                const safeTotal =
                  typeof order.totalValue === 'number'
                    ? order.totalValue
                    : typeof order.total === 'number'
                      ? order.total
                      : 0;
                const isDeleting = deletingId === order.id;

                return (
                  <View
                    key={safeId}
                    style={[
                      styles.orderMobileCard,
                      useDenseMobileLayout && styles.orderMobileCardDense,
                      { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
                    ]}
                  >
                    <View style={styles.orderMobileHeader}>
                      <View style={styles.orderMobileHeaderTop}>
                        <View style={styles.orderMobileIdBlock}>
                          <Text style={[styles.orderLabel, { color: colors.textMuted }]}>{t('Order')}</Text>
                          <Text
                            style={[
                              styles.orderId,
                              styles.orderIdMobile,
                              useDenseMobileLayout && styles.orderIdMobileDense,
                              { color: colors.primaryPurple },
                            ]}
                          >
                            #{safeId}
                          </Text>
                        </View>
                        <StatusBadge status={safeStatus.toLowerCase()} label={t(safeStatus)} />
                      </View>
                    </View>

                    <View style={[styles.orderMobileSections, useDenseMobileLayout && styles.orderMobileSectionsDense]}>
                      <View style={styles.orderMobileSection}>
                        <View style={styles.tableMetaRow}>
                          <View style={[styles.tableIconBadge, { backgroundColor: `${colors.primaryPurple}14` }]}>
                            <Feather name="user" size={14} color={colors.primaryPurple} />
                          </View>
                          <View style={styles.tableMetaContent}>
                            <Text style={[styles.tableMetaTitle, { color: colors.textPrimary }]}>{safeCustomer}</Text>
                            <Text style={[styles.tableMetaSubtitle, { color: colors.textMuted }]}>{t('Customer')}</Text>
                          </View>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.orderMobileSection,
                          styles.orderMobileTimelineSection,
                          { borderTopColor: colors.cardBorder },
                        ]}
                      >
                        <Text style={[styles.orderMobileSectionLabel, { color: colors.textMuted }]}>{t('Timeline')}</Text>
                        <View style={styles.orderTimeline}>
                          <View style={styles.timelineRow}>
                            <Feather name="calendar" size={14} color={colors.primaryPurple} />
                            <Text style={[styles.timelineText, { color: colors.textSecondary }]}>{safeDate}</Text>
                          </View>
                          <View style={styles.timelineRow}>
                            <Feather name="clock" size={14} color={colors.primaryPurple} />
                            <Text style={[styles.timelineText, { color: colors.textSecondary }]}>
                              {safeScheduledPaymentDate
                                ? t('Pay on {date}', { date: formatOrderDateTime(safeScheduledPaymentDate) })
                                : t('Payment not scheduled')}
                            </Text>
                          </View>
                          {showPaidAt && (
                            <View style={styles.timelineRow}>
                              <Feather name="check-circle" size={14} color={colors.neonGreen} />
                              <Text style={[styles.timelineText, { color: colors.textSecondary }]}>
                                {t('Paid at')}: {safePayday ? formatOrderDateTime(safePayday) : '-'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={[styles.orderMobileMetrics, useDenseMobileLayout && styles.orderMobileMetricsDense]}>
                        <View
                          style={[
                            styles.orderMobileMetricCard,
                            useDenseMobileLayout && styles.orderMobileMetricCardDense,
                            { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
                          ]}
                        >
                          <Text style={[styles.orderMobileSectionLabel, { color: colors.textMuted }]}>{t('Items')}</Text>
                          <View style={[styles.metricPill, { backgroundColor: `${colors.textMuted}12` }]}>
                            <Feather name="package" size={14} color={colors.textMuted} />
                            <Text style={[styles.metricPillText, { color: colors.textSecondary }]}>
                              {t('{count} items', { count: safeItems })}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.orderMobileMetricCard,
                            useDenseMobileLayout && styles.orderMobileMetricCardDense,
                            { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
                          ]}
                        >
                          <Text style={[styles.orderMobileSectionLabel, { color: colors.textMuted }]}>{t('Amount')}</Text>
                          <Text style={[styles.orderTotal, styles.orderTotalMobile, { color: colors.textPrimary }]}>
                            {formatCurrency(safeTotal, currency)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.actionIconRow}>
                        <IconButton
                          icon={() => <Feather name="eye" size={rowActionIconSize} color={colors.textPrimary} />}
                          size={rowActionIconSize}
                          onPress={() => openDetails(order)}
                          disabled={isDeleting}
                          testID={`order-view-${safeId}`}
                          style={[
                            styles.actionIconButton,
                            styles.actionIconButtonMobile,
                            useDenseMobileLayout && styles.actionIconButtonCompact,
                            { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom },
                            isDeleting && styles.actionButtonDisabled,
                          ]}
                          accessibilityLabel={t('View Details')}
                        />
                        {canManageOrders && (
                          <IconButton
                            icon={() => <Feather name="trash-2" size={rowActionIconSize} color={colors.accentOrange} />}
                            size={rowActionIconSize}
                            onPress={() => requestDelete(order)}
                            disabled={isDeleting}
                            testID={`order-delete-${safeId}`}
                            style={[
                              styles.actionIconButton,
                              styles.actionIconButtonMobile,
                              useDenseMobileLayout && styles.actionIconButtonCompact,
                              { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom },
                              isDeleting && styles.actionButtonDisabled,
                            ]}
                            accessibilityLabel={isDeleting ? t('Deleting...') : t('Delete')}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View
              style={[
                styles.orderTableShell,
                { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              ]}
            >
              {/* Table Header */}
              <View
                style={[
                  styles.orderTableHeader,
                  { borderBottomColor: colors.cardBorder },
                ]}
              >
                <Text style={[styles.orderTableHeadText, styles.colOrderId, { color: colors.textMuted }]}>
                  {t('Order ID')}
                </Text>
                <Text style={[styles.orderTableHeadText, styles.colCustomer, { color: colors.textMuted }]}>
                  {t('Customer')}
                </Text>
                <Text style={[styles.orderTableHeadText, styles.colItems, { color: colors.textMuted }]}>
                  {t('Items')}
                </Text>
                <Text style={[styles.orderTableHeadText, styles.colTotal, { color: colors.textMuted }]}>
                  {t('Total')}
                </Text>
                <Text style={[styles.orderTableHeadText, styles.colStatus, { color: colors.textMuted }]}>
                  {t('Status')}
                </Text>
                <Text style={[styles.orderTableHeadText, styles.colDate, { color: colors.textMuted }]}>
                  {t('Date')}
                </Text>
              </View>

              {/* Table Rows */}
              {filteredOrders.map((order, index) => {
                const safeId = order.id ?? '-';
                const safeStatus = resolveStatusOption(order.status);
                const safeCustomer = resolveOrderCustomerName(order);
                const safeDate = formatOrderDate(resolveOrderDateSource(order));
                const safeItems = resolveOrderItems(order);
                const safeTotal =
                  typeof order.totalValue === 'number'
                    ? order.totalValue
                    : typeof order.total === 'number'
                      ? order.total
                      : 0;
                const isLast = index === filteredOrders.length - 1;

                return (
                  <Pressable
                    key={safeId}
                    onPress={() => openDetails(order)}
                    style={(state: any) => [
                      styles.orderTableRow,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
                      state.hovered && { backgroundColor: 'rgba(255,255,255,0.02)' },
                    ]}
                  >
                    <Text
                      style={[styles.colOrderId, styles.colOrderIdText, { color: colors.primaryPurple }]}
                      numberOfLines={1}
                    >
                      {String(safeId)}
                    </Text>
                    <Text
                      style={[styles.colCustomer, styles.colCustomerText, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {safeCustomer}
                    </Text>
                    <Text
                      style={[styles.colItems, styles.colItemsText, { color: colors.textMuted }]}
                    >
                      {safeItems}
                    </Text>
                    <Text
                      style={[styles.colTotal, styles.colTotalText, { color: colors.textPrimary }]}
                    >
                      {formatCurrency(safeTotal, currency)}
                    </Text>
                    <View style={styles.colStatus}>
                      <StatusBadge status={safeStatus.toLowerCase()} label={t(safeStatus)} />
                    </View>
                    <Text
                      style={[styles.colDate, styles.colDateText, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {safeDate}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <DatePickerModal
        locale="en-US"
        mode="range"
        visible={datePickerVisible}
        onDismiss={closeDatePicker}
        startDate={startDateFilter ?? undefined}
        endDate={endDateFilter ?? undefined}
        startLabel={t('From')}
        endLabel={t('To')}
        saveLabel={t('Apply')}
        onConfirm={({ startDate, endDate }) => handleDateConfirm({ startDate, endDate })}
      />

      <Modal
        visible={confirmDeleteVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteConfirm}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isTablet && styles.modalCardWide,
            ]}
          >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('Delete Order')}</Text>
                <IconButton
                  icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
                  size={18}
                  onPress={closeDeleteConfirm}
                  style={[styles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
                />
              </View>
              <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
                {t('Delete order #{id}? This action cannot be undone.', { id: confirmDeleteOrder?.id ?? '-' })}
              </Text>
              <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
                <Button
                  mode="outlined"
                onPress={closeDeleteConfirm}
                disabled={deletingId !== null}
                textColor={colors.textSecondary}
                style={[styles.modalButton, { borderColor: colors.cardBorder }]}
                contentStyle={styles.modalButtonContent}
                labelStyle={styles.modalButtonLabel}
              >
                {t('Cancel')}
              </Button>
                <Button
                  mode="outlined"
                  onPress={confirmDelete}
                  disabled={deletingId !== null}
                  textColor={colors.accentOrange}
                  style={[
                    styles.modalButton,
                    styles.deleteButton,
                    { borderColor: colors.cardBorder },
                    deletingId !== null && styles.actionButtonDisabled,
                  ]}
                  contentStyle={styles.modalButtonContent}
                  labelStyle={styles.modalButtonLabel}
                >
                  {deletingId !== null ? t('Deleting...') : t('Delete')}
                </Button>
              </View>
          </View>
        </View>
      </Modal>

      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={closeCreate}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isTablet && styles.modalCardWide,
            ]}
          >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('New Order')}</Text>
                <IconButton
                  icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
                  size={18}
                  onPress={closeCreate}
                  disabled={creating}
                  style={[styles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
                />
              </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {optionsLoading && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoText, { color: colors.textMuted }]}>
                    {t('Loading customers and products...')}
                  </Text>
                </View>
              )}
                <View style={styles.modalField}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Customer')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
                  <TouchableRipple
                    style={[
                      styles.dropdownHeader,
                      {
                        borderColor: customerDropdownOpen ? colors.neonGreen : colors.cardBorder,
                        backgroundColor: colors.inputBgFrom,
                      },
                    ]}
                    onPress={toggleCustomerDropdown}
                    disabled={creating}
                    rippleColor={`${colors.primaryPurple}22`}
                  >
                    <View style={styles.dropdownHeaderContentRow}>
                      <View style={styles.dropdownHeaderContent}>
                        <Text
                          style={[
                            styles.dropdownHeaderLabel,
                            { color: selectedCustomer ? colors.textPrimary : colors.textMuted },
                          ]}
                        >
                          {resolveCustomerLabel(selectedCustomer) || t('Select customer')}
                        </Text>
                        <Text style={[styles.dropdownHeaderMeta, { color: colors.textSecondary }]}>
                          {selectedCustomer?.email ?? t('Search by name or email')}
                        </Text>
                      </View>
                      <Feather
                        name={customerDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textSecondary}
                      />
                    </View>
                  </TouchableRipple>
                  {customerDropdownOpen && (
                    <View style={styles.dropdownPanel}>
                      {selectedCustomer && (
                        <View style={[styles.dropdownSelectionRow, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
                          <Text style={[styles.dropdownSelectionText, { color: colors.textPrimary }]}>
                            {resolveCustomerLabel(selectedCustomer) || t(UNKNOWN_CUSTOMER)}
                          </Text>
                          <Button
                            mode="outlined"
                            onPress={() => setSelectedCustomer(null)}
                            disabled={creating}
                            textColor={colors.textSecondary}
                            style={[styles.clearButton, { borderColor: colors.cardBorder }]}
                            contentStyle={styles.clearButtonContent}
                          >
                            {t('Clear')}
                          </Button>
                        </View>
                      )}
                      <PaperTextInput
                        mode="outlined"
                        style={[styles.dropdownSearch, { backgroundColor: colors.inputBgFrom }]}
                        outlineColor={colors.cardBorder}
                        activeOutlineColor={colors.primaryPurple}
                        textColor={colors.textPrimary}
                        value={customerSearch}
                        onChangeText={setCustomerSearch}
                        placeholder={t('Search customers...')}
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        editable={!creating}
                        left={
                          <PaperTextInput.Icon
                            icon={() => <Feather name="search" size={16} color={colors.primaryPurple} />}
                          />
                        }
                      />
                      <ScrollView
                        style={[styles.selectorList, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}
                        nestedScrollEnabled
                      >
                        {filteredCustomers.length === 0 ? (
                          <Text style={[styles.selectorEmpty, { color: colors.textMuted }]}>
                            {t('No customers found.')}
                          </Text>
                        ) : (
                          filteredCustomers.map((customer, index) => {
                            const displayName = resolveCustomerLabel(customer) || t(UNKNOWN_CUSTOMER);
                            const displayEmail = customer.email ?? '';
                            const isSelected = selectedCustomer?.id === customer.id;
                            return (
                              <TouchableRipple
                                key={customer.id ?? customer.email ?? customer.name ?? `customer-${index}`}
                                style={[
                                  styles.selectorItem,
                                  {
                                    borderColor: isSelected ? colors.neonGreen : colors.cardBorder,
                                    backgroundColor: isSelected ? `${colors.neonGreen}12` : 'transparent',
                                  },
                                ]}
                                onPress={() => {
                                  setSelectedCustomer(customer);
                                  setCustomerDropdownOpen(false);
                                }}
                                disabled={creating}
                                rippleColor={`${colors.neonGreen}1f`}
                              >
                                <View style={styles.selectorContent}>
                                  <View style={styles.selectorInfo}>
                                    <Text style={[styles.selectorTitle, { color: colors.textPrimary }]}>{displayName}</Text>
                                    {!!displayEmail && (
                                      <Text style={[styles.selectorSubtitle, { color: colors.textMuted }]}>{displayEmail}</Text>
                                    )}
                                  </View>
                                  {isSelected && <Feather name="check" size={16} color={colors.neonGreen} />}
                                </View>
                              </TouchableRipple>
                            );
                          })
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Order date')}</Text>
                <View style={[styles.datePickerCard, { borderColor: colors.cardBorder, backgroundColor: colors.inputBgFrom }]}>
                  <View style={styles.datePickerCardContent}>
                    <View style={[styles.datePickerIconBox, { backgroundColor: `${colors.neonGreen}14` }]}>
                      <Feather name="calendar" size={16} color={colors.neonGreen} />
                    </View>
                    <View style={styles.datePickerInfo}>
                      <Text style={[styles.datePickerDateText, { color: colors.textPrimary }]}>
                        {orderDateLabel || formatOrderDateTime(new Date())}
                      </Text>
                      <Text style={[styles.datePickerHint, { color: colors.textMuted }]}>{t('Auto-set on creation')}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Payment scheduled')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
                <View style={[styles.datePickerCard, { borderColor: scheduledPaymentDate ? `${colors.primaryPurple}40` : colors.cardBorder, backgroundColor: colors.inputBgFrom }]}>
                  <View style={styles.datePickerCardContent}>
                    <View style={[styles.datePickerIconBox, { backgroundColor: scheduledPaymentDate ? `${colors.primaryPurple}14` : `${colors.textMuted}12` }]}>
                      <Feather name="clock" size={16} color={scheduledPaymentDate ? colors.primaryPurple : colors.textMuted} />
                    </View>
                    <View style={styles.datePickerInfo}>
                      <Text
                        style={[
                          styles.datePickerDateText,
                          { color: scheduledPaymentDate ? colors.textPrimary : colors.textMuted },
                        ]}
                      >
                        {scheduledPaymentDate ? formatDateLabel(scheduledPaymentDate) : t('Not scheduled')}
                      </Text>
                      <Text style={[styles.datePickerHint, { color: colors.textMuted }]}>
                        {scheduledPaymentDate ? t('Scheduled payment date') : t('Tap to pick a date')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.datePickerActions}>
                    <Pressable
                      onPress={openPaymentDatePicker}
                      disabled={creating}
                      style={(state: any) => [
                        styles.datePickerBtn,
                        { borderColor: `${colors.primaryPurple}40`, backgroundColor: `${colors.primaryPurple}08` },
                        state.hovered && { backgroundColor: `${colors.primaryPurple}18` },
                        creating && { opacity: 0.5 },
                      ]}
                    >
                      <Feather name="calendar" size={13} color={colors.primaryPurple} />
                      <Text style={[styles.datePickerBtnText, { color: colors.primaryPurple }]}>
                        {scheduledPaymentDate ? t('Change') : t('Pick date')}
                      </Text>
                    </Pressable>
                    {scheduledPaymentDate && (
                      <Pressable
                        onPress={clearScheduledPaymentDate}
                        disabled={creating}
                        style={(state: any) => [
                          styles.datePickerBtn,
                          { borderColor: colors.cardBorder },
                          state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
                          creating && { opacity: 0.5 },
                        ]}
                      >
                        <Feather name="x" size={13} color={colors.textMuted} />
                        <Text style={[styles.datePickerBtnText, { color: colors.textMuted }]}>
                          {t('Clear')}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Status')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
                {renderStatusOptions(createStatus, setCreateStatus)}
              </View>

                <View style={styles.modalField}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('Products')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
                    <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>
                      {t('{count} selected', { count: selectedItems.length })}
                    </Text>
                  </View>
                  <TouchableRipple
                    style={[
                      styles.dropdownHeader,
                      {
                        borderColor: productDropdownOpen ? colors.neonGreen : colors.cardBorder,
                        backgroundColor: colors.inputBgFrom,
                      },
                    ]}
                    onPress={toggleProductDropdown}
                    disabled={creating}
                    rippleColor={`${colors.primaryPurple}22`}
                  >
                    <View style={styles.dropdownHeaderContentRow}>
                      <View style={styles.dropdownHeaderContent}>
                        <Text style={[styles.dropdownHeaderLabel, { color: colors.textPrimary }]}>
                          {t('Add products')}
                        </Text>
                        <Text style={[styles.dropdownHeaderMeta, { color: colors.textSecondary }]}>
                          {t('Search catalog and add items')}
                        </Text>
                      </View>
                      <Feather
                        name={productDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textSecondary}
                      />
                    </View>
                  </TouchableRipple>
                  {productDropdownOpen && (
                    <View style={styles.dropdownPanel}>
                      <PaperTextInput
                        mode="outlined"
                        style={[styles.dropdownSearch, { backgroundColor: colors.inputBgFrom }]}
                        outlineColor={colors.cardBorder}
                        activeOutlineColor={colors.primaryPurple}
                        textColor={colors.textPrimary}
                        value={productSearch}
                        onChangeText={setProductSearch}
                        placeholder={t('Search products...')}
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        editable={!creating}
                        left={
                          <PaperTextInput.Icon
                            icon={() => <Feather name="search" size={16} color={colors.primaryPurple} />}
                          />
                        }
                      />
                      <ScrollView
                        style={[styles.selectorList, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}
                        nestedScrollEnabled
                      >
                        {filteredProducts.length === 0 ? (
                          <Text style={[styles.selectorEmpty, { color: colors.textMuted }]}>
                            {t('No products found.')}
                          </Text>
                        ) : (
                          filteredProducts.map((product) => {
                            const defaultValue = resolveProductValue(product);
                            const isSelected = selectedItems.some((item) => item.product.id === product.id);
                            const stock = getStorageQuantity(product);
                            const isOutOfStock = !product.isService && stock <= 0;
                            return (
                              <TouchableRipple
                                key={product.id}
                                style={[
                                  styles.selectorItem,
                                  {
                                    borderColor: isSelected ? colors.neonGreen : isOutOfStock ? `${colors.destructive}40` : colors.cardBorder,
                                    backgroundColor: isSelected ? `${colors.neonGreen}12` : isOutOfStock ? `${colors.destructive}0a` : 'transparent',
                                  },
                                  isOutOfStock && { opacity: 0.55 },
                                ]}
                                onPress={() => !isOutOfStock && addProduct(product)}
                                disabled={creating || isOutOfStock}
                                rippleColor={`${colors.neonGreen}1f`}
                              >
                                <View style={styles.selectorContent}>
                                  <View style={styles.selectorInfo}>
                                    <Text style={[styles.selectorTitle, { color: isOutOfStock ? colors.textMuted : colors.textPrimary }]}>
                                      {product.name ?? t('Unnamed product')}
                                    </Text>
                                    <Text style={[styles.selectorSubtitle, { color: colors.textMuted }]}>
                                      {formatCurrency(defaultValue, currency)}
                                      {!product.isService && ` · ${t('Stock')}: ${stock}`}
                                    </Text>
                                  </View>
                                  {isOutOfStock ? (
                                    <Text style={[styles.selectorAction, { color: colors.destructive }]}>
                                      {t('Out of Stock')}
                                    </Text>
                                  ) : (
                                    <Text style={[styles.selectorAction, { color: colors.neonGreen }]}>
                                      {isSelected ? t('Added') : t('Add')}
                                    </Text>
                                  )}
                                </View>
                              </TouchableRipple>
                            );
                          })
                        )}
                      </ScrollView>
                    </View>
                  )}

                <View style={styles.lineItems}>
                  {selectedItems.length === 0 ? (
                    <Text style={[styles.selectorEmpty, { color: colors.textMuted }]}>
                      {t('No products selected.')}
                    </Text>
                  ) : (
                    selectedItems.map((item) => {
                      const lineQuantity = parseNumber(item.quantity) ?? 0;
                      const lineValue = parseNumber(item.value) ?? 0;
                      const lineTotal = lineQuantity * lineValue;
                      const quantityError = getQuantityError(item.quantity, item.product.unitOfMeasure);
                      const stockError = getStockError(item);
                      const valueError = getValueError(item.value);
                      const allowDecimal = unitAllowsDecimal(item.product.unitOfMeasure);
                        return (
                          <View
                            key={item.product.id}
                            style={[styles.lineItemCard, { borderColor: colors.cardBorder }]}
                          >
                            <View style={styles.lineItemHeader}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.selectorTitle, { color: colors.textPrimary }]}>
                                  {item.product.name ?? t('Product')}
                                </Text>
                                {!item.product.isService && (
                                  <Text style={[styles.selectorSubtitle, { color: stockError ? colors.destructive : colors.textMuted, fontSize: 11 }]}>
                                    {t('Stock')}: {getStorageQuantity(item.product)}
                                  </Text>
                                )}
                              </View>
                              <IconButton
                                icon={() => <Feather name="trash-2" size={14} color={colors.accentOrange} />}
                                size={18}
                                onPress={() => removeLineItem(item.product.id)}
                                disabled={creating}
                              />
                            </View>
                            <View style={styles.lineItemRow}>
                              <View style={styles.lineItemField}>
                                <Text style={[styles.lineItemLabel, { color: colors.textMuted }]}>{t('Qty')}</Text>
                                <PaperTextInput
                                  mode="outlined"
                                  style={[styles.lineItemInput, { backgroundColor: colors.inputBgFrom }]}
                                  textColor={colors.textPrimary}
                                  outlineColor={colors.cardBorder}
                                  activeOutlineColor={colors.primaryPurple}
                                  value={item.quantity}
                                  onChangeText={(value) => updateLineItem(item.product.id, 'quantity', value)}
                                  keyboardType={allowDecimal ? 'decimal-pad' : 'numeric'}
                                  inputMode={allowDecimal ? 'decimal' : 'numeric'}
                                  error={!!quantityError || !!stockError}
                                  editable={!creating}
                                  dense
                                />
                                <HelperText type="error" visible={!!quantityError || !!stockError} style={styles.lineItemHelper}>
                                  {quantityError ?? stockError ?? ''}
                                </HelperText>
                              </View>
                              <View style={styles.lineItemField}>
                                <Text style={[styles.lineItemLabel, { color: colors.textMuted }]}>{t('Value')}</Text>
                                <PaperTextInput
                                  mode="outlined"
                                  style={[styles.lineItemInput, { backgroundColor: colors.inputBgFrom }]}
                                  textColor={colors.textPrimary}
                                  outlineColor={colors.cardBorder}
                                  activeOutlineColor={colors.primaryPurple}
                                  value={item.value}
                                  onChangeText={(value) => updateLineItem(item.product.id, 'value', value)}
                                  keyboardType="numeric"
                                  inputMode="decimal"
                                  error={!!valueError}
                                  editable={!creating}
                                  dense
                                />
                                <HelperText type="error" visible={!!valueError} style={styles.lineItemHelper}>
                                  {valueError ?? ''}
                                </HelperText>
                              </View>
                            <View style={styles.lineItemField}>
                              <Text style={[styles.lineItemLabel, { color: colors.textMuted }]}>{t('Total')}</Text>
                              <Text style={[styles.lineItemTotal, { color: colors.textPrimary }]}>
                                {formatCurrency(lineTotal, currency)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                <View style={[styles.summaryRow, { borderColor: colors.cardBorder }]}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('Items')}</Text>
                    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                      {hasDecimalItems ? computedItems.toFixed(2) : Math.round(computedItems)}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('Total')}</Text>
                    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                      {formatCurrency(computedTotal, currency)}
                    </Text>
                  </View>
                </View>
              </View>

                <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
                  <Button
                    mode="outlined"
                    onPress={closeCreate}
                    disabled={creating}
                    textColor={colors.textSecondary}
                    style={[styles.modalButton, { borderColor: colors.cardBorder }]}
                    contentStyle={styles.modalButtonContent}
                    labelStyle={styles.modalButtonLabel}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleCreate}
                    disabled={createDisabled}
                    buttonColor={colors.primaryPurple}
                    textColor="#fff"
                    style={styles.modalButton}
                    contentStyle={styles.modalButtonContent}
                    labelStyle={styles.modalButtonLabel}
                  >
                    {creating ? t('Creating...') : t('Create')}
                  </Button>
                </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={detailsVisible} transparent animationType="fade" onRequestClose={closeDetails}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isTablet && styles.modalCardWide,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('Order Details')}</Text>
              <IconButton
                icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
                size={18}
                onPress={closeDetails}
                style={[styles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
              />
            </View>
            {detailsLoading ? (
              <View style={styles.detailsLoading}>
                <NervLoader
                  size={140}
                  label={t('Loading order details')}
                  subtitle={t('Fetching latest info...')}
                  style={styles.detailsLoader}
                />
              </View>
            ) : detailsOrder ? (
              <ScrollView
                style={styles.detailsScroll}
                contentContainerStyle={styles.detailsContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.detailsHero, { borderColor: colors.cardBorder, backgroundColor: colors.inputBgFrom }]}>
                  <View style={styles.detailsHeroTop}>
                    <View style={styles.detailsHeroIdBlock}>
                      <Text style={[styles.detailsHeroLabel, { color: colors.textMuted }]}>{t('Order')}</Text>
                      <Text style={[styles.detailsHeroId, { color: colors.primaryPurple }]}>
                        #{detailsOrder.id ?? '-'}
                      </Text>
                    </View>
                    <StatusBadge status={resolveStatusOption(detailsOrder.status).toLowerCase()} label={t(resolveStatusOption(detailsOrder.status))} />
                  </View>
                  <View style={[styles.detailsHeroBottom, { borderTopColor: colors.cardBorder }]}>
                    <View style={styles.detailsHeroStat}>
                      <Text style={[styles.detailsHeroStatLabel, { color: colors.textMuted }]}>{t('Total')}</Text>
                      <Text style={[styles.detailsHeroStatValue, { color: colors.textPrimary }]}>
                        {formatCurrency(
                          typeof detailsOrder.totalValue === 'number'
                            ? detailsOrder.totalValue
                            : typeof detailsOrder.total === 'number'
                              ? detailsOrder.total
                              : 0,
                          currency,
                        )}
                      </Text>
                    </View>
                    <View style={styles.detailsHeroStat}>
                      <Text style={[styles.detailsHeroStatLabel, { color: colors.textMuted }]}>{t('Items')}</Text>
                      <Text style={[styles.detailsHeroStatValue, { color: colors.textPrimary }]}>
                        {resolveItemsFromOrderedProducts(detailsOrder)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailsGrid, { borderColor: colors.cardBorder }]}>
                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.primaryPurple}14` }]}>
                      <Feather name="user" size={14} color={colors.primaryPurple} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Customer')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {detailsCustomer?.name ?? resolveOrderCustomerName(detailsOrder)}
                      </Text>
                      {!!detailsCustomer?.email && (
                        <Text style={[styles.detailsSubValue, { color: colors.textMuted }]}>
                          {detailsCustomer.email}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.primaryPurple}14` }]}>
                      <Feather name="calendar" size={14} color={colors.primaryPurple} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Order date')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {formatOrderDateTime(resolveOrderDateSource(detailsOrder))}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.primaryPurple}14` }]}>
                      <Feather name="clock" size={14} color={colors.primaryPurple} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Payment scheduled')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {resolveOrderScheduledPaymentDateSource(detailsOrder)
                          ? formatOrderDateTime(resolveOrderScheduledPaymentDateSource(detailsOrder))
                          : t('Not scheduled')}
                      </Text>
                    </View>
                  </View>

                  {shouldShowPaidAt(detailsOrder.status) && (
                    <View style={styles.detailsIconRow}>
                      <View style={[styles.detailsIconBox, { backgroundColor: `${colors.neonGreen}14` }]}>
                        <Feather name="check-circle" size={14} color={colors.neonGreen} />
                      </View>
                      <View style={styles.detailsIconRowInfo}>
                        <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Paid at')}</Text>
                        <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                          {resolveOrderPaydaySource(detailsOrder)
                            ? formatOrderDateTime(resolveOrderPaydaySource(detailsOrder))
                            : '-'}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.textMuted}14` }]}>
                      <Feather name="hash" size={14} color={colors.textMuted} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Customer ID')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {detailsOrder.customerId ?? '-'}
                      </Text>
                    </View>
                  </View>
                </View>

                {canManageOrders && (
                  <View style={styles.detailsSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('Manual Status')}</Text>
                    {renderStatusOptions(
                      resolveStatusOption(detailsOrder.status),
                      requestStatusChange,
                      statusUpdating || deletingId === detailsOrder.id,
                    )}
                    {pendingStatusChange && (
                      <View
                        style={[
                          styles.statusConfirmCard,
                          { borderColor: colors.cardBorder, backgroundColor: colors.inputBgFrom },
                        ]}
                      >
                        <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
                          {t('Change status from {from} to {to}?', {
                            from: t(resolveStatusOption(detailsOrder.status)),
                            to: t(pendingStatusChange),
                          })}
                        </Text>
                        <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
                          <Button
                            mode="outlined"
                            onPress={cancelPendingStatusChange}
                            disabled={statusUpdating}
                            textColor={colors.textSecondary}
                            style={[styles.modalButton, { borderColor: colors.cardBorder }]}
                            contentStyle={styles.modalButtonContent}
                            labelStyle={styles.modalButtonLabel}
                          >
                            {t('Cancel')}
                          </Button>
                          <Button
                            mode="contained"
                            onPress={confirmStatusChange}
                            disabled={statusUpdating}
                            buttonColor={colors.primaryPurple}
                            textColor="#fff"
                            style={[styles.modalButton, statusUpdating && styles.actionButtonDisabled]}
                            contentStyle={styles.modalButtonContent}
                            labelStyle={styles.modalButtonLabel}
                          >
                            {t('Confirm')}
                          </Button>
                        </View>
                      </View>
                    )}
                    {statusUpdating && (
                      <Text style={[styles.statusUpdateHint, { color: colors.textMuted }]}>
                        {t('Updating status...')}
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.detailsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('Line Items')}</Text>
                  <View style={[styles.lineItems, { marginTop: 8 }]}>
                    {detailsOrder.orderedProduct && detailsOrder.orderedProduct.length > 0 ? (
                      detailsOrder.orderedProduct.map((item, index) => {
                        const lineQuantity = typeof item.quantity === 'number' ? item.quantity : 0;
                        const lineValue = typeof item.value === 'number' ? item.value : 0;
                        const lineTotal =
                          typeof item.total === 'number'
                            ? item.total
                            : typeof item.totalValue === 'number'
                              ? item.totalValue
                              : lineQuantity * lineValue;
                        const lineProductName =
                          item.product?.name ??
                          item.product?.description ??
                          `Product #${item.productId}`;
                        return (
                          <View
                            key={`${item.productId}-${index}`}
                            style={[styles.detailsLineCard, { borderColor: colors.cardBorder, backgroundColor: colors.inputBgFrom }]}
                          >
                            <View style={styles.detailsLineHeader}>
                              <View style={[styles.detailsLineIconBox, { backgroundColor: `${colors.primaryPurple}14` }]}>
                                <Feather name="package" size={14} color={colors.primaryPurple} />
                              </View>
                              <Text style={[styles.detailsLineName, { color: colors.textPrimary }]} numberOfLines={1}>
                                {lineProductName}
                              </Text>
                            </View>
                            <View style={styles.detailsLineMetrics}>
                              <View style={styles.detailsLineMetric}>
                                <Text style={[styles.detailsLineMetricLabel, { color: colors.textMuted }]}>{t('Qty')}</Text>
                                <Text style={[styles.detailsLineMetricValue, { color: colors.textPrimary }]}>
                                  {lineQuantity}
                                </Text>
                              </View>
                              <View style={[styles.detailsLineDivider, { backgroundColor: colors.cardBorder }]} />
                              <View style={styles.detailsLineMetric}>
                                <Text style={[styles.detailsLineMetricLabel, { color: colors.textMuted }]}>{t('Value')}</Text>
                                <Text style={[styles.detailsLineMetricValue, { color: colors.textPrimary }]}>
                                  {formatCurrency(lineValue, currency)}
                                </Text>
                              </View>
                              <View style={[styles.detailsLineDivider, { backgroundColor: colors.cardBorder }]} />
                              <View style={styles.detailsLineMetric}>
                                <Text style={[styles.detailsLineMetricLabel, { color: colors.textMuted }]}>{t('Total')}</Text>
                                <Text style={[styles.detailsLineMetricValue, { color: colors.textPrimary, fontWeight: '700' }]}>
                                  {formatCurrency(lineTotal, currency)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={[styles.selectorEmpty, { color: colors.textMuted }]}>
                        {t('Line items unavailable for this order.')}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
                    <Button
                      mode="outlined"
                      onPress={closeDetails}
                      textColor={colors.textSecondary}
                      style={[styles.modalButton, { borderColor: colors.cardBorder }]}
                      contentStyle={styles.modalButtonContent}
                      labelStyle={styles.modalButtonLabel}
                    >
                      {t('Close')}
                    </Button>
                    {canManageOrders && (
                      <Button
                        mode="outlined"
                        onPress={() => requestDelete(detailsOrder)}
                        disabled={deletingId === detailsOrder.id}
                        textColor={colors.accentOrange}
                        style={[
                          styles.modalButton,
                          styles.deleteButton,
                          { borderColor: colors.cardBorder },
                          deletingId === detailsOrder.id && styles.actionButtonDisabled,
                        ]}
                        contentStyle={styles.modalButtonContent}
                        labelStyle={styles.modalButtonLabel}
                      >
                        {deletingId === detailsOrder.id ? t('Deleting...') : t('Delete Order')}
                      </Button>
                    )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <DatePickerModal
        locale="en-US"
        mode="single"
        visible={paymentDatePickerVisible}
        onDismiss={closePaymentDatePicker}
        date={scheduledPaymentDate ?? undefined}
        saveLabel={t('Apply')}
        label={t('Payment scheduled')}
        presentationStyle="overFullScreen"
        onConfirm={({ date }) => handlePaymentDateConfirm({ date })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    borderRadius: 8,
  },
  headerBtnOutlined: {
    borderRadius: 8,
    borderWidth: 1,
  },
  headerBtnContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
    lineHeight: 30,
  },
  titleCompact: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  banner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 12,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  tabBarScroll: {
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    ...Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  tabItemActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    ...Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  filterPanelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterPanelRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  filterPanelLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPanelLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  filterDateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterDateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  presetRow: {
    marginBottom: 2,
  },
  presetPills: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    ...Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterPanelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPanelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    ...Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  filterPanelBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  compactActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  actionRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  paginationRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  paginationButton: {
    borderRadius: 8,
    borderWidth: 1,
  },
  paginationButtonContent: {
    height: 36,
    paddingHorizontal: 12,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  pageIndicator: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchBar: {
    flex: 1,
    borderRadius: 8,
    minHeight: 40,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    borderRadius: 8,
  },
  addButtonContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  orderList: {
    gap: 12,
  },
  orderMobileCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  orderMobileCardDense: {
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  orderMobileHeader: {
    gap: 10,
  },
  orderMobileHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderMobileIdBlock: {
    flex: 1,
  },
  orderMobileSections: {
    gap: 12,
  },
  orderMobileSectionsDense: {
    gap: 10,
  },
  orderMobileSection: {
    gap: 10,
  },
  orderMobileTimelineSection: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  orderMobileSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  orderMobileMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  orderMobileMetricsDense: {
    gap: 8,
  },
  orderMobileMetricCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    flex: 1,
    minWidth: 140,
  },
  orderMobileMetricCardDense: {
    borderRadius: 12,
    padding: 10,
    minWidth: 120,
  },
  orderTableShell: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  orderTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  orderTableHeadText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  orderTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...Platform.select({ web: { cursor: 'pointer', transitionProperty: 'background-color', transitionDuration: '150ms' } as any }),
  },
  colOrderId: {
    flex: 1,
    minWidth: 70,
  },
  colOrderIdText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  colCustomer: {
    flex: 1.5,
    minWidth: 90,
  },
  colCustomerText: {
    fontSize: 14,
  },
  colItems: {
    width: 44,
    textAlign: 'right' as const,
  },
  colItemsText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  colTotal: {
    width: 90,
    textAlign: 'right' as const,
  },
  colTotalText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  colStatus: {
    width: 100,
  },
  colDate: {
    width: 90,
  },
  colDateText: {
    fontSize: 12,
  },
  orderLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginBottom: 10,
  },
  orderIdMobile: {
    marginBottom: 0,
    fontSize: 17,
  },
  orderIdMobileDense: {
    fontSize: 15,
  },
  tableMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tableIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableMetaContent: {
    flex: 1,
    gap: 3,
  },
  tableMetaTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  tableMetaSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  orderTimeline: {
    gap: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  metricPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metricPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderTotalLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  orderTotalMobile: {
    fontSize: 18,
  },
  actionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  actionIconButton: {
    width: 32,
    height: 32,
    margin: 0,
    borderWidth: 1,
    borderRadius: 8,
  },
  actionIconButtonMobile: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  actionIconButtonCompact: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  deleteButton: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 18, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    gap: 20,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.22,
        shadowRadius: 30,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalCardWide: {
    maxWidth: 520,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  confirmText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalScroll: {
    marginTop: 4,
  },
  modalScrollContent: {
    paddingBottom: 8,
    gap: 12,
  },
  detailsScroll: {
    maxHeight: 460,
  },
  detailsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  detailsLoader: {
    backgroundColor: 'transparent',
  },
  detailsContent: {
    gap: 12,
    paddingBottom: 8,
  },
  detailsHero: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    gap: 0,
  },
  detailsHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 14,
  },
  detailsHeroIdBlock: {
    gap: 2,
  },
  detailsHeroLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailsHeroId: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  detailsHeroBottom: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 24,
  },
  detailsHeroStat: {
    gap: 2,
  },
  detailsHeroStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailsHeroStatValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  detailsGrid: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  detailsSection: {
    gap: 8,
  },
  detailsIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailsIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  detailsIconRowInfo: {
    flex: 1,
    gap: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailsColumn: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  detailsLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailsValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsSubValue: {
    fontSize: 11,
  },
  modalField: {
    gap: 8,
  },
  dateInputCard: {
    gap: 8,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  modalInput: {
    borderRadius: 12,
    minHeight: 52,
  },
  modalInputContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 20,
  },
  modalInputOutline: {
    borderRadius: 12,
  },
  infoRow: {
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 12,
  },
  metaRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaValue: {
    fontSize: 14,
  },
  metaHint: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  datePickerCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  datePickerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerInfo: {
    flex: 1,
    gap: 2,
  },
  datePickerDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerHint: {
    fontSize: 11,
  },
  datePickerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    ...Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  datePickerBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownHeader: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dropdownHeaderContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flex: 1,
  },
  dropdownHeaderContent: {
    flex: 1,
    gap: 4,
  },
  dropdownHeaderLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownHeaderMeta: {
    fontSize: 11,
  },
  dropdownPanel: {
    marginTop: 10,
    gap: 10,
  },
  dropdownSearch: {
    borderRadius: 12,
  },
  dropdownSelectionRow: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dropdownSelectionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearButton: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clearButtonContent: {
    paddingVertical: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  selectorList: {
    borderWidth: 1.5,
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 160,
    overflow: 'hidden',
  },
  selectorItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectorInfo: {
    flex: 1,
    gap: 2,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectorTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectorSubtitle: {
    fontSize: 11,
  },
  selectorAction: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectorEmpty: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 12,
  },
  statusPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    ...Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusConfirmCard: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  statusUpdateHint: {
    marginTop: 6,
    fontSize: 11,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  modalActionsCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  modalButton: {
    minWidth: 120,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalButtonContent: {
    height: 44,
    paddingHorizontal: 18,
  },
  modalButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  lineItems: {
    marginTop: 12,
    gap: 10,
  },
  lineItemCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  lineItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  lineItemField: {
    minWidth: 90,
    gap: 4,
  },
  lineItemLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  lineItemInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    minWidth: 80,
  },
  lineItemTotal: {
    fontSize: 13,
    fontWeight: '600',
  },
  lineItemHelper: {
    marginTop: -2,
    marginBottom: -2,
    fontSize: 10,
  },
  detailsLineCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  detailsLineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailsLineIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsLineName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  detailsLineMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  detailsLineMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  detailsLineMetricLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailsLineMetricValue: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  detailsLineDivider: {
    width: 1,
    height: 24,
  },
  summaryRow: {
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryItem: {
    gap: 4,
  },
  summaryLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
