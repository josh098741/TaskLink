import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { fetchChatThreads } from '../../config/api';

const PAGE_BG = '#fafafa';
const INDIGO = '#4f46e5';
const INK = '#1e1b4b';

const STATUS_LABELS = {
  pending: 'Pending request',
  confirmed: 'Confirmed',
  reschedule_requested: 'Reschedule requested',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No-show',
  declined: 'Declined',
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function avatarFor(person) {
  if (person?.imageUrl) {
    return <Image source={{ uri: person.imageUrl }} style={styles.avatar} />;
  }
  const initial =
    ((person?.firstName?.[0] ?? '') + (person?.lastName?.[0] ?? '')).toUpperCase() || '?';
  return (
    <View style={[styles.avatar, styles.avatarPlaceholder]}>
      <Text style={styles.avatarLetter}>{initial}</Text>
    </View>
  );
}

export default function MessagesScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [threads, setThreads] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (!token) return;
      if (asRefresh) setRefreshing(true);
      try {
        const list = await fetchChatThreads(token);
        setThreads(list);
        setError(null);
      } catch (err) {
        console.warn('[messages] load failed:', err.message);
        setError(err.message || 'Failed to load conversations.');
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

  const renderThread = useCallback(
    ({ item }) => {
      const otherName = item.other
        ? [item.other.firstName, item.other.lastName].filter(Boolean).join(' ') || 'Participant'
        : 'Participant';
      const showPreview = item.lastMessage;
      const preview = showPreview
        ? item.lastMessage.senderId === item.other?.id
          ? item.lastMessage.body
          : `You: ${item.lastMessage.body}`
        : 'No messages yet';
      const statusLabel = STATUS_LABELS[item.status] || item.status;

      return (
        <TouchableOpacity
          style={styles.threadRow}
          activeOpacity={0.7}
          onPress={() =>
            router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: item.appointmentId } })
          }
        >
          <View style={styles.avatarWrap}>
            {avatarFor(item.other)}
            {item.unreadCount > 0 ? <View style={styles.liveDot} /> : null}
          </View>

          <View style={styles.threadContent}>
            <View style={styles.threadTop}>
              <Text style={styles.threadName} numberOfLines={1}>
                {otherName}
              </Text>
              <Text style={styles.threadTime}>
                {timeAgo(item.lastMessage?.createdAt ?? item.startsAt)}
              </Text>
            </View>
            <Text style={styles.threadService} numberOfLines={1}>
              {item.service?.title ?? 'Booking'} · {statusLabel}
            </Text>
            <View style={styles.threadBottom}>
              <Text
                style={[
                  styles.threadPreview,
                  !showPreview && styles.threadPreviewEmpty,
                ]}
                numberOfLines={1}
              >
                {preview}
              </Text>
              {item.unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    []
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      {threads === null && !error ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={INDIGO} />
        </View>
      ) : error && threads === null ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={threads ?? []}
          keyExtractor={(item) => item.appointmentId}
          renderItem={renderThread}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            threads && threads.length > 0 ? (
              <Text style={styles.listCount}>
                {threads.length} conversation{threads.length === 1 ? '' : 's'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={34} color="#a5b4fc" />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Messages appear here when you book a service or someone books
                yours — then chat to agree the details.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  center: {
    flex: 1,
    backgroundColor: PAGE_BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: { fontSize: 15, color: '#6b7280', marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: INDIGO,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef0f4',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: INK, letterSpacing: -0.5 },

  listContent: { paddingHorizontal: 16, paddingTop: 14 },
  listCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eef0f4',
  },
  avatarWrap: { position: 'relative', marginRight: 13 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#eef2ff' },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c7d2fe',
  },
  avatarLetter: { fontSize: 19, fontWeight: '800', color: INDIGO },
  liveDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  threadContent: { flex: 1 },
  threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  threadName: { flex: 1, fontSize: 16, fontWeight: '800', color: INK, marginRight: 8 },
  threadTime: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  threadService: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 2,
    marginBottom: 4,
  },
  threadBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  threadPreview: { flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' },
  threadPreviewEmpty: { color: '#9ca3af', fontStyle: 'italic', fontWeight: '500' },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: INDIGO,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },

  empty: { alignItems: 'center', paddingHorizontal: 36, paddingTop: 60 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: INK, marginTop: 16 },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
    maxWidth: 290,
  },
});