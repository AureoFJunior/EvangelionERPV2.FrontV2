import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isSmall = width < 360;
  const isCompact = width < 480;
  const isTablet = width >= 768;
  const isWide = width >= 1024;
  const contentPadding = isCompact ? 16 : isTablet ? 24 : 20;
  const cardGap = isCompact ? 12 : 16;

  return {
    width,
    height,
    isSmall,
    isCompact,
    isTablet,
    isWide,
    contentPadding,
    cardGap,
  };
}
