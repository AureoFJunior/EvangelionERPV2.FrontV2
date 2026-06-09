import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Portal } from './components/ui/Paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MD3DarkTheme, MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { I18nProvider, useI18n } from './contexts/I18nContext';
import { Sidebar } from './features/sidebar/components/Sidebar';
import { Dashboard } from './features/dashboard/components/Dashboard';
import { Products } from './features/products/components/Products';
import { Customers } from './features/customers/components/Customers';
import { Orders } from './features/orders/components/Orders';
import { Bills } from './features/bills/components/Bills';
import { PayableBills } from './features/payables/components/PayableBills';
import { Forecast } from './features/forecast/components/Forecast';
import { Employees } from './features/employees/components/Employees';
import { Reports } from './features/reports/components/Reports';
import { UserProfile } from './features/profile/components/UserProfile';
import { Login } from './features/auth/components/Login';
import { useResponsive } from './hooks/useResponsive';
import { sidebarModules } from './utils/sidebar/modules';

function LoadingScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    spinLoop.start();

    return () => {
      pulseLoop.stop();
      spinLoop.stop();
      pulse.setValue(0);
      spin.setValue(0);
    };
  }, [pulse, spin]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const auraOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.65],
  });

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.appBg }]}>
      <Animated.View
        style={[
          styles.loadingAura,
          {
            backgroundColor: colors.primaryPurple,
            opacity: auraOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.loadingRing,
          {
            borderColor: colors.neonGreen,
            transform: [{ rotate: rotation }],
          },
        ]}
      />
      <View
        style={[
          styles.loadingCore,
          { backgroundColor: colors.primaryPurple, borderColor: colors.neonGreen },
        ]}
      />
      <Text style={[styles.loadingLabel, { color: colors.textPrimary }]}>{t('Loading')}</Text>
      <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>
        {t('Initializing systems...')}
      </Text>
    </View>
  );
}

