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

const ALLOWED_LOCATIONS = [
  'Juja, Kiambu',
  'Pace / Section 9, Thika',
  'Thika Town, Kiambu',
  'Ruiru, Kiambu',
  'Kiambu Town, Kiambu',
  'Ruaka, Kiambu',
  'Kahawa Sukari, Kiambu',
  'Kahawa Wendani, Kiambu',
  'Roysambu, Nairobi',
  'Kasarani, Nairobi',
  'Kikuyu, Kiambu',
  'Limuru, Kiambu',
  'Ndenderu, Kiambu',
  'Banana, Kiambu',
  'Westlands, Nairobi',
  'Kilimani, Nairobi',
  'Lavington, Nairobi',
  'Kileleshwa, Nairobi',
  'Parklands, Nairobi',
  'Nairobi CBD',
  'Ngara, Nairobi',
  'Karen, Nairobi',
  "Lang'ata, Nairobi",
  'Ngong, Kajiado',
  'Dagoretti, Nairobi',
  'Riruta, Nairobi',
  'South B, Nairobi',
  'South C, Nairobi',
  'Nairobi West',
  'Syokimau, Machakos',
  'Kitengela, Kajiado',
  'Athi River, Machakos',
  'Donholm, Nairobi',
  'Buruburu, Nairobi',
  'Utawala, Nairobi',
  'Embakasi, Nairobi',
  'Fedha, Nairobi',
];

export default function Step3() {
  const { data, update } = usePost();
  const [location, setLocation] = useState(data.location);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const filteredLocations = ALLOWED_LOCATIONS.filter((l) =>
    l.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLocation = (loc) => {
    setLocation(loc);
    setModalVisible(false);
    setSearchQuery('');
    setError(null);
  };

  const handleContinue = () => {
    if (!location.trim()) {
      setError('Location is required.');
      return;
    }
    update({ location: location.trim() });
    router.push('/post-create/step4');
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
            <View key={s} style={[styles.stepDot, s <= 3 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>3 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Where?</Text>
        <Text style={styles.subtitle}>Select the area for this task</Text>

        <Text style={styles.label}>
          Location <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.inputWrapper, error && styles.inputError]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="location-outline"
            size={18}
            color={location ? '#4f46e5' : '#9ca3af'}
            style={styles.inputIcon}
          />
          <Text style={[styles.selectText, !location && styles.placeholderText]}>
            {location || 'Select area (e.g. Juja, Westlands)...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={styles.hint}>Your exact address is only shared after hiring</Text>

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
                <Text style={styles.modalTitle}>Select Location</Text>
                <Text style={styles.modalSubtitle}>Where is the task?</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search area..."
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
            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item === location;
                return (
                  <TouchableOpacity
                    style={[styles.locationItem, isSelected && styles.locationItemSelected]}
                    onPress={() => handleSelectLocation(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="location"
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
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, marginHorizontal: 20, marginVertical: 14,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1e1b4b' },
  locationItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  locationItemSelected: { backgroundColor: '#f5f3ff' },
  locationText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#374151' },
  locationTextSelected: { fontWeight: '700', color: '#4f46e5' },
});
