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
  Animated,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../config/useOnboardingStore';
import { normalisePhone } from '../../config/api';

const COUNTRIES = [
  { name: 'Kenya', code: '+254', flag: '🇰🇪', placeholder: '701 903 833', nationalLength: 9 },
  { name: 'Uganda', code: '+256', flag: '🇺🇬', placeholder: '700 123 456', nationalLength: 9 },
  { name: 'Tanzania', code: '+255', flag: '🇹🇿', placeholder: '712 345 678', nationalLength: 9 },
  { name: 'Rwanda', code: '+250', flag: '🇷🇼', placeholder: '788 123 456', nationalLength: 9 },
  { name: 'United States', code: '+1', flag: '🇺🇸', placeholder: '202 555 0123', nationalLength: 10 },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', placeholder: '7911 123456', nationalLength: 10 },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬', placeholder: '802 123 4567', nationalLength: 10 },
  { name: 'South Africa', code: '+27', flag: '🇿🇦', placeholder: '82 123 4567', nationalLength: 9 },
  { name: 'Ghana', code: '+233', flag: '🇬🇭', placeholder: '24 123 4567', nationalLength: 9 },
  { name: 'Ethiopia', code: '+251', flag: '🇪🇹', placeholder: '91 123 4567', nationalLength: 9 },
  { name: 'India', code: '+91', flag: '🇮🇳', placeholder: '98765 43210', nationalLength: 10 },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', placeholder: '50 123 4567', nationalLength: 9 },
  { name: 'Germany', code: '+49', flag: '🇩🇪', placeholder: '151 12345678', minNationalLength: 10, maxNationalLength: 11 },
  { name: 'France', code: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78', nationalLength: 9 },
  { name: 'Australia', code: '+61', flag: '🇦🇺', placeholder: '412 345 678', nationalLength: 9 },
  { name: 'Canada', code: '+1', flag: '🇨🇦', placeholder: '416 555 0123', nationalLength: 10 },
];

/**
 * Converts user input + selected country code into a full candidate phone string.
 * Strips leading '0' if present (e.g. 0701903833 -> 701903833 -> +254701903833).
 * If user pastes a full string starting with '+', uses that directly.
 */
function buildFullPhone(countryCode, text) {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  const noLeadingZero = digitsOnly.replace(/^0+/, '');
  return `${countryCode}${noLeadingZero}`;
}

