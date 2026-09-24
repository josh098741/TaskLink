import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const darkTextColors = {
  '#14141c': '#f8fafc',
  '#1e1b4b': '#f8fafc',
  '#1f2937': '#f8fafc',
  '#1e293b': '#f8fafc',
  '#374151': '#e2e8f0',
  '#4b5563': '#cbd5e1',
  '#6b7280': '#cbd5e1',
  '#64748b': '#94a3b8',
  '#9ca3af': '#94a3b8',
  '#c7d2fe': '#a5b4fc',
  '#3730a3': '#a5b4fc',
  '#92400e': '#fcd34d',
  '#b45309': '#fbbf24',
  '#059669': '#34d399',
  '#dc2626': '#f87171',
  '#d1d5db': '#cbd5e1',
  '#e5e7eb': '#cbd5e1',
  '#eef0f4': '#cbd5e1',
  '#f1f5f9': '#cbd5e1',
};

const darkBackgroundColors = {
  '#ffffff': '#111827',
  '#fff': '#111827',
  '#fafafa': '#0b1120',
  '#f9fafb': '#111827',
  '#f8fafc': '#172033',
  '#f7f7fb': '#0b1120',
  '#f6f6fb': '#172033',
  '#f3f4f6': '#1e293b',
  '#f3f1ff': '#1e1b4b',
  '#f5f3ff': '#1e1b4b',
  '#f5f4ff': '#1e1b4b',
  '#f1f0ff': '#1e1b4b',
  '#f1f0f8': '#1e293b',
  '#eef2ff': '#1e1b4b',
  '#eef0f4': '#172033',
  '#f1f5f9': '#172033',
  '#e5e7eb': '#1e293b',
  '#d1d5db': '#334155',
  '#e0e7ff': '#312e81',
  '#ede9fe': '#312e81',
  '#eef2f2': '#1e293b',
  '#ecfdf5': '#064e3b',
  '#f0fdf4': '#052e16',
  '#fef3c7': '#451a03',
  '#fffbeb': '#451a03',
  '#ffedd5': '#431407',
  '#fee2e2': '#450a0a',
  '#fef2f2': '#450a0a',
  '#dcfce7': '#052e16',
  '#e0f2fe': '#0c4a6e',
  '#f0f9ff': '#0c4a6e',
  '#fdf2f8': '#4c1d95',
  '#fdf4ff': '#4c1d95',
  '#fefce8': '#451a03',
  '#f3e8ff': '#4c1d95',
  '#c7d2fe': '#312e81',
};

const darkBorderColors = {
  '#ffffff': '#334155',
  '#f3f4f6': '#334155',
  '#f1f5f9': '#334155',
  '#e5e7eb': '#334155',
  '#e2e8f0': '#334155',
  '#eef0f4': '#334155',
  '#d1d5db': '#475569',
  '#e0e7ff': '#6366f1',
  '#ede9fe': '#6366f1',
  '#c7d2fe': '#6366f1',
  '#bbf7d0': '#166534',
  '#e9e7f5': '#334155',
};

const colorKeys = new Set([
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderStartColor',
  'borderEndColor',
  'shadowColor',
  'tintColor',
  'placeholderTextColor',
  'selectionColor',
]);

function normalizeColor(value) {
  if (typeof value !== 'string') return value;
  const compact = value.replace(/\s/g, '').toLowerCase();
  if (compact.startsWith('#')) return compact;
  return value;
}

function isTextKey(key) {
  return key === 'color' || key === 'placeholderTextColor' || key === 'selectionColor' || key === 'tintColor';
}

function isBackgroundKey(key) {
  return key === 'backgroundColor';
}

function isBorderKey(key) {
  return key.startsWith('border') && key.endsWith('Color');
}

function mapColor(value, key, isDark) {
  if (!isDark || typeof value !== 'string') return value;
  const compact = normalizeColor(value);
  if (!compact.startsWith('#')) return value;

  if (isTextKey(key)) {
    return darkTextColors[compact] || value;
  }
  if (isBackgroundKey(key)) {
    return darkBackgroundColors[compact] || value;
  }
  if (isBorderKey(key)) {
    return darkBorderColors[compact] || value;
  }
  if (key === 'shadowColor' && (compact === '#000' || compact === '#000000')) {
    return '#000000';
  }
  return value;
}

function mapStyleValue(value, key, isDark) {
  if (Array.isArray(value)) {
    return value.map((entry) => mapStyleValue(entry, key, isDark));
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      result[childKey] = colorKeys.has(childKey) || childKey.endsWith('Color')
        ? mapColor(childValue, childKey, isDark)
        : mapStyleValue(childValue, childKey, isDark);
    }
    return result;
  }
  return mapColor(value, key, isDark);
}

function mapStyle(style, isDark) {
  const flattened = StyleSheet.flatten(style) || {};
  return mapStyleValue(flattened, '', isDark);
}

export function createThemedStyles(styles, isDark) {
  if (!isDark || !styles) return styles;
  return Object.fromEntries(
    Object.entries(styles).map(([name, style]) => [name, mapStyle(style, isDark)])
  );
}

export function useThemedStyles(styles) {
  const { isDark } = useTheme();
  return useMemo(() => createThemedStyles(styles, isDark), [isDark, styles]);
}

export function getThemedColor(value, key = 'color', isDark = false) {
  return mapColor(value, key, isDark);
}

export { mapStyleValue };
