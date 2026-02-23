import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
  ClipPath,
  Rect,
  G,
  Line,
} from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

type NervLoaderProps = {
  label?: string;
  subtitle?: string;
  size?: number;
  fullScreen?: boolean;
  inline?: boolean;
  style?: ViewStyle;
};

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export function NervLoader({
  label,
  subtitle,
  size = 200,
  fullScreen = false,
  inline = false,
  style,
}: NervLoaderProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const spin = useRef(new Animated.Value(0)).current;
  const fill = useRef(new Animated.Value(0)).current;
  const resolvedLabel = label ?? t('Synchronizing EVA-01');
  const resolvedSubtitle = subtitle ?? t('LCL circulation nominal | Loading...');

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const fillLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fill, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(fill, {
          toValue: 0.2,
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    );

    spinLoop.start();
    fillLoop.start();

    return () => {
      spinLoop.stop();
      fillLoop.stop();
      spin.setValue(0);
      fill.setValue(0);
    };
  }, [spin, fill]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const ringSize = size;
  const coreSize = size * 0.62;
  const coreStart = (ringSize - coreSize) / 2;

  const fillHeight = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [coreSize * 0.18, coreSize * 0.72],
  });
  const fillY = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [coreStart + coreSize * 0.72, coreStart + coreSize * 0.22],
  });
  const textFillHeight = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [coreSize * 0.14, coreSize * 0.55],
  });
  const textFillY = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [coreStart + coreSize * 0.64, coreStart + coreSize * 0.28],
  });

  return (
    <View
      style={[
        styles.loadingWrap,
        fullScreen && styles.fullScreen,
        inline && styles.inlineWrap,
        { backgroundColor: inline ? 'transparent' : colors.appBg },
        style,
      ]}
    >
      <View style={styles.logoStack}>
        <Animated.View
          style={[
            styles.ringWrap,
            {
              width: ringSize,
              height: ringSize,
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringSize / 2 - ringSize * 0.06}
              stroke={colors.primaryPurple}
              strokeWidth={ringSize * 0.045}
              strokeOpacity={0.9}
              fill="none"
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringSize / 2 - ringSize * 0.12}
              stroke={colors.neonGreen}
              strokeWidth={ringSize * 0.022}
              strokeDasharray="8 14"
              strokeOpacity={0.85}
              fill="none"
            />
          </Svg>
        </Animated.View>

        <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
          <Defs>
            <LinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={`${colors.cardBgFrom}F0`} />
              <Stop offset="1" stopColor={`${colors.cardBgFrom}C0`} />
            </LinearGradient>
            <LinearGradient id="water" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={colors.neonGreen} stopOpacity="0.95" />
              <Stop offset="1" stopColor={colors.primaryPurple} stopOpacity="0.9" />
            </LinearGradient>
            <ClipPath id="circle-clip">
              <Circle cx={ringSize / 2} cy={ringSize / 2} r={coreSize / 2} />
            </ClipPath>
            <ClipPath id="logo-clip">
              <SvgText
                x={ringSize / 2}
                y={ringSize * 0.54}
                fontSize={coreSize * 0.24}
                fontWeight="900"
                textAnchor="middle"
              >
                NERV
              </SvgText>
            </ClipPath>
          </Defs>

          <G clipPath="url(#circle-clip)">
            <AnimatedRect
              x={coreStart}
              y={fillY}
              width={coreSize}
              height={fillHeight}
              fill="url(#water)"
              opacity={0.9}
            />
            <AnimatedRect
              x={coreStart + coreSize * 0.12}
              y={fillY}
              width={coreSize * 0.76}
              height={fillHeight}
              fill={colors.primaryPurple}
              opacity={0.25}
            />
          </G>

          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={coreSize / 2}
            fill="url(#glass)"
            stroke={colors.cardBorder}
            strokeWidth={2}
          />

          <AnimatedRect
            x={coreStart + coreSize * 0.12}
            y={textFillY}
            width={coreSize * 0.76}
            height={textFillHeight}
            fill="url(#water)"
            opacity={0.9}
            clipPath="url(#logo-clip)"
          />

          <SvgText
            x={ringSize / 2}
            y={ringSize * 0.54}
            fontSize={coreSize * 0.24}
            fontWeight="900"
            textAnchor="middle"
            fill={colors.textPrimary}
            opacity={0.12}
          >
            NERV
          </SvgText>
          <SvgText
            x={ringSize / 2}
            y={ringSize * 0.54}
            fontSize={coreSize * 0.24}
            fontWeight="900"
            textAnchor="middle"
            fill={colors.textPrimary}
            stroke={colors.appBg}
            strokeWidth={1}
            opacity={0.8}
          >
            NERV
          </SvgText>

          <Line
            x1={ringSize * 0.36}
            y1={ringSize * 0.57}
            x2={ringSize * 0.64}
            y2={ringSize * 0.46}
            stroke={colors.accentOrange}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.9}
          />
        </Svg>
      </View>

      <View style={[styles.textBlock, inline && styles.inlineTextBlock]}>
        {!!resolvedLabel && (
          <Text
            style={[
              styles.loadingTitle,
              inline && styles.inlineTitle,
              { color: colors.textPrimary },
            ]}
          >
            {resolvedLabel}
          </Text>
        )}
        {!!resolvedSubtitle && (
          <Text
            style={[
              styles.loadingSubtitle,
              inline && styles.inlineSubtitle,
              { color: colors.textSecondary },
            ]}
          >
            {resolvedSubtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  fullScreen: {
    flex: 1,
    width: '100%',
    minHeight: 420,
  },
  inlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  logoStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: {
    position: 'absolute',
  },
  textBlock: {
    alignItems: 'center',
  },
  inlineTextBlock: {
    alignItems: 'flex-start',
  },
  loadingTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  inlineTitle: {
    marginTop: 0,
    fontSize: 14,
  },
  loadingSubtitle: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  inlineSubtitle: {
    fontSize: 11,
  },
});