function TopBar({
  onMenuPress,
  onProfilePress,
  onNavigate,
  showMenuButton,
}: {
  onMenuPress: () => void;
  onProfilePress: () => void;
  onNavigate: (moduleId: string) => void;
  showMenuButton: boolean;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();
  const { isCompact } = useResponsive();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifPos, setNotifPos] = useState({ top: 0, right: 0 });
  const bellRef = useRef<View>(null);

  const openNotif = useCallback(() => {
    if (bellRef.current) {
      bellRef.current.measureInWindow((x, y, w, h) => {
        setNotifPos({ top: y + h + 4, right: Math.max(8, (Platform.OS === 'web' ? window.innerWidth : 400) - x - w) });
        setNotifOpen(true);
      });
    } else {
      setNotifOpen((prev) => !prev);
    }
  }, []);

  const notifications = [
    { id: '1', icon: 'shopping-cart' as const, title: t('New order received'), subtitle: t('Order #1042 — $1,250.00'), time: t('2 min ago'), unread: true },
    { id: '2', icon: 'user-check' as const, title: t('Customer approved'), subtitle: t('Acme Corp verified'), time: t('15 min ago'), unread: true },
    { id: '3', icon: 'alert-circle' as const, title: t('Low stock alert'), subtitle: t('Widget Pro — 3 units left'), time: t('1h ago'), unread: false },
    { id: '4', icon: 'trending-up' as const, title: t('Monthly report ready'), subtitle: t('May 2026 summary available'), time: t('3h ago'), unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  const allModules = [
    ...sidebarModules,
    { id: 'profile', label: 'Profile', icon: 'user' },
  ];

  const searchResults = searchTerm.trim().length > 0
    ? allModules.filter((m) =>
        t(m.label).toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : [];

  const handleSelect = (moduleId: string) => {
    onNavigate(moduleId);
    setSearchTerm('');
  };

  const displayName = user?.name ?? t('User');
  const displayRole = user?.role ?? t('Operator');
  const avatarUri = user?.avatarUrl?.trim() ?? '';
  const hasAvatar = avatarUri.length > 0 && !avatarError;
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.topBar, { backgroundColor: colors.topBarBg, borderBottomColor: colors.cardBorder }]}>
      {showMenuButton && (
        <Pressable
          onPress={onMenuPress}
          style={(state: any) => [
            styles.topBarIconBtn,
            state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
            state.pressed && styles.topBarIconBtnPressed,
          ]}
        >
          {(state: any) => (
            <Feather name="menu" size={18} color={state.hovered ? colors.textPrimary : colors.textMuted} />
          )}
        </Pressable>
      )}

      <View style={styles.topBarSearchWrapper}>
        <View
          style={[
            styles.topBarSearch,
            { backgroundColor: colors.inputBgFrom, borderColor: searchFocused ? `${colors.primaryPurple}80` : colors.cardBorder },
            Platform.select({ web: { transition: 'border-color 0.15s ease' } as any, default: {} }),
          ]}
        >
          <Feather name="search" size={14} color={colors.textMuted} />
          <TextInput
            placeholder={t('Search modules...')}
            placeholderTextColor={colors.textMuted}
            style={[styles.topBarSearchInput, { color: colors.textPrimary }]}
            value={searchTerm}
            onChangeText={setSearchTerm}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onSubmitEditing={() => {
              if (searchResults.length > 0) {
                handleSelect(searchResults[0].id);
              }
            }}
            returnKeyType="search"
          />
        </View>
        {searchFocused && searchResults.length > 0 && (
          <View style={[styles.searchDropdown, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
            {searchResults.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => handleSelect(m.id)}
                style={(state: any) => [
                  styles.searchDropdownItem,
                  state.hovered && { backgroundColor: `${colors.primaryPurple}1F` },
                ]}
              >
                <Feather name={m.icon as any} size={14} color={colors.textMuted} />
                <Text style={[styles.searchDropdownLabel, { color: colors.textPrimary }]}>
                  {t(m.label)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {searchFocused && searchTerm.trim().length > 0 && searchResults.length === 0 && (
          <View style={[styles.searchDropdown, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder }]}>
            <View style={styles.searchDropdownItem}>
              <Text style={[styles.searchDropdownLabel, { color: colors.textMuted }]}>
                {t('No results')}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.topBarRight}>
        <View ref={bellRef} collapsable={false}>
          <Pressable
            onPress={openNotif}
            style={(state: any) => [
              styles.topBarIconBtn,
              state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
              state.pressed && styles.topBarIconBtnPressed,
            ]}
          >
            {(state: any) => (
              <>
                <Feather name="bell" size={16} color={state.hovered ? colors.textPrimary : colors.textMuted} />
                {unreadCount > 0 && <View style={[styles.notifDot, { backgroundColor: colors.primaryPurple }]} />}
              </>
            )}
          </Pressable>
        </View>
        {notifOpen && (
          <Portal>
            <Pressable style={styles.notifBackdrop} onPress={() => setNotifOpen(false)} />
            <View style={[styles.notifPopup, { backgroundColor: colors.cardBgFrom, borderColor: colors.cardBorder, top: notifPos.top, right: notifPos.right }]}>
              <View style={[styles.notifHeader, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.notifHeaderTitle, { color: colors.textPrimary }]}>{t('Notifications')}</Text>
                {unreadCount > 0 && (
                  <View style={[styles.notifBadge, { backgroundColor: `${colors.primaryPurple}33` }]}>
                    <Text style={[styles.notifBadgeText, { color: colors.primaryPurple }]}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <ScrollView style={styles.notifScroll}>
                {notifications.map((n) => (
                  <Pressable
                    key={n.id}
                    style={(state: any) => [
                      styles.notifItem,
                      n.unread && { backgroundColor: `${colors.primaryPurple}0D` },
                      state.hovered && { backgroundColor: `${colors.primaryPurple}1F` },
                    ]}
                    onPress={() => setNotifOpen(false)}
                  >
                    <View style={[styles.notifIconBox, { backgroundColor: `${colors.primaryPurple}1F` }]}>
                      <Feather name={n.icon} size={14} color={colors.primaryPurple} />
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifTitle, { color: colors.textPrimary }]} numberOfLines={1}>{n.title}</Text>
                      <Text style={[styles.notifSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{n.subtitle}</Text>
                    </View>
                    <Text style={[styles.notifTime, { color: colors.textMuted }]}>{n.time}</Text>
                    {n.unread && <View style={[styles.notifUnreadDot, { backgroundColor: colors.primaryPurple }]} />}
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                style={(state: any) => [
                  styles.notifFooter,
                  { borderTopColor: colors.cardBorder },
                  state.hovered && { backgroundColor: `${colors.primaryPurple}0D` },
                ]}
                onPress={() => setNotifOpen(false)}
              >
                <Text style={[styles.notifFooterText, { color: colors.primaryPurple }]}>{t('View all notifications')}</Text>
              </Pressable>
            </View>
          </Portal>
        )}

        <View style={[styles.topBarDivider, { backgroundColor: colors.cardBorder }]} />

        <Pressable
          onPress={onProfilePress}
          style={(state: any) => [
            styles.topBarProfile,
            state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
            state.pressed && styles.topBarIconBtnPressed,
          ]}
        >
          {(state: any) => (
            <>
              <View style={[styles.topBarAvatar, { backgroundColor: `${colors.primaryPurple}33`, borderColor: `${colors.primaryPurple}55` }]}>
                {hasAvatar ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.topBarAvatarImg}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <Text style={[styles.topBarAvatarText, { color: colors.primaryPurple }]}>{initials}</Text>
                )}
              </View>
              {!isCompact && (
                <View>
                  <Text style={[styles.topBarName, { color: colors.textPrimary }]} numberOfLines={1}>{displayName}</Text>
                  <Text style={[styles.topBarRole, { color: colors.textMuted }]} numberOfLines={1}>{displayRole}</Text>
                </View>
              )}
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function AppContent() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  const { width, isTablet, isCompact } = useResponsive();
  const { colors } = useTheme();
  const useSideLayout = width >= 1024;
  const layoutDirection = useSideLayout ? 'row' : 'column';

  useEffect(() => {
    if (isCompact && sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
  }, [isCompact, sidebarCollapsed]);

  useEffect(() => {
    if (useSideLayout && drawerOpen) {
      setDrawerOpen(false);
    }
  }, [useSideLayout, drawerOpen]);

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'customers':
        return <Customers />;
      case 'orders':
        return <Orders />;
      case 'bills':
        return <Bills />;
      case 'payables':
        return <PayableBills />;
      case 'forecast':
        return <Forecast />;
      case 'employees':
        return <Employees />;
      case 'reports':
        return <Reports />;
      case 'profile':
        return <UserProfile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.appBg }]} edges={['top', 'bottom']}>
      <View style={[styles.container, { backgroundColor: colors.appBg }]}>
        {loading ? (
          <LoadingScreen />
        ) : !isAuthenticated ? (
          <Login />
        ) : (
          <View style={[styles.responsiveLayout, { flexDirection: layoutDirection }]}>
            <Sidebar
              activeModule={activeModule}
              setActiveModule={setActiveModule}
              layout={useSideLayout ? 'side' : 'stacked'}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
              drawerOpen={drawerOpen}
              onDrawerClose={() => setDrawerOpen(false)}
            />
            <View style={styles.mainArea}>
              <TopBar
                showMenuButton={!useSideLayout}
                onMenuPress={() => {
                  if (isCompact) {
                    setDrawerOpen(true);
                  } else {
                    setSidebarCollapsed((prev) => !prev);
                  }
                }}
                onProfilePress={() => setActiveModule('profile')}
                onNavigate={setActiveModule}
              />
              <View style={[styles.mainContent, { backgroundColor: colors.appBg }]}>
                {renderModule()}
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function ThemedPaperProvider({ children }: { children: React.ReactNode }) {
  const { colors, theme } = useTheme();

  const paperTheme = React.useMemo(() => {
    const baseTheme = theme === 'light' ? MD3LightTheme : MD3DarkTheme;

    return {
      ...baseTheme,
      roundness: 12,
      colors: {
        ...baseTheme.colors,
        primary: colors.primaryPurple,
        secondary: colors.secondaryPurple,
        tertiary: colors.neonGreen,
        error: colors.accentOrange,
        background: 'transparent',
        surface: colors.cardBgFrom,
        surfaceVariant: colors.cardBgTo,
        outline: colors.cardBorder,
        onSurface: colors.textPrimary,
        onSurfaceVariant: colors.textSecondary,
      },
    };
  }, [colors, theme]);

  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <I18nProvider>
          <ThemeProvider>
            <ThemedPaperProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </ThemedPaperProvider>
          </ThemeProvider>
        </I18nProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingAura: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  loadingRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    opacity: 0.9,
  },
  loadingCore: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    opacity: 0.95,
  },
  loadingLabel: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loadingSub: {
    marginTop: 6,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  responsiveLayout: {
    flex: 1,
  },
  mainArea: {
    flex: 1,
    minWidth: 0,
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { transition: 'background-color 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  topBarIconBtnPressed: {
    opacity: 0.7,
  },
  topBarSearchWrapper: {
    flex: 1,
    maxWidth: 320,
    ...Platform.select({ web: { position: 'relative' } as any, default: {} }),
  },
  topBarSearch: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  topBarSearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } as any, default: {} }),
  },
  searchDropdown: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
    ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(0,0,0,0.3)' } as any, default: { elevation: 4 } }),
    zIndex: 100,
  },
  searchDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...Platform.select({ web: { cursor: 'pointer' } as any, default: {} }),
  },
  searchDropdownLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  notifBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notifPopup: {
    position: 'absolute',
    width: 340,
    maxHeight: 420,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({ web: { boxShadow: '0 8px 24px rgba(0,0,0,0.4)' } as any, default: { elevation: 8 } }),
  },
  notifScroll: {
    maxHeight: 300,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  notifHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  notifBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  notifBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Platform.select({ web: { cursor: 'pointer' } as any, default: {} }),
  },
  notifIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  notifSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  notifTime: {
    fontSize: 10,
  },
  notifUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notifFooter: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' } as any, default: {} }),
  },
  notifFooterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  topBarDivider: {
    width: 1,
    height: 20,
  },
  topBarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    ...Platform.select({ web: { transition: 'background-color 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  topBarAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  topBarAvatarText: {
    fontSize: 10,
    fontWeight: '700',
  },
  topBarName: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 14,
  },
  topBarRole: {
    fontSize: 10,
    lineHeight: 12,
  },
  mainContent: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
});
