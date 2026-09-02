import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../config/useOnboardingStore';
import { CATEGORIES, CATEGORY_GROUPS } from '../../config/categoriesData';

function CategoryChip({ item, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.8}
      onPress={() => onPress(item.id)}
    >
      {selected && (
        <LinearGradient
          colors={[item.color + '25', item.color + '0a']}
          style={StyleSheet.absoluteFill}
          borderRadius={14}
        />
      )}

      {/* Icon circle */}
      <View style={[
        styles.iconCircle,
        { backgroundColor: selected ? item.color : '#f3f4f6' },
      ]}>
        <Ionicons
          name={item.icon}
          size={18}
          color={selected ? '#ffffff' : '#6b7280'}
        />
      </View>

      <Text
        style={[styles.chipLabel, selected && { color: item.color, fontWeight: '700' }]}
        numberOfLines={2}
      >
        {item.label}
      </Text>

      {selected && (
        <View style={[styles.checkmark, { backgroundColor: item.color }]}>
          <Ionicons name="checkmark" size={10} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function CategoriesScreen() {
  const { update } = useOnboarding();
  const [selected, setSelected] = useState([]);
  const [activeGroup, setActiveGroup] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const toggle = (id) => {
    setError(null);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredCategories = CATEGORIES.filter((item) => {
    const matchesGroup = activeGroup === 'all' || item.group === activeGroup;
    const matchesSearch =
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const handleContinue = () => {
    if (selected.length === 0) {
      setError('Please select at least one category to continue.');
      return;
    }
    update({ categories: selected });
    router.push('/setup/complete');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
        </TouchableOpacity>
        <View style={styles.stepRow}>
          {[1,2,3,4,5].map((s) => (
            <View key={s} style={[styles.stepDot, s <= 4 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>4 of 5</Text>
      </View>

      {/* ── Title Area ────────────────────────────────────────────────────── */}
      <View style={styles.titleArea}>
        <Text style={styles.title}>What are you interested in?</Text>
        <Text style={styles.subtitle}>
          Browse 150+ categories — select all services you offer or need
        </Text>
        <View style={styles.badgeRow}>
          {selected.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selected.length} selected</Text>
            </View>
          )}
          <Text style={styles.countInfo}>{CATEGORIES.length} total categories</Text>
        </View>
      </View>

      {/* ── Search Bar ────────────────────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search 150+ categories e.g. Plumbing, App Dev..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Category Groups Filter Pills ──────────────────────────────────── */}
      <View style={styles.groupsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupsScroll}
        >
          {CATEGORY_GROUPS.map((g) => {
            const isActive = activeGroup === g.id;
            return (
              <TouchableOpacity
                key={g.id}
                style={[styles.groupPill, isActive && styles.groupPillActive]}
                onPress={() => setActiveGroup(g.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.groupPillText, isActive && styles.groupPillTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── 3-per-row Grid ─────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.grid}>
          {filteredCategories.map((item) => (
            <CategoryChip
              key={item.id}
              item={item}
              selected={selected.includes(item.id)}
              onPress={toggle}
            />
          ))}
        </View>

        {filteredCategories.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="search" size={32} color="#9ca3af" />
            <Text style={styles.emptyText}>No categories found matching "{searchQuery}"</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={15} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Continue ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.88}
          onPress={handleContinue}
        >
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnGradient}
          >
            <Text style={styles.continueBtnText}>
              {selected.length === 0 ? 'Select at least one' : `Continue (${selected.length})`}
            </Text>
            {selected.length > 0 && (
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f1f0ff', alignItems: 'center', justifyContent: 'center',
  },
  stepRow: { flex: 1, flexDirection: 'row', gap: 5 },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' },
  stepDotActive: { backgroundColor: '#4f46e5' },
  stepLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  titleArea: { paddingHorizontal: 20, marginBottom: 12 },
  title: {
    fontSize: 24, fontWeight: '800', color: '#1e1b4b',
    letterSpacing: -0.5, marginBottom: 4,
  },
  subtitle: { fontSize: 13.5, color: '#6b7280', lineHeight: 18 },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8,
  },
  badge: {
    backgroundColor: '#ede9fe', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  countInfo: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    marginHorizontal: 20, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e1b4b' },

  groupsWrapper: { marginBottom: 12 },
  groupsScroll: { paddingHorizontal: 20, gap: 8 },
  groupPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  groupPillActive: {
    backgroundColor: '#4f46e5', borderColor: '#4f46e5',
  },
  groupPillText: { fontSize: 12.5, fontWeight: '600', color: '#6b7280' },
  groupPillTextActive: { color: '#ffffff' },

  gridContainer: { paddingHorizontal: 16, paddingBottom: 48 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  chip: {
    width: '31.4%',
    backgroundColor: '#ffffff',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6',
    paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    position: 'relative', overflow: 'hidden', minHeight: 92,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: '#4f46e5',
    shadowColor: '#4f46e5', shadowOpacity: 0.15,
    shadowRadius: 6, elevation: 3,
  },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  chipLabel: {
    fontSize: 11.5, fontWeight: '600', color: '#374151',
    textAlign: 'center', lineHeight: 14,
  },
  checkmark: {
    position: 'absolute', top: 5, right: 5,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyBox: {
    paddingVertical: 32, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  errorRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, width: '100%', paddingHorizontal: 4, marginTop: 8,
  },
  errorText: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
  continueBtn: {
    width: '100%', borderRadius: 16,
    overflow: 'hidden', marginTop: 16,
  },
  continueBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 17, gap: 8,
  },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
});

