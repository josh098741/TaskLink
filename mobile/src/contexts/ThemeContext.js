import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { Appearance } from 'react-native';

export const THEME_STORAGE_KEY = 'tasklink_theme';
export const DEFAULT_THEME = 'light';

const ThemeContext = createContext(null);

const lightColors = {
  background: '#fafafa',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceMuted: '#f8fafc',
  text: '#1e1b4b',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  textInverse: '#ffffff',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  input: '#ffffff',
  primary: '#4f46e5',
  primaryBright: '#6366f1',
  primarySoft: '#eef2ff',
  primaryMuted: '#c7d2fe',
  success: '#10b981',
  successSoft: '#ecfdf5',
  warning: '#f59e0b',
  warningSoft: '#fffbeb',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  shadow: '#000000',
  overlay: 'rgba(15, 23, 42, 0.5)',
  tabBar: '#ffffff',
  tabBarBorder: '#e2e8f0',
  skeleton: '#e5e7eb',
};

const darkColors = {
  background: '#0b1120',
  surface: '#111827',
  surfaceElevated: '#172033',
  surfaceMuted: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textInverse: '#0f172a',
  border: '#334155',
  borderStrong: '#475569',
  input: '#0f172a',
  primary: '#818cf8',
  primaryBright: '#a5b4fc',
  primarySoft: '#1e1b4b',
  primaryMuted: '#4f46e5',
  success: '#34d399',
  successSoft: '#064e3b',
  warning: '#fbbf24',
  warningSoft: '#451a03',
  danger: '#f87171',
  dangerSoft: '#450a0a',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.65)',
  tabBar: '#111827',
  tabBarBorder: '#334155',
  skeleton: '#1e293b',
};

export const themePalettes = {
  light: lightColors,
  dark: darkColors,
};

function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : DEFAULT_THEME;
}

function applyNativeAppearance(theme) {
  if (typeof Appearance?.setColorScheme === 'function') {
    Appearance.setColorScheme(theme);
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [isHydrated, setIsHydrated] = useState(false);
  const { setColorScheme: setNativeWindColorScheme } = useNativeWindColorScheme();

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedTheme) => {
        if (active) setThemeState(normalizeTheme(storedTheme));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(THEME_STORAGE_KEY, theme).catch(() => {});
  }, [isHydrated, theme]);

  useEffect(() => {
    applyNativeAppearance(theme);
    setNativeWindColorScheme?.(theme);
  }, [setNativeWindColorScheme, theme]);

  const setTheme = useCallback((nextTheme) => {
    setThemeState(normalizeTheme(nextTheme));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      isHydrated,
      colors: themePalettes[theme],
      setTheme,
      toggleTheme,
    }),
    [isHydrated, setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context) return context;

  return {
    theme: DEFAULT_THEME,
    isDark: false,
    isHydrated: true,
    colors: lightColors,
    setTheme: () => {},
    toggleTheme: () => {},
  };
}
