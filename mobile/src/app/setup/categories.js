import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../config/useOnboardingStore';

const CATEGORIES = [
  { id: 'webdesign',   label: 'Web Design',     icon: 'color-palette-outline',    color: '#6366f1' },
  { id: 'cleaning',    label: 'Cleaning',        icon: 'sparkles-outline',         color: '#0ea5e9' },
  { id: 'plumbing',    label: 'Plumbing',        icon: 'construct-outline',        color: '#64748b' },
  { id: 'electrical',  label: 'Electrical',      icon: 'flash-outline',            color: '#f59e0b' },
  { id: 'delivery',    label: 'Delivery',        icon: 'cube-outline',             color: '#f97316' },
  { id: 'tutoring',    label: 'Tutoring',        icon: 'book-outline',             color: '#8b5cf6' },
  { id: 'photography', label: 'Photography',     icon: 'camera-outline',           color: '#ec4899' },
  { id: 'moving',      label: 'Moving',          icon: 'car-outline',              color: '#14b8a6' },
  { id: 'gardening',   label: 'Gardening',       icon: 'leaf-outline',             color: '#22c55e' },
  { id: 'cooking',     label: 'Cooking',         icon: 'restaurant-outline',       color: '#ef4444' },
  { id: 'beauty',      label: 'Beauty & Hair',   icon: 'cut-outline',              color: '#a855f7' },
  { id: 'techsupport', label: 'Tech Support',    icon: 'laptop-outline',           color: '#3b82f6' },
];

function CategoryChip({ item, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.8}
      onPress={() => onPress(item.id)}
    >
      {selected && (
        <LinearGradient
          colors={[item.color + '22', item.color + '08']}
          style={StyleSheet.absoluteFill}
          borderRadius={16}
        />
      )}

      {/* Icon circle */}
      <View style={[
        styles.iconCircle,
        { backgroundColor: selected ? item.color : '#f3f4f6' },
      ]}>
        <Ionicons
          name={item.icon}
          size={22}
          color={selected ? '#ffffff' : '#9ca3af'}
        />
      </View>

      <Text style={[styles.chipLabel, selected && { color: item.color, fontWeight: '700' }]}>
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
  const [error, setError] = useState(null);

  const toggle = (id) => {
    setError(null);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

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

      {/* ── Title ──────────────────────────────────────────────────────────── */}
      <View style={styles.titleArea}>
        <Text style={styles.title}>What are you interested in?</Text>
        <Text style={styles.subtitle}>
          Pick your categories — select all that apply
        </Text>
        {selected.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{selected.length} selected</Text>
          </View>
        )}
      </View>

      {/* ── Grid ───────────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map((item) => (
          <CategoryChip
            key={item.id}
            item={item}
            selected={selected.includes(item.id)}
            onPress={toggle}
          />
        ))}

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
              {selected.length === 0 ? 'Select at least one' : 'Continue'}
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
  titleArea: { paddingHorizontal: 24, marginBottom: 16 },
  title: {
    fontSize: 26, fontWeight: '800', color: '#1e1b4b',
    letterSpacing: -0.5, marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  badge: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: '#ede9fe', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingBottom: 48, gap: 10,
  },
  chip: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 16, borderWidth: 2, borderColor: '#f3f4f6',
    padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    position: 'relative', overflow: 'hidden',
  },
  chipSelected: {
    borderColor: '#4f46e5',
    shadowColor: '#4f46e5', shadowOpacity: 0.15,
    shadowRadius: 8, elevation: 4,
  },
  iconCircle: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  chipLabel: {
    fontSize: 13, fontWeight: '600', color: '#374151',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, width: '100%', paddingHorizontal: 4, marginTop: 4,
  },
  errorText: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
  continueBtn: {
    width: '100%', borderRadius: 16,
    overflow: 'hidden', marginTop: 8,
  },
  continueBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 17, gap: 8,
  },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
});
