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
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePost } from '../../config/usePostStore';

const PAYMENT_TYPES = [
  { id: 'fixed', label: 'Fixed price' },
  { id: 'hourly', label: 'Hourly' },
  { id: 'negotiable', label: 'Negotiable' },
];

export default function Step4() {
  const { data, update } = usePost();
  const [budgetAmount, setBudgetAmount] = useState(data.budgetAmount);
  const [paymentType, setPaymentType] = useState(data.paymentType);
  const [error, setError] = useState(null);

  const handleContinue = () => {
    if (!budgetAmount.trim()) {
      setError('Budget is required.');
      return;
    }
    update({ budgetAmount: budgetAmount.trim(), paymentType });
    router.push('/post-create/step5');
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
            <View key={s} style={[styles.stepDot, s <= 4 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>4 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Budget</Text>
        <Text style={styles.subtitle}>How much will you pay?</Text>

        <Text style={styles.label}>
          Amount <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputWrapper, error && styles.inputError]}>
          <Text style={styles.currencyPrefix}>KSh</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#d1d5db"
            value={budgetAmount}
            onChangeText={(t) => {
              setBudgetAmount(t.replace(/[^0-9]/g, ''));
              if (t.trim()) setError(null);
            }}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={[styles.label, { marginTop: 22 }]}>Payment Type</Text>
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
  input: {
    flex: 1, fontSize: 18, fontWeight: '600',
    color: '#1e1b4b', paddingVertical: 0,
  },
  currencyPrefix: {
    fontSize: 18, fontWeight: '700', color: '#4f46e5', marginRight: 8,
  },
  errorText: { fontSize: 12.5, color: '#ef4444', marginTop: 5, fontWeight: '500' },
  paymentTypeRow: { flexDirection: 'row', gap: 10 },
  paymentChip: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center',
    borderWidth: 2, borderColor: '#e2e8f0',
  },
  paymentChipActive: {
    backgroundColor: '#eef2ff', borderColor: '#4f46e5',
  },
  paymentChipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  paymentChipTextActive: { color: '#4f46e5' },
  continueBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 32 },
  continueBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 17, gap: 8,
  },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
});
