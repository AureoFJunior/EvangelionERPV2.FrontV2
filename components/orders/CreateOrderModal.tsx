import React, { useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DatePickerModal } from 'react-native-paper-dates';
import {
  Button,
  HelperText,
  IconButton,
  TextInput as PaperTextInput,
  TouchableRipple,
} from '../ui/Paper';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useToast } from '../../contexts/ToastContext';
import { useResponsive } from '../../hooks/useResponsive';
import { formatCurrency } from '../../utils/currency';
import {
  Customer as CustomerModel,
  ErpService,
  Order as OrderModel,
  OrderCreatePayload,
  OrderLineItem,
  Product as ProductModel,
} from '../../services/erpService';
import {
  formatDateLabel,
  getQuantityError,
  getValueError,
  matchesSearchWithinEnterprise,
  parseNumber,
  resolveCustomerLabel,
  resolveProductValue,
  sanitizeNumericInput,
  sanitizeQuantityInput,
  unitAllowsDecimal,
} from '../../utils/orders/helpers';
import { getStorageQuantity } from '../../utils/products/form';
import {
  modalStyles,
  orderStatusEnumValue,
  OrderStatusOption,
  UNKNOWN_CUSTOMER,
} from './shared';
import { OrderStatusPills } from './OrderStatusPills';
import { useOrderDateFormatters } from './useOrderDateFormatters';

type SelectedOrderItem = {
  product: ProductModel;
  quantity: string;
  value: string;
};

type CreateOrderModalProps = {
  erpService: ErpService;
  customers: CustomerModel[];
  products: ProductModel[];
  optionsLoading: boolean;
  onClose: () => void;
  onCreated: (order: OrderModel) => void;
};

export function CreateOrderModal({
  erpService,
  customers,
  products,
  optionsLoading,
  onClose,
  onCreated,
}: CreateOrderModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isAuthenticated, loading: authLoading, enterpriseId, currency } = useAuth();
  const { showToast } = useToast();
  const { isCompact, isTablet } = useResponsive();
  const { formatOrderDateTime } = useOrderDateFormatters();

  const openedAtRef = useRef(new Date());
  const [openDropdown, setOpenDropdown] = useState<'customer' | 'product' | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerModel | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedOrderItem[]>([]);
  const [createStatus, setCreateStatus] = useState<OrderStatusOption>('Pending');
  const [scheduledPaymentDate, setScheduledPaymentDate] = useState<Date | null>(null);
  const [paymentDatePickerVisible, setPaymentDatePickerVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const customerDropdownOpen = openDropdown === 'customer';
  const productDropdownOpen = openDropdown === 'product';

  const toggleCustomerDropdown = () => {
    setOpenDropdown((prev) => (prev === 'customer' ? null : 'customer'));
  };

  const toggleProductDropdown = () => {
    setOpenDropdown((prev) => (prev === 'product' ? null : 'product'));
  };

  const handlePaymentDateConfirm = ({ date }: { date: Date | undefined }) => {
    setScheduledPaymentDate(date ?? null);
    setPaymentDatePickerVisible(false);
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
      onCreated(hydratedOrder);
    } else {
      showToast(response.error ?? t('Unable to create order'));
      setCreating(false);
    }
  };

  return (
    <>
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
              <Text style={[modalStyles.modalTitle, { color: colors.textPrimary }]}>{t('New Order')}</Text>
              <IconButton
                icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
                size={18}
                onPress={onClose}
                disabled={creating}
                style={[modalStyles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
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
                        <Text style={[modalStyles.selectorEmpty, { color: colors.textMuted }]}>
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
                                setOpenDropdown(null);
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
                        {formatOrderDateTime(openedAtRef.current)}
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
                      onPress={() => setPaymentDatePickerVisible(true)}
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
                        onPress={() => setScheduledPaymentDate(null)}
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
                <OrderStatusPills selected={createStatus} onSelect={setCreateStatus} />
              </View>

              <View style={styles.modalField}>
                <View style={styles.sectionHeader}>
                  <Text style={[modalStyles.sectionTitle, { color: colors.textSecondary }]}>{t('Products')} <Text style={{ color: '#ff4d7d', fontWeight: '700' }}>*</Text></Text>
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
                        <Text style={[modalStyles.selectorEmpty, { color: colors.textMuted }]}>
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

                <View style={modalStyles.lineItems}>
                  {selectedItems.length === 0 ? (
                    <Text style={[modalStyles.selectorEmpty, { color: colors.textMuted }]}>
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

              <View style={[modalStyles.modalActions, isCompact && modalStyles.modalActionsCompact]}>
                <Button
                  mode="outlined"
                  onPress={onClose}
                  disabled={creating}
                  textColor={colors.textSecondary}
                  style={[modalStyles.modalButton, { borderColor: colors.cardBorder }]}
                  contentStyle={modalStyles.modalButtonContent}
                  labelStyle={modalStyles.modalButtonLabel}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCreate}
                  disabled={createDisabled}
                  buttonColor={colors.primaryPurple}
                  textColor="#fff"
                  style={modalStyles.modalButton}
                  contentStyle={modalStyles.modalButtonContent}
                  labelStyle={modalStyles.modalButtonLabel}
                >
                  {creating ? t('Creating...') : t('Create')}
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        locale="en-US"
        mode="single"
        visible={paymentDatePickerVisible}
        onDismiss={() => setPaymentDatePickerVisible(false)}
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
  modalScroll: {
    marginTop: 4,
  },
  modalScrollContent: {
    paddingBottom: 8,
    gap: 12,
  },
  infoRow: {
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 12,
  },
  modalField: {
    gap: 8,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
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
