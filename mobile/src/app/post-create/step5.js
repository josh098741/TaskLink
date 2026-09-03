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

const DURATION_OPTIONS = [
  'Under 1 hour',
  '1-3 hours',
  'Half day',
  'Full day',
  'Multiple days',
];

export default function Step5() {
  const { data, update } = usePost();
  const [dateNeeded, setDateNeeded] = useState(data.dateNeeded);
  const [timeNeeded, setTimeNeeded] = useState(data.timeNeeded);
  const [isUrgent, setIsUrgent] = useState(data.isUrgent);
  const [duration, setDuration] = useState(data.duration);
  const [durationModalVisible, setDurationModalVisible] = useState(false);
  const [error, setError] = useState(null);

  const handleContinue = () => {
    if (!dateNeeded.trim()) {
      setError('Date is required.');
      return;
    }
    update({ dateNeeded: dateNeeded.trim(), timeNeeded: timeNeeded.trim(), isUrgent, duration });
    router.push('/post-create/step6');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
        </TouchableOpacity>
        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View key={s} style={[styles.stepDot, s <= 5 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>5 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>When is it needed?</Text>
        <Text style={styles.subtitle}>Set the date, time and duration</Text>

        <Text style={styles.label}>
          Date <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputWrapper, error && styles.inputError]}>
          <Ionicons name="calendar-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#d1d5db"
            value={dateNeeded}
            onChangeText={(t) => {
              setDateNeeded(t);
              if (t.trim()) setError(null);
            }}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={[styles.label, { marginTop: 18 }]}>Preferred Time</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="time-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="HH:MM (optional)"
            placeholderTextColor="#d1d5db"
            value={timeNeeded}
            onChangeText={setTimeNeeded}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>

        <TouchableOpacity
          style={styles.urgentToggle}
          onPress={() => setIsUrgent(!isUrgent)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, isUrgent && styles.checkboxActive]}>
            {isUrgent && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Ionicons name="flash-outline" size={18} color={isUrgent ? '#ef4444' : '#6b7280'} />
          <Text style={[styles.urgentLabel, isUrgent && styles.urgentLabelActive]}>
            Urgent
          </Text>
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 22 }]}>Estimated Duration</Text>
        <TouchableOpacity
          style={styles.inputWrapper}
          onPress={() => setDurationModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="hourglass-outline"
            size={18}
            color={duration ? '#4f46e5' : '#9ca3af'}
            style={styles.inputIcon}
          />
          <Text style={[styles.selectText, !duration && styles.placeholderText]}>
            {duration || 'Select estimated duration'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>

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
        visible={durationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDurationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Estimated Duration</Text>
                <Text style={styles.modalSubtitle}>How long will this take?</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDurationModalVisible(false)}>
                <Ionicons name="close" size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DURATION_OPTIONS}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item === duration;
                return (
                  <TouchableOpacity
                    style={[styles.locationItem, isSelected && styles.locationItemSelected]}
                    onPress={() => {
                      setDuration(item);
                      setDurationModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={isSelected ? '#4f46e5' : '#9ca3af'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.locationText, isSelected && styles.locationTextSelected]}>
                      {item}
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
  urgentToggle: {
    flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  urgentLabel: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  urgentLabelActive: { color: '#ef4444' },
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
