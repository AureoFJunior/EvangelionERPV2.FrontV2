import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { IconButton, Portal, Text } from './ui/Paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { sidebarModules } from '../utils/sidebar/modules';
import { useSidebarState } from '../hooks/sidebar/useSidebarState';
import { useI18n } from '../contexts/I18nContext';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  layout?: 'side' | 'stacked';
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

export function Sidebar({
  activeModule,
  setActiveModule,
  layout = 'side',
  collapsed = false,
  onToggleCollapsed,
  drawerOpen: externalDrawerOpen,
  onDrawerClose,
}: SidebarProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { logout } = useAuth();
  const { isCompact } = useResponsive();
  const isStacked = layout === 'stacked';
  const isDrawerLayout = isStacked && isCompact;
  const isSideCollapsed = !isStacked && collapsed;
  const isStackedCollapsed = isStacked && !isDrawerLayout && collapsed;
  const baseSidebarWidth = isSideCollapsed ? 72 : 240;
  const { drawerOpen: internalDrawerOpen, setDrawerOpen: setInternalDrawerOpen } = useSidebarState(isDrawerLayout, '');
  const drawerOpen = externalDrawerOpen ?? internalDrawerOpen;
  const setDrawerOpen = onDrawerClose
    ? (open: boolean) => { if (!open) onDrawerClose(); }
    : setInternalDrawerOpen;
  const navigationModules = React.useMemo(
    () =>
      sidebarModules.filter(
        (module) =>
          typeof module.id === 'string' &&
          module.id.trim().length > 0 &&
          typeof module.label === 'string' &&
          module.label.trim().length > 0 &&
          typeof module.icon === 'string' &&
          module.icon.trim().length > 0,
      ),
    [],
  );

  const handleSelectModule = (moduleId: string) => {
    setActiveModule(moduleId);
    if (isDrawerLayout) {
      setDrawerOpen(false);
    }
  };

  const renderLogo = () => (
    <View style={[styles.logoSection, { borderBottomColor: colors.cardBorder }]}>
      <View style={[styles.logoRow, isSideCollapsed && styles.logoRowCollapsed]}>
        <View style={[styles.logoBox, { backgroundColor: `${colors.primaryPurple}33`, borderColor: `${colors.primaryPurple}4D` }]}>
          <Feather name="activity" size={16} color={colors.primaryPurple} />
        </View>
        {!isSideCollapsed && (
          <View style={styles.logoText}>
            <Text style={[styles.logoTitle, { color: colors.textPrimary }]}>NERV ERP</Text>
            <Text style={[styles.logoSubtitle, { color: colors.textMuted }]}>{t('Enterprise')}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderNavigation = () => (
    <View style={[styles.navigation, isSideCollapsed && styles.navigationCollapsed]}>
      {navigationModules.map((module) => {
        const isActive = activeModule === module.id;
        return (
          <Pressable
            key={module.id}
            onPress={() => handleSelectModule(module.id)}
            testID={`sidebar-nav-${module.id}`}
            style={(state: any) => [
              styles.navItem,
              isSideCollapsed && styles.navItemCollapsed,
              isActive && [styles.navItemActive, { backgroundColor: `${colors.primaryPurple}1F`, borderColor: `${colors.primaryPurple}33` }],
              !isActive && { borderColor: 'transparent' },
              !isActive && state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
              state.pressed && styles.navItemPressed,
            ]}
          >
            {(state: any) => (
              <>
                <Feather
                  name={module.icon as any}
                  size={16}
                  color={isActive ? colors.primaryPurple : (state.hovered ? colors.textPrimary : colors.textMuted)}
                />
                {!isSideCollapsed && (
                  <Text
                    style={[
                      styles.navItemLabel,
                      { color: isActive ? colors.primaryPurple : (state.hovered ? colors.textPrimary : colors.textMuted) },
                    ]}
                    numberOfLines={1}
                  >
                    {t(module.label)}
                  </Text>
                )}
                {!isSideCollapsed && isActive && (
                  <View style={[styles.activeDot, { backgroundColor: colors.primaryPurple }]} />
                )}
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  const renderBottom = () => (
    <View style={[styles.bottomSection, { borderTopColor: colors.cardBorder }]}>
      <Pressable
        onPress={() => handleSelectModule('profile')}
        testID="sidebar-nav-profile"
        style={(state: any) => [
          styles.navItem,
          isSideCollapsed && styles.navItemCollapsed,
          activeModule === 'profile' && [styles.navItemActive, { backgroundColor: `${colors.primaryPurple}1F`, borderColor: `${colors.primaryPurple}33` }],
          !(activeModule === 'profile') && { borderColor: 'transparent' },
          !(activeModule === 'profile') && state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
          state.pressed && styles.navItemPressed,
        ]}
      >
        {(state: any) => (
          <>
            <Feather
              name="user"
              size={16}
              color={activeModule === 'profile' ? colors.primaryPurple : (state.hovered ? colors.textPrimary : colors.textMuted)}
            />
            {!isSideCollapsed && (
              <Text style={[styles.navItemLabel, { color: activeModule === 'profile' ? colors.primaryPurple : (state.hovered ? colors.textPrimary : colors.textMuted) }]}>
                {t('Profile')}
              </Text>
            )}
          </>
        )}
      </Pressable>

      <Pressable
        onPress={onToggleCollapsed ?? (() => undefined)}
        style={(state: any) => [
          styles.navItem,
          isSideCollapsed && styles.navItemCollapsed,
          { borderColor: 'transparent' },
          state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
          state.pressed && styles.navItemPressed,
        ]}
      >
        {(state: any) => (
          <>
            <Feather
              name={isSideCollapsed ? 'chevron-right' : 'chevron-left'}
              size={16}
              color={state.hovered ? colors.textPrimary : colors.textMuted}
            />
            {!isSideCollapsed && (
              <Text style={[styles.navItemLabel, { color: state.hovered ? colors.textPrimary : colors.textMuted }]}>{t('Collapse')}</Text>
            )}
          </>
        )}
      </Pressable>

      <Pressable
        onPress={logout}
        testID="sidebar-logout"
        style={(state: any) => [
          styles.navItem,
          isSideCollapsed && styles.navItemCollapsed,
          { borderColor: 'transparent' },
          state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
          state.pressed && styles.navItemPressed,
        ]}
      >
        <Feather name="log-out" size={16} color={colors.accentOrange} />
        {!isSideCollapsed && (
          <Text style={[styles.navItemLabel, { color: colors.accentOrange }]}>{t('Logout')}</Text>
        )}
      </Pressable>
    </View>
  );

  if (isDrawerLayout) {
    return (
      <Portal>
        {drawerOpen && (
          <Pressable
            style={styles.drawerBackdrop}
            onPress={() => setDrawerOpen(false)}
          />
        )}
        <View
          style={[
            styles.drawerSlide,
            { backgroundColor: colors.sidebarBg, borderRightColor: colors.cardBorder },
            drawerOpen ? styles.drawerSlideOpen : styles.drawerSlideClosed,
          ]}
        >
          <View style={[styles.drawerHeader, { borderBottomColor: colors.cardBorder }]}>
            <View style={styles.logoRow}>
              <View style={[styles.logoBox, { backgroundColor: `${colors.primaryPurple}33`, borderColor: `${colors.primaryPurple}4D` }]}>
                <Feather name="activity" size={16} color={colors.primaryPurple} />
              </View>
              <View style={styles.logoText}>
                <Text style={[styles.logoTitle, { color: colors.textPrimary }]}>NERV ERP</Text>
                <Text style={[styles.logoSubtitle, { color: colors.textMuted }]}>{t('Enterprise')}</Text>
              </View>
            </View>
            <IconButton
              icon={() => <Feather name="x" size={18} color={colors.textMuted} />}
              size={18}
              onPress={() => setDrawerOpen(false)}
            />
          </View>
          <ScrollView style={styles.drawerScroll}>
            {renderNavigation()}
          </ScrollView>
          {renderBottom()}
        </View>
      </Portal>
    );
  }

  if (isStacked) {
    return (
      <View style={[styles.stackedContainer, { backgroundColor: colors.sidebarBg, borderBottomColor: colors.cardBorder }]}>
        <View style={[styles.stackedHeader, { borderBottomColor: colors.cardBorder }]}>
          {renderLogo()}
          <View style={styles.stackedHeaderActions}>
            <Pressable
              onPress={() => handleSelectModule('profile')}
              testID="sidebar-nav-profile-stacked"
              style={({ pressed }) => [
                styles.stackedActionBtn,
                activeModule === 'profile' && { backgroundColor: `${colors.primaryPurple}1F` },
                pressed && styles.navItemPressed,
              ]}
            >
              <Feather name="user" size={16} color={activeModule === 'profile' ? colors.primaryPurple : colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={logout}
              testID="sidebar-logout-stacked"
              style={({ pressed }) => [
                styles.stackedActionBtn,
                pressed && styles.navItemPressed,
              ]}
            >
              <Feather name="log-out" size={16} color={colors.accentOrange} />
            </Pressable>
            <Pressable
              onPress={onToggleCollapsed ?? (() => undefined)}
              style={({ pressed }) => [styles.stackedToggleBtn, { borderColor: colors.cardBorder }, pressed && styles.navItemPressed]}
            >
              <Feather name={isStackedCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
        {!isStackedCollapsed && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stackedNav}>
            {navigationModules.map((module) => {
              const isActive = activeModule === module.id;
              return (
                <Pressable
                  key={module.id}
                  onPress={() => handleSelectModule(module.id)}
                  style={({ pressed }) => [
                    styles.stackedNavItem,
                    isActive && { backgroundColor: `${colors.primaryPurple}1F`, borderColor: `${colors.primaryPurple}33` },
                    !isActive && { borderColor: 'transparent' },
                    pressed && styles.navItemPressed,
                  ]}
                >
                  <Feather name={module.icon as any} size={16} color={isActive ? colors.primaryPurple : colors.textMuted} />
                  <Text style={[styles.stackedNavLabel, { color: isActive ? colors.primaryPurple : colors.textMuted }]} numberOfLines={1}>
                    {t(module.label)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebarBg, width: baseSidebarWidth, borderRightColor: colors.cardBorder }]}>
      {renderLogo()}
      <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
        {renderNavigation()}
      </ScrollView>
      {renderBottom()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRightWidth: 1,
    flexDirection: 'column',
    flexShrink: 0,
    ...Platform.select({ web: { transition: 'width 0.3s ease' } as any, default: {} }),
  },
  logoSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoRowCollapsed: {
    justifyContent: 'center',
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    flexShrink: 1,
  },
  logoTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  logoSubtitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  navScroll: {
    flex: 1,
  },
  navigation: {
    padding: 12,
    gap: 2,
  },
  navigationCollapsed: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    ...Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  navItemCollapsed: {
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  navItemActive: {
    borderWidth: 1,
  },
  navItemPressed: {
    opacity: 0.7,
  },
  navItemLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bottomSection: {
    borderTopWidth: 1,
    padding: 12,
    gap: 2,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 40,
  },
  drawerSlide: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    borderRightWidth: 1,
    zIndex: 50,
    flexDirection: 'column',
    ...Platform.select({ web: { transition: 'transform 0.3s ease' } as any, default: {} }),
  },
  drawerSlideOpen: {
    ...Platform.select({ web: { transform: [{ translateX: 0 }] } as any, default: { transform: [{ translateX: 0 }] } }),
  },
  drawerSlideClosed: {
    ...Platform.select({ web: { transform: [{ translateX: -280 }] } as any, default: { transform: [{ translateX: -280 }] } }),
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  drawerScroll: {
    flex: 1,
  },
  stackedToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedContainer: {
    borderBottomWidth: 1,
  },
  stackedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  stackedNav: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  stackedNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  stackedNavLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  stackedHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stackedActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
