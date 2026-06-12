import { Platform, StyleSheet } from 'react-native';
import { Customer as CustomerModel, Order as OrderModel } from '../../services/erpService';
import {
  looksLikeId,
  resolveOrderCustomerId,
  resolveOrderItems,
  toIdKey,
} from '../../utils/orders/helpers';

export const orderStatusOptions = ['Pending', 'Processing', 'Paid', 'Shipped', 'Delivered', 'Finished'] as const;
export type OrderStatusOption = (typeof orderStatusOptions)[number];

export const UNKNOWN_CUSTOMER = 'Unknown customer';
export const LOADING_CUSTOMER = 'Loading customer...';

export const orderStatusEnumValue: Record<OrderStatusOption, number> = {
  Pending: 0,
  Processing: 1,
  Paid: 2,
  Shipped: 3,
  Delivered: 4,
  Finished: 5,
};

export const resolveStatusOption = (value?: string | null): OrderStatusOption => {
  const normalized = (value ?? '').trim().toLowerCase();
  const match = orderStatusOptions.find((status) => status.toLowerCase() === normalized);
  return match ?? 'Pending';
};

export const shouldShowPaidAt = (status?: string | null) => {
  const normalized = resolveStatusOption(status);
  return normalized === 'Paid' || normalized === 'Shipped' || normalized === 'Delivered' || normalized === 'Finished';
};

export const resolveItemsFromOrderedProducts = (order: OrderModel) => {
  if (!order.orderedProduct || order.orderedProduct.length === 0) {
    return resolveOrderItems(order);
  }
  const quantitySum = order.orderedProduct.reduce((sum, item) => {
    const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
    return sum + quantity;
  }, 0);
  return quantitySum > 0 ? quantitySum : order.orderedProduct.length;
};

export const resolveOrderDateSource = (order: OrderModel) =>
  order.date ?? order.createdAt ?? null;

export const resolveOrderScheduledPaymentDateSource = (order: OrderModel) =>
  order.paymentScheduledDate ?? null;

export const resolveOrderPaydaySource = (order: OrderModel) =>
  order.payday ?? order.paymentDate ?? null;

export const resolveOrderCustomerNameRaw = (
  order: OrderModel,
  customerDirectory: Map<string, CustomerModel>,
  customerLookupLoading: boolean,
) => {
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

export const modalStyles = StyleSheet.create({
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
  deleteButton: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectorEmpty: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 12,
  },
  lineItems: {
    marginTop: 12,
    gap: 10,
  },
});
