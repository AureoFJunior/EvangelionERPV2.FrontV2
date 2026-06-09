import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

export type SkeletonVariant =
  | 'generic'
  | 'dashboard'
  | 'customers'
  | 'orders'
  | 'products'
  | 'bills'
  | 'payables'
  | 'reports'
  | 'employees';

type NervLoaderProps = {
  label?: string;
  subtitle?: string;
  size?: number;
  fullScreen?: boolean;
  inline?: boolean;
  style?: ViewStyle;
  variant?: SkeletonVariant;
};

type SkeletonBlockProps = {
  baseColor: string;
  highlightColor: string;
  reduceMotionEnabled: boolean;
  shimmerTranslate: Animated.AnimatedInterpolation<string | number>;
  style: ViewStyle;
};

function SkeletonBlock({
  baseColor,
  highlightColor,
  reduceMotionEnabled,
  shimmerTranslate,
  style,
}: SkeletonBlockProps) {
  return (
    <View style={[styles.block, style, { backgroundColor: baseColor }]}>
      {!reduceMotionEnabled && (
        <Animated.View style={[styles.shimmerTrack, { transform: [{ translateX: shimmerTranslate }] }]}>
          <LinearGradient
            colors={['transparent', highlightColor, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      )}
    </View>
  );
}

type SkeletonPalette = {
  base: string;
  highlight: string;
  cardBackground: string;
  borderColor: string;
};

type CommonSkeletonProps = {
  reduceMotionEnabled: boolean;
  shimmerTranslate: Animated.AnimatedInterpolation<string | number>;
  palette: SkeletonPalette;
};

function HeaderSkeleton({ reduceMotionEnabled, shimmerTranslate, palette }: CommonSkeletonProps) {
  return (
    <View style={styles.headerSkeleton}>
      <SkeletonBlock
        style={styles.headerTitle}
        baseColor={palette.base}
        highlightColor={palette.highlight}
        reduceMotionEnabled={reduceMotionEnabled}
        shimmerTranslate={shimmerTranslate}
      />
      <SkeletonBlock
        style={styles.headerSubtitle}
        baseColor={palette.base}
        highlightColor={palette.highlight}
        reduceMotionEnabled={reduceMotionEnabled}
        shimmerTranslate={shimmerTranslate}
      />
    </View>
  );
}

function ToolbarSkeleton({
  reduceMotionEnabled,
  shimmerTranslate,
  palette,
  compact = false,
}: CommonSkeletonProps & { compact?: boolean }) {
  return (
    <View style={[styles.toolbarSkeleton, compact && styles.toolbarSkeletonCompact]}>
      <SkeletonBlock
        style={compact ? styles.toolbarSearchCompact : styles.toolbarSearch}
        baseColor={palette.base}
        highlightColor={palette.highlight}
        reduceMotionEnabled={reduceMotionEnabled}
        shimmerTranslate={shimmerTranslate}
      />
      <SkeletonBlock
        style={styles.toolbarButton}
        baseColor={palette.base}
        highlightColor={palette.highlight}
        reduceMotionEnabled={reduceMotionEnabled}
        shimmerTranslate={shimmerTranslate}
      />
    </View>
  );
}

function ListCardSkeleton({
  reduceMotionEnabled,
  shimmerTranslate,
  palette,
  withMedia = false,
  withActions = false,
}: CommonSkeletonProps & { withMedia?: boolean; withActions?: boolean }) {
  return (
    <View style={[styles.cardSkeleton, { borderColor: palette.borderColor, backgroundColor: palette.cardBackground }]}>
      {withMedia && (
        <SkeletonBlock
          style={styles.cardMedia}
          baseColor={palette.base}
          highlightColor={palette.highlight}
          reduceMotionEnabled={reduceMotionEnabled}
          shimmerTranslate={shimmerTranslate}
        />
      )}
      <SkeletonBlock
        style={styles.cardTitle}
        baseColor={palette.base}
        highlightColor={palette.highlight}
        reduceMotionEnabled={reduceMotionEnabled}
        shimmerTranslate={shimmerTranslate}
      />
      <SkeletonBlock
        style={styles.cardSubtitle}
        baseColor={palette.base}
        highlightColor={palette.highlight}
        reduceMotionEnabled={reduceMotionEnabled}
        shimmerTranslate={shimmerTranslate}
      />
      <View style={styles.cardMetaRow}>
        <SkeletonBlock
          style={styles.cardMetaItem}
          baseColor={palette.base}
          highlightColor={palette.highlight}
          reduceMotionEnabled={reduceMotionEnabled}
          shimmerTranslate={shimmerTranslate}
        />
        <SkeletonBlock
          style={styles.cardMetaItem}
          baseColor={palette.base}
          highlightColor={palette.highlight}
          reduceMotionEnabled={reduceMotionEnabled}
          shimmerTranslate={shimmerTranslate}
        />
        <SkeletonBlock
          style={styles.cardMetaItem}
          baseColor={palette.base}
          highlightColor={palette.highlight}
          reduceMotionEnabled={reduceMotionEnabled}
          shimmerTranslate={shimmerTranslate}
        />
      </View>
      {withActions && (
        <View style={styles.cardActionsRow}>
          <SkeletonBlock
            style={styles.actionButtonSkeleton}
            baseColor={palette.base}
            highlightColor={palette.highlight}
            reduceMotionEnabled={reduceMotionEnabled}
            shimmerTranslate={shimmerTranslate}
          />
          <SkeletonBlock
            style={styles.actionButtonSkeleton}
            baseColor={palette.base}
            highlightColor={palette.highlight}
            reduceMotionEnabled={reduceMotionEnabled}
            shimmerTranslate={shimmerTranslate}
          />
        </View>
      )}
    </View>
  );
}

function KpiCardSkeleton({ palette, ...blockProps }: CommonSkeletonProps) {
  return (
    <View style={[styles.statCard, { borderColor: palette.borderColor, backgroundColor: palette.cardBackground }]}>
      <SkeletonBlock style={styles.statIcon} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
      <SkeletonBlock style={styles.statValue} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
      <SkeletonBlock style={styles.statLabel} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
    </View>
  );
}

function ChartCardSkeleton({ palette, ...blockProps }: CommonSkeletonProps & { flex?: number }) {
  return (
    <View style={[styles.chartCardSkeleton, { borderColor: palette.borderColor, backgroundColor: palette.cardBackground }]}>
      <SkeletonBlock style={styles.chartCardTitle} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
      <SkeletonBlock style={styles.chartCardSubtitle} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
      <SkeletonBlock style={styles.chartArea} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
    </View>
  );
}

function TableRowSkeleton({ palette, ...blockProps }: CommonSkeletonProps) {
  return (
    <View style={[styles.tableRow, { borderBottomColor: palette.borderColor }]}>
      <SkeletonBlock style={styles.tableCell} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
      <SkeletonBlock style={styles.tableCellMd} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
      <SkeletonBlock style={styles.tableCellSm} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
      <SkeletonBlock style={styles.tableCellBadge} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
    </View>
  );
}

function SummaryCardSkeleton({ palette, ...blockProps }: CommonSkeletonProps) {
  return (
    <View style={[styles.summaryCard, { borderColor: palette.borderColor, backgroundColor: palette.cardBackground }]}>
      <SkeletonBlock style={styles.summaryLabel} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
      <SkeletonBlock style={styles.summaryValue} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
    </View>
  );
}

function SegmentedControlSkeleton({ palette, ...blockProps }: CommonSkeletonProps & { count?: number }) {
  return (
    <View style={styles.segmentedRow}>
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonBlock key={i} style={styles.segmentedTab} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
      ))}
    </View>
  );
}

