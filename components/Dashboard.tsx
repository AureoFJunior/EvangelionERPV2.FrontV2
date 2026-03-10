import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "./ui/Paper";
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
  buildCreatedAtSeries,
  buildDashboardTotals,
  buildMonthlyBuckets,
  buildOrderDateSeries,
} from "../utils/dashboard/metrics";
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryScatter,
  VictoryAxis,
  VictoryTheme,
} from "victory-native";

export function Dashboard() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading, currency, enterpriseId } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { width, isCompact, isTablet, contentPadding, cardGap } = useResponsive();
  const chartCardWidth = Math.min(Math.max(width - contentPadding * 2, 320), 1400);
  const chartInnerHorizontalPadding = isCompact ? 28 : isTablet ? 32 : 36;
  const chartWidth = Math.max(chartCardWidth - chartInnerHorizontalPadding, 300);
  const chartHeight = isCompact ? 240 : isTablet ? 300 : 340;
  const [activeProductPoint, setActiveProductPoint] = useState<{ x: string; y: number } | null>(null);
  const [activeOrderPoint, setActiveOrderPoint] = useState<{ x: string; y: number } | null>(null);

  const { products, orders, customers, loading, errorMessage } = useDashboardData({
    erpService,
    isAuthenticated,
    authLoading,
    enterpriseId,
  });

  const monthlyBuckets = useMemo(() => buildMonthlyBuckets(6), []);

  const productData = useMemo(
    () => buildCreatedAtSeries(monthlyBuckets, products),
    [products, monthlyBuckets],
  );

  const orderData = useMemo(
    () => buildOrderDateSeries(monthlyBuckets, orders),
    [orders, monthlyBuckets],
  );
  const productChartData = useMemo(
    () =>
      monthlyBuckets.map((bucket, index) => ({
        x: index + 1,
        label: bucket.label,
        y: Number(productData[index]?.y ?? 0),
      })),
    [monthlyBuckets, productData],
  );
  const orderChartData = useMemo(
    () =>
      monthlyBuckets.map((bucket, index) => ({
        x: index + 1,
        label: bucket.label,
        y: Number(orderData[index]?.y ?? 0),
      })),
    [monthlyBuckets, orderData],
  );
  const maxProductY = Math.max(1, ...productChartData.map((item) => item.y));
  const maxOrderY = Math.max(1, ...orderChartData.map((item) => item.y));
  const xTickValues = monthlyBuckets.map((_, index) => index + 1);
  const productDomainMaxY = Math.max(1, maxProductY * 1.2);
  const orderDomainMaxY = Math.max(1, maxOrderY * 1.25);
  const productDomainMinY = maxProductY <= 1 ? -0.25 : -Math.max(0.5, maxProductY * 0.08);
  const orderDomainMinY = maxOrderY <= 1 ? -0.2 : -Math.max(0.35, maxOrderY * 0.08);
  const orderBarWidth = Math.max(
    isCompact ? 14 : 18,
    Math.min(48, Math.round(chartWidth / Math.max(orderChartData.length * 2.1, 8))),
  );

  const activities = useMemo(() => buildActivities(orders, products), [orders, products]);

  const totals = useMemo(
    () => buildDashboardTotals(products, orders, customers),
    [products, orders, customers],
  );

  const stats = [
    {
      title: t('Total Products'),
      value: totals.totalProducts.toLocaleString(),
      change: totals.productChange.text,
      isPositive: totals.productChange.isPositive,
      icon: "package",
    },
    {
      title: t('Total Orders'),
      value: totals.totalOrders.toLocaleString(),
      change: totals.orderChange.text,
      isPositive: totals.orderChange.isPositive,
      icon: "shopping-cart",
    },
    {
      title: t('Active Customers'),
      value: totals.activeCustomers.toLocaleString(),
      change: totals.customerChange.text,
      isPositive: totals.customerChange.isPositive,
      icon: "users",
    },
    {
      title: t('Revenue'),
      value: formatCurrency(totals.revenue, currency),
      change: totals.revenueChange.text,
      isPositive: totals.revenueChange.isPositive,
      icon: "dollar-sign",
    },
  ];

  if (loading) {
    return (
      <NervLoader
        variant="dashboard"
        fullScreen
        label={t('Synchronizing EVA-01')}
        subtitle={t('LCL circulation nominal - Loading dashboard...')}
      />
    );
  }

  return (
    <ScrollView style={styles.container}> 
      <View style={[styles.content, { padding: contentPadding }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
            {t('COMMAND CENTER')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
            {t('Real-time system monitoring and analytics')}
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
        </View>

        {!isAuthenticated && !authLoading && (
          <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>{t('Authenticate to load analytics.')}</Text>
          </View>
        )}

        {errorMessage && (
          <View style={[styles.banner, { backgroundColor: `${colors.accentOrange}20`, borderColor: colors.accentOrange }]}>
            <Text style={[styles.bannerText, { color: colors.accentOrange }]}>{errorMessage}</Text>
          </View>
        )}

        {/* Stats Grid */}
        <View style={[styles.statsGrid, { gap: cardGap }, isCompact && styles.statsGridCompact]}>
          {stats.map((stat, index) => (
            <Card
              key={index}
              mode="outlined"
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
                isCompact && styles.statCardCompact,
              ]}
            >
              <Card.Content style={styles.statCardContent}>
                <View style={styles.statHeader}>
                  <View style={[styles.iconBox, { backgroundColor: `${colors.primaryPurple}20`, borderColor: colors.cardBorder }]}>
                    <Feather name={stat.icon as any} size={24} color={colors.primaryPurple} />
                  </View>
                  <View style={styles.changeContainer}>
                    <Feather
                      name={stat.isPositive ? "trending-up" : "trending-down"}
                      size={16}
                      color={stat.isPositive ? colors.neonGreen : colors.accentOrange}
                    />
                    <Text style={[styles.changeText, { color: stat.isPositive ? colors.neonGreen : colors.accentOrange }]}>
                      {stat.change}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{stat.title}</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }, isCompact && styles.statValueCompact]}>
                  {stat.value}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Charts */}
        <Card
          mode="outlined"
          style={[
            styles.chartCard,
            styles.chartCardSized,
            { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
          ]}
        >
          <Card.Content style={styles.chartCardContent}>
            <Text style={[styles.chartTitle, { color: colors.neonGreen }, isCompact && styles.chartTitleCompact]}>
              {t('Product Analytics')}
            </Text>
            <View style={[styles.chartCanvas, { minHeight: chartHeight + 8 }]}>
              <VictoryChart
                width={chartWidth}
                height={chartHeight}
                theme={VictoryTheme.material}
                domain={{
                  x: [1, Math.max(1, productChartData.length)],
                  y: [productDomainMinY, productDomainMaxY],
                }}
                domainPadding={{ x: isCompact ? 16 : 24, y: 16 }}
                padding={{ top: 18, bottom: 46, left: 52, right: 20 }}
              >
                <VictoryAxis
                  tickValues={xTickValues}
                  tickFormat={(tick) => {
                    const index = Number(tick) - 1;
                    return productChartData[index]?.label ?? "";
                  }}
                  style={{
                    axis: { stroke: colors.cardBorder },
                    tickLabels: { fill: colors.textSecondary, fontSize: isCompact ? 9 : 10, padding: 8 },
                    grid: { stroke: `${colors.cardBorder}40` },
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  tickFormat={(tick) => {
                    const value = Number(tick);
                    return value < 0 ? "" : `${Math.round(value)}`;
                  }}
                  style={{
                    axis: { stroke: colors.cardBorder },
                    tickLabels: { fill: colors.textSecondary, fontSize: isCompact ? 9 : 10, padding: 6 },
                    grid: { stroke: `${colors.cardBorder}40` },
                  }}
                />
                <VictoryLine
                  data={productChartData}
                  interpolation="linear"
                  style={{ data: { stroke: colors.primaryPurple, strokeWidth: 3 } }}
                />
                <VictoryScatter
                  data={productChartData}
                  size={({ datum }: any) => {
                    const isFocused =
                      activeProductPoint &&
                      activeProductPoint.x === String(datum?.label ?? datum?.x) &&
                      activeProductPoint.y === Number(datum?.y ?? 0);
                    if (isFocused) {
                      return 7;
                    }
                    return Number(datum?.y ?? 0) > 0 ? 4 : 3;
                  }}
                  style={{
                    data: {
                      fill: ({ datum }: any) => {
                        const isFocused =
                          activeProductPoint &&
                          activeProductPoint.x === String(datum?.label ?? datum?.x) &&
                          activeProductPoint.y === Number(datum?.y ?? 0);
                        if (isFocused) {
                          return colors.neonGreen;
                        }
                        return Number(datum?.y ?? 0) > 0 ? colors.primaryPurple : `${colors.primaryPurple}65`;
                      },
                      stroke: colors.cardBgFrom,
                      strokeWidth: 2,
                    },
                  }}
                  events={[
                    {
                      target: "data",
                      eventHandlers: {
                        onMouseOver: (_event: any, props: any) => {
                          const datum = props?.datum;
                          if (datum) {
                            setActiveProductPoint({
                              x: String(datum.label ?? datum.x),
                              y: Number(datum.y),
                            });
                          }
                          return [];
                        },
                        onMouseOut: () => {
                          setActiveProductPoint(null);
                          return [];
                        },
                        onPressIn: (_event: any, props: any) => {
                          const datum = props?.datum;
                          if (datum) {
                            setActiveProductPoint({
                              x: String(datum.label ?? datum.x),
                              y: Number(datum.y),
                            });
                          }
                          return [];
                        },
                      },
                    },
                  ]}
                />
              </VictoryChart>
            </View>
            <View style={[styles.chartInfoBox, { borderColor: colors.cardBorder, backgroundColor: `${colors.inputBgTo}80` }]}>
              <Text style={[styles.chartInfoText, { color: colors.textSecondary }]}>
                {activeProductPoint
                  ? `${activeProductPoint.x} - ${activeProductPoint.y} ${t('Products')}`
                  : t('Hover or tap a point to inspect values')}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card
          mode="outlined"
          style={[
            styles.chartCard,
            styles.chartCardSized,
            { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
          ]}
        > 
          <Card.Content style={styles.chartCardContent}>
            <Text style={[styles.chartTitle, { color: colors.neonGreen }, isCompact && styles.chartTitleCompact]}>
              {t('Order Volume')}
            </Text>
            <View style={[styles.chartCanvas, { minHeight: chartHeight + 8 }]}>
              <VictoryChart
                width={chartWidth}
                height={chartHeight}
                theme={VictoryTheme.material}
                domain={{
                  x: [1, Math.max(1, orderChartData.length)],
                  y: [orderDomainMinY, orderDomainMaxY],
                }}
                domainPadding={{ x: isCompact ? 18 : 26, y: 16 }}
                padding={{ top: 18, bottom: 46, left: 52, right: 20 }}
              >
                <VictoryAxis
                  tickValues={xTickValues}
                  tickFormat={(tick) => {
                    const index = Number(tick) - 1;
                    return orderChartData[index]?.label ?? "";
                  }}
                  style={{
                    axis: { stroke: colors.cardBorder },
                    tickLabels: { fill: colors.textSecondary, fontSize: isCompact ? 9 : 10, padding: 8 },
                    grid: { stroke: `${colors.cardBorder}40` },
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  tickFormat={(tick) => {
                    const value = Number(tick);
                    return value < 0 ? "" : `${Math.round(value)}`;
                  }}
                  style={{
                    axis: { stroke: colors.cardBorder },
                    tickLabels: { fill: colors.textSecondary, fontSize: isCompact ? 9 : 10, padding: 6 },
                    grid: { stroke: `${colors.cardBorder}40` },
                  }}
                />
                <VictoryBar
                  data={orderChartData}
                  style={{
                    data: {
                      fill: ({ datum }: any) => {
                        const isFocused =
                          activeOrderPoint &&
                          activeOrderPoint.x === String(datum?.label ?? datum?.x) &&
                          activeOrderPoint.y === Number(datum?.y ?? 0);
                        return isFocused ? colors.primaryPurple : colors.neonGreen;
                      },
                      width: ({ datum }: any) => {
                        const isFocused =
                          activeOrderPoint &&
                          activeOrderPoint.x === String(datum?.label ?? datum?.x) &&
                          activeOrderPoint.y === Number(datum?.y ?? 0);
                        return isFocused ? orderBarWidth + 4 : orderBarWidth;
                      },
                    },
                  }}
                  cornerRadius={4}
                  events={[
                    {
                      target: "data",
                      eventHandlers: {
                        onMouseOver: (_event: any, props: any) => {
                          const datum = props?.datum;
                          if (datum) {
                            setActiveOrderPoint({
                              x: String(datum.label ?? datum.x),
                              y: Number(datum.y),
                            });
                          }
                          return [];
                        },
                        onMouseOut: () => {
                          setActiveOrderPoint(null);
                          return [];
                        },
                        onPressIn: (_event: any, props: any) => {
                          const datum = props?.datum;
                          if (datum) {
                            setActiveOrderPoint({
                              x: String(datum.label ?? datum.x),
                              y: Number(datum.y),
                            });
                          }
                          return [];
                        },
                      },
                    },
                  ]}
                />
                <VictoryScatter
                  data={orderChartData}
                  size={({ datum }: any) => {
                    const isFocused =
                      activeOrderPoint &&
                      activeOrderPoint.x === String(datum?.label ?? datum?.x) &&
                      activeOrderPoint.y === Number(datum?.y ?? 0);
                    if (isFocused) {
                      return 6;
                    }
                    return Number(datum?.y ?? 0) > 0 ? 4 : 3;
                  }}
                  style={{
                    data: {
                      fill: ({ datum }: any) => {
                        const isFocused =
                          activeOrderPoint &&
                          activeOrderPoint.x === String(datum?.label ?? datum?.x) &&
                          activeOrderPoint.y === Number(datum?.y ?? 0);
                        if (isFocused) {
                          return colors.primaryPurple;
                        }
                        return Number(datum?.y ?? 0) > 0 ? colors.neonGreen : `${colors.neonGreen}55`;
                      },
                      stroke: colors.cardBgFrom,
                      strokeWidth: 1.5,
                    },
                  }}
                />
              </VictoryChart>
            </View>
            <View style={[styles.chartInfoBox, { borderColor: colors.cardBorder, backgroundColor: `${colors.inputBgTo}80` }]}>
              <Text style={[styles.chartInfoText, { color: colors.textSecondary }]}>
                {activeOrderPoint
                  ? `${activeOrderPoint.x} - ${activeOrderPoint.y} ${t('Orders')}`
                  : t('Hover or tap a bar to inspect values')}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Activities */}
        <Card mode="outlined" style={[styles.activitiesCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}> 
          <Card.Content style={styles.activitiesCardContent}>
            <Text style={[styles.chartTitle, { color: colors.neonGreen }, isCompact && styles.chartTitleCompact]}>
              {t('Recent Activities')}
            </Text>
            {activities.length === 0 ? (
              <View
                style={[
                  styles.activityItem,
                  { backgroundColor: colors.inputBgTo, borderColor: `${colors.cardBorder}50` },
                  isCompact && styles.activityItemCompact,
                ]}
              > 
                <View style={styles.activityLeft}>
                  <View style={[styles.activityDot, { backgroundColor: colors.neonGreen }]} />
                  <Text style={[styles.activityText, { color: colors.textSecondary }]}>{t('No recent activity')}</Text>
                </View>
                <Text style={[styles.activityTime, { color: colors.textMuted }]}>-</Text>
              </View>
            ) : (
              activities.map((activity, index) => (
                <View
                  key={index}
                  style={[
                    styles.activityItem,
                    { backgroundColor: colors.inputBgTo, borderColor: `${colors.cardBorder}50` },
                    isCompact && styles.activityItemCompact,
                  ]}
                >
                  <View style={styles.activityLeft}>
                    <View style={[styles.activityDot, { backgroundColor: colors.neonGreen }]} />
                    <Text style={[styles.activityText, { color: colors.textSecondary }]}>{t(activity.action)}</Text>
                  </View>
                  <Text style={[styles.activityTime, { color: colors.textMuted }]}>{t(activity.time)}</Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
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
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6,
    lineHeight: 36,
  },
  titleCompact: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 10,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  headerLine: {
    height: 6,
    width: 132,
    borderRadius: 999,
  },
  banner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  statsGridCompact: {
    flexDirection: "column",
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 8,
  },
  statCardCompact: {
    minWidth: 0,
    width: "100%",
  },
  statCardContent: {
    padding: 16,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  changeText: {
    fontSize: 12,
  },
  statTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
  },
  statValueCompact: {
    fontSize: 20,
  },
  chartCard: {
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  chartCardSized: {
    width: "100%",
    maxWidth: 1400,
    alignSelf: "center",
  },
  chartCardContent: {
    padding: 16,
    alignItems: "stretch",
  },
  chartCanvas: {
    width: "100%",
    minHeight: 260,
    alignItems: "stretch",
    justifyContent: "center",
  },
  chartTitle: {
    fontSize: 18,
    marginBottom: 16,
    letterSpacing: 1,
    textAlign: "center",
  },
  chartTitleCompact: {
    fontSize: 16,
    marginBottom: 12,
  },
  chartInfoBox: {
    width: "100%",
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chartInfoText: {
    fontSize: 12,
  },
  activitiesCard: {
    borderRadius: 8,
    marginBottom: 16,
  },
  activitiesCardContent: {
    padding: 16,
  },
  activityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  activityItemCompact: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityText: {
    fontSize: 12,
    flex: 1,
  },
  activityTime: {
    fontSize: 10,
  },
});
