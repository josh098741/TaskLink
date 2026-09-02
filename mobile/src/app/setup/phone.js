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
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../config/useOnboardingStore';
import { normalisePhone } from '../../config/api';

export default function PhoneScreen() {
  const { update } = useOnboarding();
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

  // ── Live validation as the user types ─────────────────────────────────────
  const handleChange = (text) => {
    setRaw(text);
    if (touched) {
      const { error: e } = normalisePhone(text);
      setError(e);
    }
  };

  // ── Validate on blur ──────────────────────────────────────────────────────
  const handleBlur = () => {
    setTouched(true);
    const { error: e } = normalisePhone(raw);
    setError(e);
    if (e) shake();
  };

  // ── Continue ──────────────────────────────────────────────────────────────
  const handleContinue = () => {
    setTouched(true);
    const { cleaned, error: e } = normalisePhone(raw);
    setError(e);
    if (e) {
      shake();
      return;
    }
    update({ phoneNumber: cleaned });
    router.push('/setup/profile');
  };

  const isValid = !normalisePhone(raw).error;

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
          {/* Flag + hint */}
          <View style={styles.flagBox}>
            <Text style={styles.flag}>🇰🇪</Text>
            <Text style={styles.prefix}>+254</Text>
          </View>
          <View style={styles.divider} />
          <TextInput
            style={styles.input}
            placeholder="712 345 678"
            placeholderTextColor="#d1d5db"
            keyboardType="phone-pad"
            value={raw}
            onChangeText={handleChange}
            onBlur={handleBlur}
            autoCorrect={false}
            autoComplete="tel"
            maxLength={20}
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
            Include your country code, e.g. +254712345678
          </Text>
        )}

        {/* ── What we accept box ──────────────────────────────────────────── */}
        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Phone number requirements:</Text>
          {[
            'Must start with "+" and your country code',
            'Country code cannot start with 0',
            'Only digits — no spaces or hyphens needed',
            'Between 7 and 15 digits after the "+"',
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
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 6,
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
});
