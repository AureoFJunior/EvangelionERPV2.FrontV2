import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isSmall = width < 360;
  const isCompact = width < 560;
  const isTablet = width >= 768 && width < 1200;
  const isWide = width >= 1200;
  const contentPadding = isSmall ? 12 : isCompact ? 14 : isTablet ? 24 : 22;
  const cardGap = isCompact ? 10 : isTablet ? 14 : 16;
  const sectionGap = isCompact ? 14 : 18;
  const inputMinHeight = isCompact ? 46 : 50;

  return {
    width,
    height,
    isSmall,
    isCompact,
    isTablet,
    isWide,
    contentPadding,
    cardGap,
    sectionGap,
    inputMinHeight,
  };
}
