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

const JOB_CATEGORIES = [
  { id: 'repairs', label: 'Repairs & Fundi', icon: 'construct-outline' },
  { id: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline' },
  { id: 'tutoring', label: 'Tutoring', icon: 'book-outline' },
  { id: 'moving', label: 'Moving & Transport', icon: 'car-outline' },
  { id: 'errands', label: 'Errands', icon: 'basket-outline' },
  { id: 'digital', label: 'Digital/Tech', icon: 'laptop-outline' },
  { id: 'events', label: 'Events', icon: 'calendar-outline' },
  { id: 'delivery', label: 'Delivery/Collection', icon: 'cube-outline' },
  { id: 'gardening', label: 'Gardening', icon: 'leaf-outline' },
  { id: 'general', label: 'General Help', icon: 'people-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function Step1() {
  const { data, update } = usePost();
  const [title, setTitle] = useState(data.title);
  const [category, setCategory] = useState(data.category);
  const [modalVisible, setModalVisible] = useState(false);
  const [errors, setErrors] = useState({});

  const selectedCategory = category ? JOB_CATEGORIES.find((c) => c.id === category) : null;

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

        <Text style={[styles.label, { marginTop: 22 }]}>
          Category <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.inputWrapper, errors.category && styles.inputError]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={selectedCategory?.icon || 'grid-outline'}
            size={18}
            color={selectedCategory ? '#4f46e5' : '#9ca3af'}
            style={styles.inputIcon}
          />
          <Text style={[styles.selectText, !selectedCategory && styles.placeholderText]}>
            {selectedCategory?.label || 'Select a category'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

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
            <FlatList
              data={JOB_CATEGORIES}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.id === category;
                return (
                  <TouchableOpacity
                    style={[styles.locationItem, isSelected && styles.locationItemSelected]}
                    onPress={() => {
                      setCategory(item.id);
                      setModalVisible(false);
                      setErrors((e) => ({ ...e, category: null }));
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={isSelected ? '#4f46e5' : '#6b7280'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.locationText, isSelected && styles.locationTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />}
                  </TouchableOpacity>
                );
              }}
            />
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
  errorText: { fontSize: 12.5, color: '#ef4444', marginTop: 5, fontWeight: '500' },
  continueBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 32 },
  continueBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 17, gap: 8,
  },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e1b4b' },
  modalSubtitle: { fontSize: 12.5, color: '#6b7280', marginTop: 2 },
  closeBtn: { padding: 6, backgroundColor: '#f3f4f6', borderRadius: 20 },
  locationItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  locationItemSelected: { backgroundColor: '#f5f3ff' },
  locationText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#374151' },
  locationTextSelected: { fontWeight: '700', color: '#4f46e5' },
});
