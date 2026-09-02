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
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { useOnboarding } from '../../config/useOnboardingStore';

const LOCATIONS = [
  'Nairobi, Kenya',
  'Mombasa, Kenya',
  'Kisumu, Kenya',
  'Nakuru, Kenya',
  'Eldoret, Kenya',
  'Thika, Kenya',
  'Malindi, Kenya',
  'Kitale, Kenya',
  'Nyeri, Kenya',
  'Machakos, Kenya',
];

export default function ProfileScreen() {
  const { user } = useUser();
  const { update } = useOnboarding();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName,  setLastName]  = useState(user?.lastName  ?? '');
  const [location,  setLocation]  = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState({});

  const filtered = LOCATIONS.filter((l) =>
    l.toLowerCase().includes(location.toLowerCase())
  );

  const validate = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'First name is required.';
    if (!location.trim() || location.trim().length < 2)
      e.location = 'Please enter your city or region.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    update({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      location:  location.trim(),
    });
    router.push('/setup/categories');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
        </TouchableOpacity>
        <View style={styles.stepRow}>
          {[1,2,3,4,5].map((s) => (
            <View
              key={s}
              style={[styles.stepDot, s <= 3 && styles.stepDotActive]}
            />
          ))}
        </View>
        <Text style={styles.stepLabel}>3 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar ─────────────────────────────────────────────────────── */}
        <View style={styles.avatarContainer}>
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={['#4f46e5', '#7c3aed']}
              style={styles.avatarPlaceholder}
            >
              <Ionicons name="person" size={40} color="#fff" />
            </LinearGradient>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </View>

        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

        {/* ── First name ──────────────────────────────────────────────────── */}
        <Text style={styles.label}>First Name</Text>
        <View style={[styles.inputWrapper, errors.firstName && styles.inputError]}>
          <Ionicons name="person-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="John"
            placeholderTextColor="#d1d5db"
            value={firstName}
            onChangeText={(t) => { setFirstName(t); setErrors((e) => ({ ...e, firstName: null })); }}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

        {/* ── Last name ───────────────────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 16 }]}>Last Name <Text style={styles.optional}>(optional)</Text></Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Mwangi"
            placeholderTextColor="#d1d5db"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* ── Location ────────────────────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 16 }]}>Location</Text>
        <View style={[styles.inputWrapper, errors.location && styles.inputError]}>
          <Ionicons name="location-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nairobi, Kenya"
            placeholderTextColor="#d1d5db"
            value={location}
            onChangeText={(t) => {
              setLocation(t);
              setShowSuggestions(true);
              setErrors((e) => ({ ...e, location: null }));
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Ionicons name="chevron-down" size={16} color="#9ca3af" />
        </View>
        {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}

        {/* Location suggestions dropdown */}
        {showSuggestions && filtered.length > 0 && (
          <View style={styles.dropdown}>
            {filtered.slice(0, 5).map((l) => (
              <TouchableOpacity
                key={l}
                style={styles.dropdownItem}
                onPress={() => { setLocation(l); setShowSuggestions(false); }}
              >
                <Ionicons name="location" size={14} color="#4f46e5" />
                <Text style={styles.dropdownText}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.changeHint}>You can change this later</Text>

        {/* ── Continue ────────────────────────────────────────────────────── */}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f1f0ff',
    alignItems: 'center', justifyContent: 'center',
  },
  stepRow: { flex: 1, flexDirection: 'row', gap: 5 },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' },
  stepDotActive: { backgroundColor: '#4f46e5' },
  stepLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  avatarContainer: {
    width: 90, height: 90, borderRadius: 45,
    marginTop: 8, marginBottom: 20, position: 'relative',
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#4f46e5',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fafafa',
  },
  title: {
    fontSize: 28, fontWeight: '800', color: '#1e1b4b',
    letterSpacing: -0.5, marginBottom: 6,
  },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  optional: { fontWeight: '400', color: '#9ca3af' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 2, borderColor: '#e5e7eb',
    paddingHorizontal: 14, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  inputError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontSize: 16, fontWeight: '500',
    color: '#1e1b4b', paddingVertical: 14,
  },
  errorText: { fontSize: 12.5, color: '#ef4444', marginTop: 5, fontWeight: '500' },
  dropdown: {
    backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  dropdownText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  changeHint: {
    fontSize: 12.5, color: '#9ca3af',
    textAlign: 'center', marginTop: 8, marginBottom: 28,
  },
  continueBtn: { borderRadius: 16, overflow: 'hidden' },
  continueBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 17, gap: 8,
  },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
});
