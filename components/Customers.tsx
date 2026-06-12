import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Searchbar } from './ui/Paper';
import { SegmentedControl } from './SegmentedControl';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { Customer as CustomerModel, ErpService } from '../services/erpService';
import { useResponsive } from '../hooks/useResponsive';
import { useCustomers } from '../hooks/customers/useCustomers';
import { useOrderSummary } from '../hooks/customers/useOrderSummary';
import { useCepLookup } from '../hooks/customers/useCepLookup';
import { useCustomerForm } from '../hooks/customers/useCustomerForm';
import { useCustomerStats } from '../hooks/customers/useCustomerStats';
import { buildAddress } from '../utils/customers/address';
import { normalizeDigits } from '../utils/customers/validation';
import {
  CustomerFilterOption,
  OrderSummaryMap,
  filterCustomers,
  mapCustomersToCardData,
} from '../utils/customers/presentation';
import { hasManagementAccess } from '../utils/access';
import { NervLoader } from './NervLoader';
import { ConfirmModal } from './customers/ConfirmModal';
import { CustomerCard } from './customers/CustomerCard';
import { CustomerFormModal } from './customers/CustomerFormModal';

const filterOptions: CustomerFilterOption[] = ['all', 'active', 'inactive'];

export function Customers() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading, enterpriseId, currency, user } = useAuth();
  const { isCompact, isTablet, contentPadding } = useResponsive();
  const canManageCustomers = hasManagementAccess(user?.role);
  const managementDeniedMessage = t('Only Admin, Manager, and Supervisor can edit or delete customers.');

  const erpService = useMemo(() => new ErpService(client), [client]);

  const {
    searchTerm,
    setSearchTerm,
    customers,
    setCustomers,
    loading,
    errorMessage,
    setErrorMessage,
    pageNumber,
    setPageNumber,
    hasMore,
  } = useCustomers({
    erpService,
    isAuthenticated,
    authLoading,
    pageSize: 25,
  });

  const { orderSummary, orderSummaryError } = useOrderSummary({
    erpService,
    isAuthenticated,
    authLoading,
    enterpriseId,
  });

  const [filterStatus, setFilterStatus] = useState<CustomerFilterOption>('active');
  const [deactivatingId, setDeactivatingId] = useState<CustomerModel['id'] | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ customer: CustomerModel; name: string } | null>(null);

  const { stats: customerStats, refreshStats } = useCustomerStats({
    erpService,
    isAuthenticated,
    authLoading,
    enterpriseId,
  });

  const {
    formState,
    formErrors,
    formSubmitDisabled,
    openCreate: openCreateForm,
    openEdit: openEditForm,
    closeForm,
    setField: setFormField,
    setAttempted: setFormAttempted,
    setSubmitting: setFormSubmitting,
    applyCepResult,
  } = useCustomerForm();

  useCepLookup({
    postalCode: formState.values.postalCode,
    enabled: formState.visible,
    onResolved: applyCepResult,
  });

  const goPrevPage = useCallback(() => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  }, [setPageNumber]);

  const goNextPage = useCallback(() => {
    if (hasMore) {
      setPageNumber((prev) => prev + 1);
    }
  }, [hasMore, setPageNumber]);

  const openCreate = useCallback(() => {
    if (!isAuthenticated || authLoading) {
      setErrorMessage(t('Authenticate to manage customers.'));
      return;
    }

    setErrorMessage(null);
    openCreateForm();
  }, [isAuthenticated, authLoading, setErrorMessage, openCreateForm]);

  const openEdit = useCallback(
    (customer: CustomerModel) => {
      if (!isAuthenticated || authLoading) {
        setErrorMessage(t('Authenticate to manage customers.'));
        return;
      }
      if (!canManageCustomers) {
        setErrorMessage(managementDeniedMessage);
        return;
      }

      setErrorMessage(null);
      openEditForm(customer);
    },
    [isAuthenticated, authLoading, setErrorMessage, openEditForm, canManageCustomers, managementDeniedMessage],
  );

  const handleFormSubmit = useCallback(async () => {
    if (formState.submitting) {
      return;
    }

    if (!isAuthenticated || authLoading) {
      setErrorMessage(t('Authenticate to manage customers.'));
      return;
    }

    setFormAttempted(true);

    if (formSubmitDisabled) {
      setErrorMessage(t('Please fix the highlighted fields.'));
      return;
    }

    setFormSubmitting(true);
    setErrorMessage(null);

    try {
      const name = formState.values.name.trim();
      const email = formState.values.email.trim();
      const phoneNumber = normalizeDigits(formState.values.phone);
      const adress = buildAddress(formState.values);
      const document = formState.values.document.trim();

      const payloadBase: CustomerModel = {
        name: name || undefined,
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
        adress: adress || undefined,
        document: document || undefined,
        status: formState.values.status,
        isActive: formState.values.status !== 'Inactive',
      };

      if (formState.mode === 'create') {
        const now = new Date().toISOString();
        const createPayload: CustomerModel = {
          ...payloadBase,
          enterpriseId: enterpriseId ?? undefined,
          createdAt: now,
          updatedAt: now,
        };

        const response = await erpService.createCustomer(createPayload);
        if (response.ok) {
          const fallbackCustomer: CustomerModel = {
            ...createPayload,
            id: createPayload.id ?? `temp-${Date.now()}`,
          };
          const nextCustomer = response.data ?? fallbackCustomer;
          setCustomers((prev) => [nextCustomer, ...prev]);
          refreshStats();
          closeForm();
          return;
        }

        setErrorMessage(response.error ?? t('Unable to create customer'));
        return;
      }

      if (!canManageCustomers) {
        setErrorMessage(managementDeniedMessage);
        return;
      }

      if (!formState.customer) {
        setErrorMessage(t('Customer not selected.'));
        return;
      }

      const updatePayload: CustomerModel = {
        ...formState.customer,
        ...payloadBase,
        enterpriseId: formState.customer.enterpriseId ?? enterpriseId ?? undefined,
        updatedAt: new Date().toISOString(),
      };

      const response = await erpService.updateCustomer(updatePayload);
      if (response.ok) {
        const nextCustomer = response.data ?? updatePayload;
        setCustomers((prev) =>
          prev.map((item) => (item.id === formState.customer?.id ? { ...item, ...nextCustomer } : item)),
        );
        refreshStats();
        closeForm();
        return;
      }

      setErrorMessage(response.error ?? t('Unable to update customer'));
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : t('Unable to save customer');
      setErrorMessage(message);
    } finally {
      setFormSubmitting(false);
    }
  }, [
    formState,
    formSubmitDisabled,
    isAuthenticated,
    authLoading,
    setErrorMessage,
    enterpriseId,
    erpService,
    setCustomers,
    closeForm,
    setFormAttempted,
    setFormSubmitting,
    canManageCustomers,
    managementDeniedMessage,
    refreshStats,
  ]);

  const requestDeactivate = useCallback(
    (customer: CustomerModel, displayName: string) => {
      if (!isAuthenticated || authLoading) {
        setErrorMessage(t('Authenticate to manage customers.'));
        return;
      }
      if (!canManageCustomers) {
        setErrorMessage(managementDeniedMessage);
        return;
      }
      if (customer.id === undefined || customer.id === null) {
        setErrorMessage(t('Customer id missing.'));
        return;
      }

      setConfirmTarget({ customer, name: displayName });
    },
    [isAuthenticated, authLoading, setErrorMessage, canManageCustomers, managementDeniedMessage],
  );

  const closeConfirm = useCallback(() => {
    setConfirmTarget(null);
  }, []);

  const confirmDeactivate = useCallback(async () => {
    if (!canManageCustomers) {
      setErrorMessage(managementDeniedMessage);
      closeConfirm();
      return;
    }

    const confirmCustomer = confirmTarget?.customer;
    if (!confirmCustomer || confirmCustomer.id === undefined || confirmCustomer.id === null) {
      setErrorMessage(t('Customer id missing.'));
      closeConfirm();
      return;
    }

    setDeactivatingId(confirmCustomer.id);
    setErrorMessage(null);

    try {
      const response = await erpService.deactivateCustomer(confirmCustomer.id);
      if (response.ok) {
        setCustomers((prev) =>
          prev.map((item) =>
            item.id === confirmCustomer.id
              ? { ...item, isActive: false, status: 'Inactive' }
              : item,
          ),
        );
        refreshStats();
        closeConfirm();
      } else {
        setErrorMessage(response.error ?? t('Unable to deactivate customer'));
        closeConfirm();
      }
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : t('Unable to deactivate customer');
      setErrorMessage(message);
      closeConfirm();
    } finally {
      setDeactivatingId(null);
    }
  }, [confirmTarget, setErrorMessage, closeConfirm, erpService, setCustomers, canManageCustomers, managementDeniedMessage, refreshStats]);

  const filteredCustomers = useMemo(
    () => filterCustomers(customers, searchTerm, filterStatus),
    [customers, searchTerm, filterStatus],
  );

  const customerCards = useMemo(
    () => mapCustomersToCardData(filteredCustomers, orderSummary as OrderSummaryMap),
    [filteredCustomers, orderSummary],
  );

  const displayErrorMessage = errorMessage ?? orderSummaryError;

  if (loading) {
    return (
      <NervLoader
        variant="customers"
        fullScreen
        label={t('Loading')}
        subtitle={t('Fetching customer data...')}
      />
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={[styles.content, { padding: contentPadding }]}>
          <View style={[styles.header, !isCompact && styles.headerRow]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }, isCompact && styles.titleCompact]}>
                {t('Customers')}
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.textMuted }, isCompact && styles.subtitleCompact]}
              >
                {`${customerStats.total} ${t('accounts')}`}
              </Text>
            </View>
            {!isCompact && (
              <View style={styles.headerActions}>
                <Button
                  mode="outlined"
                  onPress={() => setPageNumber(1)}
                  textColor={colors.textSecondary}
                  icon={({ size }) => <Feather name="download" size={size} color={colors.textSecondary} />}
                  style={[styles.headerBtnOutlined, { borderColor: colors.cardBorder }]}
                  contentStyle={styles.headerBtnContent}
                >
                  {t('Export')}
                </Button>
                {canManageCustomers && (
                  <Button
                    mode="contained"
                    onPress={() => openCreate()}
                    icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
                    buttonColor={colors.primaryPurple}
                    textColor="#fff"
                    style={styles.headerBtn}
                    contentStyle={styles.headerBtnContent}
                  >
                    {t('Add Customer')}
                  </Button>
                )}
              </View>
            )}
          </View>

          <View style={styles.searchContainer}>
            <Searchbar
              placeholder={t('Search customers...')}
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={[styles.searchBar, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
              iconColor={colors.primaryPurple}
              inputStyle={[styles.searchInput, { color: colors.textPrimary }]}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.filterRow}>
            <SegmentedControl
              options={filterOptions}
              selected={filterStatus}
              onSelect={setFilterStatus}
              labelFn={(v) => v === 'all' ? t('All') : v === 'active' ? t('Active') : t('Inactive')}
            />
          </View>

          {isCompact && canManageCustomers && (
            <Button
              mode="contained"
              onPress={openCreate}
              disabled={!isAuthenticated || authLoading}
              icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
              buttonColor={colors.primaryPurple}
              textColor="#fff"
              style={[
                styles.addButtonCompact,
                (!isAuthenticated || authLoading) && styles.buttonDisabled,
              ]}
              contentStyle={styles.addButtonContent}
              labelStyle={styles.addButtonLabel}
            >
              {t('Add Customer')}
            </Button>
          )}

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

          {!isAuthenticated && !authLoading && (
            <View
              style={[
                styles.banner,
                { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple },
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.textSecondary }]}>{t('Authenticate to load live customers.')}</Text>
            </View>
          )}

          {displayErrorMessage && (
            <View
              style={[
                styles.banner,
                { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange },
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{displayErrorMessage}</Text>
            </View>
          )}

          {!loading && customerCards.length === 0 && (
            <View
              style={[
                styles.emptyState,
                { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom },
              ]}
            >
              <Feather name="users" size={20} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('No customers yet')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {t('Customers will appear here once they are registered.')}
              </Text>
            </View>
          )}

          <View style={styles.customerList}>
            {customerCards.map((cardData) => (
              <CustomerCard
                key={cardData.key}
                data={cardData}
                colors={colors}
                currency={currency}
                isCompact={isCompact}
                canManage={canManageCustomers}
                isDeactivating={cardData.customer.id === deactivatingId}
                onEdit={openEdit}
                onDeactivate={requestDeactivate}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <CustomerFormModal
        visible={formState.visible}
        mode={formState.mode}
        values={formState.values}
        errors={formErrors}
        attempted={formState.attempted}
        submitting={formState.submitting}
        submitDisabled={formSubmitDisabled}
        isCompact={isCompact}
        isTablet={isTablet}
        colors={colors}
        errorMessage={errorMessage}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        onFieldChange={setFormField}
      />

      <ConfirmModal
        visible={confirmTarget !== null}
        title={t('Deactivate Customer')}
        message={t('Deactivate {name}? They will no longer be active.', { name: confirmTarget?.name || t('this customer') })}
        confirmLabel={t('Deactivate')}
        busy={deactivatingId !== null}
        isCompact={isCompact}
        isTablet={isTablet}
        colors={colors}
        onCancel={closeConfirm}
        onConfirm={confirmDeactivate}
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
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    paddingHorizontal: 14,
    paddingVertical: 5,
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
  filterRow: {
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchBar: {
    borderRadius: 8,
    minHeight: 44,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  addButtonCompact: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
    marginBottom: 16,
  },
  addButtonContent: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
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
    borderRadius: 12,
    borderWidth: 1.5,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonContent: {
    paddingVertical: 4,
  },
  pageIndicator: {
    fontSize: 13,
    fontWeight: '600',
  },
  customerList: {
    gap: 12,
    marginTop: 4,
  },
});
