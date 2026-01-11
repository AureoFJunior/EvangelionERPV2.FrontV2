import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Customer as CustomerModel, ErpService } from '../services/erpService';
import { NervLoader } from './NervLoader';
import { useResponsive } from '../hooks/useResponsive';

type CustomerStatusOption = 'Active' | 'Inactive';

const statusOptions: CustomerStatusOption[] = ['Active', 'Inactive'];
const filterOptions = ['all', 'active', 'inactive'] as const;
type CustomerFilterOption = (typeof filterOptions)[number];

export function Customers() {
  const { colors } = useTheme();
  const { client, isAuthenticated, loading: authLoading, enterpriseId } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { isCompact, isTablet, contentPadding } = useResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<CustomerFilterOption>('all');
  const [customers, setCustomers] = useState<CustomerModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(50);
  const [hasMore, setHasMore] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createStatus, setCreateStatus] = useState<CustomerStatusOption>('Active');
  const [creating, setCreating] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerModel | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState<CustomerStatusOption>('Active');
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<CustomerModel['id'] | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmCustomer, setConfirmCustomer] = useState<CustomerModel | null>(null);
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    let active = true;

    const loadCustomers = async () => {
      setLoading(true);
      setErrorMessage(null);

      const response = await erpService.fetchCustomers(pageNumber, pageSize);
      if (!active) {
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
  }, [erpService, isAuthenticated, authLoading, pageNumber, pageSize]);

  const goPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goNextPage = () => {
    if (hasMore) {
      setPageNumber((prev) => prev + 1);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const resolveText = (value?: string | null) => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };
  const normalizeStatus = (
    status?: string | null,
    isActive?: boolean,
  ): CustomerStatusOption => {
    const normalized = resolveText(status)?.toLowerCase();
    if (normalized === 'inactive' || normalized === 'disabled' || normalized === 'blocked') {
      return 'Inactive';
    }
    if (normalized === 'active') {
      return 'Active';
    }
    if (isActive === false) {
      return 'Inactive';
    }
    return 'Active';
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      (customer.name ?? '').toLowerCase().includes(normalizedSearch) ||
      (customer.email ?? '').toLowerCase().includes(normalizedSearch);
    const statusValue = normalizeStatus(customer.status, customer.isActive).toLowerCase();
    const matchesStatus = filterStatus === 'all' || statusValue === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.trim().toLowerCase()) {
      case 'active':
        return colors.neonGreen;
      case 'inactive':
      case 'disabled':
      case 'blocked':
        return colors.textMuted;
      default:
        return colors.textMuted;
    }
  };

  const openCreate = () => {
    if (!isAuthenticated || authLoading) {
      setErrorMessage('Authenticate to manage customers.');
      return;
    }
    setErrorMessage(null);
    setCreateName('');
    setCreateEmail('');
    setCreateStatus('Active');
    setCreateVisible(true);
  };

  const closeCreate = () => {
    setCreateVisible(false);
    setCreateName('');
    setCreateEmail('');
    setCreateStatus('Active');
    setCreating(false);
  };

  const openEdit = (customer: CustomerModel) => {
    if (!isAuthenticated || authLoading) {
      setErrorMessage('Authenticate to manage customers.');
      return;
    }
    setErrorMessage(null);
    setEditingCustomer(customer);
    setEditName(customer.name ?? '');
    setEditEmail(customer.email ?? '');
    setEditStatus(normalizeStatus(customer.status, customer.isActive));
    setEditVisible(true);
  };

  const closeEdit = () => {
    setEditVisible(false);
    setEditingCustomer(null);
    setEditName('');
    setEditEmail('');
    setEditStatus('Active');
    setSaving(false);
  };

  const handleCreate = async () => {
    if (creating) {
      return;
    }
    if (!isAuthenticated || authLoading) {
      setErrorMessage('Authenticate to manage customers.');
      return;
    }

    const name = createName.trim();
    const email = createEmail.trim();
    if (!name && !email) {
      setErrorMessage('Customer name or email is required.');
      return;
    }

    setCreating(true);
    setErrorMessage(null);

    const now = new Date().toISOString();
    const payload: CustomerModel = {
      name: name || undefined,
      email: email || undefined,
      status: createStatus,
      isActive: createStatus !== 'Inactive',
      enterpriseId: enterpriseId ?? undefined,
      createdAt: now,
      updatedAt: now,
    };

    const response = await erpService.createCustomer(payload);
    if (response.ok) {
      const fallbackCustomer: CustomerModel = {
        ...payload,
        id: payload.id ?? `temp-${Date.now()}`,
      };
      const nextCustomer = response.data ?? fallbackCustomer;
      setCustomers((prev) => [nextCustomer, ...prev]);
      closeCreate();
    } else {
      setErrorMessage(response.error ?? 'Unable to create customer');
    }

    setCreating(false);
  };

  const handleSave = async () => {
    if (!editingCustomer || saving) {
      return;
    }
    if (!isAuthenticated || authLoading) {
      setErrorMessage('Authenticate to manage customers.');
      return;
    }

    const name = editName.trim();
    const email = editEmail.trim();
    if (!name && !email) {
      setErrorMessage('Customer name or email is required.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const payload: CustomerModel = {
      ...editingCustomer,
      name: name || undefined,
      email: email || undefined,
      status: editStatus,
      isActive: editStatus !== 'Inactive',
      enterpriseId: editingCustomer.enterpriseId ?? enterpriseId ?? undefined,
      updatedAt: new Date().toISOString(),
    };

    const response = await erpService.updateCustomer(payload);
    if (response.ok) {
      const nextCustomer = response.data ?? payload;
      setCustomers((prev) =>
        prev.map((item) => (item.id === editingCustomer.id ? { ...item, ...nextCustomer } : item)),
      );
      closeEdit();
    } else {
      setErrorMessage(response.error ?? 'Unable to update customer');
    }

    setSaving(false);
  };

  const requestDeactivate = (customer: CustomerModel, displayName: string) => {
    if (!isAuthenticated || authLoading) {
      setErrorMessage('Authenticate to manage customers.');
      return;
    }
    if (customer.id === undefined || customer.id === null) {
      setErrorMessage('Customer id missing.');
      return;
    }
    setConfirmCustomer(customer);
    setConfirmName(displayName);
    setConfirmVisible(true);
  };

  const closeConfirm = () => {
    setConfirmVisible(false);
    setConfirmCustomer(null);
    setConfirmName('');
  };

  const confirmDeactivate = async () => {
    if (!confirmCustomer || confirmCustomer.id === undefined || confirmCustomer.id === null) {
      setErrorMessage('Customer id missing.');
      closeConfirm();
      return;
    }

    setDeactivatingId(confirmCustomer.id);
    setErrorMessage(null);

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
      setErrorMessage(response.error ?? 'Unable to deactivate customer');
      closeConfirm();
    }

    setDeactivatingId(null);
  };

  const renderStatusOptions = (
    selected: CustomerStatusOption,
    onSelect: (status: CustomerStatusOption) => void,
  ) => (
    <View style={[styles.statusOptions, isCompact && styles.statusOptionsCompact]}>
      {statusOptions.map((status) => {
        const isSelected = selected === status;
        return (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusOption,
              {
                borderColor: isSelected ? colors.neonGreen : colors.cardBorder,
                backgroundColor: isSelected ? `${colors.neonGreen}12` : colors.cardBgFrom,
              },
            ]}
            onPress={() => onSelect(status)}
          >
            <Text style={[styles.statusOptionText, { color: isSelected ? colors.neonGreen : colors.textSecondary }]}>
              {status}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(
    (customer) => normalizeStatus(customer.status, customer.isActive) === 'Active',
  ).length;
  const inactiveCustomers = customers.filter(
    (customer) => normalizeStatus(customer.status, customer.isActive) === 'Inactive',
  ).length;

  if (loading) {
    return (
      <NervLoader
        fullScreen
        label="Synchronizing EVA-01"
        subtitle="LCL circulation nominal | Loading customers..."
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
            CUSTOMER MANAGEMENT
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
            Track and manage customer relationships
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
        </View>

        {/* Stats */}
        <View style={[styles.statsContainer, isCompact && styles.statsContainerCompact]}>
          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isCompact && styles.statBoxCompact,
            ]}
          >
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalCustomers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }, isCompact && styles.statLabelCompact]}>
              Total Customers
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isCompact && styles.statBoxCompact,
            ]}
          >
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{activeCustomers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }, isCompact && styles.statLabelCompact]}>
              Active
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isCompact && styles.statBoxCompact,
            ]}
          >
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{inactiveCustomers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }, isCompact && styles.statLabelCompact]}>
              Inactive
            </Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {filterOptions.map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilterStatus(status)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: colors.cardBgFrom,
                  borderColor: filterStatus === status ? colors.neonGreen : colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filterStatus === status ? colors.neonGreen : colors.textSecondary },
                ]}
              >
                {status === 'all' ? 'All' : status === 'active' ? 'Active' : 'Inactive'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search and Add */}
        <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBgFrom, borderColor: colors.cardBorder }]}>
            <Feather name="search" size={20} color={colors.primaryPurple} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search customers..."
              placeholderTextColor={colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: colors.primaryPurple },
              isCompact && styles.addButtonCompact,
              (!isAuthenticated || authLoading) && styles.buttonDisabled,
            ]}
            onPress={openCreate}
            disabled={!isAuthenticated || authLoading}
          >
            <Feather name="plus" size={20} color={colors.neonGreen} />
          </TouchableOpacity>
        </View>

        <View style={[styles.paginationRow, isCompact && styles.paginationRowCompact]}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              { borderColor: colors.cardBorder },
              pageNumber === 1 && styles.paginationButtonDisabled,
            ]}
            onPress={goPrevPage}
            disabled={pageNumber === 1}
          >
            <Feather name="chevron-left" size={16} color={colors.textSecondary} />
            <Text style={[styles.paginationText, { color: colors.textSecondary }]}>Prev</Text>
          </TouchableOpacity>
          <Text style={[styles.pageIndicator, { color: colors.textPrimary }]}>Page {pageNumber}</Text>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              { borderColor: colors.cardBorder },
              !hasMore && styles.paginationButtonDisabled,
            ]}
            onPress={goNextPage}
            disabled={!hasMore}
          >
            <Text style={[styles.paginationText, { color: colors.textSecondary }]}>Next</Text>
            <Feather name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {!isAuthenticated && !authLoading && (
          <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
              Authenticate to load live customers.
            </Text>
          </View>
        )}

        {errorMessage && (
          <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
            <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
          </View>
        )}

        {!loading && filteredCustomers.length === 0 && (
          <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
            <Feather name="users" size={20} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No customers yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Customers will appear here once they are registered.
            </Text>
          </View>
        )}

        {/* Customer List */}
        <View style={styles.customerList}>
          {filteredCustomers.map((customer, index) => {
            const displayName = resolveText(customer.name) ?? resolveText(customer.email) ?? 'Unknown customer';
            const displayEmail = resolveText(customer.email) ?? 'No email on file';
            const displayStatus = normalizeStatus(customer.status, customer.isActive);
            const orderCount = typeof customer.orders === 'number' ? customer.orders : 0;
            const spentTotal = typeof customer.spent === 'number' ? customer.spent : 0;
            const isDeactivating = customer.id === deactivatingId;

            return (
              <View
                key={customer.id ?? customer.email ?? customer.name ?? index}
                style={[styles.customerCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
              >
                <View style={[styles.customerHeader, isCompact && styles.customerHeaderCompact]}>
                  <View style={[styles.avatar, { backgroundColor: colors.primaryPurple }]}>
                    <Text style={[styles.avatarText, { color: colors.neonGreen }]}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={[styles.customerName, { color: colors.textPrimary }]}>{displayName}</Text>
                    <View style={styles.customerEmail}>
                      <Feather name="mail" size={12} color={colors.textMuted} />
                      <Text style={[styles.emailText, { color: colors.textSecondary }]}>{displayEmail}</Text>
                    </View>
                  </View>
                  <View style={[styles.customerActions, isCompact && styles.customerActionsCompact]}>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(displayStatus)}20` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(displayStatus) }]}>
                        {displayStatus}
                      </Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: colors.cardBorder }]}
                        onPress={() => openEdit(customer)}
                      >
                        <Feather name="edit-2" size={14} color={colors.primaryPurple} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { borderColor: colors.cardBorder },
                          isDeactivating && styles.actionButtonDisabled,
                        ]}
                        onPress={() => requestDeactivate(customer, displayName)}
                        disabled={isDeactivating}
                      >
                        <Feather name="trash-2" size={14} color={colors.accentOrange} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={[styles.customerStats, isCompact && styles.customerStatsCompact]}>
                  <View style={styles.statItem}>
                    <Feather name="shopping-bag" size={16} color={colors.primaryPurple} />
                    <Text style={[styles.statItemText, { color: colors.textSecondary }]}>
                      {orderCount} orders
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Feather name="dollar-sign" size={16} color={colors.neonGreen} />
                    <Text style={[styles.statItemText, { color: colors.textSecondary }]}>
                      ${spentTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>

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
              <Text style={[styles.modalTitle, { color: colors.neonGreen }]}>New Customer</Text>
              <TouchableOpacity onPress={closeCreate}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={createName}
                onChangeText={setCreateName}
                placeholder="Customer name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                editable={!creating}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={createEmail}
                onChangeText={setCreateEmail}
                placeholder="email@domain.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!creating}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Status</Text>
              {renderStatusOptions(createStatus, setCreateStatus)}
            </View>

            <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.cardBorder }]}
                onPress={closeCreate}
                disabled={creating}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primaryPurple }]}
                onPress={handleCreate}
                disabled={creating}
              >
                <Text style={[styles.modalButtonText, { color: colors.neonGreen }]}>
                  {creating ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isTablet && styles.modalCardWide,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.neonGreen }]}>Edit Customer</Text>
              <TouchableOpacity onPress={closeEdit}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Customer name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                editable={!saving}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="email@domain.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!saving}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Status</Text>
              {renderStatusOptions(editStatus, setEditStatus)}
            </View>

            <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.cardBorder }]}
                onPress={closeEdit}
                disabled={saving}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primaryPurple }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={[styles.modalButtonText, { color: colors.neonGreen }]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={closeConfirm}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isTablet && styles.modalCardWide,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.neonGreen }]}>Deactivate Customer</Text>
              <TouchableOpacity onPress={closeConfirm}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
              Deactivate {confirmName || 'this customer'}? They will no longer be active.
            </Text>
            <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.cardBorder }]}
                onPress={closeConfirm}
                disabled={deactivatingId !== null}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primaryPurple }]}
                onPress={confirmDeactivate}
                disabled={deactivatingId !== null}
              >
                <Text style={[styles.modalButtonText, { color: colors.neonGreen }]}>
                  {deactivatingId !== null ? 'Deactivating...' : 'Deactivate'}
                </Text>
              </TouchableOpacity>
            </View>
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
    fontWeight: 'bold',
    letterSpacing: 2,
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
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  statBoxCompact: {
    width: '100%',
    flex: 0,
    alignItems: 'flex-start',
    minHeight: 72,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: 12,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pageIndicator: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonCompact: {
    width: '100%',
    height: 44,
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  customerList: {
    gap: 16,
  },
  customerCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  customerHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerEmail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emailText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  customerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  customerActionsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  customerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  customerStatsCompact: {
    flexDirection: 'column',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItemText: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 8, 18, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    gap: 12,
  },
  modalCardWide: {
    maxWidth: 520,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalField: {
    gap: 6,
  },
  modalLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modalInput: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  modalActionsCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
