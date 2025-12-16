import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeColors {
  appBg: string;
  appText: string;
  cardBgFrom: string;
  cardBgTo: string;
  cardBorder: string;
  sidebarBgFrom: string;
  sidebarBgTo: string;
  primaryPurple: string;
  secondaryPurple: string;
  neonGreen: string;
  accentOrange: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  inputBgFrom: string;
  inputBgTo: string;
  hoverBg: string;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const lightColors: ThemeColors = {
  appBg: '#f6f7fb',
  appText: '#0f1221',
  cardBgFrom: '#ffffff',
  cardBgTo: '#f4f5ff',
  cardBorder: '#d6d8ff',
  sidebarBgFrom: '#ffffff',
  sidebarBgTo: '#f0f2ff',
  primaryPurple: '#6f4cff',
  secondaryPurple: '#9d7bff',
  neonGreen: '#00c27a',
  accentOrange: '#ff7a45',
  textPrimary: '#16192a',
  textSecondary: '#4c5070',
  textMuted: '#80849c',
  inputBgFrom: '#ffffff',
  inputBgTo: '#f3f5ff',
  hoverBg: '#eceeff',
};

const darkColors: ThemeColors = {
  appBg: '#0b0c14',
  appText: '#e6e8f5',
  cardBgFrom: '#111325',
  cardBgTo: '#0c0f1e',
  cardBorder: '#2f2f4a',
  sidebarBgFrom: '#0f1022',
  sidebarBgTo: '#0a0c18',
  primaryPurple: '#7c4dff',
  secondaryPurple: '#9f76ff',
  neonGreen: '#34f5a6',
  accentOrange: '#ff8b5f',
  textPrimary: '#eef0fa',
  textSecondary: '#b6b9d4',
  textMuted: '#7b7f99',
  inputBgFrom: '#14172b',
  inputBgTo: '#0d1020',
  hoverBg: '#1f2340',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
