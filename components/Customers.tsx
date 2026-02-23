import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Card, Chip, Searchbar } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { Customer as CustomerModel, ErpService } from '../services/erpService';
import { useResponsive } from '../hooks/useResponsive';
import { useCustomers } from '../hooks/customers/useCustomers';
import { useOrderSummary } from '../hooks/customers/useOrderSummary';
import { useCepLookup } from '../hooks/customers/useCepLookup';
import { useCustomerForm } from '../hooks/customers/useCustomerForm';
import { buildAddress } from '../utils/customers/address';
import {
  CustomerFilterOption,
  OrderSummaryMap,
  filterCustomers,
  getCustomerStats,
  mapCustomersToCardData,
} from '../utils/customers/presentation';
import { hasManagementAccess } from '../utils/access';
import { NervLoader } from './NervLoader';
import { ConfirmModal } from './customers/ConfirmModal';
import { CustomerCard } from './customers/CustomerCard';
import { CustomerFormModal } from './customers/CustomerFormModal';

const filterOptions = ['all', 'active', 'inactive'] as const;

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
  const [confirmCustomer, setConfirmCustomer] = useState<CustomerModel | null>(null);
  const [confirmName, setConfirmName] = useState('');

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
      const phoneNumber = formState.values.phone.trim();
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

      setConfirmCustomer(customer);
      setConfirmName(displayName);
    },
    [isAuthenticated, authLoading, setErrorMessage, canManageCustomers, managementDeniedMessage],
  );

  const closeConfirm = useCallback(() => {
    setConfirmCustomer(null);
    setConfirmName('');
  }, []);

  const confirmDeactivate = useCallback(async () => {
    if (!canManageCustomers) {
      setErrorMessage(managementDeniedMessage);
      closeConfirm();
      return;
    }

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
  }, [confirmCustomer, setErrorMessage, closeConfirm, erpService, setCustomers, canManageCustomers, managementDeniedMessage]);

  const filteredCustomers = useMemo(
    () => filterCustomers(customers, searchTerm, filterStatus),
    [customers, searchTerm, filterStatus],
  );

  const customerCards = useMemo(
    () => mapCustomersToCardData(filteredCustomers, orderSummary as OrderSummaryMap),
    [filteredCustomers, orderSummary],
  );

  const customerStats = useMemo(() => getCustomerStats(customers), [customers]);

  const displayErrorMessage = errorMessage ?? orderSummaryError;

  if (loading) {
    return (
      <NervLoader
        fullScreen
        label={t('Synchronizing EVA-01')}
        subtitle={t('LCL circulation nominal | Loading customers...')}
      />
    );
  }

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
        <View style={[styles.content, { padding: contentPadding }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
              {t('CUSTOMER MANAGEMENT')}
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}
            >
              {t('Track and manage customer relationships')}
            </Text>
            <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
          </View>

          <View style={[styles.statsContainer, isCompact && styles.statsContainerCompact]}>
            <Card
              mode="outlined"
              style={[
                styles.statBox,
                { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
                isCompact && styles.statBoxCompact,
              ]}
            >
              <View style={[styles.statBoxContent, isCompact && styles.statBoxContentCompact]}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{customerStats.total}</Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }, isCompact && styles.statLabelCompact]}
                >
                  {t('Total Customers')}
                </Text>
              </View>
            </Card>

            <Card
              mode="outlined"
              style={[
                styles.statBox,
                { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
                isCompact && styles.statBoxCompact,
              ]}
            >
              <View style={[styles.statBoxContent, isCompact && styles.statBoxContentCompact]}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{customerStats.active}</Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }, isCompact && styles.statLabelCompact]}
                >
                  {t('Active')}
                </Text>
              </View>
            </Card>

            <Card
              mode="outlined"
              style={[
                styles.statBox,
                { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
                isCompact && styles.statBoxCompact,
              ]}
            >
              <View style={[styles.statBoxContent, isCompact && styles.statBoxContentCompact]}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{customerStats.inactive}</Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }, isCompact && styles.statLabelCompact]}
                >
                  {t('Inactive')}
                </Text>
              </View>
            </Card>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
            {filterOptions.map((status) => {
              const isSelected = filterStatus === status;
              return (
                <Chip
                  key={status}
                  selected={isSelected}
                  showSelectedCheck={false}
                  icon={
                    isSelected
                      ? ({ size }) => (
                          <Feather name="check" size={Math.max(12, size - 2)} color={colors.neonGreen} />
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
                  {status === 'all' ? t('All') : status === 'active' ? t('Active') : t('Inactive')}
                </Chip>
              );
            })}
          </ScrollView>

          <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
            <Searchbar
              placeholder={t('Search by name, email, or document...')}
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
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        onFieldChange={setFormField}
      />

      <ConfirmModal
        visible={confirmCustomer !== null}
        title={t('Deactivate Customer')}
        message={t('Deactivate {name}? They will no longer be active.', { name: confirmName || t('this customer') })}
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statsContainerCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 8,
  },
  statBoxCompact: {
    width: '100%',
    flex: 0,
    minHeight: 72,
  },
  statBoxContent: {
    padding: 16,
    alignItems: 'center',
  },
  statBoxContentCompact: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statLabelCompact: {
    textAlign: 'left',
    width: '100%',
  },
  filterContainer: {
    marginBottom: 16,
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
  customerList: {
    gap: 16,
  },
});
