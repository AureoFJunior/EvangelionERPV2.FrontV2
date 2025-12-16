import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
}

export function Sidebar({ activeModule, setActiveModule }: SidebarProps) {
  const { colors } = useTheme();
  const { logout } = useAuth();

  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'products', label: 'Products', icon: 'package' },
    { id: 'customers', label: 'Customers', icon: 'users' },
    { id: 'orders', label: 'Orders', icon: 'shopping-cart' },
    { id: 'employees', label: 'Employees', icon: 'briefcase' },
    { id: 'reports', label: 'Reports', icon: 'file-text' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebarBgFrom, borderColor: colors.cardBorder }]}>
      <ScrollView style={styles.scrollView}>
        {/* Logo/Header */}
        <View style={[styles.header, { borderColor: colors.cardBorder }]}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoBox, { backgroundColor: colors.primaryPurple }]}>
              <Text style={[styles.logoText, { color: colors.neonGreen }]}>E</Text>
            </View>
            <View>
              <Text style={[styles.title, { color: colors.neonGreen }]}>NERV ERP</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>System Online</Text>
            </View>
          </View>
        </View>

        {/* User Profile */}
        <View style={[styles.profileSection, { borderColor: colors.cardBorder }]}>
          <View style={[styles.profileCard, { backgroundColor: `${colors.hoverBg}`, borderColor: `${colors.cardBorder}` }]}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200' }}
                style={[styles.avatar, { borderColor: colors.neonGreen }]}
              />
              <View style={[styles.statusDot, { backgroundColor: colors.neonGreen, borderColor: colors.sidebarBgTo }]} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.textPrimary }]}>Shinji Ikari</Text>
              <Text style={[styles.profileRole, { color: colors.primaryPurple }]}>Administrator</Text>
            </View>
          </View>
        </View>

        {/* Theme Toggle */}
        <View style={[styles.themeSection, { borderColor: colors.cardBorder }]}>
          <ThemeToggle />
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          {modules.map((module) => {
            const isActive = activeModule === module.id;
            return (
              <TouchableOpacity
                key={module.id}
                onPress={() => setActiveModule(module.id)}
                style={[
                  styles.navButton,
                  {
                    borderColor: colors.cardBorder,
                    backgroundColor: isActive ? colors.hoverBg : colors.sidebarBgFrom,
                  },
                  isActive && { borderColor: colors.primaryPurple },
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
                  ]}
                >
                  {module.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Status Footer */}
      <View style={[styles.footer, { borderColor: colors.cardBorder, backgroundColor: colors.sidebarBgTo }]}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Feather name="log-out" size={16} color={colors.accentOrange} />
          <Text style={[styles.logoutText, { color: colors.accentOrange }]}>Logout</Text>
        </TouchableOpacity>
        <View style={[styles.statusDot, { backgroundColor: colors.neonGreen }]} />
        <Text style={[styles.footerText, { color: colors.textMuted }]}>System Status: Active</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 270,
    borderRightWidth: 2,
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    borderBottomWidth: 2,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 10,
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
  navigation: {
    padding: 16,
    gap: 8,
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
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  footer: {
    padding: 16,
    borderTopWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    fontSize: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
