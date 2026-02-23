import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import {
  Button,
  Card,
  Chip,
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
import { formatUsDateTime } from '../utils/datetime';
import { hasManagementAccess } from '../utils/access';

const orderStatusOptions = ['Pending', 'Processing', 'Shipped', 'Delivered'] as const;
type OrderStatusOption = (typeof orderStatusOptions)[number];
const statuses = ['all', ...orderStatusOptions];
const UNKNOWN_CUSTOMER = 'Unknown customer';
const LOADING_CUSTOMER = 'Loading customer...';
const orderStatusEnumValue: Record<OrderStatusOption, number> = {
  Pending: 0,
  Processing: 1,
  Shipped: 2,
  Delivered: 3,
};
const resolveStatusOption = (value?: string | null): OrderStatusOption => {
  const normalized = (value ?? '').trim().toLowerCase();
  const match = orderStatusOptions.find((status) => status.toLowerCase() === normalized);
  return match ?? 'Pending';
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
  const { t } = useI18n();
  const { client, token, isAuthenticated, loading: authLoading, enterpriseId, currency, user } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const canManageOrders = hasManagementAccess(user?.role);
  const managementDeniedMessage = t('Only Admin, Manager, and Supervisor can edit or delete orders.');
  const { isCompact, isTablet, contentPadding } = useResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState<Date | null>(null);
  const [endDateFilter, setEndDateFilter] = useState<Date | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [orders, setOrders] = useState<OrderModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<OrderModel | null>(null);
  const [detailsCustomer, setDetailsCustomer] = useState<CustomerModel | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
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
  const [createVisible, setCreateVisible] = useState(false);
  const [orderDateLabel, setOrderDateLabel] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerModel | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedOrderItem[]>([]);
  const [customers, setCustomers] = useState<CustomerModel[]>([]);
  const [products, setProducts] = useState<ProductModel[]>([]);
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
      setErrorMessage(null);

      const response = await erpService.fetchOrders(pageNumber, pageSize, false, orderFilter);
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        const activeOrders = response.data.filter((order) => order.isActive === true);
        setOrders(activeOrders);
        setHasMore(response.data.length === pageSize);
      } else {
        setErrorMessage(response.error ?? t('Unable to load orders'));
      }

      setLoading(false);
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading, pageNumber, pageSize, orderFilter, refreshKey]);

  useEffect(() => {
    if (!isAuthenticated || authLoading || !ordersHubUrl) {
      return;
    }

    let active = true;
    const tokenValue = token ?? '';
    const hubUrlWithToken =
      tokenValue && ordersHubUrl
        ? `${ordersHubUrl}${ordersHubUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(tokenValue)}`
        : ordersHubUrl;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrlWithToken, {
        accessTokenFactory: () => tokenValue,
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    const handleOrderEvent = (orderId?: string, status?: string) => {
      if (!active) {
        return;
      }
      if (orderId) {
        const nextStatus = resolveStatusOption(status);
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
      setErrorMessage(
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
    if (!createVisible || !isAuthenticated || authLoading) {
      return;
    }

    let active = true;

    const loadOptions = async () => {
      setOptionsLoading(true);

      const shouldLoadCustomers = customers.length === 0;
      const shouldLoadProducts = products.length === 0;

      const [customersResponse, productsResponse] = await Promise.all([
        shouldLoadCustomers
          ? erpService.fetchCustomers(1, 25)
          : Promise.resolve({ ok: true, data: customers, error: undefined }),
        shouldLoadProducts
          ? erpService.fetchProducts(1, 25)
          : Promise.resolve({ ok: true, data: products, error: undefined }),
      ]);

      if (!active) {
        setOptionsLoading(false);
        return;
      }

      if (customersResponse.ok && customersResponse.data && shouldLoadCustomers) {
        setCustomers(customersResponse.data);
      }

      if (productsResponse.ok && productsResponse.data && shouldLoadProducts) {
        setProducts(productsResponse.data);
      }

      if (!customersResponse.ok || !productsResponse.ok) {
        const fallbackError =
          customersResponse.error ??
          productsResponse.error ??
          t('Unable to load order options');
        setErrorMessage(fallbackError);
      }

      setOptionsLoading(false);
    };

    loadOptions();

    return () => {
      active = false;
      setOptionsLoading(false);
    };
  }, [createVisible, isAuthenticated, authLoading, erpService]);

  const goPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goNextPage = () => {
    if (hasMore) {
      setPageNumber((prev) => prev + 1);
    }
  };

  const openDatePicker = () => {
    setErrorMessage(null);
    setDatePickerVisible(true);
  };

  const closeDatePicker = () => {
    setDatePickerVisible(false);
  };

  const handleDateConfirm = ({
    startDate,
    endDate,
  }: {
    startDate?: Date;
    endDate?: Date;
  }) => {
    if (startDate && endDate && endDate < startDate) {
      setErrorMessage(t('End date must be after the start date.'));
      return;
    }
    setErrorMessage(null);
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
          setErrorMessage(response.error);
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
                    // Preserve list status; details prefetch should not override user-visible status.
                    status: order.status,
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
          setErrorMessage(response.error);
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
            // Preserve current modal status to avoid stale fetch overriding recent status changes.
            status: current.status,
            customer: mergedCustomer,
            customerId: response.data.customerId ?? current.customerId,
          };
        });
      } else if (response.error) {
        setErrorMessage(response.error);
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
      setErrorMessage(t('Authenticate to manage orders.'));
      return;
    }
    setErrorMessage(null);
    setOrderDateLabel(formatUsDateTime(new Date()));
    setCustomerDropdownOpen(false);
    setProductDropdownOpen(false);
    setCustomerSearch('');
    setSelectedCustomer(null);
    setProductSearch('');
    setSelectedItems([]);
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
    setCreateStatus('Pending');
    setCreating(false);
  };

  const openDetails = (order: OrderModel) => {
    orderDetailsRequestRef.current = null;
    setStatusUpdating(false);
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
  };

  const closeDeleteConfirm = () => {
    setConfirmDeleteVisible(false);
    setConfirmDeleteOrder(null);
  };

  const confirmDelete = async () => {
    if (!canManageOrders) {
      setErrorMessage(managementDeniedMessage);
      closeDeleteConfirm();
      return;
    }

    if (!confirmDeleteOrder || confirmDeleteOrder.id === undefined || confirmDeleteOrder.id === null) {
      closeDeleteConfirm();
      return;
    }

    setDeletingId(confirmDeleteOrder.id);
    setErrorMessage(null);

    const response = await erpService.deleteOrder(confirmDeleteOrder.id);
    if (response.ok) {
      setOrders((prev) =>
        prev.filter((item) => String(item.id) !== String(confirmDeleteOrder.id)),
      );
      if (detailsOrder?.id === confirmDeleteOrder.id) {
        closeDetails();
      }
    } else {
      setErrorMessage(response.error ?? t('Unable to delete order'));
    }

    setDeletingId(null);
    closeDeleteConfirm();
  };

  const requestDelete = (order: OrderModel) => {
    if (!isAuthenticated || authLoading) {
      setErrorMessage(t('Authenticate to manage orders.'));
      return;
    }
    if (!canManageOrders) {
      setErrorMessage(managementDeniedMessage);
      return;
    }
    if (order.id === undefined || order.id === null) {
      setErrorMessage(t('Order id missing.'));
      return;
    }

    setConfirmDeleteOrder(order);
    setConfirmDeleteVisible(true);
  };

  const addProduct = (product: ProductModel) => {
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

  const hasLineItemErrors = useMemo(
    () =>
      selectedItems.some(
        (item) =>
          getQuantityError(item.quantity, item.product.unitOfMeasure) ||
          getValueError(item.value),
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
      setErrorMessage(t('Authenticate to manage orders.'));
      return;
    }
    if (!enterpriseId) {
      setErrorMessage(t('Enterprise not found for this user.'));
      return;
    }

    if (!selectedCustomer) {
      setErrorMessage(t('Select a customer.'));
      return;
    }

    if (selectedItems.length === 0) {
      setErrorMessage(t('Add at least one product.'));
      return;
    }

    const orderLineItems: OrderLineItem[] = [];
    let totalItems = 0;
    let totalValue = 0;
    for (const item of selectedItems) {
      const quantityError = getQuantityError(item.quantity, item.product.unitOfMeasure);
      if (quantityError) {
        setErrorMessage(
          t('{name} quantity: {message}.', {
            name: item.product.name ?? t('Product'),
            message: t(quantityError),
          }),
        );
        return;
      }
      const valueError = getValueError(item.value);
      if (valueError) {
        setErrorMessage(
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
        setErrorMessage(
          t('{name} has invalid quantity or value.', {
            name: item.product.name ?? t('Product'),
          }),
        );
        return;
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
      setErrorMessage(t('Customer name is required.'));
      return;
    }

    const now = new Date();
    const dateValue = now.toISOString();
    setOrderDateLabel(formatUsDateTime(now));

    setCreating(true);
    setErrorMessage(null);

    const payload: OrderCreatePayload = {
      customer,
      date: dateValue,
      total: totalValue,
      totalValue,
      status: orderStatusEnumValue[createStatus],
      items: totalItems,
      customerId: selectedCustomer?.id,
      enterpriseId: enterpriseId ?? undefined,
      orderedProduct: orderLineItems,
    };

    const response = await erpService.createOrder(payload);
    if (response.ok) {
      const fallbackOrder: OrderModel = {
        id: response.data?.id ?? Date.now(),
        customer,
        customerId: selectedCustomer?.id,
        date: dateValue,
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
      setErrorMessage(response.error ?? t('Unable to create order'));
    }

    setCreating(false);
  };

  const handleManualStatusChange = async (nextStatus: OrderStatusOption) => {
    if (statusUpdating || !detailsOrder || detailsOrder.id === undefined || detailsOrder.id === null) {
      return;
    }

    if (resolveStatusOption(detailsOrder.status) === nextStatus) {
      return;
    }

    if (!isAuthenticated || authLoading) {
      setErrorMessage(t('Authenticate to manage orders.'));
      return;
    }
    if (!canManageOrders) {
      setErrorMessage(managementDeniedMessage);
      return;
    }

    setStatusUpdating(true);
    setErrorMessage(null);
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
        setErrorMessage(t('Order must have Ordered Products.'));
        return;
      }

      const updatedAt = new Date().toISOString();
      const safeCustomer = resolveOrderCustomerNameRaw(sourceOrder) || UNKNOWN_CUSTOMER;
      const safeDate = sourceOrder.date ?? sourceOrder.createdAt ?? new Date().toISOString();
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
        payday: safeDate,
        paymentScheduledDate: safeDate,
      };

      const response = await erpService.updateOrder(payload);
      if (response.ok) {
        setDetailsOrder((current) =>
          current && String(current.id) === String(payload.id)
            ? {
                ...current,
                updatedAt,
                status: nextStatus,
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
                }
              : order,
          ),
        );
      } else {
        setErrorMessage(response.error ?? t('Unable to update order status'));
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  const renderStatusOptions = (
    selected: OrderStatusOption,
    onSelect: (status: OrderStatusOption) => void,
    disabled = false,
  ) => (
    <View style={[styles.statusOptions, isCompact && styles.statusOptionsCompact]}>
      {orderStatusOptions.map((status) => {
        const isSelected = selected === status;
        return (
          <Chip
            key={status}
            disabled={disabled}
            selected={isSelected}
            showSelectedCheck={false}
            icon={
              isSelected
                ? ({ size }) => <Feather name="check" size={Math.max(12, size - 2)} color={colors.neonGreen} />
                : undefined
            }
            onPress={() => {
              if (disabled) {
                return;
              }
              onSelect(status);
            }}
            style={[
              styles.statusOption,
              {
                borderColor: isSelected ? colors.primaryPurple : colors.cardBorder,
                backgroundColor: isSelected ? colors.primaryPurple : colors.cardBgFrom,
              },
            ]}
            textStyle={[
              styles.statusOptionText,
              { color: isSelected ? colors.neonGreen : colors.textSecondary },
            ]}
          >
            {t(status)}
          </Chip>
        );
      })}
    </View>
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

    const orderDate = parseOrderDateValue(order.date ?? order.createdAt ?? null);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return colors.accentOrange;
      case 'Processing':
        return colors.primaryPurple;
      case 'Shipped':
        return '#4a9eff';
      case 'Delivered':
        return colors.neonGreen;
      default:
        return colors.textMuted;
    }
  };

  if (loading) {
    return (
      <NervLoader
        fullScreen
        label={t('Synchronizing EVA-01')}
        subtitle={t('LCL circulation nominal | Loading orders...')}
      />
    );
  }

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
        <View style={[styles.content, { padding: contentPadding }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
              {t('ORDER TRACKING')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
              {t('Monitor and manage customer orders')}
            </Text>
            <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
          </View>

          {!isAuthenticated && !authLoading && (
            <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
              <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                {t('Authenticate to load live orders.')}
              </Text>
            </View>
          )}

          {errorMessage && (
            <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
              <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
            </View>
          )}

          {!loading && filteredOrders.length === 0 && (
            <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
              <Feather name="shopping-cart" size={20} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('No orders yet')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {t('Orders will appear here as soon as they are placed.')}
              </Text>
            </View>
          )}

            {/* Status Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
              {statuses.map((status) => {
                const isSelected = filterStatus === status;
                return (
                  <Chip
                    key={status}
                    selected={isSelected}
                    showSelectedCheck={false}
                    icon={
                      isSelected
                        ? ({ size }) => (
                            <Feather
                              name="check"
                              size={Math.max(12, size - 2)}
                              color={colors.neonGreen}
                            />
                          )
                        : undefined
                    }
                    onPress={() => setFilterStatus(status)}
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor: isSelected ? colors.primaryPurple : colors.cardBgFrom,
                        borderColor: isSelected ? colors.primaryPurple : colors.cardBorder,
                      },
                    ]}
                    textStyle={[
                      styles.filterText,
                      { color: isSelected ? colors.neonGreen : colors.textSecondary },
                    ]}
                  >
                    {status === 'all' ? t('All') : t(status.charAt(0).toUpperCase() + status.slice(1))}
                  </Chip>
                );
              })}
            </ScrollView>

          <View
            style={[
              styles.dateFilterCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isCompact && styles.dateFilterCardCompact,
            ]}
          >
            <View style={styles.dateFilterHeader}>
              <View>
                <Text style={[styles.dateFilterLabel, { color: colors.textMuted }]}>
                  {t('Date Range')}
                </Text>
                <Text style={[styles.dateRangeSummary, { color: colors.textSecondary }]}>
                  {startDateFilter || endDateFilter
                    ? `${formatDateLabel(startDateFilter ?? endDateFilter)} - ${formatDateLabel(endDateFilter ?? startDateFilter)}`
                    : t('Any time')}
                </Text>
              </View>
                <View style={styles.dateFilterHeaderActions}>
                  <Button
                    mode="contained"
                    onPress={openDatePicker}
                    icon={({ size }) => <Feather name="calendar" size={size} color={colors.neonGreen} />}
                    buttonColor={colors.primaryPurple}
                    textColor={colors.appBg}
                    style={styles.dateFilterActionPrimary}
                    contentStyle={styles.dateFilterActionContent}
                  >
                    {t('Pick range')}
                  </Button>
                  {(startDateFilter || endDateFilter) && (
                    <Button
                      mode="outlined"
                      onPress={clearDateFilter}
                      textColor={colors.textSecondary}
                      style={[styles.dateFilterActionGhost, { borderColor: colors.cardBorder }]}
                      contentStyle={styles.dateFilterActionContent}
                    >
                      {t('Clear')}
                    </Button>
                  )}
                </View>
            </View>
          </View>

            {/* Search and Add */}
            <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
              <Searchbar
                placeholder={t('Search orders...')}
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={[styles.searchBar, { backgroundColor: colors.inputBgFrom }]}
                iconColor={colors.primaryPurple}
                inputStyle={[styles.searchInput, { color: colors.textPrimary }]}
                placeholderTextColor={colors.textMuted}
              />
              <Button
                mode="contained"
                onPress={openCreate}
                disabled={!isAuthenticated || authLoading}
                icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
                buttonColor={colors.primaryPurple}
                textColor={colors.appBg}
                style={[
                  styles.addButton,
                  isCompact && styles.addButtonCompact,
                  (!isAuthenticated || authLoading) && styles.buttonDisabled,
                ]}
                contentStyle={[styles.addButtonContent, isCompact && styles.addButtonContentCompact]}
                labelStyle={styles.addButtonLabel}
              >
                {t('Add')}
              </Button>
            </View>

            <View style={[styles.paginationRow, isCompact && styles.paginationRowCompact]}>
              <Button
                mode="outlined"
                onPress={goPrevPage}
                disabled={pageNumber === 1}
                icon={({ size }) => <Feather name="chevron-left" size={size} color={colors.textSecondary} />}
                textColor={colors.textSecondary}
                style={[
                  styles.paginationButton,
                  { borderColor: colors.cardBorder },
                  pageNumber === 1 && styles.paginationButtonDisabled,
                ]}
              >
                {t('Prev')}
              </Button>
              <Text style={[styles.pageIndicator, { color: colors.textPrimary }]}>{t('Page {page}', { page: pageNumber })}</Text>
              <Button
                mode="outlined"
                onPress={goNextPage}
                disabled={!hasMore}
                icon={({ size }) => <Feather name="chevron-right" size={size} color={colors.textSecondary} />}
                textColor={colors.textSecondary}
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
          <View style={styles.orderList}>
          {filteredOrders.map((order) => {
            const safeId = order.id ?? '-';
            const safeStatus = resolveStatusOption(order.status);
            const safeCustomer = resolveOrderCustomerName(order);
            const safeDate = formatUsDateTime(order.date ?? order.createdAt ?? null);
            const safeItems = resolveOrderItems(order);
            const safeTotal =
              typeof order.totalValue === 'number'
                ? order.totalValue
                : typeof order.total === 'number'
                  ? order.total
                  : 0;
            const isDeleting = deletingId === order.id;

            return (
                <Card
                  key={safeId}
                  mode="outlined"
                  style={[styles.orderCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
                >
                  <Card.Content style={styles.orderCardContent}>
                    <View style={[styles.orderHeader, isCompact && styles.orderHeaderCompact]}>
                      <View style={styles.orderIdContainer}>
                        <Text style={[styles.orderLabel, { color: colors.textMuted }]}>{t('Order')}</Text>
                        <Text style={[styles.orderId, { color: colors.neonGreen }]}>#{safeId}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isCompact && styles.statusBadgeCompact,
                          { backgroundColor: `${getStatusColor(safeStatus)}20` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            isCompact && styles.statusTextCompact,
                            { color: getStatusColor(safeStatus) },
                          ]}
                        >
                          {t(safeStatus)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.orderDetails}>
                      <View style={styles.detailRow}>
                        <Feather name="user" size={16} color={colors.primaryPurple} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>{safeCustomer}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Feather name="calendar" size={16} color={colors.primaryPurple} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>{safeDate}</Text>
                      </View>
                    </View>

                    <View style={[styles.orderFooter, isCompact && styles.orderFooterCompact]}>
                      <View style={styles.detailRow}>
                        <Feather name="package" size={16} color={colors.textMuted} />
                        <Text style={[styles.detailText, { color: colors.textMuted }]}>{t('{count} items', { count: safeItems })}</Text>
                      </View>
                      <Text style={[styles.orderTotal, { color: colors.textPrimary }]}>
                        {formatCurrency(safeTotal, currency)}
                      </Text>
                    </View>

                    <View style={[styles.cardActions, isCompact && styles.cardActionsCompact]}>
                      <Button
                        mode="contained"
                        onPress={() => openDetails(order)}
                        disabled={isDeleting}
                        icon={({ size }) => <Feather name="eye" size={size} color={colors.neonGreen} />}
                        buttonColor={colors.primaryPurple}
                        textColor={colors.appBg}
                        testID={`order-view-${safeId}`}
                        style={styles.actionButton}
                        contentStyle={styles.actionButtonContent}
                      >
                        {t('View Details')}
                      </Button>
                      {canManageOrders && (
                        <Button
                          mode="outlined"
                          onPress={() => requestDelete(order)}
                          disabled={isDeleting}
                          icon={({ size }) => <Feather name="trash-2" size={size} color={colors.accentOrange} />}
                          textColor={colors.accentOrange}
                          testID={`order-delete-${safeId}`}
                          style={[
                            styles.actionButton,
                            styles.deleteButton,
                            { borderColor: colors.cardBorder },
                            isDeleting && styles.actionButtonDisabled,
                          ]}
                          contentStyle={styles.actionButtonContent}
                        >
                          {isDeleting ? t('Deleting...') : t('Delete')}
                        </Button>
                      )}
                    </View>
                  </Card.Content>
                </Card>
            );
          })}
        </View>
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
              {errorMessage && (
                <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
                  <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
                </View>
              )}

                <View style={styles.modalField}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Customer')}</Text>
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
                <View style={[styles.metaRow, { borderColor: colors.cardBorder, backgroundColor: colors.inputBgFrom }]}>
                  <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
                    {orderDateLabel || formatUsDateTime(new Date())}
                  </Text>
                  <Text style={[styles.metaHint, { color: colors.textMuted }]}>{t('Auto-set')}</Text>
                </View>
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('Status')}</Text>
                {renderStatusOptions(createStatus, setCreateStatus)}
              </View>

                <View style={styles.modalField}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('Products')}</Text>
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
                            return (
                              <TouchableRipple
                                key={product.id}
                                style={[
                                  styles.selectorItem,
                                  {
                                    borderColor: isSelected ? colors.neonGreen : colors.cardBorder,
                                    backgroundColor: isSelected ? `${colors.neonGreen}12` : 'transparent',
                                  },
                                ]}
                                onPress={() => addProduct(product)}
                                disabled={creating}
                                rippleColor={`${colors.neonGreen}1f`}
                              >
                                <View style={styles.selectorContent}>
                                  <View style={styles.selectorInfo}>
                                    <Text style={[styles.selectorTitle, { color: colors.textPrimary }]}>
                                      {product.name ?? t('Unnamed product')}
                                    </Text>
                                    <Text style={[styles.selectorSubtitle, { color: colors.textMuted }]}>
                                      {formatCurrency(defaultValue, currency)}
                                    </Text>
                                  </View>
                                  <Text style={[styles.selectorAction, { color: colors.neonGreen }]}>
                                    {isSelected ? t('Added') : t('Add')}
                                  </Text>
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
                      const valueError = getValueError(item.value);
                      const allowDecimal = unitAllowsDecimal(item.product.unitOfMeasure);
                        return (
                          <View
                            key={item.product.id}
                            style={[styles.lineItemCard, { borderColor: colors.cardBorder }]}
                          >
                            <View style={styles.lineItemHeader}>
                              <Text style={[styles.selectorTitle, { color: colors.textPrimary }]}>
                                {item.product.name ?? t('Product')}
                              </Text>
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
                                  error={!!quantityError}
                                  editable={!creating}
                                  dense
                                />
                                <HelperText type="error" visible={!!quantityError} style={styles.lineItemHelper}>
                                  {quantityError ?? ''}
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
                    textColor={colors.appBg}
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
                <View style={[styles.detailsSummary, { borderColor: colors.cardBorder }]}>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Order')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.neonGreen }]}>
                      #{detailsOrder.id ?? '-'}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Status')}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        isCompact && styles.statusBadgeCompact,
                        { backgroundColor: `${getStatusColor(resolveStatusOption(detailsOrder.status))}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isCompact && styles.statusTextCompact,
                          { color: getStatusColor(resolveStatusOption(detailsOrder.status)) },
                        ]}
                      >
                        {t(resolveStatusOption(detailsOrder.status))}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailsGrid, { borderColor: colors.cardBorder }]}>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Customer')}</Text>
                    <View style={styles.detailsColumn}>
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
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Date')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {formatUsDateTime(detailsOrder.createdAt ?? detailsOrder.date ?? null)}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Items')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {resolveItemsFromOrderedProducts(detailsOrder)}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Customer ID')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsOrder.customerId ?? '-'}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Total')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
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
                </View>

                {canManageOrders && (
                  <View style={styles.detailsSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('Manual Status')}</Text>
                    {renderStatusOptions(
                      resolveStatusOption(detailsOrder.status),
                      handleManualStatusChange,
                      statusUpdating || deletingId === detailsOrder.id,
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
                            style={[styles.lineItemCard, { borderColor: colors.cardBorder }]}
                          >
                            <View style={styles.lineItemHeader}>
                              <Text style={[styles.selectorTitle, { color: colors.textPrimary }]}>
                                {lineProductName}
                              </Text>
                            </View>
                            <View style={styles.lineItemRow}>
                              <View style={styles.lineItemField}>
                                <Text style={[styles.lineItemLabel, { color: colors.textMuted }]}>{t('Qty')}</Text>
                                <Text style={[styles.lineItemTotal, { color: colors.textPrimary }]}>
                                  {lineQuantity}
                                </Text>
                              </View>
                              <View style={styles.lineItemField}>
                                <Text style={[styles.lineItemLabel, { color: colors.textMuted }]}>{t('Value')}</Text>
                                <Text style={[styles.lineItemTotal, { color: colors.textPrimary }]}>
                                  {formatCurrency(lineValue, currency)}
                                </Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    letterSpacing: 1,
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 22,
    letterSpacing: 1.4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  subtitleCompact: {
    fontSize: 12,
  },
  headerLine: {
    height: 4,
    width: 100,
    borderRadius: 2,
  },
  banner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 12,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  filterContainer: {
    marginBottom: 16,
  },
  dateFilterCard: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  dateFilterCardCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  dateFilterLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dateFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateFilterHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateRangeSummary: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  dateFilterActionPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  dateFilterActionContent: {
    paddingVertical: 2,
  },
  dateFilterActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateFilterActionGhost: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dateFilterGhostText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterButton: {
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
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
    borderWidth: 2,
  },
  paginationButtonContent: {
    paddingVertical: 4,
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
    borderRadius: 12,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    borderRadius: 8,
    minHeight: 48,
  },
  addButtonContent: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonContentCompact: {
    paddingVertical: 6,
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonCompact: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  orderList: {
    gap: 16,
  },
  orderCard: {
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  orderCardContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderLabel: {
    fontSize: 12,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    minHeight: 24,
    justifyContent: 'center',
  },
  statusBadgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    minHeight: 22,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextCompact: {
    fontSize: 10,
  },
  orderDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 63, 242, 0.2)',
  },
  orderFooterCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cardActionsCompact: {
    flexDirection: 'column',
  },
  actionButton: {
    borderRadius: 8,
  },
  actionButtonContent: {
    paddingVertical: 6,
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
        shadowColor: '#1c140d',
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
  detailsSummary: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  detailsGrid: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  detailsSection: {
    gap: 8,
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
  datePickerSection: {
    gap: 8,
  },
  datePickerRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  datePickerButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  modalInput: {
    borderRadius: 16,
    minHeight: 52,
  },
  modalInputContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 20,
  },
  modalInputOutline: {
    borderRadius: 16,
  },
  infoRow: {
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 12,
  },
  metaRow: {
    borderWidth: 1,
    borderRadius: 14,
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
  dropdownHeader: {
    borderWidth: 2,
    borderRadius: 10,
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
    borderRadius: 10,
  },
  dropdownSelectionRow: {
    borderWidth: 1.5,
    borderRadius: 10,
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
    borderRadius: 10,
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
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOptionsCompact: {
    flexDirection: 'column',
  },
  statusOption: {
    paddingHorizontal: 2,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 16,
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
    borderRadius: 10,
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
  summaryRow: {
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 10,
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
