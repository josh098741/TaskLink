import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { fetchPost, updatePost } from '../../config/api';

const PAYMENT_TYPES = ['fixed', 'hourly', 'negotiable'];
const PAYMENT_LABELS = { fixed: 'Fixed', hourly: 'Hourly', negotiable: 'Negotiable' };
const DURATIONS = [
  'Under 1 hour',
  '1-3 hours',
  'Half day',
  'Full day',
  'Multiple days',
];

export default function PostEdit() {
  const { id } = useLocalSearchParams();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notOwner, setNotOwner] = useState(false);
  const [locked, setLocked] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    budgetAmount: '',
    paymentType: 'fixed',
    dateNeeded: '',
    timeNeeded: '',
    isUrgent: false,
    duration: '',
    doerCount: 1,
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotOwner(false);
    setLocked(false);
    try {
      const post = await fetchPost(id);
      if (!post) {
        setError('Post not found.');
        return;
      }
      if (post.posterId !== user?.id) {
        setNotOwner(true);
        return;
      }
      if (post.status !== 'open') {
        setLocked(true);
        setForm((prev) => ({
          ...prev,
          title: post.title || '',
          description: post.description || '',
          location: post.location || '',
          budgetAmount: String(post.budgetAmount ?? ''),
          paymentType: PAYMENT_TYPES.includes(post.paymentType)
            ? post.paymentType
            : 'fixed',
          dateNeeded: post.dateNeeded || '',
          timeNeeded: post.timeNeeded || '',
          isUrgent: Boolean(post.isUrgent),
          duration: post.duration || '',
          doerCount: post.doerCount || 1,
        }));
        return;
      }
      setForm((prev) => ({
        ...prev,
        title: post.title || '',
        description: post.description || '',
        location: post.location || '',
        budgetAmount: String(post.budgetAmount ?? ''),
        paymentType: PAYMENT_TYPES.includes(post.paymentType)
          ? post.paymentType
          : 'fixed',
        dateNeeded: post.dateNeeded || '',
        timeNeeded: post.timeNeeded || '',
        isUrgent: Boolean(post.isUrgent),
        duration: post.duration || '',
        doerCount: post.doerCount || 1,
      }));
    } catch (err) {
      console.warn('[post-edit] load failed:', err);
      setError(err.message || 'Failed to load post.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Missing title', 'Please enter a job title.');
      return;
    }
    if (!String(form.budgetAmount).trim()) {
      Alert.alert('Missing budget', 'Please enter a budget amount.');
      return;
    }

    setSaving(true);
    try {
      let token = await getToken({ skipCache: true }).catch(() => null);
      if (!token) token = await getToken().catch(() => null);

      await updatePost(
        id,
        {
          title: form.title.trim(),
          description: form.description.trim(),
          location: form.location.trim(),
          budgetAmount: String(form.budgetAmount).trim(),
          paymentType: form.paymentType,
          dateNeeded: form.dateNeeded,
          timeNeeded: form.timeNeeded || null,
          isUrgent: form.isUrgent,
          duration: form.duration || null,
          doerCount: form.doerCount,
        },
        token,
        { 'x-clerk-user-id': user?.id || '' }
      );

      Alert.alert('Saved', 'Your post has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.warn('[post-edit] save failed:', err);
      Alert.alert('Save failed', err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (notOwner) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Ionicons name="lock-closed-outline" size={40} color="#f59e0b" />
        <Text style={styles.errorText}>You can only edit your own posts.</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.retryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (locked) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Ionicons name="checkmark-circle-outline" size={40} color="#10b981" />
        <Text style={styles.errorText}>
          This post has already been accepted. Its details can no longer be changed.
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.retryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Post</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Job title">
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(v) => set('title', v)}
            placeholder="e.g. Fix leaking tap"
            placeholderTextColor="#9ca3af"
            maxLength={80}
          />
        </Field>

        <Field label="Description">
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(v) => set('description', v)}
            placeholder="Describe the task in detail"
            placeholderTextColor="#9ca3af"
            multiline
          />
        </Field>

        <Field label="Location">
          <TextInput
            style={styles.input}
            value={form.location}
            onChangeText={(v) => set('location', v)}
            placeholder="e.g. Juja, Kiambu"
            placeholderTextColor="#9ca3af"
          />
        </Field>

        <Field label="Budget (KSh)">
          <TextInput
            style={styles.input}
            value={form.budgetAmount}
            onChangeText={(v) => set('budgetAmount', v)}
            placeholder="e.g. 5000"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
        </Field>

        <Field label="Payment type">
          <View style={styles.segmentRow}>
            {PAYMENT_TYPES.map((pt) => (
              <TouchableOpacity
                key={pt}
                style={[styles.segment, form.paymentType === pt && styles.segmentActive]}
                onPress={() => set('paymentType', pt)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentText,
                    form.paymentType === pt && styles.segmentTextActive,
                  ]}
                >
                  {PAYMENT_LABELS[pt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Date needed">
          <TextInput
            style={styles.input}
            value={form.dateNeeded}
            onChangeText={(v) => set('dateNeeded', v)}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#9ca3af"
          />
        </Field>

        <Field label="Preferred time">
          <TextInput
            style={styles.input}
            value={form.timeNeeded}
            onChangeText={(v) => set('timeNeeded', v)}
            placeholder="e.g. 10:00 or Flexible / Anytime"
            placeholderTextColor="#9ca3af"
          />
        </Field>

        <Field label="Duration">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.durationRow}
          >
            {['Flexible', ...DURATIONS].map((d) => {
              const active = form.duration === d || (!form.duration && d === 'Flexible');
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => set('duration', d === 'Flexible' ? '' : d)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Field>

        <Field label="People needed">
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => set('doerCount', Math.max(1, form.doerCount - 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={20} color="#4f46e5" />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{form.doerCount}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => set('doerCount', Math.min(5, form.doerCount + 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color="#4f46e5" />
            </TouchableOpacity>
          </View>
        </Field>

        <TouchableOpacity
          style={styles.urgentRow}
          onPress={() => set('isUrgent', !form.isUrgent)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, form.isUrgent && styles.checkboxActive]}>
            {form.isUrgent && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.urgentLabel}>Mark as urgent</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          activeOpacity={0.88}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          )}
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  center: {
    flex: 1,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: { fontSize: 15, color: '#6b7280', marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafafa',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1e1b4b' },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  field: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e1b4b',
  },
  textArea: { height: 100, textAlignVertical: 'top' },

  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  segmentTextActive: { color: '#4f46e5', fontWeight: '700' },

  durationRow: { gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#4f46e5', fontWeight: '700' },

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    gap: 16,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f1f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 16, fontWeight: '800', color: '#1e1b4b', minWidth: 24, textAlign: 'center' },

  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  urgentLabel: { fontSize: 15, fontWeight: '600', color: '#1e1b4b' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