function Block({ style, palette, ...blockProps }: CommonSkeletonProps & { style: ViewStyle }) {
  return <SkeletonBlock style={style} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />;
}

function PaginationSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.paginationRow}>
      <Block style={styles.paginationBtn} {...props} />
      <Block style={styles.paginationLabel} {...props} />
      <Block style={styles.paginationBtn} {...props} />
    </View>
  );
}

function DashboardSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <View style={styles.headerWithActions}>
        <HeaderSkeleton {...props} />
        <View style={styles.headerBtnRow}>
          <Block style={styles.headerActionBtn} {...props} />
          <Block style={styles.headerActionBtn} {...props} />
        </View>
      </View>
      <View style={styles.statsGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} {...props} />
        ))}
      </View>
      <View style={styles.chartRow}>
        <View style={[styles.chartCardSkeleton, { flex: 2, borderColor: props.palette.borderColor, backgroundColor: props.palette.cardBackground }]}>
          <Block style={styles.chartCardTitle} {...props} />
          <Block style={styles.chartCardSubtitle} {...props} />
          <Block style={styles.chartArea} {...props} />
        </View>
        <View style={[styles.chartCardSkeleton, { flex: 1, borderColor: props.palette.borderColor, backgroundColor: props.palette.cardBackground }]}>
          <Block style={styles.chartCardTitle} {...props} />
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} style={styles.statusBarSkeleton} {...props} />
          ))}
        </View>
      </View>
      <View style={styles.chartRow}>
        <View style={[styles.chartCardSkeleton, { flex: 2, borderColor: props.palette.borderColor, backgroundColor: props.palette.cardBackground }]}>
          <Block style={styles.chartCardTitle} {...props} />
          <Block style={styles.chartCardSubtitle} {...props} />
          <Block style={styles.chartArea} {...props} />
        </View>
        <View style={[styles.chartCardSkeleton, { flex: 1, borderColor: props.palette.borderColor, backgroundColor: props.palette.cardBackground }]}>
          <Block style={styles.chartCardTitle} {...props} />
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.activityRowSkeleton}>
              <Block style={styles.activityDot} {...props} />
              <View style={styles.activityLines}>
                <Block style={styles.activityLine} {...props} />
                <Block style={styles.activityLineSm} {...props} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function CustomersSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <View style={styles.headerWithActions}>
        <HeaderSkeleton {...props} />
        <View style={styles.headerBtnRow}>
          <Block style={styles.headerActionBtn} {...props} />
          <Block style={styles.headerActionBtn} {...props} />
        </View>
      </View>
      <ToolbarSkeleton {...props} compact />
      <SegmentedControlSkeleton {...props} />
      <PaginationSkeleton {...props} />
      {Array.from({ length: 3 }).map((_, i) => (
        <ListCardSkeleton key={i} {...props} />
      ))}
    </View>
  );
}

