import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CATEGORIES, CATEGORY_GROUPS } from '../../../config/categoriesData';

const GROUP_COLORS = {
  home: '#0ea5e9',
  tech: '#8b5cf6',
  events: '#ec4899',
  transport: '#f59e0b',
  wellness: '#10b981',
  business: '#4f46e5',
};

export default function Home() {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');

  const groups = useMemo(
    () => [{ id: 'all', label: 'All' }, ...CATEGORY_GROUPS.filter((g) => g.id !== 'all')],
    []
  );

  // Filter categories based on the selected group pill.
  const visibleCategories = useMemo(
    () =>
      selectedGroup === 'all'
        ? CATEGORIES
        : CATEGORIES.filter((c) => c.group === selectedGroup),
    [selectedGroup]
  );

  const openCategory = (cat) => {
    Keyboard.dismiss();
    router.push({
      pathname: '/results',
      params: { type: 'category', id: cat.id, title: cat.label },
    });
  };

  const onSearch = () => {
    const q = search.trim();
    if (!q) return;
    Keyboard.dismiss();
    router.push({
      pathname: '/results',
      params: { type: 'search', q, title: `"${q}"` },
    });
  };

  const renderCategory = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.catItem}
      activeOpacity={0.7}
      onPress={() => openCategory(item)}
    >
      <View style={[styles.catCircle, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon} size={26} color="#ffffff" />
      </View>
      <Text style={styles.catName} numberOfLines={2}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.title}>TaskLink</Text>
          </View>
          <TouchableOpacity style={styles.avatar} activeOpacity={0.8}>
            <Ionicons name="person" size={22} color="#4f46e5" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a task or service..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={onSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#c4b5fd" />
            </TouchableOpacity>
          )}
        </View>

        {/* Group filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupRow}
        >
          {groups.map((g) => {
            const active = g.id === selectedGroup;
            return (
              <TouchableOpacity
                key={g.id}
                style={[styles.groupPill, active && styles.groupPillActive]}
                activeOpacity={0.8}
                onPress={() => setSelectedGroup(g.id)}
              >
                <View
                  style={[
                    styles.groupDot,
                    { backgroundColor: active ? '#ffffff' : GROUP_COLORS[g.id] || '#4f46e5' },
                  ]}
                />
                <Text style={[styles.groupText, active && styles.groupTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Categories section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedGroup === 'all'
              ? 'Browse Categories'
              : groups.find((g) => g.id === selectedGroup)?.label || 'Categories'}
          </Text>
          <Text style={styles.sectionCount}>{visibleCategories.length} services</Text>
        </View>

        <View style={styles.catsBox}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catsRow}
          >
            {visibleCategories.map((item) => renderCategory(item))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  root: { flex: 1 },
  content: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  greeting: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 2 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.5,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eef2ff',
    borderWidth: 2,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 22,
    marginTop: 20,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1e1b4b' },

  groupRow: { paddingHorizontal: 22, paddingTop: 18, gap: 10 },
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 38,
    borderWidth: 1.5,
    borderColor: '#eef0f4',
    gap: 8,
  },
  groupPillActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  groupTextActive: { color: '#ffffff' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginTop: 28,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.3,
  },
  sectionCount: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },

  catsBox: { marginBottom: 8 },
  catsRow: { paddingHorizontal: 22, gap: 18 },

  catItem: { alignItems: 'center', width: 74 },
  catCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  catName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
    maxWidth: 74,
  },
});
