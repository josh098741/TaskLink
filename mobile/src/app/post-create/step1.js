import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePost } from '../../config/usePostStore';
import { CATEGORIES, CATEGORY_GROUPS } from '../../config/categoriesData';

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

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

export default function Step1() {
  const { data, update } = usePost();
  const [category, setCategory] = useState(data.category);
  const [title, setTitle] = useState(data.title);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeGroup, setActiveGroup] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState({});

  const selectedLabel = category ? CATEGORY_MAP[category] || null : null;

  const filteredCategories = CATEGORIES.filter((item) => {
    const matchesGroup = activeGroup === 'all' || item.group === activeGroup;
    const matchesSearch =
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const selectCategory = (id) => {
    setCategory(id);
    setModalVisible(false);
    setSearchQuery('');
    setErrors((e) => ({ ...e, category: null }));
  };

  const handleContinue = () => {
    const e = {};
    if (!title.trim()) e.title = 'Job title is required.';
    if (!category) e.category = 'Please select a category.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    update({ title: title.trim(), category });
    router.push('/post-create/step2');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#1e1b4b" />
        </TouchableOpacity>
        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View key={s} style={[styles.stepDot, s === 1 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>1 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What do you need?</Text>
        <Text style={styles.subtitle}>Start with a clear title and category</Text>

        <Text style={styles.label}>
          Job Title <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputWrapper, errors.title && styles.inputError]}>
          <Ionicons name="pencil-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder='e.g. "Fix leaking kitchen tap"'
            placeholderTextColor="#d1d5db"
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              if (t.trim()) setErrors((e) => ({ ...e, title: null }));
            }}
            maxLength={80}
          />
        </View>
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

        <Text style={[styles.label, { marginTop: 20 }]}>
          Category <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.inputWrapper, errors.category && styles.inputError]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="grid-outline"
            size={18}
            color={category ? '#4f46e5' : '#9ca3af'}
            style={styles.inputIcon}
          />
          <Text style={[styles.selectText, !selectedLabel && styles.placeholderText]}>
            {selectedLabel || 'Select a category'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
          {selectedLabel ? (
            <TouchableOpacity
              onPress={() => setCategory(null)}
              style={{ marginLeft: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#d1d5db" />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        <Text style={styles.hint}>150+ categories available — pick the best fit</Text>

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
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Category Selection Modal ─────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Category</Text>
                <Text style={styles.modalSubtitle}>What type of task is this?</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#9ca3af" />
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

            {/* Group filter pills */}
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

            {/* Grid */}
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
                    selected={item.id === category}
                    onPress={selectCategory}
                  />
                ))}
              </View>
              {filteredCategories.length === 0 && (
                <View style={styles.emptyBox}>
                  <Ionicons name="search" size={32} color="#9ca3af" />
                  <Text style={styles.emptyText}>
                    No categories found matching "{searchQuery}"
                  </Text>
                </View>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  title: {
    fontSize: 28, fontWeight: '800', color: '#1e1b4b',
    letterSpacing: -0.5, marginTop: 8,
  },
  subtitle: { fontSize: 15, color: '#6b7280', marginTop: 4, marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  required: { color: '#ef4444' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 2, borderColor: '#e5e7eb',
    paddingHorizontal: 14, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  inputError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontSize: 16, fontWeight: '500',
    color: '#1e1b4b', paddingVertical: 0,
  },
  selectText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e1b4b' },
  placeholderText: { fontWeight: '400', color: '#9ca3af' },
  hint: { fontSize: 12.5, color: '#9ca3af', marginTop: 6 },
  errorText: { fontSize: 12.5, color: '#ef4444', marginTop: 5, fontWeight: '500' },
  continueBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 32 },
  continueBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 17, gap: 8,
  },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },

  // ── Modal Styles ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e1b4b' },
  modalSubtitle: { fontSize: 12.5, color: '#6b7280', marginTop: 2 },
  closeBtn: { padding: 6, backgroundColor: '#f3f4f6', borderRadius: 20 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, marginHorizontal: 20, marginVertical: 14,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1e1b4b' },
  groupsWrapper: { marginBottom: 12 },
  groupsScroll: { paddingHorizontal: 20, gap: 8 },
  groupPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  groupPillActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  groupPillText: { fontSize: 12.5, fontWeight: '600', color: '#6b7280' },
  groupPillTextActive: { color: '#ffffff' },
  gridContainer: { paddingHorizontal: 16, paddingBottom: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
});
