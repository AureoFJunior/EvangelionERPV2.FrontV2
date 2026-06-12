import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, IconButton } from '../ui/Paper';
import { StatusBadge } from '../StatusBadge';
import { NervLoader } from '../NervLoader';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useToast } from '../../contexts/ToastContext';
import { useResponsive } from '../../hooks/useResponsive';
import { formatCurrency } from '../../utils/currency';
import { hasManagementAccess } from '../../utils/access';
import { looksLikeId, resolveOrderCustomerId, resolveOrderItems, toIdKey } from '../../utils/orders/helpers';
import {
  Customer as CustomerModel,
  ErpService,
  Order as OrderModel,
  OrderUpdatePayload,
} from '../../services/erpService';
import {
  LOADING_CUSTOMER,
  modalStyles,
  orderStatusEnumValue,
  OrderStatusOption,
  resolveItemsFromOrderedProducts,
  resolveOrderCustomerNameRaw,
  resolveOrderDateSource,
  resolveOrderPaydaySource,
  resolveOrderScheduledPaymentDateSource,
  resolveStatusOption,
  shouldShowPaidAt,
  UNKNOWN_CUSTOMER,
} from './shared';
import { OrderStatusPills } from './OrderStatusPills';
import { useOrderDateFormatters } from './useOrderDateFormatters';

type OrderDetailsModalProps = {
  order: OrderModel;
  deleting: boolean;
  erpService: ErpService;
  customerDirectory: Map<string, CustomerModel>;
  customerLookupLoading: boolean;
  onClose: () => void;
  onOrderChange: React.Dispatch<React.SetStateAction<OrderModel | null>>;
  onOrdersChange: React.Dispatch<React.SetStateAction<OrderModel[]>>;
  onRequestDelete: (order: OrderModel) => void;
};

