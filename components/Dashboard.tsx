import React, { useMemo } from "react";
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
  buildCategoryData,
  buildCreatedAtSeries,
  buildDashboardTotals,
  buildMonthlyBuckets,
  buildOrderDateSeries,
} from "../utils/dashboard/metrics";
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryPie,
  VictoryAxis,
  VictoryTheme,
  VictoryLabel,
} from "victory-native";

export function Dashboard() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { client, isAuthenticated, loading: authLoading, currency, enterpriseId } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { width, isCompact, isTablet, contentPadding, cardGap } = useResponsive();
  const chartWidth = Math.min(Math.max(width - contentPadding * 2 - 8, 260), isTablet ? 420 : 360);
  const chartHeight = isCompact ? 220 : 250;
  const pieRadius = Math.min(chartWidth / 2 - 12, isCompact ? 90 : 115);
  const pieInnerRadius = Math.round(pieRadius * 0.6);

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

  const categoryData = useMemo(() => buildCategoryData(products), [products]);

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
        fullScreen
        label={t('Synchronizing EVA-01')}
        subtitle={t('LCL circulation nominal - Loading dashboard...')}
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}> 
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
        <Card mode="outlined" style={[styles.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
          <Card.Content style={styles.chartCardContent}>
            <Text style={[styles.chartTitle, { color: colors.neonGreen }, isCompact && styles.chartTitleCompact]}>
              {t('Product Analytics')}
            </Text>
            <VictoryChart
              width={chartWidth}
              height={chartHeight}
              theme={VictoryTheme.material}
            >
              <VictoryAxis
                style={{
                  axis: { stroke: colors.cardBorder },
                  tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                  grid: { stroke: `${colors.cardBorder}40` },
                }}
              />
              <VictoryAxis
                dependentAxis
                style={{
                  axis: { stroke: colors.cardBorder },
                  tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                  grid: { stroke: `${colors.cardBorder}40` },
                }}
              />
              <VictoryLine
                data={productData}
                style={{ data: { stroke: colors.primaryPurple, strokeWidth: 3 } }}
              />
            </VictoryChart>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[styles.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}> 
          <Card.Content style={styles.chartCardContent}>
            <Text style={[styles.chartTitle, { color: colors.neonGreen }, isCompact && styles.chartTitleCompact]}>
              {t('Order Volume')}
            </Text>
            <VictoryChart
              width={chartWidth}
              height={chartHeight}
              theme={VictoryTheme.material}
            >
              <VictoryAxis
                style={{
                  axis: { stroke: colors.cardBorder },
                  tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                  grid: { stroke: `${colors.cardBorder}40` },
                }}
              />
              <VictoryAxis
                dependentAxis
                style={{
                  axis: { stroke: colors.cardBorder },
                  tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                  grid: { stroke: `${colors.cardBorder}40` },
                }}
              />
              <VictoryBar
                data={orderData}
                style={{ data: { fill: colors.neonGreen, width: isCompact ? 12 : 18 } }}
                cornerRadius={4}
              />
            </VictoryChart>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[styles.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}> 
          <Card.Content style={styles.chartCardContent}>
            <Text style={[styles.chartTitle, { color: colors.neonGreen }, isCompact && styles.chartTitleCompact]}>
              {t('Product Distribution')}
            </Text>
            <VictoryPie
              data={categoryData}
              width={chartWidth}
              height={chartHeight}
              radius={pieRadius}
              colorScale={[
                colors.primaryPurple,
                colors.secondaryPurple,
                colors.neonGreen,
                colors.accentOrange,
                "#ff4f7d",
              ]}
              padAngle={3}
              innerRadius={pieInnerRadius}
              labels={({ datum }) => `${datum.x}\n${datum.y}%`}
              labelPlacement="parallel"
              style={{
                data: {
                  stroke: colors.cardBorder,
                  strokeWidth: 2,
                },
                labels: {
                  fill: colors.textPrimary,
                  fontSize: 11,
                  fontWeight: "700",
                  textAnchor: "middle",
                },
              }}
              labelRadius={({ innerRadius, radius }) => {
                const safeInner = typeof innerRadius === 'number' ? innerRadius : 70;
                const safeRadius = typeof radius === 'number' ? radius : 115;
                return safeInner + (safeRadius - safeInner) * 0.55;
              }}
              labelComponent={<VictoryLabel lineHeight={1.4} />}
            />
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
  },
  chartCardContent: {
    padding: 16,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 18,
    marginBottom: 16,
    letterSpacing: 1,
  },
  chartTitleCompact: {
    fontSize: 16,
    marginBottom: 12,
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