function ProductCardSkeleton({ palette, ...blockProps }: CommonSkeletonProps) {
  return (
    <View style={[styles.productCard, { borderColor: palette.borderColor, backgroundColor: palette.cardBackground }]}>
      <SkeletonBlock style={styles.productImage} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
      <View style={styles.productCardBody}>
        <SkeletonBlock style={styles.productName} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
        <SkeletonBlock style={styles.productCategory} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
        <View style={styles.productMetaRow}>
          <SkeletonBlock style={styles.productPrice} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
          <SkeletonBlock style={styles.productBadge} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
        </View>
        <View style={styles.cardActionsRow}>
          <SkeletonBlock style={styles.productActionBtn} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
          <SkeletonBlock style={styles.productActionBtn} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
          <SkeletonBlock style={styles.productActionBtn} baseColor={palette.base} highlightColor={palette.highlight} {...blockProps} />
        </View>
      </View>
    </View>
  );
}

function ProductsSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <HeaderSkeleton {...props} />
      <ToolbarSkeleton {...props} compact />
      <View style={styles.filterRowSkeleton}>
        <SegmentedControlSkeleton {...props} />
        <SkeletonBlock style={styles.filterDropdownSkeleton} baseColor={props.palette.base} highlightColor={props.palette.highlight} reduceMotionEnabled={props.reduceMotionEnabled} shimmerTranslate={props.shimmerTranslate} />
      </View>
      <View style={styles.paginationRow}>
        <SkeletonBlock style={styles.paginationBtn} baseColor={props.palette.base} highlightColor={props.palette.highlight} reduceMotionEnabled={props.reduceMotionEnabled} shimmerTranslate={props.shimmerTranslate} />
        <SkeletonBlock style={styles.paginationLabel} baseColor={props.palette.base} highlightColor={props.palette.highlight} reduceMotionEnabled={props.reduceMotionEnabled} shimmerTranslate={props.shimmerTranslate} />
        <SkeletonBlock style={styles.paginationBtn} baseColor={props.palette.base} highlightColor={props.palette.highlight} reduceMotionEnabled={props.reduceMotionEnabled} shimmerTranslate={props.shimmerTranslate} />
      </View>
      <View style={styles.productGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} {...props} />
        ))}
      </View>
    </View>
  );
}

