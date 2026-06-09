import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBadge } from './StatusBadge';
import { Button, HelperText, IconButton, Searchbar, Switch, Text, TextInput } from './ui/Paper';
import { SegmentedControl } from './SegmentedControl';
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

  const payableSummary = useMemo(() => {
    const pending = bills.filter((b) => !b.isPaid);
    const pendingTotal = pending.reduce((s, b) => s + (typeof b.amount === 'number' ? b.amount : 0), 0);
    const paidTotal = bills.filter((b) => b.isPaid).reduce((s, b) => s + (typeof b.amount === 'number' ? b.amount : 0), 0);
    const nextDue = pending
      .filter((b) => b.dueDate)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    return { pendingTotal, paidTotal, nextDue };
  }, [bills]);

  if (loading) {
    return <NervLoader variant="payables" fullScreen label={t('Loading')} subtitle={t('Fetching payable bills...')} />;
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={[styles.content, { padding: contentPadding }]}>
          <View style={[styles.header, !isCompact && styles.headerRow]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }, isCompact && styles.titleCompact]}>
                {t('Payables')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }, isCompact && styles.subtitleCompact]}>
                {t('Vendor expenses and outgoing payments')}
              </Text>
            </View>
            {!isCompact && (
              <Button
                mode="contained"
                onPress={openCreateModal}
                buttonColor={colors.primaryPurple}
                textColor="#fff"
                icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
                style={styles.createButton}
              >
                {t('Record Expense')}
              </Button>
            )}
          </View>

          {/* Pending Summary */}
          <View style={[styles.pendingSummary, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
            <View style={styles.pendingLeft}>
              <Text style={[styles.pendingLabel, { color: colors.textMuted }]}>{t('Pending this month')}</Text>
              <Text style={[styles.pendingValue, { color: colors.accentOrange }]}>
                {formatCurrency(payableSummary.pendingTotal, currency)}
              </Text>
            </View>
            {payableSummary.nextDue && (
              <View style={styles.pendingRight}>
                <Text style={[styles.pendingNextLabel, { color: colors.textMuted }]}>{t('Next due')}</Text>
                <Text style={[styles.pendingNextValue, { color: colors.textPrimary }]}>
                  {formatDateLabel(payableSummary.nextDue.dueDate)} — {payableSummary.nextDue.description}
                </Text>
              </View>
            )}
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
              textColor="#fff"
              icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
              style={styles.createButton}
            >
              {t('New Bill')}
            </Button>
          </View>

          <SegmentedControl
            options={['all', 'open', 'paid'] as BillFilter[]}
            selected={statusFilter}
            onSelect={setStatusFilter}
            labelFn={(v) => v === 'all' ? t('All') : v === 'open' ? t('Open') : t('Paid')}
          />

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
            {filteredBills.map((bill) => {
              const billIsPaid = bill.isPaid;
              return (
                <Pressable
                  key={bill.id ?? `${bill.description}-${bill.dueDate}`}
                  style={(state: any) => [
                    styles.billRow,
                    { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
                    billIsPaid && styles.billRowPaid,
                    !billIsPaid && state.hovered && { borderColor: `${colors.primaryPurple}33` },
                  ]}
                >
                  <View style={[styles.billIconBox, { backgroundColor: `${colors.sidebarBgTo ?? colors.textMuted}20` }]}>
                    <Feather name="home" size={16} color={colors.textMuted} />
                  </View>

                  <View style={styles.billInfo}>
                    <Text style={[styles.billDescription, { color: colors.textPrimary }]} numberOfLines={1}>
                      {bill.description}
                    </Text>
                    <Text style={[styles.billMeta, { color: colors.textMuted }]}>
                      {t('Due')} {formatDateLabel(bill.dueDate)}
                    </Text>
                  </View>

                  <Text style={[styles.billAmount, { color: colors.textPrimary }]}>
                    {formatCurrency(bill.amount, currency)}
                  </Text>

                  <StatusBadge status={billIsPaid ? 'paid' : 'open'} label={billIsPaid ? t('Paid') : t('Open')} />

                  {!billIsPaid && (
                    <Button
                      mode="outlined"
                      onPress={() => togglePaid(bill)}
                      textColor={colors.neonGreen}
                      style={[styles.markPaidButton, { borderColor: `${colors.neonGreen}40`, backgroundColor: `${colors.neonGreen}1A` }]}
                      compact
                      labelStyle={styles.markPaidLabel}
                    >
                      {t('Mark Paid')}
                    </Button>
                  )}

                  <View style={styles.billActionIcons}>
                    <IconButton
                      icon={() => <Feather name="edit-2" size={14} color={colors.textSecondary} />}
                      size={16}
                      onPress={() => openEditModal(bill)}
                      style={[styles.billActionIcon, { borderColor: colors.cardBorder }]}
                    />
                    <IconButton
                      icon={() => <Feather name="trash-2" size={14} color={colors.accentOrange} />}
                      size={16}
                      onPress={() => confirmDelete(bill)}
                      style={[styles.billActionIcon, { borderColor: colors.cardBorder }]}
                    />
                  </View>
                </Pressable>
              );
            })}
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
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
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
              label={`${t('Description')} *`}
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { backgroundColor: colors.inputBgFrom }]}
            />
            <TextInput
              mode="outlined"
              label={`${t('Due Date (MM/DD/YYYY)')} *`}
              value={dueDateInput}
              onChangeText={setDueDateInput}
              style={[styles.input, { backgroundColor: colors.inputBgFrom }]}
            />
            <TextInput
              mode="outlined"
              label={`${t('Amount')} *`}
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
                textColor="#fff"
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
    alignItems: 'flex-start',
  },
  pendingSummary: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingLeft: {
    flexShrink: 0,
  },
  pendingLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '500',
  },
  pendingValue: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  pendingRight: {
    alignItems: 'flex-end',
  },
  pendingNextLabel: {
    fontSize: 12,
  },
  pendingNextValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
    lineHeight: 30,
  },
  titleCompact: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
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
    borderRadius: 12,
    minHeight: 50,
    minWidth: 220,
  },
  searchInput: {
    fontSize: 14,
  },
  refreshButton: {
    borderRadius: 12,
    minHeight: 50,
  },
  createButton: {
    borderRadius: 12,
    minHeight: 50,
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
  billList: {
    gap: 8,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({ web: { transition: 'border-color 0.15s ease' } as any, default: {} }),
  },
  billRowPaid: {
    opacity: 0.5,
  },
  billIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  billInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  billDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  billMeta: {
    fontSize: 12,
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  markPaidButton: {
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  markPaidLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  billActionIcons: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  billActionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    margin: 0,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