export function OrderDetailsModal({
  order,
  deleting,
  erpService,
  customerDirectory,
  customerLookupLoading,
  onClose,
  onOrderChange,
  onOrdersChange,
  onRequestDelete,
}: OrderDetailsModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isAuthenticated, loading: authLoading, enterpriseId, currency, user } = useAuth();
  const { showToast } = useToast();
  const { isCompact, isTablet } = useResponsive();
  const { formatOrderDateTime } = useOrderDateFormatters();

  const canManageOrders = hasManagementAccess(user?.role);
  const managementDeniedMessage = t('Only Admin, Manager, and Supervisor can edit or delete orders.');

  const [detailsLoading, setDetailsLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<OrderStatusOption | null>(null);
  const requestedOrderIdRef = useRef<string | null>(null);

  const detailsCustomer = useMemo(() => {
    const customerId = resolveOrderCustomerId(order);
    if (!customerId) {
      return null;
    }
    return customerDirectory.get(toIdKey(customerId)) ?? null;
  }, [order, customerDirectory]);

  const resolveCustomerName = (target: OrderModel) => {
    const raw = resolveOrderCustomerNameRaw(target, customerDirectory, customerLookupLoading);
    if (raw === UNKNOWN_CUSTOMER || raw === LOADING_CUSTOMER) {
      return t(raw);
    }
    return raw;
  };

  useEffect(() => {
    if (order.id === undefined || order.id === null) {
      setDetailsLoading(false);
      return;
    }

    const orderIdKey = String(order.id);
    if (requestedOrderIdRef.current === orderIdKey) {
      return;
    }

    requestedOrderIdRef.current = orderIdKey;
    let active = true;

    const loadOrderDetails = async () => {
      setDetailsLoading(true);
      const response = await erpService.fetchOrderById(order.id);
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        onOrderChange((current) => {
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
  }, [order.id, erpService]);

  const requestStatusChange = (nextStatus: OrderStatusOption) => {
    if (statusUpdating || order.id === undefined || order.id === null) {
      return;
    }

    if (resolveStatusOption(order.status) === nextStatus) {
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

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) {
      return;
    }

    const nextStatus = pendingStatusChange;
    setPendingStatusChange(null);
    await handleManualStatusChange(nextStatus);
  };

  const handleManualStatusChange = async (nextStatus: OrderStatusOption) => {
    if (statusUpdating || order.id === undefined || order.id === null) {
      return;
    }

    if (resolveStatusOption(order.status) === nextStatus) {
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
      const fullOrderResponse = await erpService.fetchOrderById(order.id);
      const sourceOrder = fullOrderResponse.ok && fullOrderResponse.data
        ? fullOrderResponse.data
        : order;

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
      const safeCustomer =
        resolveOrderCustomerNameRaw(sourceOrder, customerDirectory, customerLookupLoading) || UNKNOWN_CUSTOMER;
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
        onOrderChange((current) =>
          current && String(current.id) === String(payload.id)
            ? {
                ...current,
                updatedAt,
                status: nextStatus,
                payday: nextPayday,
              }
            : current,
        );
        onOrdersChange((prev) =>
          prev.map((entry) =>
            String(entry.id) === String(payload.id)
              ? {
                  ...entry,
                  updatedAt,
                  status: nextStatus,
                  payday: nextPayday,
                }
              : entry,
          ),
        );

        const refreshed = await erpService.fetchOrderById(payload.id);
        if (refreshed.ok && refreshed.data) {
          const fresh = refreshed.data;
          onOrderChange((current) =>
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
          onOrdersChange((prev) =>
            prev.map((entry) =>
              String(entry.id) === String(payload.id)
                ? {
                    ...entry,
                    ...fresh,
                    status: nextStatus,
                    payday: fresh.payday ?? entry.payday,
                    paymentDate: fresh.paymentDate ?? entry.paymentDate,
                  }
                : entry,
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

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.modalBackdrop}>
        <View
          style={[
            modalStyles.modalCard,
            { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
            isTablet && modalStyles.modalCardWide,
          ]}
        >
          <View style={modalStyles.modalHeader}>
            <Text style={[modalStyles.modalTitle, { color: colors.textPrimary }]}>{t('Order Details')}</Text>
            <IconButton
              icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
              size={18}
              onPress={onClose}
              style={[modalStyles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
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
          ) : (
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
                      #{order.id ?? '-'}
                    </Text>
                  </View>
                  <StatusBadge status={resolveStatusOption(order.status).toLowerCase()} label={t(resolveStatusOption(order.status))} />
                </View>
                <View style={[styles.detailsHeroBottom, { borderTopColor: colors.cardBorder }]}>
                  <View style={styles.detailsHeroStat}>
                    <Text style={[styles.detailsHeroStatLabel, { color: colors.textMuted }]}>{t('Total')}</Text>
                    <Text style={[styles.detailsHeroStatValue, { color: colors.textPrimary }]}>
                      {formatCurrency(
                        typeof order.totalValue === 'number'
                          ? order.totalValue
                          : typeof order.total === 'number'
                            ? order.total
                            : 0,
                        currency,
                      )}
                    </Text>
                  </View>
                  <View style={styles.detailsHeroStat}>
                    <Text style={[styles.detailsHeroStatLabel, { color: colors.textMuted }]}>{t('Items')}</Text>
                    <Text style={[styles.detailsHeroStatValue, { color: colors.textPrimary }]}>
                      {resolveItemsFromOrderedProducts(order)}
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
                      {detailsCustomer?.name ?? resolveCustomerName(order)}
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
                      {formatOrderDateTime(resolveOrderDateSource(order))}
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
                      {resolveOrderScheduledPaymentDateSource(order)
                        ? formatOrderDateTime(resolveOrderScheduledPaymentDateSource(order))
                        : t('Not scheduled')}
                    </Text>
                  </View>
                </View>

                {shouldShowPaidAt(order.status) && (
                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.neonGreen}14` }]}>
                      <Feather name="check-circle" size={14} color={colors.neonGreen} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Paid at')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {resolveOrderPaydaySource(order)
                          ? formatOrderDateTime(resolveOrderPaydaySource(order))
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
                      {order.customerId ?? '-'}
                    </Text>
                  </View>
                </View>
              </View>

              {canManageOrders && (
                <View style={styles.detailsSection}>
                  <Text style={[modalStyles.sectionTitle, { color: colors.textSecondary }]}>{t('Manual Status')}</Text>
                  <OrderStatusPills
                    selected={resolveStatusOption(order.status)}
                    onSelect={requestStatusChange}
                    disabled={statusUpdating || deleting}
                  />
                  {pendingStatusChange && (
                    <View
                      style={[
                        styles.statusConfirmCard,
                        { borderColor: colors.cardBorder, backgroundColor: colors.inputBgFrom },
                      ]}
                    >
                      <Text style={[modalStyles.confirmText, { color: colors.textSecondary }]}>
                        {t('Change status from {from} to {to}?', {
                          from: t(resolveStatusOption(order.status)),
                          to: t(pendingStatusChange),
                        })}
                      </Text>
                      <View style={[modalStyles.modalActions, isCompact && modalStyles.modalActionsCompact]}>
                        <Button
                          mode="outlined"
                          onPress={() => setPendingStatusChange(null)}
                          disabled={statusUpdating}
                          textColor={colors.textSecondary}
                          style={[modalStyles.modalButton, { borderColor: colors.cardBorder }]}
                          contentStyle={modalStyles.modalButtonContent}
                          labelStyle={modalStyles.modalButtonLabel}
                        >
                          {t('Cancel')}
                        </Button>
                        <Button
                          mode="contained"
                          onPress={confirmStatusChange}
                          disabled={statusUpdating}
                          buttonColor={colors.primaryPurple}
                          textColor="#fff"
                          style={[modalStyles.modalButton, statusUpdating && modalStyles.actionButtonDisabled]}
                          contentStyle={modalStyles.modalButtonContent}
                          labelStyle={modalStyles.modalButtonLabel}
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
                <Text style={[modalStyles.sectionTitle, { color: colors.textSecondary }]}>{t('Line Items')}</Text>
                <View style={[modalStyles.lineItems, { marginTop: 8 }]}>
                  {order.orderedProduct && order.orderedProduct.length > 0 ? (
                    order.orderedProduct.map((item, index) => {
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
                    <Text style={[modalStyles.selectorEmpty, { color: colors.textMuted }]}>
                      {t('Line items unavailable for this order.')}
                    </Text>
                  )}
                </View>
              </View>

              <View style={[modalStyles.modalActions, isCompact && modalStyles.modalActionsCompact]}>
                <Button
                  mode="outlined"
                  onPress={onClose}
                  textColor={colors.textSecondary}
                  style={[modalStyles.modalButton, { borderColor: colors.cardBorder }]}
                  contentStyle={modalStyles.modalButtonContent}
                  labelStyle={modalStyles.modalButtonLabel}
                >
                  {t('Close')}
                </Button>
                {canManageOrders && (
                  <Button
                    mode="outlined"
                    onPress={() => onRequestDelete(order)}
                    disabled={deleting}
                    textColor={colors.accentOrange}
                    style={[
                      modalStyles.modalButton,
                      modalStyles.deleteButton,
                      { borderColor: colors.cardBorder },
                      deleting && modalStyles.actionButtonDisabled,
                    ]}
                    contentStyle={modalStyles.modalButtonContent}
                    labelStyle={modalStyles.modalButtonLabel}
                  >
                    {deleting ? t('Deleting...') : t('Delete Order')}
                  </Button>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
});
