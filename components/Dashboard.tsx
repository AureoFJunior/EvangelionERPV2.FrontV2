import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { ErpService, Order as OrderModel, Product as ProductModel } from "../services/erpService";
import { NervLoader } from "./NervLoader";
import { useResponsive } from "../hooks/useResponsive";
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryPie,
  VictoryAxis,
  VictoryTheme,
  VictoryLabel,
} from "victory-native";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatRelativeTime = (date: Date) => {
  const diffMs = Date.now() - date.getTime();
  if (diffMs <= 0) {
    return "just now";
  }
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const buildChange = (current: number, previous: number) => {
  if (previous <= 0) {
    const text = current > 0 ? "+100%" : "0%";
    return { text, isPositive: current >= 0 };
  }
  const percent = ((current - previous) / previous) * 100;
  return {
    text: `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`,
    isPositive: percent >= 0,
  };
};

export function Dashboard() {
  const { colors } = useTheme();
  const { client, isAuthenticated, loading: authLoading } = useAuth();
  const erpService = useMemo(() => new ErpService(client), [client]);
  const { width, isCompact, isTablet, contentPadding, cardGap } = useResponsive();
  const chartWidth = Math.min(Math.max(width - contentPadding * 2 - 8, 260), isTablet ? 420 : 360);
  const chartHeight = isCompact ? 220 : 250;
  const pieRadius = Math.min(chartWidth / 2 - 12, isCompact ? 90 : 115);
  const pieInnerRadius = Math.round(pieRadius * 0.6);

  const [products, setProducts] = useState<ProductModel[]>([]);
  const [orders, setOrders] = useState<OrderModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setErrorMessage(null);

      const [productsResponse, ordersResponse] = await Promise.all([
        erpService.fetchProducts(),
        erpService.fetchOrders(),
      ]);

      if (!active) {
        return;
      }

      let nextError: string | null = null;

      if (productsResponse.ok && productsResponse.data) {
        setProducts(productsResponse.data);
      } else {
        setProducts([]);
        nextError = productsResponse.error ?? "Unable to load products";
      }

      if (ordersResponse.ok && ordersResponse.data) {
        setOrders(ordersResponse.data);
      } else {
        setOrders([]);
        if (!nextError) {
          nextError = ordersResponse.error ?? "Unable to load orders";
        }
      }

      setErrorMessage(nextError);
      setLoading(false);
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [erpService, isAuthenticated, authLoading]);

  const monthlyBuckets = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, index) => {
      const offset = 5 - index;
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      return {
        label: monthLabels[date.getMonth()],
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    });
  }, []);

  const productData = useMemo(
    () =>
      monthlyBuckets.map((bucket) => {
        const count = products.filter((product) => {
          const created = parseDate(product.createdAt ?? "");
          if (!created) {
            return false;
          }
          return created.getFullYear() === bucket.year && created.getMonth() === bucket.month;
        }).length;
        return { x: bucket.label, y: count };
      }),
    [products, monthlyBuckets],
  );

  const orderData = useMemo(
    () =>
      monthlyBuckets.map((bucket) => {
        const count = orders.filter((order) => {
          const created = parseDate(order.date ?? "");
          if (!created) {
            return false;
          }
          return created.getFullYear() === bucket.year && created.getMonth() === bucket.month;
        }).length;
        return { x: bucket.label, y: count };
      }),
    [orders, monthlyBuckets],
  );

  const categoryData = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      const category = product.category || "Uncategorized";
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });

    const total = products.length;
    if (total === 0) {
      return [{ x: "No data", y: 100 }];
    }

    return Array.from(counts.entries()).map(([category, count]) => ({
      x: category,
      y: Math.max(1, Math.round((count / total) * 100)),
    }));
  }, [products]);

  const activities = useMemo(() => {
    const events: { action: string; time: string; date: Date }[] = [];

    orders.forEach((order) => {
      const created = parseDate(order.date ?? "");
      if (!created) {
        return;
      }
      events.push({
        action: `Order #${order.id ?? "-"} received`,
        time: formatRelativeTime(created),
        date: created,
      });
    });

    products.forEach((product) => {
      const created = parseDate(product.updatedAt ?? product.createdAt ?? "");
      if (!created) {
        return;
      }
      events.push({
        action: `Product updated: ${product.name}`,
        time: formatRelativeTime(created),
        date: created,
      });
    });

    return events
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map(({ action, time }) => ({ action, time }));
  }, [orders, products]);

  const totals = useMemo(() => {
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const activeCustomers = new Set(
      orders.map((order) => order.customer).filter((customer) => typeof customer === "string"),
    ).size;
    const revenue = orders.reduce(
      (sum, order) => sum + (typeof order.total === "number" ? order.total : 0),
      0,
    );

    const now = new Date();
    const last30Start = new Date(now);
    last30Start.setDate(now.getDate() - 30);
    const prev30Start = new Date(now);
    prev30Start.setDate(now.getDate() - 60);
    const prev30End = new Date(now);
    prev30End.setDate(now.getDate() - 30);

    const isInRange = (date: Date, start: Date, end: Date) => date >= start && date < end;

    const productLast30 = products.filter((product) => {
      const created = parseDate(product.createdAt ?? "");
      return created ? isInRange(created, last30Start, now) : false;
    }).length;
    const productPrev30 = products.filter((product) => {
      const created = parseDate(product.createdAt ?? "");
      return created ? isInRange(created, prev30Start, prev30End) : false;
    }).length;

    const ordersLast30 = orders.filter((order) => {
      const created = parseDate(order.date ?? "");
      return created ? isInRange(created, last30Start, now) : false;
    }).length;
    const ordersPrev30 = orders.filter((order) => {
      const created = parseDate(order.date ?? "");
      return created ? isInRange(created, prev30Start, prev30End) : false;
    }).length;

    const customersLast30 = new Set(
      orders
        .filter((order) => {
          const created = parseDate(order.date ?? "");
          return created ? isInRange(created, last30Start, now) : false;
        })
        .map((order) => order.customer)
        .filter((customer) => typeof customer === "string"),
    ).size;

    const customersPrev30 = new Set(
      orders
        .filter((order) => {
          const created = parseDate(order.date ?? "");
          return created ? isInRange(created, prev30Start, prev30End) : false;
        })
        .map((order) => order.customer)
        .filter((customer) => typeof customer === "string"),
    ).size;

    const revenueLast30 = orders.reduce((sum, order) => {
      const created = parseDate(order.date ?? "");
      if (!created || !isInRange(created, last30Start, now)) {
        return sum;
      }
      return sum + (typeof order.total === "number" ? order.total : 0);
    }, 0);

    const revenuePrev30 = orders.reduce((sum, order) => {
      const created = parseDate(order.date ?? "");
      if (!created || !isInRange(created, prev30Start, prev30End)) {
        return sum;
      }
      return sum + (typeof order.total === "number" ? order.total : 0);
    }, 0);

    return {
      totalProducts,
      totalOrders,
      activeCustomers,
      revenue,
      productChange: buildChange(productLast30, productPrev30),
      orderChange: buildChange(ordersLast30, ordersPrev30),
      customerChange: buildChange(customersLast30, customersPrev30),
      revenueChange: buildChange(revenueLast30, revenuePrev30),
    };
  }, [products, orders]);

  const stats = [
    {
      title: "Total Products",
      value: totals.totalProducts.toLocaleString(),
      change: totals.productChange.text,
      isPositive: totals.productChange.isPositive,
      icon: "package",
    },
    {
      title: "Total Orders",
      value: totals.totalOrders.toLocaleString(),
      change: totals.orderChange.text,
      isPositive: totals.orderChange.isPositive,
      icon: "shopping-cart",
    },
    {
      title: "Active Customers",
      value: totals.activeCustomers.toLocaleString(),
      change: totals.customerChange.text,
      isPositive: totals.customerChange.isPositive,
      icon: "users",
    },
    {
      title: "Revenue",
      value: `$${Math.round(totals.revenue).toLocaleString()}`,
      change: totals.revenueChange.text,
      isPositive: totals.revenueChange.isPositive,
      icon: "dollar-sign",
    },
  ];

  if (loading) {
    return (
      <NervLoader
        fullScreen
        label="Synchronizing EVA-01"
        subtitle="LCL circulation nominal - Loading dashboard..."
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}> 
      <View style={[styles.content, { padding: contentPadding }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
            COMMAND CENTER
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
            Real-time system monitoring and analytics
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
        </View>

        {!isAuthenticated && !authLoading && (
          <View style={[styles.banner, { backgroundColor: `${colors.primaryPurple}15`, borderColor: colors.primaryPurple }]}>
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>Authenticate to load analytics.</Text>
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
            <View
              key={index}
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
                isCompact && styles.statCardCompact,
              ]}
            >
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
            </View>
          ))}
        </View>

        {/* Charts */}
        <View style={[styles.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}> 
          <Text style={[styles.chartTitle, { color: colors.neonGreen }, isCompact && styles.chartTitleCompact]}>
            Product Analytics
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
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}> 
          <Text style={[styles.chartTitle, { color: colors.neonGreen }, isCompact && styles.chartTitleCompact]}>
            Order Volume
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
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}> 
          <Text style={[styles.chartTitle, { color: colors.neonGreen }, isCompact && styles.chartTitleCompact]}>
            Product Distribution
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
            labelRadius={({ innerRadius, radius }) =>
              (innerRadius ?? 70) + ((radius ?? 115) - (innerRadius ?? 70)) * 0.55
            }
            labelComponent={<VictoryLabel lineHeight={1.4} />}
          />
        </View>

        {/* Recent Activities */}
        <View style={[styles.activitiesCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}> 
          <Text style={[styles.chartTitle, { color: colors.neonGreen }, isCompact && styles.chartTitleCompact]}>
            Recent Activities
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
                <Text style={[styles.activityText, { color: colors.textSecondary }]}>No recent activity</Text>
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
                  <Text style={[styles.activityText, { color: colors.textSecondary }]}>{activity.action}</Text>
                </View>
                <Text style={[styles.activityTime, { color: colors.textMuted }]}>{activity.time}</Text>
              </View>
            ))
          )}
        </View>
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
    fontWeight: "bold",
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
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  statCardCompact: {
    minWidth: 0,
    width: "100%",
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
    fontWeight: "bold",
  },
  statValueCompact: {
    fontSize: 20,
  },
  chartCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 16,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    letterSpacing: 1,
  },
  chartTitleCompact: {
    fontSize: 16,
    marginBottom: 12,
  },
  activitiesCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 16,
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