function OrderCardSkeleton({ palette, ...blockProps }: CommonSkeletonProps) {
  return (
    <View style={[styles.cardSkeleton, { borderColor: palette.borderColor, backgroundColor: palette.cardBackground }]}>
      <View style={styles.orderCardHeader}>
        <Block style={styles.orderIdBlock} palette={palette} {...blockProps} />
        <Block style={styles.tableCellBadge} palette={palette} {...blockProps} />
      </View>
      <Block style={styles.cardTitle} palette={palette} {...blockProps} />
      <View style={styles.cardMetaRow}>
        <Block style={styles.cardMetaItem} palette={palette} {...blockProps} />
        <Block style={styles.cardMetaItem} palette={palette} {...blockProps} />
      </View>
      <View style={styles.cardMetaRow}>
        <Block style={styles.cardMetaItem} palette={palette} {...blockProps} />
        <Block style={styles.orderAmountBlock} palette={palette} {...blockProps} />
      </View>
      <View style={styles.cardActionsRow}>
        <Block style={styles.actionButtonSkeleton} palette={palette} {...blockProps} />
        <Block style={styles.actionButtonSkeleton} palette={palette} {...blockProps} />
      </View>
    </View>
  );
}

function OrdersSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <View style={styles.headerWithActions}>
        <HeaderSkeleton {...props} />
        <View style={styles.headerBtnRow}>
          <Block style={styles.headerActionBtn} {...props} />
          <Block style={styles.headerActionBtn} {...props} />
        </View>
      </View>
      <ToolbarSkeleton {...props} />
      <View style={styles.segmentedRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Block key={i} style={styles.segmentedTab} {...props} />
        ))}
      </View>
      <Block style={styles.dateRangeSkeleton} {...props} />
      <PaginationSkeleton {...props} />
      {Array.from({ length: 3 }).map((_, i) => (
        <OrderCardSkeleton key={i} {...props} />
      ))}
    </View>
  );
}

function BillsTableRowSkeleton({ palette, ...blockProps }: CommonSkeletonProps) {
  return (
    <View style={[styles.tableRow, { borderBottomColor: palette.borderColor }]}>
      <Block style={styles.tableCell} palette={palette} {...blockProps} />
      <Block style={styles.tableCellMd} palette={palette} {...blockProps} />
      <Block style={styles.tableCellSm} palette={palette} {...blockProps} />
      <Block style={styles.tableCellSm} palette={palette} {...blockProps} />
      <Block style={styles.tableCellSm} palette={palette} {...blockProps} />
      <Block style={styles.tableCellBadge} palette={palette} {...blockProps} />
    </View>
  );
}

function BillsSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <View style={styles.headerWithActions}>
        <HeaderSkeleton {...props} />
        <View style={styles.headerBtnRow}>
          <Block style={styles.headerActionBtn} {...props} />
          <Block style={styles.headerActionBtn} {...props} />
        </View>
      </View>
      <View style={styles.statsGrid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SummaryCardSkeleton key={i} {...props} />
        ))}
      </View>
      <ToolbarSkeleton {...props} />
      <PaginationSkeleton {...props} />
      {Array.from({ length: 5 }).map((_, i) => (
        <BillsTableRowSkeleton key={i} {...props} />
      ))}
    </View>
  );
}

function PayableCardSkeleton({ palette, ...blockProps }: CommonSkeletonProps) {
  return (
    <View style={[styles.cardSkeleton, { borderColor: palette.borderColor, backgroundColor: palette.cardBackground }]}>
      <View style={styles.payableCardRow}>
        <Block style={styles.payableIcon} palette={palette} {...blockProps} />
        <View style={styles.payableInfo}>
          <Block style={styles.cardTitle} palette={palette} {...blockProps} />
          <Block style={styles.cardSubtitle} palette={palette} {...blockProps} />
        </View>
        <Block style={styles.orderAmountBlock} palette={palette} {...blockProps} />
        <Block style={styles.tableCellBadge} palette={palette} {...blockProps} />
      </View>
    </View>
  );
}

function PayablesSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <View style={styles.headerWithActions}>
        <HeaderSkeleton {...props} />
        <Block style={styles.headerActionBtn} {...props} />
      </View>
      <SummaryCardSkeleton {...props} />
      <ToolbarSkeleton {...props} />
      <SegmentedControlSkeleton {...props} />
      <PaginationSkeleton {...props} />
      {Array.from({ length: 4 }).map((_, i) => (
        <PayableCardSkeleton key={i} {...props} />
      ))}
    </View>
  );
}

