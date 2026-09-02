import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useOnboarding } from '../../config/useOnboardingStore';
import { apiFetch } from '../../config/api';

// Map category IDs back to display labels
const CATEGORY_LABELS = {
  webdesign:   'Web Design',
  cleaning:    'Cleaning',
  plumbing:    'Plumbing',
  electrical:  'Electrical',
  delivery:    'Delivery',
  tutoring:    'Tutoring',
  photography: 'Photography',
  moving:      'Moving',
  gardening:   'Gardening',
  cooking:     'Cooking',
  beauty:      'Beauty & Hair',
  techsupport: 'Tech Support',
};

const ROLE_LABEL = { poster: 'Task Poster', tasker: 'Tasker' };
const ROLE_ICON  = { poster: 'clipboard-outline', tasker: 'briefcase-outline' };

// ── Animated checkmark ────────────────────────────────────────────────────────
function CheckmarkAnimation() {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1, tension: 80, friction: 7, useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1, duration: 300, useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1.5, duration: 600,
          easing: Easing.out(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0, duration: 600, useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.checkmarkWrapper}>
      {/* Expanding ring */}
      <Animated.View style={[
        styles.checkRing,
        { opacity: ringOpacity, transform: [{ scale: ringScale }] },
      ]} />
      {/* Circle + icon */}
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          style={styles.checkCircle}
        >
          <Ionicons name="checkmark" size={44} color="#fff" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ── Summary row ───────────────────────────────────────────────────────────────
function SummaryRow({ icon, label, value, color = '#4f46e5' }) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CompleteScreen() {
  const { getToken } = useAuth();
  const { data, reset } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleGetStarted = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const token = await getToken();
      await apiFetch('/user/onboarding', token, {
        method: 'PUT',
        body: JSON.stringify({
          role:        data.role,
          phoneNumber: data.phoneNumber,
          firstName:   data.firstName,
          lastName:    data.lastName,
          location:    data.location,
          categories:  data.categories,
        }),
      });
      reset();
      router.replace('/(tabs)/home');
    } catch (err) {
      setApiError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categoriesDisplay = data.categories
    .map((c) => CATEGORY_LABELS[c] ?? c)
    .join(', ');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
        </TouchableOpacity>
        <View style={styles.stepRow}>
          {[1,2,3,4,5].map((s) => (
            <View key={s} style={[styles.stepDot, styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>5 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Animated checkmark ─────────────────────────────────────────── */}
        <CheckmarkAnimation />

        <Text style={styles.title}>You're all set! 🎉</Text>
        <Text style={styles.subtitle}>
          Here's a summary of your account before we get started.
        </Text>

        {/* ── Summary card ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <SummaryRow
            icon={ROLE_ICON[data.role] ?? 'person-outline'}
            label="Account type"
            value={ROLE_LABEL[data.role] ?? '—'}
            color="#4f46e5"
          />
          <View style={styles.divider} />
          <SummaryRow
            icon="person-outline"
            label="Name"
            value={[data.firstName, data.lastName].filter(Boolean).join(' ') || '—'}
            color="#7c3aed"
          />
          <View style={styles.divider} />
          <SummaryRow
            icon="call-outline"
            label="Phone number"
            value={data.phoneNumber || '—'}
            color="#0ea5e9"
          />
          <View style={styles.divider} />
          <SummaryRow
            icon="location-outline"
            label="Location"
            value={data.location || '—'}
            color="#10b981"
          />
          <View style={styles.divider} />
          <SummaryRow
            icon="grid-outline"
            label="Interests"
            value={categoriesDisplay || '—'}
            color="#f59e0b"
          />
        </View>

        {/* ── API error ───────────────────────────────────────────────────── */}
        {apiError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={styles.errorText}>{apiError}</Text>
          </View>
        )}

        {/* ── Get Started button ──────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.startBtn}
          activeOpacity={0.88}
          onPress={handleGetStarted}
          disabled={loading}
        >
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startBtnGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.startBtnText}>Get Started</Text>
                <Ionicons name="rocket-outline" size={20} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Trust badge */}
        <View style={styles.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#9ca3af" />
          <Text style={styles.trustText}>Safe · Trusted · Local — Powered by TaskLink</Text>
        </View>
      </ScrollView>
    </View>
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
  scroll: { paddingHorizontal: 24, paddingBottom: 48, alignItems: 'center' },
  checkmarkWrapper: {
    width: 120, height: 120, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 24,
  },
  checkRing: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: '#4f46e5',
  },
  checkCircle: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  title: {
    fontSize: 30, fontWeight: '800', color: '#1e1b4b',
    letterSpacing: -0.5, textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: '#6b7280', textAlign: 'center',
    lineHeight: 20, marginBottom: 28, paddingHorizontal: 12,
  },
  card: {
    width: '100%', backgroundColor: '#ffffff', borderRadius: 20,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    marginBottom: 24, overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, gap: 14,
  },
  summaryIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11.5, fontWeight: '600', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3,
  },
  summaryValue: {
    fontSize: 14, fontWeight: '600', color: '#1e1b4b', lineHeight: 20,
  },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },
  errorBox: {
    width: '100%', flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, backgroundColor: '#fef2f2', borderRadius: 12,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: 13, color: '#ef4444', fontWeight: '500', lineHeight: 18 },
  startBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  startBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 18, gap: 10,
    minHeight: 56,
  },
  startBtnText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  trustRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingVertical: 4,
  },
  trustText: { fontSize: 12, color: '#9ca3af' },
});
