import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAnalyticsSummary } from '../../config/api';

const PAGE_BG = '#fafafa';
const INDIGO = '#4f46e5';
const INK = '#1e1b4b';

function timeAgo(iso) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function nameOf(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || (user?.email ?? 'Unknown');
}

function StatCard({ label, value, icon, tint, bg }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (!token) return;
      if (asRefresh) setRefreshing(true);
      try {
        const data = await fetchAnalyticsSummary(token);
        setSummary(data);
        setError(null);
      } catch (err) {
        console.warn('[analytics] load failed:', err.message);
        setError(err.message || 'Failed to load analytics.');
      } finally {
        if (asRefresh) setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => load(true), [load]);

  const totals = summary?.totals ?? {};

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.badgeAdmin}>
          <Ionicons name="shield-checkmark" size={12} color={INDIGO} />
          <Text style={styles.badgeAdminText}>Admin</Text>
        </View>
      </View>

      {summary === null && !error ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={INDIGO} />
        </View>
      ) : error && summary === null ? (
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={40} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* ── Activity ─────────────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Active Users</Text>
          <View style={styles.statGrid}>
            <StatCard
              label="Last 24 hours"
              value={totals.active24h ?? '—'}
              icon="flash"
              tint={INDIGO}
              bg="#e0e7ff"
            />
            <StatCard
              label="Last 7 days"
              value={totals.active7d ?? '—'}
              icon="calendar"
              tint="#0284c7"
              bg="#e0f2fe"
            />
            <StatCard
              label="Last 30 days"
              value={totals.active30d ?? '—'}
              icon="people"
              tint="#16a34a"
              bg="#dcfce7"
            />
          </View>

          {/* ── Usage ───────────────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Usage</Text>
          <View style={styles.statGrid}>
            <StatCard
              label="Sessions (7d)"
              value={totals.totalSessions7d ?? '—'}
              icon="analytics"
              tint="#d97706"
              bg="#fef3c7"
            />
            <StatCard
              label="Avg session (7d)"
              value={
                totals.avgDurationSeconds7d == null
                  ? '—'
                  : formatDuration(totals.avgDurationSeconds7d)
              }
              icon="timer"
              tint="#9333ea"
              bg="#f3e8ff"
            />
            <StatCard
              label="Total users"
              value={totals.users ?? '—'}
              icon="person"
              tint="#dc2626"
              bg="#fee2e2"
            />
          </View>

          {/* ── Totals ──────────────────────────────────────────────────── */}
          <Text style={styles.sectionSub}>All time</Text>
          <View style={styles.totalRow}>
            <StatCard label="Users" value={totals.users ?? '—'} icon="people" tint={INDIGO} bg="#e0e7ff" />
            <StatCard
              label="Sessions"
              value={totals.sessions ?? '—'}
              icon="flash"
              tint="#0284c7"
              bg="#e0f2fe"
            />
          </View>

          {/* ── Recent sessions ─────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Recent Sessions</Text>
          <View style={styles.card}>
            {(summary?.recentSessions ?? []).length === 0 ? (
              <Text style={styles.emptyText}>No sessions recorded yet.</Text>
            ) : (
              (summary?.recentSessions ?? [])
                .slice(0, 10)
                .map((s, idx) => (
                  <View key={`${s.id}-${idx}`} style={styles.rowWrap}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarLetter}>
                        {(((s.firstName ?? '')[0] ?? '') + ((s.lastName ?? '')[0] ?? '')).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.rowTop}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {nameOf(s)}
                        </Text>
                        <Text style={styles.rowMeta}>
                          {timeAgo(s.startedAt)} · {formatDuration(s.durationSeconds)}
                        </Text>
                      </View>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {s.email ?? '—'}
                        {s.platform ? ` · ${s.platform}` : ''}
                        {s.appVersion ? ` · v${s.appVersion}` : ''}
                      </Text>
                    </View>
                  </View>
                ))
            )}
          </View>

          {/* ── Last seen ───────────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Last Seen</Text>
          <View style={styles.card}>
            {(summary?.lastSeen ?? []).length === 0 ? (
              <Text style={styles.emptyText}>No activity yet.</Text>
            ) : (
              (summary?.lastSeen ?? [])
                .slice(0, 10)
                .map((u, idx) => (
                  <View key={`${u.id}-${idx}`} style={styles.rowWrap}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarLetter}>
                        {(((u.firstName ?? '')[0] ?? '') + ((u.lastName ?? '')[0] ?? '')).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.rowTop}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {nameOf(u)}
                        </Text>
                        <Text style={styles.rowMeta}>{timeAgo(u.lastSeenAt)}</Text>
                      </View>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {u.email ?? '—'}
                        {u.isAdmin ? ' · Admin' : ''}
                      </Text>
                    </View>
                  </View>
                ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: INK,
    letterSpacing: -0.4,
  },
  badgeAdmin: {
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  badgeAdminText: {
    fontSize: 11,
    fontWeight: '700',
    color: INDIGO,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: INDIGO,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: 4,
    marginBottom: 8,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: INK,
  },
  statLabel: {
    fontSize: 10.5,
    color: '#6b7280',
    marginTop: 1,
  },
  totalRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: '800',
    color: INDIGO,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowName: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: INK,
  },
  rowMeta: {
    fontSize: 11,
    color: '#9ca3af',
  },
  rowSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
});