function ReportsTableRowSkeleton({ palette, ...blockProps }: CommonSkeletonProps) {
  return (
    <View style={[styles.tableRow, { borderBottomColor: palette.borderColor }]}>
      <Block style={styles.tableCell} palette={palette} {...blockProps} />
      <Block style={styles.tableCellSm} palette={palette} {...blockProps} />
      <Block style={styles.tableCellSm} palette={palette} {...blockProps} />
      <Block style={styles.paginationBtn} palette={palette} {...blockProps} />
    </View>
  );
}

function ReportsSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <View style={styles.headerWithActions}>
        <HeaderSkeleton {...props} />
        <View style={styles.headerBtnRow}>
          <View style={styles.segmentedRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Block key={i} style={styles.segmentedTab} {...props} />
            ))}
          </View>
          <Block style={styles.headerActionBtn} {...props} />
        </View>
      </View>
      <View style={styles.statsGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} {...props} />
        ))}
      </View>
      {Array.from({ length: 4 }).map((_, i) => (
        <ReportsTableRowSkeleton key={i} {...props} />
      ))}
    </View>
  );
}

function EmployeeCardSkeleton({ palette, ...blockProps }: CommonSkeletonProps) {
  return (
    <View style={[styles.employeeCard, { borderColor: palette.borderColor, backgroundColor: palette.cardBackground }]}>
      <Block style={styles.employeeAvatar} palette={palette} {...blockProps} />
      <Block style={styles.employeeName} palette={palette} {...blockProps} />
      <Block style={styles.employeeRole} palette={palette} {...blockProps} />
      <View style={styles.cardMetaRow}>
        <Block style={styles.cardMetaItem} palette={palette} {...blockProps} />
        <Block style={styles.cardMetaItem} palette={palette} {...blockProps} />
      </View>
    </View>
  );
}

function EmployeesSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <HeaderSkeleton {...props} />
      <ToolbarSkeleton {...props} compact />
      {Array.from({ length: 2 }).map((_, gi) => (
        <View key={gi} style={styles.deptGroup}>
          <View style={styles.deptHeader}>
            <Block style={styles.deptLabel} {...props} />
            <Block style={styles.deptBadge} {...props} />
            <View style={[styles.deptLine, { backgroundColor: props.palette.base }]} />
          </View>
          <View style={styles.employeeGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <EmployeeCardSkeleton key={i} {...props} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function CompactListSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <HeaderSkeleton {...props} />
      <ToolbarSkeleton {...props} />
      {Array.from({ length: 3 }).map((_, i) => (
        <ListCardSkeleton key={i} {...props} />
      ))}
    </View>
  );
}

function PanelSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.panelSkeleton}>
      <SkeletonBlock
        style={styles.panelTitle}
        baseColor={props.palette.base}
        highlightColor={props.palette.highlight}
        reduceMotionEnabled={props.reduceMotionEnabled}
        shimmerTranslate={props.shimmerTranslate}
      />
      <SkeletonBlock
        style={styles.panelLine}
        baseColor={props.palette.base}
        highlightColor={props.palette.highlight}
        reduceMotionEnabled={props.reduceMotionEnabled}
        shimmerTranslate={props.shimmerTranslate}
      />
      <SkeletonBlock
        style={styles.panelLineShort}
        baseColor={props.palette.base}
        highlightColor={props.palette.highlight}
        reduceMotionEnabled={props.reduceMotionEnabled}
        shimmerTranslate={props.shimmerTranslate}
      />
    </View>
  );
}

