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
  | 'reports';

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

function DashboardSkeleton(props: CommonSkeletonProps) {
  const { reduceMotionEnabled, shimmerTranslate, palette } = props;
  return (
    <View style={styles.pageSkeleton}>
      <HeaderSkeleton {...props} />

      <View style={styles.statsGrid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={`stat-${index}`} style={[styles.statCard, { borderColor: palette.borderColor, backgroundColor: palette.cardBackground }]}>
            <SkeletonBlock
              style={styles.statIcon}
              baseColor={palette.base}
              highlightColor={palette.highlight}
              reduceMotionEnabled={reduceMotionEnabled}
              shimmerTranslate={shimmerTranslate}
            />
            <SkeletonBlock
              style={styles.statValue}
              baseColor={palette.base}
              highlightColor={palette.highlight}
              reduceMotionEnabled={reduceMotionEnabled}
              shimmerTranslate={shimmerTranslate}
            />
            <SkeletonBlock
              style={styles.statLabel}
              baseColor={palette.base}
              highlightColor={palette.highlight}
              reduceMotionEnabled={reduceMotionEnabled}
              shimmerTranslate={shimmerTranslate}
            />
          </View>
        ))}
      </View>

      <ListCardSkeleton {...props} />
      <ListCardSkeleton {...props} />
    </View>
  );
}

function CustomersSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <HeaderSkeleton {...props} />
      <View style={styles.statsRow}>
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock
            key={`customer-stat-${index}`}
            style={styles.statsChip}
            baseColor={props.palette.base}
            highlightColor={props.palette.highlight}
            reduceMotionEnabled={props.reduceMotionEnabled}
            shimmerTranslate={props.shimmerTranslate}
          />
        ))}
      </View>
      <ToolbarSkeleton {...props} compact />
      {Array.from({ length: 3 }).map((_, index) => (
        <ListCardSkeleton key={`customer-card-${index}`} {...props} />
      ))}
    </View>
  );
}

function ProductsSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <HeaderSkeleton {...props} />
      <ToolbarSkeleton {...props} compact />
      {Array.from({ length: 3 }).map((_, index) => (
        <ListCardSkeleton key={`product-card-${index}`} {...props} withMedia withActions />
      ))}
    </View>
  );
}

function OrdersSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <HeaderSkeleton {...props} />
      <SkeletonBlock
        style={styles.dateRangeSkeleton}
        baseColor={props.palette.base}
        highlightColor={props.palette.highlight}
        reduceMotionEnabled={props.reduceMotionEnabled}
        shimmerTranslate={props.shimmerTranslate}
      />
      {Array.from({ length: 3 }).map((_, index) => (
        <ListCardSkeleton key={`order-card-${index}`} {...props} withActions />
      ))}
    </View>
  );
}

function CompactListSkeleton(props: CommonSkeletonProps) {
  return (
    <View style={styles.pageSkeleton}>
      <HeaderSkeleton {...props} />
      <ToolbarSkeleton {...props} />
      {Array.from({ length: 3 }).map((_, index) => (
        <ListCardSkeleton key={`list-card-${index}`} {...props} />
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
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1350,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    shimmerLoop.start();

    return () => {
      shimmerLoop.stop();
    };
  }, [reduceMotionEnabled, shimmer]);

  const shimmerDistance = Math.max(size * 1.9, 420);
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
      case 'payables':
      case 'reports':
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
      accessibilityHint={resolvedSubtitle}
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