export default function PhoneScreen() {
  const { update } = useOnboarding();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [raw, setRaw] = useState('');
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  // Shake animation for error feedback
  const shakeX = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const getValidation = (country, text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { cleaned: null, error: 'Phone number is required.' };
    }

    const fullPhone = buildFullPhone(country.code, text);
    const baseValidation = normalisePhone(fullPhone);

    if (baseValidation.error) {
      return baseValidation;
    }

    // Per-country national length validation
    let nationalDigits = '';
    if (trimmed.startsWith('+')) {
      const codeDigits = country.code.replace(/[^\d]/g, '');
      const allDigits = trimmed.replace(/[^\d]/g, '');
      if (allDigits.startsWith(codeDigits)) {
        nationalDigits = allDigits.slice(codeDigits.length);
      } else {
        nationalDigits = allDigits;
      }
    } else {
      nationalDigits = trimmed.replace(/[^\d]/g, '').replace(/^0+/, '');
    }

    if (country.nationalLength) {
      if (nationalDigits.length < country.nationalLength) {
        return {
          cleaned: null,
          error: `${country.name} numbers must be ${country.nationalLength} digits (${nationalDigits.length}/${country.nationalLength}).`,
        };
      }
      if (nationalDigits.length > country.nationalLength) {
        return {
          cleaned: null,
          error: `${country.name} numbers cannot exceed ${country.nationalLength} digits (${nationalDigits.length}/${country.nationalLength}).`,
        };
      }
    } else if (country.minNationalLength && country.maxNationalLength) {
      if (nationalDigits.length < country.minNationalLength) {
        return {
          cleaned: null,
          error: `${country.name} numbers must be at least ${country.minNationalLength} digits.`,
        };
      }
      if (nationalDigits.length > country.maxNationalLength) {
        return {
          cleaned: null,
          error: `${country.name} numbers cannot exceed ${country.maxNationalLength} digits.`,
        };
      }
    }

    return baseValidation;
  };

  // ── Dynamic Max Length for TextInput ──────────────────────────────────────
  const getDynamicMaxLength = () => {
    const trimmed = raw.trim();
    if (trimmed.startsWith('+')) {
      return selectedCountry.code.length + (selectedCountry.nationalLength || selectedCountry.maxNationalLength || 10);
    }
    const maxNatLen = selectedCountry.nationalLength || selectedCountry.maxNationalLength || 10;
    // Allow +1 extra char if starting with leading 0 e.g. 0701903833
    return trimmed.startsWith('0') ? maxNatLen + 1 : maxNatLen;
  };

  // ── Live validation as the user types ─────────────────────────────────────
  const handleChange = (text) => {
    setRaw(text);
    if (touched) {
      const { error: e } = getValidation(selectedCountry, text);
      setError(e);
    }
  };

  // ── Validate on blur ──────────────────────────────────────────────────────
  const handleBlur = () => {
    setTouched(true);
    const { error: e } = getValidation(selectedCountry, raw);
    setError(e);
    if (e) shake();
  };

  // ── Country select handler ────────────────────────────────────────────────
  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setModalVisible(false);
    setSearchQuery('');
    if (touched || raw) {
      const { error: e } = getValidation(country, raw);
      setError(e);
    }
  };

  // ── Continue ──────────────────────────────────────────────────────────────
  const handleContinue = () => {
    setTouched(true);
    const { cleaned, error: e } = getValidation(selectedCountry, raw);
    setError(e);
    if (e) {
      shake();
      return;
    }
    update({ phoneNumber: cleaned });
    router.push('/setup/profile');
  };

  const isValid = !getValidation(selectedCountry, raw).error;

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.includes(searchQuery)
  );

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
              style={[styles.stepDot, s <= 2 && styles.stepDotActive]}
            />
          ))}
        </View>
        <Text style={styles.stepLabel}>2 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Icon ───────────────────────────────────────────────────────── */}
        <View style={styles.iconCircle}>
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            style={styles.iconGradient}
          >
            <Ionicons name="call" size={30} color="#fff" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Verify your phone</Text>
        <Text style={styles.subtitle}>
          Enter your phone number to create your account
        </Text>

        {/* ── Phone input ─────────────────────────────────────────────────── */}
        <Text style={styles.label}>Phone Number</Text>

        <Animated.View
          style={[
            styles.inputWrapper,
            error && touched && styles.inputWrapperError,
            isValid && touched && styles.inputWrapperValid,
            { transform: [{ translateX: shakeX }] },
          ]}
        >
          {/* Flag + prefix button */}
          <TouchableOpacity
            style={styles.flagBox}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{selectedCountry.flag}</Text>
            <Text style={styles.prefix}>{selectedCountry.code}</Text>
            <Ionicons name="chevron-down" size={14} color="#6b7280" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TextInput
            style={styles.input}
            placeholder={selectedCountry.placeholder}
            placeholderTextColor="#d1d5db"
            keyboardType="phone-pad"
            value={raw}
            onChangeText={handleChange}
            onBlur={handleBlur}
            autoCorrect={false}
            autoComplete="tel"
            maxLength={getDynamicMaxLength()}
          />
          {isValid && touched && (
            <Ionicons name="checkmark-circle" size={22} color="#10b981" style={styles.validIcon} />
          )}
          {error && touched && (
            <Ionicons name="close-circle" size={22} color="#ef4444" style={styles.validIcon} />
          )}
        </Animated.View>

        {/* ── Error message ───────────────────────────────────────────────── */}
        {error && touched ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={14} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>
            Enter your mobile number (e.g. {selectedCountry.placeholder})
          </Text>
        )}

        {/* ── What we accept box ──────────────────────────────────────────── */}
        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Phone number requirements:</Text>
          {[
            `Country code (${selectedCountry.code}) is applied automatically`,
            `Enter your ${selectedCountry.name} local number (exactly ${selectedCountry.nationalLength || '9-10'} digits e.g. ${selectedCountry.placeholder})`,
            'Only digits — no spaces or hyphens needed',
            'One unique phone per account',
          ].map((rule) => (
            <View key={rule} style={styles.ruleRow}>
              <View style={styles.ruleDot} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>

        {/* ── Continue button ─────────────────────────────────────────────── */}
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

        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#9ca3af" />
          <Text style={styles.secureText}>Your number is stored securely</Text>
        </View>
      </ScrollView>

      {/* ── Country Selection Modal ───────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code..."
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

            {/* Country List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code + item.name}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.code === selectedCountry.code && item.name === selectedCountry.name;
                return (
                  <TouchableOpacity
                    style={[styles.countryItem, isSelected && styles.countryItemSelected]}
                    onPress={() => handleSelectCountry(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.countryFlag}>{item.flag}</Text>
                    <Text style={styles.countryName}>{item.name}</Text>
                    <Text style={styles.countryCode}>{item.code}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color="#4f46e5" style={{ marginLeft: 8 }} />
                    )}
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
  root: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
  },
  stepDotActive: {
    backgroundColor: '#4f46e5',
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  inputWrapperValid: {
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  flagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 5,
  },
  flag: {
    fontSize: 22,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1b4b',
    paddingVertical: 16,
    letterSpacing: 0.5,
  },
  validIcon: {
    marginLeft: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
    flex: 1,
  },
  hint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
  },
  rulesBox: {
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  ruleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#7c3aed',
    marginTop: 5,
  },
  ruleText: {
    fontSize: 12.5,
    color: '#4b5563',
    flex: 1,
    lineHeight: 18,
  },
  continueBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 8,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  secureText: {
    fontSize: 12.5,
    color: '#9ca3af',
  },
  // ── Modal Styles ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e1b4b',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e1b4b',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  countryItemSelected: {
    backgroundColor: '#f5f3ff',
  },
  countryFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4f46e5',
  },
});