export function NervLoader({
  label,
  subtitle,
  size = 200,
  fullScreen = false,
  inline = false,
  style,
  variant = 'generic',
}: NervLoaderProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const shimmer = useRef(new Animated.Value(0)).current;
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  const resolvedLabel = label ?? t('Loading...');
  const resolvedSubtitle = subtitle ?? t('Please wait while data is synchronized.');

  const palette = useMemo(
    () => ({
      base: colors.cardBgTo,
      highlight: `${colors.textPrimary}24`,
      cardBackground: colors.cardBgFrom,
      borderColor: colors.cardBorder,
    }),
    [colors.cardBgFrom, colors.cardBgTo, colors.cardBorder, colors.textPrimary],
  );

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReduceMotionEnabled(enabled);
        }
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotionEnabled(enabled);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      shimmer.stopAnimation();
      shimmer.setValue(0);
      return;
    }

    shimmer.setValue(0);
    const shimmerDuration = fullScreen ? 1800 : 1350;
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: shimmerDuration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    shimmerLoop.start();

    return () => {
      shimmerLoop.stop();
    };
  }, [reduceMotionEnabled, shimmer]);

  const shimmerDistance = fullScreen ? 960 : Math.max(size * 1.9, 420);
  const shimmerTranslate = useMemo(
    () =>
      shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-140, shimmerDistance],
      }),
    [shimmer, shimmerDistance],
  );

  const commonProps: CommonSkeletonProps = {
    reduceMotionEnabled,
    shimmerTranslate,
    palette,
  };

  const renderInline = () => (
    <View style={styles.inlineSkeleton}>
      <SkeletonBlock
        style={styles.inlineAvatar}
        baseColor={palette.base}
        highlightColor={palette.highlight}
        reduceMotionEnabled={reduceMotionEnabled}
        shimmerTranslate={shimmerTranslate}
      />
      <View style={styles.inlineLines}>
        <SkeletonBlock
          style={styles.inlineLinePrimary}
          baseColor={palette.base}
          highlightColor={palette.highlight}
          reduceMotionEnabled={reduceMotionEnabled}
          shimmerTranslate={shimmerTranslate}
        />
        <SkeletonBlock
          style={styles.inlineLineSecondary}
          baseColor={palette.base}
          highlightColor={palette.highlight}
          reduceMotionEnabled={reduceMotionEnabled}
          shimmerTranslate={shimmerTranslate}
        />
      </View>
    </View>
  );

  const renderPage = () => {
    if (!fullScreen) {
      return <PanelSkeleton {...commonProps} />;
    }

    switch (variant) {
      case 'dashboard':
        return <DashboardSkeleton {...commonProps} />;
      case 'customers':
        return <CustomersSkeleton {...commonProps} />;
      case 'orders':
        return <OrdersSkeleton {...commonProps} />;
      case 'products':
        return <ProductsSkeleton {...commonProps} />;
      case 'bills':
        return <BillsSkeleton {...commonProps} />;
      case 'payables':
        return <PayablesSkeleton {...commonProps} />;
      case 'reports':
        return <ReportsSkeleton {...commonProps} />;
      case 'employees':
        return <EmployeesSkeleton {...commonProps} />;
      case 'generic':
      default:
        return <CompactListSkeleton {...commonProps} />;
    }
  };

  return (
    <View
      style={[
        styles.loadingWrap,
        fullScreen && styles.fullScreen,
        inline && styles.inlineWrap,
        { backgroundColor: inline ? 'transparent' : colors.appBg },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={resolvedLabel}
    >
      {inline ? renderInline() : renderPage()}

      <View style={[styles.textBlock, inline && styles.inlineTextBlock]}>
        {!!resolvedLabel && (
          <Text style={[styles.loadingTitle, inline && styles.inlineTitle, { color: colors.textPrimary }]}>
            {resolvedLabel}
          </Text>
        )}
        {!!resolvedSubtitle && (
          <Text style={[styles.loadingSubtitle, inline && styles.inlineSubtitle, { color: colors.textSecondary }]}>
            {resolvedSubtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  fullScreen: {
    flex: 1,
    minHeight: 420,
  },
  inlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  pageSkeleton: {
    width: '100%',
    maxWidth: 940,
    gap: 14,
  },
  panelSkeleton: {
    width: '100%',
    gap: 10,
    paddingVertical: 4,
  },
  panelTitle: {
    width: '56%',
    height: 16,
    borderRadius: 8,
  },
  panelLine: {
    width: '100%',
    height: 12,
    borderRadius: 6,
  },
  panelLineShort: {
    width: '72%',
    height: 12,
    borderRadius: 6,
  },
  headerSkeleton: {
    gap: 10,
  },
  headerTitle: {
    width: '58%',
    height: 24,
    borderRadius: 8,
  },
  headerSubtitle: {
    width: '40%',
    height: 14,
    borderRadius: 6,
  },
  toolbarSkeleton: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  toolbarSkeletonCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  toolbarSearch: {
    flex: 1,
    height: 42,
    borderRadius: 12,
  },
  toolbarSearchCompact: {
    width: '100%',
    height: 42,
    borderRadius: 12,
  },
  toolbarButton: {
    width: 116,
    height: 42,
    borderRadius: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  statValue: {
    width: '62%',
    height: 16,
    borderRadius: 8,
  },
  statLabel: {
    width: '80%',
    height: 12,
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statsChip: {
    width: 112,
    height: 34,
    borderRadius: 17,
  },
  headerWithActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerBtnRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerActionBtn: {
    width: 100,
    height: 36,
    borderRadius: 8,
  },
  chartRow: {
    flexDirection: 'row',
    gap: 14,
  },
  chartCardSkeleton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  chartCardTitle: {
    width: '50%',
    height: 16,
    borderRadius: 8,
  },
  chartCardSubtitle: {
    width: '35%',
    height: 12,
    borderRadius: 6,
  },
  chartArea: {
    width: '100%',
    height: 140,
    borderRadius: 10,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableCell: {
    flex: 2,
    height: 14,
    borderRadius: 6,
  },
  tableCellMd: {
    flex: 1.5,
    height: 14,
    borderRadius: 6,
  },
  tableCellSm: {
    flex: 1,
    height: 14,
    borderRadius: 6,
  },
  tableCellBadge: {
    width: 64,
    height: 24,
    borderRadius: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 120,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  summaryLabel: {
    width: '60%',
    height: 12,
    borderRadius: 6,
  },
  summaryValue: {
    width: '45%',
    height: 20,
    borderRadius: 8,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentedTab: {
    width: 72,
    height: 34,
    borderRadius: 8,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  paginationBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  productCard: {
    width: 200,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 120,
  },
  productCardBody: {
    padding: 10,
    gap: 8,
  },
  productName: {
    width: '75%',
    height: 14,
    borderRadius: 6,
  },
  productCategory: {
    width: '50%',
    height: 11,
    borderRadius: 6,
  },
  productMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    width: 60,
    height: 16,
    borderRadius: 6,
  },
  productBadge: {
    width: 56,
    height: 22,
    borderRadius: 11,
  },
  productActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  filterRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterDropdownSkeleton: {
    width: 120,
    height: 34,
    borderRadius: 8,
  },
  paginationLabel: {
    width: 60,
    height: 14,
    borderRadius: 6,
  },
  statusBarSkeleton: {
    width: '100%',
    height: 28,
    borderRadius: 6,
  },
  activityRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  activityLines: {
    flex: 1,
    gap: 4,
  },
  activityLine: {
    width: '70%',
    height: 12,
    borderRadius: 6,
  },
  activityLineSm: {
    width: '45%',
    height: 10,
    borderRadius: 5,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdBlock: {
    width: 80,
    height: 16,
    borderRadius: 6,
  },
  orderAmountBlock: {
    width: 72,
    height: 18,
    borderRadius: 6,
  },
  payableCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payableIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  payableInfo: {
    flex: 1,
    gap: 6,
  },
  employeeCard: {
    flex: 1,
    minWidth: 160,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  employeeName: {
    width: '65%',
    height: 14,
    borderRadius: 6,
  },
  employeeRole: {
    width: '45%',
    height: 11,
    borderRadius: 6,
  },
  employeeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  deptGroup: {
    gap: 12,
  },
  deptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deptLabel: {
    width: 90,
    height: 16,
    borderRadius: 6,
  },
  deptBadge: {
    width: 28,
    height: 20,
    borderRadius: 10,
  },
  deptLine: {
    flex: 1,
    height: 1,
  },
  dateRangeSkeleton: {
    width: '100%',
    height: 58,
    borderRadius: 14,
  },
  cardSkeleton: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  cardMedia: {
    width: '100%',
    height: 118,
    borderRadius: 12,
  },
  cardTitle: {
    width: '62%',
    height: 18,
    borderRadius: 8,
  },
  cardSubtitle: {
    width: '46%',
    height: 13,
    borderRadius: 6,
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardMetaItem: {
    width: 72,
    height: 12,
    borderRadius: 6,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonSkeleton: {
    width: 108,
    height: 36,
    borderRadius: 10,
  },
  inlineSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineAvatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
  },
  inlineLines: {
    gap: 6,
  },
  inlineLinePrimary: {
    width: 138,
    height: 11,
    borderRadius: 6,
  },
  inlineLineSecondary: {
    width: 92,
    height: 9,
    borderRadius: 5,
  },
  block: {
    overflow: 'hidden',
  },
  shimmerTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
  },
  shimmerGradient: {
    width: 120,
    height: '100%',
  },
  textBlock: {
    alignItems: 'center',
    gap: 2,
  },
  inlineTextBlock: {
    alignItems: 'flex-start',
  },
  loadingTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  inlineTitle: {
    fontSize: 12,
  },
  loadingSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  inlineSubtitle: {
    fontSize: 11,
    textAlign: 'left',
  },
});
