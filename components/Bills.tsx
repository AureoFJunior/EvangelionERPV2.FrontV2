import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBadge } from './StatusBadge';
import { Button, IconButton, Searchbar } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';

let WebView: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch {}
}
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../contexts/I18nContext';
import { Bill as BillModel, ErpService, Order as OrderModel } from '../services/erpService';
import { NervLoader } from './NervLoader';
import { useResponsive } from '../hooks/useResponsive';
import { formatCurrency } from '../utils/currency';
import { useBillsOrders } from '../hooks/bills/useBillsOrders';
import { filterOrdersBySearch, openPdfInBrowser } from '../utils/bills/helpers';
import { formatUsDate, formatUsDateTime } from '../utils/datetime';

type BillMode = 'view' | 'generate';

export function Bills() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading, enterpriseId, currency } = useAuth();
  const { showToast } = useToast();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { isCompact, isTablet, contentPadding } = useResponsive();
  const {
    searchTerm,
    setSearchTerm,
    orders,
    bills,
    loading,
    errorMessage,
    pageNumber,
    setPageNumber,
    hasMore,
    goPrevPage,
    goNextPage,
  } = useBillsOrders({
    erpService,
    isAuthenticated,
    authLoading,
    enterpriseId,
    pageSize: 25,
  });
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsMode, setDetailsMode] = useState<BillMode>('view');
  const [detailsOrder, setDetailsOrder] = useState<OrderModel | null>(null);
  const [detailsBill, setDetailsBill] = useState<BillModel | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) showToast(errorMessage);
  }, [errorMessage]);

  useEffect(() => {
    if (!detailsVisible || !detailsOrder?.id) {
      setDetailsLoading(false);
      setDetailsBill(null);
      setDetailsError(null);
      return;
    }

    let active = true;

    const loadBill = async () => {
      setDetailsLoading(true);
      setDetailsError(null);
      setDetailsBill(null);
      setShowPdf(false);
      setPdfBase64(null);
      setPdfDataUri(null);
      setPdfError(null);
      setPdfLoading(false);

      const orderId = detailsOrder.id;
      const response =
        detailsMode === 'generate'
          ? await erpService.generateBill(orderId)
          : await erpService.getBillByOrder(orderId);

      if (!active) {
        return;
      }

      if (response.ok && response.data) {
        setDetailsBill(response.data);
      } else {
        const fallback =
          detailsMode === 'generate'
            ? t('Bill generation unavailable for this order.')
            : t('No bill found for this order.');
        setDetailsError(response.error ?? fallback);
      }

      setDetailsLoading(false);
    };

    loadBill();

    return () => {
      active = false;
    };
  }, [detailsVisible, detailsOrder, detailsMode, erpService]);

  const filteredOrders = useMemo(
    () => filterOrdersBySearch(orders, searchTerm),
    [orders, searchTerm],
  );

  const openDetails = (order: OrderModel, mode: BillMode) => {
    if (!isAuthenticated || authLoading) {
      showToast(t('Authenticate to manage bills.'), 'warning');
      return;
    }
    setDetailsOrder(order);
    setDetailsMode(mode);
    setDetailsVisible(true);
  };

  const closeDetails = () => {
    setDetailsVisible(false);
    setDetailsOrder(null);
    setDetailsBill(null);
    setDetailsError(null);
    setDetailsLoading(false);
    setShowPdf(false);
    setPdfBase64(null);
    setPdfDataUri(null);
    setPdfError(null);
    setPdfLoading(false);
  };

  const openPdf = async () => {
    if (!detailsOrder?.id) {
      setPdfError(t('No bill selected.'));
      setShowPdf(true);
      return;
    }

    setPdfLoading(true);
    setPdfError(null);
    setShowPdf(true);

    try {
      const response = await erpService.getBillPdf(detailsOrder.id);
      if (response.ok && response.data) {
        setPdfBase64(response.data);
        setPdfDataUri(`data:application/pdf;base64,${response.data}`);
        openPdfInBrowser(response.data);
      } else {
        setPdfError(response.error ?? t('Unable to load the bill PDF.'));
      }
    } catch (error) {
      setPdfError(t('Unable to load the bill PDF.'));
    } finally {
      setPdfLoading(false);
    }
  };

  const billSummary = useMemo(() => {
    const activeOrders = orders.filter((o) => o.isActive !== false);
    const now = new Date();
    let paidAmount = 0;
    let overdueAmount = 0;
    let outstandingAmount = 0;

    for (const o of activeOrders) {
      const bill = o.id != null ? bills.get(String(o.id)) : undefined;
      const amount = bill ? bill.amount : (typeof o.total === 'number' ? o.total : 0);
      const hasPaid = (o.payday != null && o.payday !== '') || (o.paymentDate != null && o.paymentDate !== '');

      if (hasPaid) {
        paidAmount += amount;
      } else {
        const dueDateStr = bill?.dueDate ?? o.paymentScheduledDate ?? null;
        const dueDate = dueDateStr ? new Date(dueDateStr) : null;
        if (dueDate && dueDate < now) {
          overdueAmount += amount;
        } else {
          outstandingAmount += amount;
        }
      }
    }

    return { totalOrders: activeOrders.length, paidAmount, overdueAmount, outstandingAmount };
  }, [orders, bills]);

  if (loading) {
    return (
      <NervLoader
        variant="bills"
        fullScreen
        label={t('Loading')}
        subtitle={t('Fetching bill data...')}
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
                {t('Receivables')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }, isCompact && styles.subtitleCompact]}>
                {t('Outstanding invoices and payment tracking')}
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
                <Button
                  mode="contained"
                  onPress={() => {}}
                  buttonColor={colors.primaryPurple}
                  textColor="#fff"
                  icon={({ size }) => <Feather name="plus" size={size} color={colors.neonGreen} />}
                  style={styles.headerBtn}
                  contentStyle={styles.headerBtnContent}
                >
                  {t('New Invoice')}
                </Button>
              </View>
            )}
          </View>

          {/* Summary Cards */}
          <View style={[styles.summaryRow, isCompact && styles.summaryRowCompact]}>
            {[
              { label: t('Outstanding'), value: formatCurrency(billSummary.outstandingAmount, currency), accent: colors.accentOrange },
              { label: t('Overdue'), value: formatCurrency(billSummary.overdueAmount, currency), accent: colors.destructive },
              { label: t('Paid'), value: formatCurrency(billSummary.paidAmount, currency), accent: colors.neonGreen },
            ].map(({ label, value, accent }) => (
              <View key={label} style={[styles.summaryCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[styles.summaryValue, { color: accent }]}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
            <Searchbar
              placeholder={t('Search by order or customer...')}
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={[styles.searchBar, { backgroundColor: colors.inputBgFrom }]}
              iconColor={colors.primaryPurple}
              inputStyle={[styles.searchInput, { color: colors.textPrimary }]}
              placeholderTextColor={colors.textMuted}
            />
            <Button
              mode="outlined"
              onPress={() => setPageNumber(1)}
              textColor={colors.textSecondary}
              icon={({ size }) => <Feather name="refresh-cw" size={size} color={colors.textSecondary} />}
              style={[styles.refreshButton, isCompact && styles.refreshButtonCompact, { borderColor: colors.cardBorder }]}
              contentStyle={[styles.refreshButtonContent, isCompact && styles.refreshButtonContentCompact]}
              labelStyle={styles.refreshButtonLabel}
            >
              {t('Refresh')}
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
            <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
              <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                {t('Authenticate to generate bills.')}
              </Text>
            </View>
          )}

          {!loading && filteredOrders.length === 0 && (
            <View style={[styles.emptyState, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgFrom }]}>
              <Feather name="file-text" size={20} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('No orders found')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {t('Create an order before generating a bill.')}
              </Text>
            </View>
          )}

          <View style={[styles.tableContainer, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
            {/* Table Header */}
            <View style={[styles.tableHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[styles.tableHeadText, styles.colInvoice, { color: colors.textMuted }]}>{t('Invoice')}</Text>
              <Text style={[styles.tableHeadText, styles.colCustomer, { color: colors.textMuted }]}>{t('Customer')}</Text>
              <Text style={[styles.tableHeadText, styles.colAmount, { color: colors.textMuted }]}>{t('Amount')}</Text>
              {!isCompact && (
                <>
                  <Text style={[styles.tableHeadText, styles.colIssued, { color: colors.textMuted }]}>{t('Issued')}</Text>
                  <Text style={[styles.tableHeadText, styles.colDue, { color: colors.textMuted }]}>{t('Due')}</Text>
                </>
              )}
              <Text style={[styles.tableHeadText, styles.colStatus, { color: colors.textMuted }]}>{t('Status')}</Text>
            </View>

            {filteredOrders.map((order, index) => {
              const orderId = order.id ?? index;
              const bill = order.id != null ? bills.get(String(order.id)) : undefined;
              const displayAmount = bill
                ? bill.amount
                : typeof order.totalValue === 'number'
                  ? order.totalValue
                  : typeof order.total === 'number'
                    ? order.total
                    : 0;
              const orderCustomer = order.customer ?? t('Unknown customer');
              const statusKey = (order.status ?? 'Pending').toLowerCase();
              const isOverdue = statusKey === 'overdue';
              const isLast = index === filteredOrders.length - 1;
              return (
                <Pressable
                  key={orderId}
                  onPress={() => openDetails(order, 'view')}
                  style={(state: any) => [
                    styles.tableRow,
                    !isLast && { borderBottomColor: colors.cardBorder, borderBottomWidth: 1 },
                    isLast && styles.tableRowLast,
                    isOverdue && styles.tableRowOverdue,
                    state.hovered && { backgroundColor: 'rgba(255,255,255,0.02)' },
                  ]}
                >
                  <Text style={[styles.cellInvoice, styles.colInvoice, { color: colors.primaryPurple }]} numberOfLines={1}>
                    #{orderId}
                  </Text>
                  <Text style={[styles.cellCustomer, styles.colCustomer, { color: colors.textPrimary }]} numberOfLines={1}>
                    {orderCustomer}
                  </Text>
                  <Text style={[styles.cellAmount, styles.colAmount, { color: colors.textPrimary }]} numberOfLines={1}>
                    {formatCurrency(displayAmount, currency)}
                  </Text>
                  {!isCompact && (
                    <>
                      <Text
                        style={[styles.cellIssued, styles.colIssued, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {formatUsDate(bill?.issueDate ?? order.createdAt ?? order.date ?? null)}
                      </Text>
                      <Text
                        style={[
                          styles.cellDue,
                          styles.colDue,
                          { color: isOverdue ? colors.destructive : colors.textMuted },
                        ]}
                        numberOfLines={1}
                      >
                        {formatUsDate(bill?.dueDate ?? order.payday ?? order.paymentScheduledDate ?? null)}
                      </Text>
                    </>
                  )}
                  <View style={styles.colStatus}>
                    <StatusBadge status={statusKey} label={t(order.status ?? 'Pending')} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

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
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {detailsMode === 'generate' ? t('Generate Bill') : t('Bill Details')}
              </Text>
              <IconButton
                icon={() => <Feather name="x" size={18} color={colors.textSecondary} />}
                size={18}
                onPress={closeDetails}
                style={[styles.modalCloseButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBgTo }]}
              />
            </View>

            {detailsLoading ? (
              <View style={styles.detailsLoading}>
                <NervLoader label={t('Processing...')} subtitle={t('Generating bill data')} />
              </View>
            ) : detailsError ? (
              <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
                <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{detailsError}</Text>
              </View>
            ) : detailsBill ? (
              <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsContent}>
                <View style={[styles.detailsCard, { borderColor: colors.cardBorder }]}>
                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.primaryPurple}14` }]}>
                      <Feather name="file-text" size={14} color={colors.primaryPurple} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Order')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.primaryPurple }]}>
                        #{detailsOrder?.id ?? '--'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.neonGreen}14` }]}>
                      <Feather name="dollar-sign" size={14} color={colors.neonGreen} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Amount')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.neonGreen, fontSize: 16, fontWeight: '700' }]}>
                        {formatCurrency(detailsBill.amount, currency)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.accentOrange}14` }]}>
                      <Feather name="calendar" size={14} color={colors.accentOrange} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Due Date')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {formatUsDateTime(detailsBill.dueDate ?? null)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.textMuted}14` }]}>
                      <Feather name="clock" size={14} color={colors.textMuted} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Issue Date')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {formatUsDateTime(detailsBill.issueDate ?? null)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailsCard, { borderColor: colors.cardBorder }]}>
                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.textMuted}14` }]}>
                      <Feather name="type" size={14} color={colors.textMuted} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Digitable Line')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]} selectable>
                        {detailsBill.digitableLine || '--'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.textMuted}14` }]}>
                      <Feather name="bar-chart-2" size={14} color={colors.textMuted} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Barcode')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]} selectable>
                        {detailsBill.barCode || '--'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailsCard, { borderColor: colors.cardBorder }]}>
                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.primaryPurple}14` }]}>
                      <Feather name="home" size={14} color={colors.primaryPurple} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Bank')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {detailsBill.bankCode}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.textMuted}14` }]}>
                      <Feather name="hash" size={14} color={colors.textMuted} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Our Number')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {detailsBill.ourNumber}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailsIconRow}>
                    <View style={[styles.detailsIconBox, { backgroundColor: `${colors.textMuted}14` }]}>
                      <Feather name="file" size={14} color={colors.textMuted} />
                    </View>
                    <View style={styles.detailsIconRowInfo}>
                      <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Document')}</Text>
                      <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                        {detailsBill.documentNumber}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsActions}>
                  <Button
                    mode="contained"
                    onPress={openPdf}
                    buttonColor={colors.primaryPurple}
                    textColor="#fff"
                    testID="bill-view-pdf"
                    style={styles.actionButton}
                    contentStyle={styles.modalButtonContent}
                    labelStyle={styles.modalButtonLabel}
                  >
                    {t('View PDF')}
                  </Button>
                </View>

                {showPdf && (
                  <View style={[styles.pdfBox, { borderColor: colors.cardBorder }]}>
                    {pdfLoading ? (
                      <View style={styles.pdfLoading}>
                        <NervLoader label={t('Rendering PDF')} subtitle={t('Preparing bill preview...')} />
                      </View>
                    ) : pdfError ? (
                      <Text style={[styles.htmlText, { color: colors.accentOrange }]}>{pdfError}</Text>
                    ) : pdfDataUri ? (
                      Platform.OS !== 'web' && WebView ? (
                        <WebView
                          originWhitelist={['*']}
                          source={{ uri: pdfDataUri }}
                          style={styles.pdfViewer}
                        />
                      ) : (
                        <View style={styles.pdfWebFallback}>
                          <Text style={[styles.htmlText, { color: colors.textSecondary }]}>
                            {t('PDF preview opens in a new tab on web.')}
                          </Text>
                          <Button
                            mode="outlined"
                            onPress={() => pdfBase64 && openPdfInBrowser(pdfBase64)}
                            textColor={colors.textSecondary}
                            style={[styles.actionButton, { borderColor: colors.cardBorder }]}
                            contentStyle={styles.modalButtonContent}
                            labelStyle={styles.modalButtonLabel}
                          >
                            {t('Open PDF')}
                          </Button>
                        </View>
                      )
                    ) : (
                      <Text style={[styles.htmlText, { color: colors.textSecondary }]}>
                        {t('PDF preview is unavailable.')}
                      </Text>
                    )}
                  </View>
                )}
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
  headerActions: {
    flexDirection: 'row',
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
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  summaryRowCompact: {
    flexDirection: 'column',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  actionRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchBar: {
    flex: 1,
    borderRadius: 12,
    minHeight: 50,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  refreshButton: {
    borderRadius: 12,
    minHeight: 50,
  },
  refreshButtonCompact: {
    minHeight: 46,
    borderRadius: 12,
  },
  refreshButtonContent: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonContentCompact: {
    paddingVertical: 6,
  },
  refreshButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
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
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableHeadText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...Platform.select({ web: { transition: 'background-color 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowOverdue: {
    backgroundColor: 'rgba(255, 77, 125, 0.03)',
  },
  colInvoice: {
    flex: 1,
    minWidth: 70,
  },
  colCustomer: {
    flex: 1.5,
    minWidth: 80,
  },
  colAmount: {
    width: 90,
    textAlign: 'right' as const,
  },
  colIssued: {
    width: 90,
  },
  colDue: {
    width: 90,
  },
  colStatus: {
    width: 100,
  },
  cellInvoice: {
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  cellCustomer: {
    fontSize: 14,
  },
  cellAmount: {
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  cellIssued: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  cellDue: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  actionButton: {
    borderRadius: 8,
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
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    maxHeight: '90%',
  },
  modalCardWide: {
    maxWidth: 560,
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
    fontSize: 22,
    fontWeight: '700',
  },
  detailsLoading: {
    paddingVertical: 12,
  },
  detailsScroll: {
    maxHeight: 520,
  },
  detailsContent: {
    gap: 12,
    paddingBottom: 8,
  },
  detailsCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  detailsIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailsIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
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
  detailsLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailsValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButtonContent: {
    height: 44,
    paddingHorizontal: 18,
  },
  modalButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  htmlText: {
    fontSize: 11,
    lineHeight: 16,
  },
  pdfBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 8,
    height: 360,
  },
  pdfWebFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  pdfViewer: {
    flex: 1,
    borderRadius: 8,
  },
  pdfLoading: {
    flex: 1,
    justifyContent: 'center',
  },
});
