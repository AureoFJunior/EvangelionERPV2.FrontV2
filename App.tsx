import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Products } from './components/Products';
import { Customers } from './components/Customers';
import { Orders } from './components/Orders';
import { Employees } from './components/Employees';
import { Reports } from './components/Reports';
import { Login } from './components/Login';

function AppContent() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const { isAuthenticated, loading } = useAuth();

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
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDot} />
        </View>
      ) : !isAuthenticated ? (
        <Login />
      ) : Platform.OS === 'web' ? (
        <View style={styles.webLayout}>
          <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
          <View style={styles.mainContent}>
            {renderModule()}
          </View>
        </View>
      ) : (
        <View style={styles.mobileLayout}>
          <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
          <View style={styles.mainContent}>
            {renderModule()}
          </View>
        </View>
      )}
    </View>
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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#7f3ff2',
  },
  webLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileLayout: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
});
