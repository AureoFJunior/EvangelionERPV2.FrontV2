import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Products } from './components/Products';
import { Customers } from './components/Customers';
import { Orders } from './components/Orders';
import { Employees } from './components/Employees';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { useResponsive } from './hooks/useResponsive';

function LoadingScreen() {
  const { colors } = useTheme();
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
      <Text style={[styles.loadingLabel, { color: colors.textPrimary }]}>BOOTING NERV SYSTEMS</Text>
      <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>
        Synchronizing EVA-01 | LCL pressure stable
      </Text>
    </View>
  );
}

function AppContent() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const { isAuthenticated, loading } = useAuth();
  const { isWide, isTablet, isCompact } = useResponsive();
  const { colors } = useTheme();
  const layoutDirection = isWide ? 'row' : 'column';

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
      case 'employees':
        return <Employees />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.appBg }]} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {loading ? (
          <LoadingScreen />
        ) : !isAuthenticated ? (
          <Login />
        ) : (
          <View
            style={[
              styles.responsiveLayout,
              { flexDirection: layoutDirection },
              !isWide && styles.stackedLayout,
              !isWide && isCompact && styles.stackedLayoutCompact,
            ]}
          >
            <Sidebar
              activeModule={activeModule}
              setActiveModule={setActiveModule}
              layout={isWide ? 'side' : 'stacked'}
            />
            <View
              style={[
                styles.mainContent,
                !isWide && styles.mainContentStacked,
                isTablet && !isWide && styles.mainContentTablet,
                isCompact && !isWide && styles.mainContentCompact,
              ]}
            >
              {renderModule()}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
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
    letterSpacing: 2,
  },
  loadingSub: {
    marginTop: 6,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  responsiveLayout: {
    flex: 1,
  },
  stackedLayout: {
    gap: 12,
  },
  stackedLayoutCompact: {
    gap: 8,
  },
  mainContent: {
    flex: 1,
    minHeight: 0,
  },
  mainContentStacked: {
    width: '100%',
    paddingHorizontal: 12,
  },
  mainContentTablet: {
    paddingHorizontal: 8,
  },
  mainContentCompact: {
    paddingHorizontal: 10,
  },
});
