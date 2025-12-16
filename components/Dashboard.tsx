import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { VictoryChart, VictoryLine, VictoryBar, VictoryPie, VictoryAxis, VictoryTheme } from 'victory-native';

export function Dashboard() {
  const { colors } = useTheme();

  const productData = [
    { x: 'Jan', y: 145 },
    { x: 'Feb', y: 178 },
    { x: 'Mar', y: 203 },
    { x: 'Apr', y: 189 },
    { x: 'May', y: 234 },
    { x: 'Jun', y: 267 },
  ];

  const orderData = [
    { x: 'Jan', y: 234 },
    { x: 'Feb', y: 289 },
    { x: 'Mar', y: 312 },
    { x: 'Apr', y: 298 },
    { x: 'May', y: 356 },
    { x: 'Jun', y: 402 },
  ];

  const categoryData = [
    { x: 'Electronics', y: 35 },
    { x: 'Clothing', y: 25 },
    { x: 'Food', y: 20 },
    { x: 'Tools', y: 15 },
    { x: 'Others', y: 5 },
  ];

  const stats = [
    {
      title: 'Total Products',
      value: '2,847',
      change: '+12.5%',
      isPositive: true,
      icon: 'package',
    },
    {
      title: 'Total Orders',
      value: '1,891',
      change: '+18.2%',
      isPositive: true,
      icon: 'shopping-cart',
    },
    {
      title: 'Active Customers',
      value: '4,352',
      change: '+8.1%',
      isPositive: true,
      icon: 'users',
    },
    {
      title: 'Revenue',
      value: '$354K',
      change: '-3.4%',
      isPositive: false,
      icon: 'dollar-sign',
    },
  ];

  const activities = [
    { action: 'New order #4521 received', time: '2 min ago' },
    { action: 'Product stock updated: EVA Unit 01 Model', time: '15 min ago' },
    { action: 'New customer registration: Misato K.', time: '1 hour ago' },
    { action: 'Order #4518 shipped', time: '2 hours ago' },
    { action: 'Report generated: Monthly Sales', time: '3 hours ago' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonGreen }]}>COMMAND CENTER</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Real-time system monitoring and analytics
          </Text>
          <View style={[styles.headerLine, { backgroundColor: colors.primaryPurple }]} />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.statHeader}>
                <View style={[styles.iconBox, { backgroundColor: `${colors.primaryPurple}20`, borderColor: colors.cardBorder }]}>
                  <Feather name={stat.icon as any} size={24} color={colors.primaryPurple} />
                </View>
                <View style={styles.changeContainer}>
                  <Feather
                    name={stat.isPositive ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={stat.isPositive ? colors.neonGreen : colors.accentOrange}
                  />
                  <Text style={[styles.changeText, { color: stat.isPositive ? colors.neonGreen : colors.accentOrange }]}>
                    {stat.change}
                  </Text>
                </View>
              </View>
              <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{stat.title}</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Charts */}
        <View style={[styles.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
          <Text style={[styles.chartTitle, { color: colors.neonGreen }]}>Product Analytics</Text>
          <VictoryChart width={350} height={250} theme={VictoryTheme.material}>
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
          <Text style={[styles.chartTitle, { color: colors.neonGreen }]}>Order Volume</Text>
          <VictoryChart width={350} height={250} theme={VictoryTheme.material}>
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
              style={{ data: { fill: colors.neonGreen, width: 18 } }}
              cornerRadius={4}
            />
          </VictoryChart>
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
          <Text style={[styles.chartTitle, { color: colors.neonGreen }]}>Product Distribution</Text>
          <VictoryPie
            data={categoryData}
            width={350}
            height={250}
            colorScale={[
              colors.primaryPurple,
              colors.secondaryPurple,
              colors.neonGreen,
              colors.accentOrange,
              '#ff4f7d',
            ]}
            padAngle={1}
            innerRadius={40}
            style={{
              labels: {
                fill: colors.textPrimary,
                fontSize: 12,
                fontWeight: '600',
              },
            }}
            labelRadius={({ innerRadius, radius }) => (innerRadius ?? 40) + ((radius ?? 120) - (innerRadius ?? 40)) * 0.6}
          />
        </View>

        {/* Recent Activities */}
        <View style={[styles.activitiesCard, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
          <Text style={[styles.chartTitle, { color: colors.neonGreen }]}>Recent Activities</Text>
          {activities.map((activity, index) => (
            <View
              key={index}
              style={[styles.activityItem, { backgroundColor: colors.inputBgTo, borderColor: `${colors.cardBorder}50` }]}
            >
              <View style={styles.activityLeft}>
                <View style={[styles.activityDot, { backgroundColor: colors.neonGreen }]} />
                <Text style={[styles.activityText, { color: colors.textSecondary }]}>{activity.action}</Text>
              </View>
              <Text style={[styles.activityTime, { color: colors.textMuted }]}>{activity.time}</Text>
            </View>
          ))}
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
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  headerLine: {
    height: 4,
    width: 100,
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
  },
  chartCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 1,
  },
  activitiesCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
