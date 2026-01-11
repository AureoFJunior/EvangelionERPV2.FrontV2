import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Modal, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { useResponsive } from '../hooks/useResponsive';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  layout?: 'side' | 'stacked';
}

export function Sidebar({ activeModule, setActiveModule, layout = 'side' }: SidebarProps) {
  const { colors, theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const { isCompact } = useResponsive();
  const isStacked = layout === 'stacked';
  const isDrawerLayout = isStacked && isCompact;
  const baseSidebarWidth = 270;
  const showProfile = !isCompact;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const avatarUri = user?.avatarUrl?.trim() ?? '';
  const defaultAvatar = require('../assets/images/icon.png');
  const avatarSource = avatarUri && !avatarError ? { uri: avatarUri } : defaultAvatar;
  const displayName = user?.name ?? 'User';
  const displayRole = user?.role ?? user?.email ?? 'Operator';

  useEffect(() => {
    if (!isDrawerLayout) {
      setDrawerOpen(false);
    }
  }, [isDrawerLayout]);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUri]);

  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'products', label: 'Products', icon: 'package' },
    { id: 'customers', label: 'Customers', icon: 'users' },
    { id: 'orders', label: 'Orders', icon: 'shopping-cart' },
    { id: 'employees', label: 'Employees', icon: 'briefcase' },
    { id: 'reports', label: 'Reports', icon: 'file-text' },
  ];

  const handleSelectModule = (moduleId: string) => {
    setActiveModule(moduleId);
    if (isDrawerLayout) {
      setDrawerOpen(false);
    }
  };

  const renderHeader = (showToggle: boolean, toggleIcon: 'menu' | 'x', onToggle: () => void) => (
    <View style={[styles.header, { borderColor: colors.cardBorder }, isCompact && styles.headerCompact]}>
      <View style={styles.headerRow}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoBox, { borderColor: colors.cardBorder }, isCompact && styles.logoBoxCompact]}>
            <Image source={require('../assets/images/icon.png')} style={styles.logoImage} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.neonGreen }, isCompact && styles.titleCompact]}>
              NERV ERP
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }, isCompact && styles.subtitleCompact]}>
              System Online
            </Text>
          </View>
        </View>
        {showToggle && (
          <TouchableOpacity onPress={onToggle} style={[styles.menuButton, { borderColor: colors.cardBorder }]}>
            <Feather name={toggleIcon} size={18} color={colors.neonGreen} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderNavigation = () => (
    <View style={[styles.navigation, isStacked && styles.navigationStacked, isCompact && styles.navigationCompact]}>
      {modules.map((module) => {
        const isActive = activeModule === module.id;
        return (
          <TouchableOpacity
            key={module.id}
            onPress={() => handleSelectModule(module.id)}
            testID={`sidebar-nav-${module.id}`}
            style={[
              styles.navButton,
              {
                borderColor: colors.cardBorder,
                backgroundColor: isActive ? colors.hoverBg : colors.sidebarBgFrom,
              },
              isActive && { borderColor: colors.primaryPurple },
              isStacked && styles.navButtonStacked,
              isStacked && isCompact && styles.navButtonStackedCompact,
              isCompact && styles.navButtonCompact,
            ]}
          >
            <Feather
              name={module.icon as any}
              size={20}
              color={isActive ? colors.neonGreen : colors.textSecondary}
            />
            <Text
              style={[
                styles.navButtonText,
                { color: isActive ? colors.neonGreen : colors.textSecondary },
                isCompact && styles.navButtonTextCompact,
              ]}
            >
              {module.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderMenuContent = () => (
    <>
      {/* User Profile */}
      {showProfile && (
        <View style={[styles.profileSection, { borderColor: colors.cardBorder }]}>
          <View style={[styles.profileCard, { backgroundColor: `${colors.hoverBg}`, borderColor: `${colors.cardBorder}` }]}>
            <View style={styles.avatarContainer}>
              <Image
                source={avatarSource}
                style={[styles.avatar, { borderColor: colors.neonGreen }]}
                onError={() => setAvatarError(true)}
              />
              <View style={[styles.statusDot, { backgroundColor: colors.neonGreen, borderColor: colors.sidebarBgTo }]} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.textPrimary }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.profileRole, { color: colors.primaryPurple }]} numberOfLines={1}>
                {displayRole}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Theme Toggle */}
      <View style={[styles.themeSection, { borderColor: colors.cardBorder }, isCompact && styles.themeSectionCompact]}>
        <ThemeToggle />
      </View>

      {/* Navigation */}
      {renderNavigation()}
    </>
  );

  const renderFooter = () => (
    <View
      style={[
        styles.footer,
        {
          borderColor: colors.cardBorder,
          backgroundColor: colors.sidebarBgTo,
          borderTopWidth: isStacked ? 2 : 2,
        },
        isStacked && styles.footerStacked,
        isCompact && styles.footerCompact,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.logoutButton,
          isStacked && styles.logoutButtonStacked,
          isCompact && styles.logoutButtonCompact,
        ]}
        onPress={logout}
        testID="sidebar-logout"
      >
        <Feather name="log-out" size={16} color={colors.accentOrange} />
        <Text style={[styles.logoutText, { color: colors.accentOrange }]}>Logout</Text>
      </TouchableOpacity>
      <View style={[styles.statusDot, { backgroundColor: colors.neonGreen, position: 'relative' }]} />
      <Text style={[styles.footerText, { color: colors.textMuted }]} numberOfLines={1}>
        System Status: Active
      </Text>
    </View>
  );

  if (isDrawerLayout) {
    return (
      <View
        style={[
          styles.container,
          styles.compactContainer,
          {
            backgroundColor: colors.sidebarBgFrom,
            borderColor: colors.cardBorder,
            width: '100%',
            borderRightWidth: 0,
            borderBottomWidth: 2,
          },
        ]}
      >
        <View style={[styles.topBar, { borderColor: colors.cardBorder }]}>
          <View style={[styles.logoContainer, styles.topBarLogo]}>
            <View style={[styles.logoBox, { borderColor: colors.cardBorder }, styles.logoBoxCompact]}>
              <Image source={require('../assets/images/icon.png')} style={styles.logoImage} />
            </View>
            <View>
              <Text style={[styles.title, { color: colors.neonGreen }, styles.titleCompact]}>NERV ERP</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }, styles.subtitleCompact]}>
                System Online
              </Text>
            </View>
          </View>
          <View style={styles.topBarActions}>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.cardBorder }]}
              onPress={toggleTheme}
            >
              <Feather name={theme === 'light' ? 'sun' : 'moon'} size={16} color={colors.neonGreen} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.cardBorder }]}
              onPress={logout}
            >
              <Feather name="log-out" size={16} color={colors.accentOrange} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuButton, { borderColor: colors.cardBorder }]}
              onPress={() => setDrawerOpen(true)}
            >
              <Feather name="menu" size={18} color={colors.neonGreen} />
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={drawerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setDrawerOpen(false)}
        >
          <View style={styles.drawerBackdrop}>
            <Pressable style={styles.backdropPressable} onPress={() => setDrawerOpen(false)} />
            <View
              style={[
                styles.drawerPanel,
                { backgroundColor: colors.sidebarBgFrom, borderColor: colors.cardBorder },
              ]}
            >
              {renderHeader(true, 'x', () => setDrawerOpen(false))}
              <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerContent}>
                {renderMenuContent()}
              </ScrollView>
              {renderFooter()}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.sidebarBgFrom,
          borderColor: colors.cardBorder,
          width: isStacked ? '100%' : baseSidebarWidth,
          borderRightWidth: isStacked ? 0 : 2,
          borderBottomWidth: isStacked ? 2 : 0,
        },
      ]}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={isStacked ? styles.scrollContent : undefined}>
        {renderHeader(false, 'menu', () => undefined)}
        {renderMenuContent()}
      </ScrollView>
      {renderFooter()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 270,
    borderRightWidth: 2,
    flexDirection: 'column',
    width: 270,
    borderRightWidth: 2,
    flexDirection: 'column',
    flexShrink: 0,
  },
  compactContainer: {
    flexShrink: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    padding: 24,
    borderBottomWidth: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCompact: {
    padding: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarLogo: {
    flex: 1,
    minWidth: 0,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  logoBoxCompact: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  titleCompact: {
    fontSize: 14,
    letterSpacing: 1.4,
  },
  subtitle: {
    fontSize: 10,
  },
  subtitleCompact: {
    fontSize: 9,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 8, 18, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerPanel: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    maxHeight: '92%',
    width: '100%',
  },
  drawerScroll: {
    flex: 1,
  },
  drawerContent: {
    paddingBottom: 12,
  },
  profileSection: {
    padding: 16,
    borderBottomWidth: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  profileRole: {
    fontSize: 10,
    marginTop: 2,
  },
  themeSection: {
    padding: 16,
    borderBottomWidth: 2,
  },
  themeSectionCompact: {
    padding: 12,
  },
  navigation: {
    padding: 16,
    gap: 8,
  },
  navigationCompact: {
    padding: 12,
  },
  navigationStacked: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  navButtonCompact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  navButtonStacked: {
    minWidth: '47%',
    flexGrow: 1,
  },
  navButtonStackedCompact: {
    minWidth: '100%',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  navButtonTextCompact: {
    fontSize: 13,
  },
  footer: {
    padding: 16,
    borderTopWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  footerCompact: {
    padding: 12,
    gap: 8,
  },
  footerStacked: {
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 10,
    flexShrink: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutButtonStacked: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  logoutButtonCompact: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
