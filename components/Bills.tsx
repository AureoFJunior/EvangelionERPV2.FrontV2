import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Card, Chip, IconButton, Searchbar } from './ui/Paper';
import { WebView } from 'react-native-webview';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { Bill as BillModel, ErpService, Order as OrderModel } from '../services/erpService';
import { NervLoader } from './NervLoader';
import { useResponsive } from '../hooks/useResponsive';
import { formatCurrency } from '../utils/currency';
import { useBillsOrders } from '../hooks/bills/useBillsOrders';
import { filterOrdersBySearch, getOrderStatusColor, openPdfInBrowser } from '../utils/bills/helpers';
import { formatUsDateTime } from '../utils/datetime';

type BillMode = 'view' | 'generate';

export function Bills() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading, enterpriseId, currency } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { isCompact, isTablet, contentPadding } = useResponsive();
  const {
    searchTerm,
    setSearchTerm,
    orders,
    loading,
    errorMessage,
    setErrorMessage,
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
      setErrorMessage(t('Authenticate to manage bills.'));
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

  if (loading) {
    return (
      <NervLoader
        fullScreen
        label={t('Synchronizing EVA-02')}
        subtitle={t('Generating bill streams...')}
      />
    );
  }

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
        <View style={[styles.content, { padding: contentPadding }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
              {t('BILLS CENTER')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
              {t('Generate and review bills per order')}
            </Text>
            <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
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

          {errorMessage && (
            <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
              <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
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

          <View style={styles.orderList}>
            {filteredOrders.map((order, index) => {
              const orderId = order.id ?? index;
              const orderTotal =
                typeof order.totalValue === 'number'
                  ? order.totalValue
                  : typeof order.total === 'number'
                    ? order.total
                    : 0;
              const orderCustomer = order.customer ?? t('Unknown customer');
              return (
                <Card
                  key={orderId}
                  mode="outlined"
                  style={[styles.orderCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}
                >
                  <Card.Content style={styles.orderCardContent}>
                    <View style={[styles.orderHeader, isCompact && styles.orderHeaderCompact]}>
                      <View style={styles.orderInfo}>
                        <Text style={[styles.orderLabel, { color: colors.textSecondary }]}>{t('Order')}</Text>
                        <Text style={[styles.orderId, { color: colors.textPrimary }]}>#{orderId}</Text>
                        <Text style={[styles.orderCustomer, { color: colors.textMuted }]}>{orderCustomer}</Text>
                      </View>
                      <Chip
                        compact={isCompact}
                        style={[
                          styles.statusBadge,
                          isCompact && styles.statusBadgeCompact,
                          { backgroundColor: `${getOrderStatusColor(order.status ?? 'Pending', colors)}20` },
                        ]}
                        textStyle={[
                          styles.statusText,
                          isCompact && styles.statusTextCompact,
                          { color: getOrderStatusColor(order.status ?? 'Pending', colors) },
                        ]}
                      >
                          {t(order.status ?? 'Pending')}
                        </Chip>
                    </View>

                    <View style={styles.orderMeta}>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('Date')}</Text>
                        <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
                          {formatUsDateTime(order.createdAt ?? order.date ?? null)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t('Total')}</Text>
                        <Text style={[styles.metaValue, { color: colors.neonGreen }]}>
                          {formatCurrency(orderTotal, currency)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.cardActions, isCompact && styles.cardActionsCompact]}>
                      <Button
                        mode="outlined"
                        onPress={() => openDetails(order, 'view')}
                        textColor={colors.textSecondary}
                        testID={`bill-view-${order.id}`}
                        style={[styles.actionButton, { borderColor: colors.cardBorder }]}
                      >
                        {t('View')}
                      </Button>
                      <Button
                        mode="contained"
                        onPress={() => openDetails(order, 'generate')}
                        buttonColor={colors.primaryPurple}
                        textColor={colors.neonGreen}
                        testID={`bill-generate-${order.id}`}
                        style={styles.actionButton}
                      >
                        {t('Generate')}
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
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
              <Text style={[styles.modalTitle, { color: colors.neonGreen }]}>
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
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Order')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      #{detailsOrder?.id ?? '--'}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Amount')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.neonGreen }]}>
                      {formatCurrency(detailsBill.amount, currency)}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Due Date')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {formatUsDateTime(detailsBill.dueDate ?? null)}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Issue Date')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {formatUsDateTime(detailsBill.issueDate ?? null)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailsCard, { borderColor: colors.cardBorder }]}>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Digitable Line')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsBill.digitableLine || '--'}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Barcode')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsBill.barCode || '--'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailsCard, { borderColor: colors.cardBorder }]}>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Bank')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsBill.bankCode}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Our Number')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsBill.ourNumber}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsLabel, { color: colors.textMuted }]}>{t('Document')}</Text>
                    <Text style={[styles.detailsValue, { color: colors.textPrimary }]}>
                      {detailsBill.documentNumber}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsActions}>
                  <Button
                    mode="contained"
                    onPress={openPdf}
                    buttonColor={colors.primaryPurple}
                    textColor={colors.neonGreen}
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
                      Platform.OS === 'web' ? (
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
                      ) : (
                      <WebView
                        originWhitelist={['*']}
                        source={{ uri: pdfDataUri }}
                        style={styles.pdfViewer}
                      />
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
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  refreshButton: {
    borderRadius: 8,
    minHeight: 48,
  },
  refreshButtonCompact: {
    minHeight: 44,
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
  orderList: {
    gap: 16,
  },
  orderCard: {
    borderRadius: 10,
  },
  orderCardContent: {
    padding: 16,
    gap: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  orderInfo: {
    gap: 4,
  },
  orderLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
  },
  orderCustomer: {
    fontSize: 12,
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
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaItem: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
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
    gap: 8,
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
    flex: 1,
    textAlign: 'right',
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
    borderRadius: 10,
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
