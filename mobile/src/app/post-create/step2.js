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

export default function Step2() {
  const { data, update } = usePost();
  const [description, setDescription] = useState(data.description);
  const [error, setError] = useState(null);

  const handleContinue = () => {
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    update({ description: description.trim() });
    router.push('/post-create/step3');
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
            <View key={s} style={[styles.stepDot, s <= 2 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>2 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Tell us more</Text>
        <Text style={styles.subtitle}>Describe what needs to be done</Text>

        <Text style={styles.label}>
          Description <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputWrapper, error && styles.inputError]}>
          <TextInput
            style={styles.textArea}
            placeholder="Describe what needs to be done, including any important instructions..."
            placeholderTextColor="#d1d5db"
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              if (t.trim()) setError(null);
            }}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={styles.hint}>Be specific — this helps Doers understand the task</Text>

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
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 2, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  inputError: { borderColor: '#ef4444' },
  textArea: {
    fontSize: 16, fontWeight: '500', color: '#1e1b4b',
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14,
    minHeight: 180,
  },
  hint: { fontSize: 12.5, color: '#9ca3af', marginTop: 6 },
  errorText: { fontSize: 12.5, color: '#ef4444', marginTop: 5, fontWeight: '500' },
  continueBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 32 },
  continueBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 17, gap: 8,
  },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
});
