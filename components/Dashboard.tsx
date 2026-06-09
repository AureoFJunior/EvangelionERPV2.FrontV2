import React, { useMemo, useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { ErpService } from "../services/erpService";
import { NervLoader } from "./NervLoader";
import { useResponsive } from "../hooks/useResponsive";
import { formatCurrency } from "../utils/currency";
import { useDashboardData } from "../hooks/dashboard/useDashboardData";
import {
  buildActivities,
  buildCategoryRevenue,
  buildDashboardTotals,
  buildMonthlyRevenueSeries,
  buildMonthlyTargetSeries,
  buildOrderStatusCounts,
  monthLabels,
} from "../utils/dashboard/metrics";
import {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryAxis,
  VictoryBar,
  VictoryGroup,
  VictoryScatter,
  VictoryTheme,
} from "victory-native";

/* ── KPI Card ────────────────────────────────────────────────────────────────── */

function KPICard({
  title,
  value,
  change,
  isPositive,
  icon,
  accent,
  colors,
  cardWidth,
}: {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: string;
  accent: string;
  colors: any;
  cardWidth?: number;
}) {
  return (
    <Pressable
      style={(state: any) => [
        s.kpiCard,
        { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
        cardWidth != null && { width: cardWidth, flex: undefined },
        state.hovered && { borderColor: `${colors.cardBorder}99` },
      ]}
    >
      {(state: any) => (
        <>
          <View
            style={[
              s.kpiGlow,
              { backgroundColor: accent, opacity: state.hovered ? 0.14 : 0.08 },
              Platform.OS === 'web' && ({ filter: 'blur(40px)', transition: 'opacity 0.2s ease' } as any),
            ]}
            pointerEvents="none"
          />
          <View style={s.kpiTopRow}>
            <View style={[s.kpiIconBox, { backgroundColor: `${accent}20` }]}>
              <Feather name={icon as any} size={16} color={accent} />
            </View>
            <View style={[s.kpiChangePill, { backgroundColor: isPositive ? `${colors.neonGreen}1A` : `${colors.destructive}1A` }]}>
              <Feather name={isPositive ? 'arrow-up-right' : 'arrow-down-right'} size={12} color={isPositive ? colors.neonGreen : colors.destructive} />
              <Text style={[s.kpiChangeText, { color: isPositive ? colors.neonGreen : colors.destructive }]}>{change}</Text>
            </View>
          </View>
          <Text style={[s.kpiValue, { color: colors.textPrimary }]}>{value}</Text>
          <Text style={[s.kpiTitle, { color: colors.textMuted }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ── Order Status Bar ────────────────────────────────────────────────────────── */

function OrderStatusBar({
  label,
  count,
  percent,
  color,
  colors,
}: {
  label: string;
  count: number;
  percent: number;
  color: string;
  colors: any;
}) {
  return (
    <View style={s.statusRow}>
      <View style={s.statusLabelRow}>
        <Text style={[s.statusLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[s.statusCount, { color: colors.textPrimary }]}>{count.toLocaleString()}</Text>
      </View>
      <View style={[s.statusBarTrack, { backgroundColor: `${colors.cardBorder}40` }]}>
        <View style={[s.statusBarFill, { width: `${count === 0 ? 0 : Math.max(percent, 1)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────────── */

const formatCompactCurrency = (amount: number, symbol: string) => {
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(0)}K`;
  return `${symbol}${amount.toFixed(0)}`;
};

const formatActivityAmount = (amount: number, symbol: string) => {
  return `+${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/* ── Dashboard Component ─────────────────────────────────────────────────────── */

export function Dashboard() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading, currency, enterpriseId } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { width, isCompact, isTablet, contentPadding, cardGap } = useResponsive();
  const chartCardWidth = Math.min(Math.max(width - contentPadding * 2, 320), 1400);
  const chartInnerPad = isCompact ? 28 : isTablet ? 32 : 36;
  const chartHeight = isCompact ? 180 : isTablet ? 210 : 210;

  const useWideLayout = !isCompact && width >= 768;
  const kpiCols = width >= 1024 ? 4 : 2;
  const kpiCardWidth = Math.floor((width - contentPadding * 2 - cardGap * (kpiCols - 1)) / kpiCols);
  const revenueChartWidth = useWideLayout
    ? Math.max((chartCardWidth * 0.65) - chartInnerPad, 300)
    : Math.max(chartCardWidth - chartInnerPad, 300);
  const barChartWidth = useWideLayout
    ? Math.max((chartCardWidth * 0.65) - chartInnerPad, 300)
    : Math.max(chartCardWidth - chartInnerPad, 300);
  const barChartHeight = isCompact ? 160 : 190;

  const [refreshKey, setRefreshKey] = useState(0);
  const [activePoint, setActivePoint] = useState<{ x: number; revenue: number; target: number } | null>(null);
  const chartCanvasRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const { products, orders, customers, loading, errorMessage } = useDashboardData({
    erpService,
    isAuthenticated,
    authLoading,
    enterpriseId,
    refreshKey,
  });

  const totals = useMemo(
    () => buildDashboardTotals(products, orders, customers),
    [products, orders, customers],
  );

  const revenueSeries = useMemo(() => buildMonthlyRevenueSeries(orders), [orders]);
  const targetSeries = useMemo(() => buildMonthlyTargetSeries(revenueSeries), [revenueSeries]);
  const orderStatusCounts = useMemo(() => buildOrderStatusCounts(orders), [orders]);
  const activities = useMemo(() => buildActivities(orders, products), [orders, products]);
  const categoryRevenue = useMemo(() => buildCategoryRevenue(products, orders), [products, orders]);

  const revenueChartData = useMemo(
    () => monthLabels.map((_, i) => ({ x: i + 1, y: revenueSeries[i]?.y ?? 0 })),
    [revenueSeries],
  );
  const targetChartData = useMemo(
    () => monthLabels.map((_, i) => ({ x: i + 1, y: targetSeries[i]?.y ?? 0 })),
    [targetSeries],
  );

  const maxChartY = Math.max(1, ...revenueChartData.map((d) => d.y), ...targetChartData.map((d) => d.y));
  const xTickValues = monthLabels.map((_, i) => i + 1);

  const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '$';

  const handleChartPointer = useCallback((e: any) => {
    const rect = e.currentTarget?.getBoundingClientRect?.();
    if (!rect) return;
    const offsetX = (e.clientX ?? e.nativeEvent?.pageX ?? 0) - rect.left;
    const hitWidth = rect.width;
    if (hitWidth <= 0) return;
    const ratio = offsetX / hitWidth;
    const monthIndex = Math.round(ratio * 11);
    const x = Math.max(1, Math.min(12, monthIndex + 1));
    const rev = revenueChartData.find((d) => d.x === x)?.y ?? 0;
    const tgt = targetChartData.find((d) => d.x === x)?.y ?? 0;
    setActivePoint((prev) => (prev?.x === x ? prev : { x, revenue: rev, target: tgt }));
  }, [revenueChartData, targetChartData]);

  const now = new Date();
  const monthName = now.toLocaleString('en', { month: 'long' });
  const subtitle = `${monthName} ${now.getFullYear()} — ${t('Fiscal Year Overview')}`;

  /* ── KPI data ─────────────────────────────────────────────────────────────── */

  const stats = [
    {
      title: t('TOTAL REVENUE'),
      value: formatCompactCurrency(totals.revenue, currencySymbol),
      change: totals.revenueChange.text,
      isPositive: totals.revenueChange.isPositive,
      icon: "dollar-sign",
      accent: colors.primaryPurple,
    },
    {
      title: t('ACTIVE ORDERS'),
      value: totals.totalOrders.toLocaleString(),
      change: totals.orderChange.text,
      isPositive: totals.orderChange.isPositive,
      icon: "shopping-cart",
      accent: colors.neonGreen,
    },
    {
      title: t('TOTAL CUSTOMERS'),
      value: totals.activeCustomers.toLocaleString(),
      change: totals.customerChange.text,
      isPositive: totals.customerChange.isPositive,
      icon: "users",
      accent: colors.secondaryPurple,
    },
    {
      title: t('OUTSTANDING AR'),
      value: formatCompactCurrency(totals.outstandingAR, currencySymbol),
      change: totals.arChange.text,
      isPositive: !totals.arChange.isPositive,
      icon: "file-text",
      accent: colors.accentOrange,
    },
  ];

  /* ── Order status percentage calculations ─────────────────────────────────── */

  const orderTotal = orderStatusCounts.total || 1;
  const orderStatuses = [
    { label: t('Completed'), count: orderStatusCounts.completed, percent: Math.round((orderStatusCounts.completed / orderTotal) * 100), color: colors.neonGreen },
    { label: t('Processing'), count: orderStatusCounts.processing, percent: Math.round((orderStatusCounts.processing / orderTotal) * 100), color: colors.primaryPurple },
    { label: t('Pending'), count: orderStatusCounts.pending, percent: Math.round((orderStatusCounts.pending / orderTotal) * 100), color: colors.accentOrange },
    { label: t('Cancelled'), count: orderStatusCounts.cancelled, percent: Math.round((orderStatusCounts.cancelled / orderTotal) * 100), color: colors.destructive },
  ];

  /* ── Activity icon/color mapping ──────────────────────────────────────────── */

  const getActivityStyle = (action: string): { icon: string; color: string } => {
    const lower = action.toLowerCase();
    if (lower.includes('order') && lower.includes('received')) {
      return { icon: 'shopping-cart', color: colors.primaryPurple };
    }
    if (lower.includes('payment') || lower.includes('paid')) {
      return { icon: 'dollar-sign', color: colors.neonGreen };
    }
    if (lower.includes('customer') || lower.includes('registered')) {
      return { icon: 'users', color: colors.secondaryPurple };
    }
    if (lower.includes('overdue') || lower.includes('cancelled') || lower.includes('alert')) {
      return { icon: 'alert-circle', color: colors.destructive };
    }
    if (lower.includes('fulfilled') || lower.includes('completed') || lower.includes('delivered')) {
      return { icon: 'check-circle', color: colors.neonGreen };
    }
    if (lower.includes('product')) {
      return { icon: 'package', color: colors.accentOrange };
    }
    return { icon: 'activity', color: colors.primaryPurple };
  };

  /* ── Bar chart data for Revenue by Category ───────────────────────────────── */

  const barCategories = categoryRevenue.map((r) => r.category);
  const barQ1 = categoryRevenue.map((r, i) => ({ x: i + 1, y: r.q1 }));
  const barQ2 = categoryRevenue.map((r, i) => ({ x: i + 1, y: r.q2 }));
  const barQ3 = categoryRevenue.map((r, i) => ({ x: i + 1, y: r.q3 }));
  const barQ4 = categoryRevenue.map((r, i) => ({ x: i + 1, y: r.q4 }));
  const maxBarY = Math.max(1, ...categoryRevenue.flatMap((r) => [r.q1, r.q2, r.q3, r.q4]));

  /* ── Loading state ─────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <NervLoader
        variant="dashboard"
        fullScreen
        label={t('Loading dashboard')}
        subtitle={t('Fetching analytics data...')}
      />
    );
  }

  /* ── Revenue vs Target chart ───────────────────────────────────────────────── */

  const revenueChart = (
    <View style={[s.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }, useWideLayout && { flex: 2 }]}>
      <View style={s.chartHeader}>
        <View>
          <Text style={[s.chartTitle, { color: colors.textPrimary }]}>{t('Revenue vs Target')}</Text>
          <Text style={[s.chartSubtitle, { color: colors.textMuted }]}>
            {t('Monthly performance')}, FY {now.getFullYear()}
          </Text>
        </View>
        <View style={s.legendRow}>
          <View style={s.legendItem}>
            <View style={[s.legendLine, { backgroundColor: colors.primaryPurple }]} />
            <Text style={[s.legendText, { color: colors.textMuted }]}>{t('Revenue')}</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendLineDashed, { borderColor: colors.neonGreen }]} />
            <Text style={[s.legendText, { color: colors.textMuted }]}>{t('Target')}</Text>
          </View>
        </View>
      </View>
      <View
        style={[s.chartCanvas, { minHeight: chartHeight + 8 }]}
        onLayout={(e) => {
          chartCanvasRef.current = {
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          };
        }}
      >
        <VictoryChart
          width={revenueChartWidth}
          height={chartHeight}
          theme={VictoryTheme.material}
          domain={{ x: [1, 12], y: [0, maxChartY * 1.2] }}
          domainPadding={{ x: isCompact ? 12 : 20, y: 16 }}
          padding={{ top: 18, bottom: 46, left: 60, right: 20 }}
        >
          <VictoryAxis
            tickValues={xTickValues}
            tickFormat={(tick: number) => monthLabels[Number(tick) - 1] ?? ""}
            style={{
              axis: { stroke: colors.cardBorder },
              tickLabels: { fill: colors.textMuted, fontSize: isCompact ? 9 : 11, padding: 8 },
              grid: { stroke: 'transparent' },
            }}
          />
          <VictoryAxis
            dependentAxis
            tickFormat={(tick: number) => {
              const v = Number(tick);
              if (v >= 1_000_000) return `${currencySymbol}${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${currencySymbol}${(v / 1_000).toFixed(0)}K`;
              return `${currencySymbol}${v.toFixed(0)}`;
            }}
            style={{
              axis: { stroke: colors.cardBorder },
              tickLabels: { fill: colors.textMuted, fontSize: isCompact ? 9 : 11, padding: 6 },
              grid: { stroke: `${colors.cardBorder}40`, strokeDasharray: '3,3' },
            }}
          />
          <VictoryLine
            data={targetChartData}
            interpolation="monotoneX"
            style={{
              data: {
                stroke: colors.neonGreen,
                strokeWidth: 1.5,
                strokeDasharray: '4,4',
              },
            }}
          />
          <VictoryArea
            data={revenueChartData}
            interpolation="monotoneX"
            style={{
              data: {
                stroke: colors.primaryPurple,
                strokeWidth: 2.5,
                fill: colors.primaryPurple,
                fillOpacity: 0.15,
              },
            }}
          />
          {activePoint && (
            <VictoryScatter
              data={[{ x: activePoint.x, y: activePoint.revenue }]}
              size={5}
              style={{ data: { fill: colors.primaryPurple, stroke: '#fff', strokeWidth: 2 } }}
            />
          )}
        </VictoryChart>
        {Platform.OS === 'web' && (
          <View
            style={s.chartHitArea}
            onPointerMove={handleChartPointer}
            onPointerLeave={() => setActivePoint(null)}
          />
        )}
        {activePoint && (
          <View style={[s.chartTooltip, { backgroundColor: colors.popover, borderColor: colors.cardBorder }]}>
            <Text style={[s.chartTooltipLabel, { color: colors.textMuted }]}>
              {monthLabels[activePoint.x - 1]}
            </Text>
            <View style={s.chartTooltipRow}>
              <View style={[s.chartTooltipDot, { backgroundColor: colors.primaryPurple }]} />
              <Text style={[s.chartTooltipName, { color: colors.textSecondary }]}>{t('Revenue')}:</Text>
              <Text style={[s.chartTooltipValue, { color: colors.textPrimary }]}>
                {formatCompactCurrency(activePoint.revenue, currencySymbol)}
              </Text>
            </View>
            <View style={s.chartTooltipRow}>
              <View style={[s.chartTooltipDot, { backgroundColor: colors.neonGreen }]} />
              <Text style={[s.chartTooltipName, { color: colors.textSecondary }]}>{t('Target')}:</Text>
              <Text style={[s.chartTooltipValue, { color: colors.textPrimary }]}>
                {formatCompactCurrency(activePoint.target, currencySymbol)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  /* ── Order Status panel ────────────────────────────────────────────────────── */

  const orderStatus = (
    <View style={[s.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }, useWideLayout && { flex: 1 }]}>
      <Text style={[s.chartTitle, { color: colors.textPrimary, marginBottom: 20 }]}>
        {t('Order Status')}
      </Text>
      {orderStatuses.map((row) => (
        <OrderStatusBar
          key={row.label}
          label={row.label}
          count={row.count}
          percent={row.percent}
          color={row.color}
          colors={colors}
        />
      ))}
      <View style={[s.statusTotalRow, { borderTopColor: `${colors.cardBorder}60` }]}>
        <Text style={[s.statusTotalLabel, { color: colors.textMuted }]}>{t('Total')}</Text>
        <Text style={[s.statusTotalCount, { color: colors.textPrimary }]}>
          {orderStatusCounts.total.toLocaleString()}
        </Text>
      </View>
    </View>
  );

  /* ── Revenue by Category bar chart ─────────────────────────────────────────── */

  const categoryChart = (
    <View style={[s.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }, useWideLayout && { flex: 2 }]}>
      <View style={{ marginBottom: 20 }}>
        <Text style={[s.chartTitle, { color: colors.textPrimary }]}>{t('Revenue by Category')}</Text>
        <Text style={[s.chartSubtitle, { color: colors.textMuted }]}>
          {t('Quarterly breakdown (in thousands)')}
        </Text>
      </View>
      <View style={[s.chartCanvas, { minHeight: barChartHeight + 8 }]}>
        {categoryRevenue.length > 0 ? (
          <VictoryChart
            width={barChartWidth}
            height={barChartHeight}
            theme={VictoryTheme.material}
            domainPadding={{ x: isCompact ? 20 : 30, y: 16 }}
            padding={{ top: 10, bottom: 40, left: 44, right: 16 }}
          >
            <VictoryAxis
              tickValues={barCategories.map((_, i) => i + 1)}
              tickFormat={(tick: number) => barCategories[Number(tick) - 1] ?? ""}
              style={{
                axis: { stroke: 'transparent' },
                tickLabels: { fill: colors.textMuted, fontSize: isCompact ? 9 : 11, padding: 8 },
                grid: { stroke: 'transparent' },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(v: number) => `${v}k`}
              style={{
                axis: { stroke: 'transparent' },
                tickLabels: { fill: colors.textMuted, fontSize: isCompact ? 9 : 11, padding: 6 },
                grid: { stroke: `${colors.cardBorder}30`, strokeDasharray: '3,3' },
              }}
            />
            <VictoryGroup offset={isCompact ? 6 : 8}>
              <VictoryBar
                data={barQ1}
                style={{ data: { fill: colors.primaryPurple, opacity: 0.45, width: isCompact ? 5 : 7 } }}
                cornerRadius={{ top: 2 }}
              />
              <VictoryBar
                data={barQ2}
                style={{ data: { fill: colors.primaryPurple, opacity: 0.62, width: isCompact ? 5 : 7 } }}
                cornerRadius={{ top: 2 }}
              />
              <VictoryBar
                data={barQ3}
                style={{ data: { fill: colors.primaryPurple, opacity: 0.8, width: isCompact ? 5 : 7 } }}
                cornerRadius={{ top: 2 }}
              />
              <VictoryBar
                data={barQ4}
                style={{ data: { fill: colors.primaryPurple, opacity: 1.0, width: isCompact ? 5 : 7 } }}
                cornerRadius={{ top: 2 }}
              />
            </VictoryGroup>
          </VictoryChart>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('No category data')}</Text>
          </View>
        )}
      </View>
    </View>
  );

  /* ── Activity feed ─────────────────────────────────────────────────────────── */

  const activityFeed = (
    <View style={[s.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }, useWideLayout && { flex: 1 }]}>
      <View style={s.chartHeader}>
        <Text style={[s.chartTitle, { color: colors.textPrimary }]}>{t('Activity')}</Text>
        <Pressable>
          <Text style={[s.viewAllLink, { color: colors.primaryPurple }]}>{t('View all')}</Text>
        </Pressable>
      </View>
      <View style={{ gap: 14 }}>
        {activities.length === 0 ? (
          <View style={s.activityItem}>
            <View style={[s.activityDot, { backgroundColor: colors.textMuted }]} />
            <Text style={[s.activityText, { color: colors.textMuted }]}>{t('No recent activity')}</Text>
          </View>
        ) : (
          activities.map((activity, index) => {
            const actStyle = getActivityStyle(activity.action);
            return (
              <View key={index} style={s.activityItem}>
                <View style={[s.activityIconBox, { backgroundColor: `${actStyle.color}1A` }]}>
                  <Feather name={actStyle.icon as any} size={14} color={actStyle.color} />
                </View>
                <View style={s.activityContent}>
                  <Text style={[s.activityText, { color: colors.textPrimary }]} numberOfLines={2}>
                    {t(activity.action)}
                  </Text>
                  <Text style={[s.activityTime, { color: colors.textMuted }]}>{t(activity.time)}</Text>
                </View>
                {activity.amount != null && activity.amount > 0 && (
                  <Text style={[s.activityAmount, { color: colors.neonGreen }]}>{formatActivityAmount(activity.amount, currencySymbol)}</Text>
                )}
              </View>
            );
          })
        )}
      </View>
    </View>
  );

  /* ── Main render ───────────────────────────────────────────────────────────── */

  return (
    <ScrollView style={s.container}>
      <View style={[s.content, { padding: contentPadding }]}>
        {/* ── Page Header ──────────────────────────────────────────────────────── */}
        <View style={[s.header, isCompact && s.headerCompact]}>
          <View style={s.headerLeft}>
            <Text style={[s.pageTitle, { color: colors.textPrimary }, isCompact && s.pageTitleCompact]}>
              {t('Dashboard')}
            </Text>
            <Text style={[s.pageSubtitle, { color: colors.textMuted }]}>
              {subtitle}
            </Text>
          </View>
          {!isCompact && (
            <View style={s.headerActions}>
              <Pressable onPress={() => setRefreshKey((k) => k + 1)} style={[s.headerBtn, { borderColor: colors.cardBorder }]}>
                <Feather name="refresh-cw" size={14} color={colors.textMuted} />
                <Text style={[s.headerBtnText, { color: colors.textMuted }]}>{t('Refresh')}</Text>
              </Pressable>
              <Pressable style={[s.headerBtn, { borderColor: colors.cardBorder }]}>
                <Feather name="download" size={14} color={colors.textMuted} />
                <Text style={[s.headerBtnText, { color: colors.textMuted }]}>{t('Export')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Auth / Error banners ─────────────────────────────────────────────── */}
        {!isAuthenticated && !authLoading && (
          <View style={[s.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
            <Text style={[s.bannerText, { color: colors.textSecondary }]}>{t('Authenticate to load analytics.')}</Text>
          </View>
        )}

        {errorMessage && (
          <View style={[s.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
            <Text style={[s.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
          </View>
        )}

        {/* ── KPI Cards (2-col mobile, 4-col wide) ────────────────────────────── */}
        <View style={[s.kpiGrid, { gap: cardGap }]}>
          {stats.map((stat) => (
            <KPICard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              isPositive={stat.isPositive}
              icon={stat.icon}
              accent={stat.accent}
              colors={colors}
              cardWidth={kpiCardWidth}
            />
          ))}
        </View>

        {/* ── Row 1: Revenue vs Target + Order Status ──────────────────────────── */}
        <View style={[useWideLayout ? s.rowLayout : s.stackLayout, { gap: cardGap }]}>
          {revenueChart}
          {orderStatus}
        </View>

        {/* ── Row 2: Revenue by Category + Activity ────────────────────────────── */}
        <View style={[useWideLayout ? s.rowLayout : s.stackLayout, { gap: cardGap }]}>
          {categoryChart}
          {activityFeed}
        </View>
      </View>
    </ScrollView>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 34,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerCompact: {
    flexDirection: 'column',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  pageTitleCompact: {
    fontSize: 20,
  },
  pageSubtitle: {
    fontSize: 14,
  },

  /* Banners */
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 12,
  },

  /* KPI grid */
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    ...Platform.select({ web: { transitionProperty: 'border-color', transitionDuration: '200ms' } as any }),
  },
  kpiGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 112,
    height: 112,
    borderRadius: 56,
    opacity: 0.08,
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiChangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  kpiChangeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontWeight: '600',
  },

  /* Layout helpers */
  rowLayout: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stackLayout: {
    flexDirection: 'column',
    marginBottom: 20,
  },

  /* Chart cards */
  chartCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chartCanvas: {
    width: "100%",
    minHeight: 190,
    alignItems: "stretch",
    justifyContent: "center",
  },
  chartHitArea: {
    position: 'absolute',
    top: 0,
    left: 60,
    right: 20,
    bottom: 46,
    ...Platform.select({ web: { cursor: 'crosshair' } as any, default: {} }),
  },
  chartTooltip: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    ...Platform.select({ web: { boxShadow: '0 4px 16px rgba(0,0,0,0.4)' } as any, default: {} }),
  },
  chartTooltipLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  chartTooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartTooltipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chartTooltipName: {
    fontSize: 11,
  },
  chartTooltipValue: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  /* Legend */
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  legendLineDashed: {
    width: 12,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 12,
  },

  /* Order Status */
  statusRow: {
    marginBottom: 16,
  },
  statusLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 12,
  },
  statusCount: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  statusBarTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  statusTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 4,
  },
  statusTotalLabel: {
    fontSize: 14,
  },
  statusTotalCount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },

  /* Activity */
  viewAllLink: {
    fontSize: 12,
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
  },
  activityText: {
    fontSize: 12,
    lineHeight: 16,
  },
  activityTime: {
    fontSize: 12,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
});
