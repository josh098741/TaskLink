import { useState, useRef } from 'react';
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
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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

const DURATION_OPTIONS = [
  'Under 1 hour',
  '1-3 hours',
  'Half day',
  'Full day',
  'Multiple days',
];

const PAYMENT_TYPES = [
  { id: 'fixed', label: 'Fixed price' },
  { id: 'hourly', label: 'Hourly' },
  { id: 'negotiable', label: 'Negotiable' },
];

export default function Post() {
  const scrollRef = useRef(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [paymentType, setPaymentType] = useState('fixed');
  const [dateNeeded, setDateNeeded] = useState('');
  const [timeNeeded, setTimeNeeded] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [duration, setDuration] = useState(null);
  const [skills, setSkills] = useState('');
  const [photos, setPhotos] = useState([]);
  const [doerCount, setDoerCount] = useState(1);

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [durationModalVisible, setDurationModalVisible] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [errors, setErrors] = useState({});

  const filteredLocations = ALLOWED_LOCATIONS.filter((l) =>
    l.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const selectedCategory = category ? JOB_CATEGORIES.find((c) => c.id === category) : null;

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = 'Job title is required.';
    if (!category) e.category = 'Please select a category.';
    if (!description.trim()) e.description = 'Description is required.';
    if (!location.trim()) e.location = 'Location is required.';
    if (!budgetAmount.trim()) e.budget = 'Budget is required.';
    if (!dateNeeded.trim()) e.date = 'Date is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePost = () => {
    if (!validate()) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    Alert.alert(
      'Post Task',
      `Title: ${title}\nCategory: ${selectedCategory?.label}\nLocation: ${location}\nBudget: KSh ${budgetAmount} (${PAYMENT_TYPES.find((p) => p.id === paymentType)?.label})\nDate: ${dateNeeded}${timeNeeded ? ` at ${timeNeeded}` : ''}${isUrgent ? ' (Urgent)' : ''}\nDoers needed: ${doerCount}`,
      [{ text: 'OK' }]
    );
  };

  const handlePickPhotos = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
      quality: 0.7,
    });
    if (!result.canceled && result.assets) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectLocation = (loc) => {
    setLocation(loc);
    setLocationModalVisible(false);
    setLocationSearch('');
    setErrors((e) => ({ ...e, location: null }));
  };

  const handleSelectCategory = (catId) => {
    setCategory(catId);
    setCategoryModalVisible(false);
    setErrors((e) => ({ ...e, category: null }));
  };

  const handleSelectDuration = (dur) => {
    setDuration(dur);
    setDurationModalVisible(false);
  };

  const clearField = (field) => {
    if (field === 'title') setTitle('');
    if (field === 'description') setDescription('');
    if (field === 'budget') setBudgetAmount('');
    if (field === 'date') setDateNeeded('');
    if (field === 'time') setTimeNeeded('');
    if (field === 'skills') setSkills('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.screenTitle}>Create a Task</Text>
          <Text style={styles.screenSubtitle}>What do you need help with?</Text>

          {/* ── Job Title ─────────────────────────────────────────────── */}
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
            {title ? (
              <TouchableOpacity onPress={() => clearField('title')}>
                <Ionicons name="close-circle" size={18} color="#d1d5db" />
              </TouchableOpacity>
            ) : null}
          </View>
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

          {/* ── Category ──────────────────────────────────────────────── */}
          <Text style={[styles.label, { marginTop: 18 }]}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.inputWrapper, errors.category && styles.inputError]}
            onPress={() => setCategoryModalVisible(true)}
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

          {/* ── Description ───────────────────────────────────────────── */}
          <Text style={[styles.label, { marginTop: 18 }]}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper, errors.description && styles.inputError]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe what needs to be done, including any important instructions..."
              placeholderTextColor="#d1d5db"
              value={description}
              onChangeText={(t) => {
                setDescription(t);
                if (t.trim()) setErrors((e) => ({ ...e, description: null }));
              }}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

          {/* ── Location ──────────────────────────────────────────────── */}
          <Text style={[styles.label, { marginTop: 18 }]}>
            Where? <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.inputWrapper, errors.location && styles.inputError]}
            onPress={() => setLocationModalVisible(true)}
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
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          <Text style={styles.hint}>Your exact address is only shared after hiring</Text>

          {/* ── Budget / Payment ──────────────────────────────────────── */}
          <Text style={[styles.label, { marginTop: 18 }]}>
            How much will you pay? <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.inputWrapper, errors.budget && styles.inputError]}>
            <Text style={styles.currencyPrefix}>KSh</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#d1d5db"
              value={budgetAmount}
              onChangeText={(t) => {
                setBudgetAmount(t.replace(/[^0-9]/g, ''));
                if (t.trim()) setErrors((e) => ({ ...e, budget: null }));
              }}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          {errors.budget && <Text style={styles.errorText}>{errors.budget}</Text>}

          <View style={styles.paymentTypeRow}>
            {PAYMENT_TYPES.map((pt) => (
              <TouchableOpacity
                key={pt.id}
                style={[styles.paymentChip, paymentType === pt.id && styles.paymentChipActive]}
                onPress={() => setPaymentType(pt.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.paymentChipText, paymentType === pt.id && styles.paymentChipTextActive]}
                >
                  {pt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── When is it needed? ────────────────────────────────────── */}
          <Text style={[styles.label, { marginTop: 18 }]}>
            When do you need it? <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.dateTimeRow}>
            <View style={[styles.inputWrapper, styles.halfInput, errors.date && styles.inputError]}>
              <Ionicons name="calendar-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#d1d5db"
                value={dateNeeded}
                onChangeText={(t) => {
                  setDateNeeded(t);
                  if (t.trim()) setErrors((e) => ({ ...e, date: null }));
                }}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <View style={[styles.inputWrapper, styles.halfInput]}>
              <Ionicons name="time-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor="#d1d5db"
                value={timeNeeded}
                onChangeText={setTimeNeeded}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>
          {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}

          {/* Urgent toggle */}
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

          {/* ── Estimated Duration ────────────────────────────────────── */}
          <Text style={[styles.label, { marginTop: 18 }]}>Estimated Duration</Text>
          <TouchableOpacity
            style={styles.inputWrapper}
            onPress={() => setDurationModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="hourglass-outline" size={18} color={duration ? '#4f46e5' : '#9ca3af'} style={styles.inputIcon} />
            <Text style={[styles.selectText, !duration && styles.placeholderText]}>
              {duration || 'Select estimated duration'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6b7280" />
          </TouchableOpacity>

          {/* ── Skills / Requirements ─────────────────────────────────── */}
          <Text style={[styles.label, { marginTop: 18 }]}>Requirements</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="ribbon-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='e.g. "Must know basic plumbing"'
              placeholderTextColor="#d1d5db"
              value={skills}
              onChangeText={setSkills}
            />
            {skills ? (
              <TouchableOpacity onPress={() => clearField('skills')}>
                <Ionicons name="close-circle" size={18} color="#d1d5db" />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.hint}>Optional — add any skills or requirements</Text>

          {/* ── Photos / Attachments ──────────────────────────────────── */}
          <Text style={[styles.label, { marginTop: 18 }]}>Add Photos</Text>
          <View style={styles.photosRow}>
            {photos.map((uri, idx) => (
              <View key={idx} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImage} />
                <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(idx)}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={styles.photoAdd} onPress={handlePickPhotos} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={24} color="#9ca3af" />
                <Text style={styles.photoAddText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.hint}>Up to 5 photos — helps Doers understand the task</Text>

          {/* ── Number of Doers ───────────────────────────────────────── */}
          <Text style={[styles.label, { marginTop: 18 }]}>How many people do you need?</Text>
          <View style={styles.doerRow}>
            <TouchableOpacity
              style={[styles.doerBtn, doerCount <= 1 && styles.doerBtnDisabled]}
              onPress={() => doerCount > 1 && setDoerCount(doerCount - 1)}
              disabled={doerCount <= 1}
            >
              <Ionicons name="remove" size={20} color={doerCount <= 1 ? '#d1d5db' : '#4f46e5'} />
            </TouchableOpacity>
            <Text style={styles.doerCount}>{doerCount}</Text>
            <TouchableOpacity
              style={[styles.doerBtn, doerCount >= 5 && styles.doerBtnDisabled]}
              onPress={() => doerCount < 5 && setDoerCount(doerCount + 1)}
              disabled={doerCount >= 5}
            >
              <Ionicons name="add" size={20} color={doerCount >= 5 ? '#d1d5db' : '#4f46e5'} />
            </TouchableOpacity>
          </View>

          {/* ── Post Task Button ──────────────────────────────────────── */}
          <TouchableOpacity style={styles.postBtn} activeOpacity={0.88} onPress={handlePost}>
            <Text style={styles.postBtnText}>Post Task</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Location Modal ───────────────────────────────────────────── */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Location</Text>
                <Text style={styles.modalSubtitle}>Where is the task?</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close" size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search area..."
                placeholderTextColor="#9ca3af"
                value={locationSearch}
                onChangeText={setLocationSearch}
                autoCorrect={false}
              />
              {locationSearch ? (
                <TouchableOpacity onPress={() => setLocationSearch('')}>
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

      {/* ── Category Modal ───────────────────────────────────────────── */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Category</Text>
                <Text style={styles.modalSubtitle}>What type of task is this?</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setCategoryModalVisible(false)}>
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
                    onPress={() => handleSelectCategory(item.id)}
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

      {/* ── Duration Modal ───────────────────────────────────────────── */}
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
                    onPress={() => handleSelectDuration(item)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  screenTitle: {
    fontSize: 28, fontWeight: '800', color: '#1e1b4b',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 15, color: '#6b7280', marginTop: 4, marginBottom: 24,
  },

  label: {
    fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8,
  },
  required: { color: '#ef4444' },
  hint: {
    fontSize: 12.5, color: '#9ca3af', marginTop: 6,
  },

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
  textAreaWrapper: { alignItems: 'flex-start' },
  textArea: {
    minHeight: 110, textAlignVertical: 'top',
    paddingTop: 2,
  },
  selectText: {
    flex: 1, fontSize: 15, fontWeight: '600', color: '#1e1b4b',
  },
  placeholderText: { fontWeight: '400', color: '#9ca3af' },
  currencyPrefix: {
    fontSize: 16, fontWeight: '700', color: '#4f46e5',
    marginRight: 8,
  },
  errorText: { fontSize: 12.5, color: '#ef4444', marginTop: 5, fontWeight: '500' },

  paymentTypeRow: {
    flexDirection: 'row', gap: 8, marginTop: 10,
  },
  paymentChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#f1f5f9', alignItems: 'center',
    borderWidth: 2, borderColor: '#e2e8f0',
  },
  paymentChipActive: {
    backgroundColor: '#eef2ff', borderColor: '#4f46e5',
  },
  paymentChipText: {
    fontSize: 13, fontWeight: '600', color: '#64748b',
  },
  paymentChipTextActive: { color: '#4f46e5' },

  dateTimeRow: {
    flexDirection: 'row', gap: 10,
  },
  halfInput: { flex: 1 },

  urgentToggle: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, gap: 8,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#ef4444', borderColor: '#ef4444',
  },
  urgentLabel: {
    fontSize: 15, fontWeight: '600', color: '#6b7280',
  },
  urgentLabelActive: { color: '#ef4444' },

  photosRow: {
    flexDirection: 'row', gap: 10, flexWrap: 'wrap',
  },
  photoThumb: { position: 'relative' },
  photoImage: {
    width: 72, height: 72, borderRadius: 12,
  },
  photoRemove: {
    position: 'absolute', top: -6, right: -6,
  },
  photoAdd: {
    width: 72, height: 72, borderRadius: 12,
    borderWidth: 2, borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  photoAddText: {
    fontSize: 11, fontWeight: '600', color: '#9ca3af', marginTop: 2,
  },

  doerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 20, marginTop: 4,
  },
  doerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  doerBtnDisabled: { backgroundColor: '#f9fafb', borderColor: '#f1f5f9' },
  doerCount: {
    fontSize: 22, fontWeight: '800', color: '#1e1b4b',
  },

  postBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2563eb', borderRadius: 16,
    paddingVertical: 17, gap: 8, marginTop: 28,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  postBtnText: {
    fontSize: 17, fontWeight: '700', color: '#ffffff',
  },

  // ── Modal Styles ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e1b4b' },
  modalSubtitle: { fontSize: 12.5, color: '#6b7280', marginTop: 2 },
  closeBtn: {
    padding: 6, backgroundColor: '#f3f4f6', borderRadius: 20,
  },
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
  locationText: {
    flex: 1, fontSize: 15, fontWeight: '500', color: '#374151',
  },
  locationTextSelected: { fontWeight: '700', color: '#4f46e5' },
});
