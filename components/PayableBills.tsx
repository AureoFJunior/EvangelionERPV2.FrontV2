import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Card, Chip, HelperText, IconButton, Searchbar, Switch, Text, TextInput } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { ErpService, PayableBill, PayableBillPayload } from '../services/erpService';
import { useResponsive } from '../hooks/useResponsive';
import { NervLoader } from './NervLoader';
import { formatCurrency } from '../utils/currency';
import {
  filterPayableBillsBySearch,
  formatDateInput,
  formatDateLabel,
  parseAmountInput,
  toIsoFromDateInput,
} from '../utils/payables/helpers';

const pageSize = 25;
type BillFilter = 'all' | 'open' | 'paid';

export function PayableBills() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading, currency } = useAuth();
  const { isCompact, isTablet, contentPadding } = useResponsive();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BillFilter>('all');
  const [bills, setBills] = useState<PayableBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<PayableBill | null>(null);
  const [description, setDescription] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setBills([]);
      return;
    }

    let active = true;

    const loadBills = async () => {
      setLoading(true);
      setErrorMessage(null);

      const response = await erpService.fetchPayableBills(pageNumber, pageSize);
      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        const activeBills = response.data.filter((bill) => bill.isActive !== false);
        setBills(activeBills);
        setHasMore(activeBills.length === pageSize);
      } else {
        setErrorMessage(response.error ?? t('Unable to load payable bills.'));
      }

      setLoading(false);
    };

    loadBills();

    return () => {
      active = false;
    };
  }, [authLoading, erpService, isAuthenticated, pageNumber, refreshKey]);

  const filteredBills = useMemo(() => {
    const bySearch = filterPayableBillsBySearch(bills, searchTerm);
    if (statusFilter === 'open') {
      return bySearch.filter((bill) => !bill.isPaid);
    }
    if (statusFilter === 'paid') {
      return bySearch.filter((bill) => bill.isPaid);
    }
    return bySearch;
  }, [bills, searchTerm, statusFilter]);

  const openCreateModal = () => {
    setEditingBill(null);
    setDescription('');
    setDueDateInput(formatDateInput(new Date().toISOString()));
    setAmountInput('');
    setIsPaid(false);
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (bill: PayableBill) => {
    setEditingBill(bill);
    setDescription(bill.description);
    setDueDateInput(formatDateInput(bill.dueDate));
    setAmountInput(`${bill.amount}`);
    setIsPaid(bill.isPaid);
    setFormError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingBill(null);
    setFormError(null);
    setSaving(false);
  };

  const saveBill = async () => {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setFormError(t('Description is required.'));
      return;
    }

    const dueDate = toIsoFromDateInput(dueDateInput);
    if (!dueDate) {
      setFormError(t('Invalid due date. Use MM/DD/YYYY.'));
      return;
    }

    const amount = parseAmountInput(amountInput);
    if (amount === null || amount <= 0) {
      setFormError(t('Amount must be greater than zero.'));
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload: PayableBillPayload = {
      id: editingBill?.id,
      description: trimmedDescription,
      dueDate,
      paidAt: isPaid ? editingBill?.paidAt ?? new Date().toISOString() : null,
      amount,
      isPaid,
    };

    const response = editingBill?.id
      ? await erpService.updatePayableBill(payload)
      : await erpService.createPayableBill(payload);

    if (response.ok) {
      closeModal();
      setPageNumber(1);
      setRefreshKey((prev) => prev + 1);
      return;
    }

    setFormError(response.error ?? t('Unable to save payable bill.'));
    setSaving(false);
  };

  const togglePaid = async (bill: PayableBill) => {
    if (!bill.id) {
      return;
    }

    const response = await erpService.updatePayableBill({
      id: bill.id,
      description: bill.description,
      dueDate: bill.dueDate,
      amount: bill.amount,
      isPaid: !bill.isPaid,
      paidAt: !bill.isPaid ? new Date().toISOString() : null,
    });

    if (response.ok) {
      setRefreshKey((prev) => prev + 1);
      return;
    }

    setErrorMessage(response.error ?? t('Unable to update payable bill.'));
  };

  const confirmDelete = (bill: PayableBill) => {
    if (!bill.id) {
      return;
    }

    Alert.alert(
      t('Delete payable bill'),
      t('Delete "{name}"?', { name: bill.description }),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            const response = await erpService.deletePayableBill(bill.id as string);
            if (response.ok) {
              setRefreshKey((prev) => prev + 1);
              return;
            }
            setErrorMessage(response.error ?? t('Unable to delete payable bill.'));
          },
        },
      ],
    );
  };

  const goPrevPage = () => setPageNumber((prev) => Math.max(1, prev - 1));
  const goNextPage = () => {
    if (hasMore) {
      setPageNumber((prev) => prev + 1);
    }
  };

  if (loading) {
    return <NervLoader fullScreen label={t('Syncing Payables')} subtitle={t('Loading payable bills...')} />;
  }

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
        <View style={[styles.content, { padding: contentPadding }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
              {t('PAYABLE BILLS')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
              {t('Manage accounts payable and payment status')}
            </Text>
            <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
          </View>

          <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
            <Searchbar
              placeholder={t('Search by description or ID...')}
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={[styles.searchBar, { backgroundColor: colors.inputBgFrom }]}
              iconColor={colors.primaryPurple}
              inputStyle={[styles.searchInput, { color: colors.textPrimary }]}
              placeholderTextColor={colors.textMuted}
            />
            <Button
              mode="outlined"
              onPress={() => setRefreshKey((prev) => prev + 1)}
              textColor={colors.textSecondary}
              icon={({ size }) => <Feather name="refresh-cw" size={size} color={colors.textSecondary} />}
              style={[styles.refreshButton, { borderColor: colors.cardBorder }]}
            >
              {t('Refresh')}
            </Button>
            <Button
              mode="contained"
              onPress={openCreateModal}
              buttonColor={colors.primaryPurple}
              textColor={colors.neonGreen}
              icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
              style={styles.createButton}
            >
              {t('New Bill')}
            </Button>
          </View>

          <View style={[styles.filterRow, isCompact && styles.filterRowCompact]}>
            <Chip
              selected={statusFilter === 'all'}
              showSelectedCheck={false}
              icon={
                statusFilter === 'all'
                  ? ({ size }) => <Feather name="check" size={Math.max(12, size - 2)} color={colors.neonGreen} />
                  : undefined
              }
              onPress={() => setStatusFilter('all')}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === 'all' ? colors.primaryPurple : colors.cardBgFrom,
                  borderColor: statusFilter === 'all' ? colors.primaryPurple : colors.cardBorder,
                },
              ]}
              textStyle={{ color: statusFilter === 'all' ? colors.neonGreen : colors.textSecondary }}
            >
              {t('All')}
            </Chip>
            <Chip
              selected={statusFilter === 'open'}
              showSelectedCheck={false}
              icon={
                statusFilter === 'open'
                  ? ({ size }) => <Feather name="check" size={Math.max(12, size - 2)} color={colors.neonGreen} />
                  : undefined
              }
              onPress={() => setStatusFilter('open')}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === 'open' ? colors.primaryPurple : colors.cardBgFrom,
                  borderColor: statusFilter === 'open' ? colors.primaryPurple : colors.cardBorder,
                },
              ]}
              textStyle={{ color: statusFilter === 'open' ? colors.neonGreen : colors.textSecondary }}
            >
              {t('Open')}
            </Chip>
            <Chip
              selected={statusFilter === 'paid'}
              showSelectedCheck={false}
              icon={
                statusFilter === 'paid'
                  ? ({ size }) => <Feather name="check" size={Math.max(12, size - 2)} color={colors.neonGreen} />
                  : undefined
              }
              onPress={() => setStatusFilter('paid')}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === 'paid' ? colors.primaryPurple : colors.cardBgFrom,
                  borderColor: statusFilter === 'paid' ? colors.primaryPurple : colors.cardBorder,
                },
              ]}
              textStyle={{ color: statusFilter === 'paid' ? colors.neonGreen : colors.textSecondary }}
            >
              {t('Paid')}
            </Chip>
          </View>

          <View style={[styles.paginationRow, isCompact && styles.paginationRowCompact]}>
            <Button
              mode="outlined"
              onPress={goPrevPage}
              disabled={pageNumber === 1}
              icon={({ size }) => <Feather name="chevron-left" size={size} color={colors.textSecondary} />}
              textColor={colors.textSecondary}
              style={[styles.paginationButton, { borderColor: colors.cardBorder }]}
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
              style={[styles.paginationButton, { borderColor: colors.cardBorder }]}
            >
              {t('Next')}
            </Button>
          </View>

          {!isAuthenticated && !authLoading && (
            <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
              <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                {t('Authenticate to manage payable bills.')}
              </Text>
            </View>
          )}

          {errorMessage && (
            <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
              <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
            </View>
          )}

          {!loading && filteredBills.length === 0 && (
            <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
              <Feather name="file-text" size={20} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('No payable bills found')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {t('Create bills to start the payable flow.')}
              </Text>
            </View>
          )}

          <View style={styles.billList}>
            {filteredBills.map((bill) => (
              <Card
                key={bill.id ?? `${bill.description}-${bill.dueDate}`}
                mode="outlined"
                style={[styles.billCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
              >
                <Card.Content style={styles.billCardContent}>
                  <View style={[styles.billHeader, isCompact && styles.billHeaderCompact]}>
                    <View style={styles.billInfo}>
                      <Text style={[styles.billDescription, { color: colors.textPrimary }]}>{bill.description}</Text>
                      <Text style={[styles.billId, { color: colors.textMuted }]}>#{bill.id ?? t('N/A')}</Text>
                    </View>
                    <Chip
                      style={[
                        styles.statusChip,
                        { backgroundColor: bill.isPaid ? `${colors.neonGreen}20` : `${colors.accentOrange}20` },
                      ]}
                      textStyle={{ color: bill.isPaid ? colors.neonGreen : colors.accentOrange }}
                    >
                      {bill.isPaid ? t('Paid') : t('Open')}
                    </Chip>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('Due date')}</Text>
                      <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{formatDateLabel(bill.dueDate)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('Amount')}</Text>
                      <Text style={[styles.metaValue, { color: colors.neonGreen }]}>
                        {formatCurrency(bill.amount, currency)}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('Paid at')}</Text>
                      <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
                        {bill.paidAt ? formatDateLabel(bill.paidAt) : '--'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cardActions, isCompact && styles.cardActionsCompact]}>
                    <Button
                      mode="outlined"
                      onPress={() => togglePaid(bill)}
                      textColor={bill.isPaid ? colors.accentOrange : colors.neonGreen}
                      style={[styles.actionButton, { borderColor: colors.cardBorder }]}
                    >
                      {bill.isPaid ? t('Mark Open') : t('Mark Paid')}
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => openEditModal(bill)}
                      textColor={colors.textSecondary}
                      style={[styles.actionButton, { borderColor: colors.cardBorder }]}
                    >
                      {t('Edit')}
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => confirmDelete(bill)}
                      textColor={colors.accentOrange}
                      style={[styles.actionButton, { borderColor: colors.accentOrange }]}
                    >
                      {t('Delete')}
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              isTablet && styles.modalCardWide,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.neonGreen }]}>
                {editingBill ? t('Edit Payable Bill') : t('Create Payable Bill')}
              </Text>
              <IconButton
                icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
                size={18}
                onPress={closeModal}
                style={[styles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
              />
            </View>

            <TextInput
              mode="outlined"
              label={t('Description')}
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { backgroundColor: colors.inputBgFrom }]}
            />
            <TextInput
              mode="outlined"
              label={t('Due Date (MM/DD/YYYY)')}
              value={dueDateInput}
              onChangeText={setDueDateInput}
              style={[styles.input, { backgroundColor: colors.inputBgFrom }]}
            />
            <TextInput
              mode="outlined"
              label={t('Amount')}
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.inputBgFrom }]}
            />

            <View style={[styles.switchRow, { borderColor: colors.cardBorder }]}>
              <Text style={{ color: colors.textPrimary }}>{t('Mark as paid')}</Text>
              <Switch value={isPaid} onValueChange={setIsPaid} />
            </View>

            <HelperText type="error" visible={Boolean(formError)}>
              {formError}
            </HelperText>

            <View style={[styles.modalActions, isCompact && styles.modalActionsCompact]}>
              <Button
                mode="outlined"
                onPress={closeModal}
                disabled={saving}
                textColor={colors.textSecondary}
                style={[styles.modalButton, { borderColor: colors.cardBorder }]}
              >
                {t('Cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={saveBill}
                loading={saving}
                disabled={saving}
                buttonColor={colors.primaryPurple}
                textColor={colors.neonGreen}
                style={styles.modalButton}
              >
                {editingBill ? t('Save') : t('Create')}
              </Button>
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
    width: 120,
    borderRadius: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  actionRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchBar: {
    flex: 1,
    minWidth: 220,
  },
  searchInput: {
    fontSize: 14,
  },
  refreshButton: {
    borderRadius: 8,
  },
  createButton: {
    borderRadius: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterRowCompact: {
    gap: 10,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 2,
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
  },
  pageIndicator: {
    fontSize: 13,
    fontWeight: '600',
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
  billList: {
    gap: 12,
  },
  billCard: {
    borderRadius: 10,
  },
  billCardContent: {
    paddingVertical: 8,
    gap: 10,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  billHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  billInfo: {
    flex: 1,
    gap: 2,
  },
  billDescription: {
    fontSize: 16,
    fontWeight: '700',
  },
  billId: {
    fontSize: 11,
  },
  statusChip: {
    borderRadius: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    minWidth: 110,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardActionsCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  actionButton: {
    borderRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 9, 18, 0.65)',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  modalCardWide: {
    maxWidth: 620,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    borderWidth: 1,
    borderRadius: 10,
  },
  input: {
    marginTop: 6,
  },
  switchRow: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalActions: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalActionsCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  modalButton: {
    borderRadius: 8,
  },
});
