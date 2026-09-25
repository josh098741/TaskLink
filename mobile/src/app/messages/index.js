import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../theme/themeStyles';
import { useAuth } from '../../contexts/AuthContext';
import { fetchChatThreads } from '../../config/api';

const PAGE_BG = '#f7f7fb';
const INDIGO = '#4f46e5';
const INK = '#1e1b4b';

const STATUS_UI = {
  pending: {
    label: 'Pending',
    icon: 'time-outline',
    badgeStyle: 'statusPending',
    textStyle: 'statusPendingText',
  },
  confirmed: {
    label: 'Confirmed',
    icon: 'checkmark-circle-outline',
    badgeStyle: 'statusConfirmed',
    textStyle: 'statusConfirmedText',
  },
  reschedule_requested: {
    label: 'Reschedule',
    icon: 'calendar-outline',
    badgeStyle: 'statusReschedule',
    textStyle: 'statusRescheduleText',
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'close-circle-outline',
    badgeStyle: 'statusCancelled',
    textStyle: 'statusCancelledText',
  },
  completed: {
    label: 'Completed',
    icon: 'checkmark-done-outline',
    badgeStyle: 'statusCompleted',
    textStyle: 'statusCompletedText',
  },
  no_show: {
    label: 'No-show',
    icon: 'alert-circle-outline',
    badgeStyle: 'statusCancelled',
    textStyle: 'statusCancelledText',
  },
  'no-show': {
    label: 'No-show',
    icon: 'alert-circle-outline',
    badgeStyle: 'statusCancelled',
    textStyle: 'statusCancelledText',
  },
  declined: {
    label: 'Declined',
    icon: 'close-circle-outline',
    badgeStyle: 'statusCancelled',
    textStyle: 'statusCancelledText',
  },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
];

function timeAgo(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function getOtherName(item) {
  return item.other
    ? [item.other.firstName, item.other.lastName].filter(Boolean).join(' ') || 'Participant'
    : 'Participant';
}

function avatarFor(person, styles) {
  if (person?.imageUrl) {
    return <Image source={{ uri: person.imageUrl }} style={styles.avatar} resizeMode="cover" />;
  }

  const initial =
    ((person?.firstName?.[0] ?? '') + (person?.lastName?.[0] ?? '')).toUpperCase() || '?';

  return (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarLetter}>{initial}</Text>
    </View>
  );
}

export default function MessagesScreen() {
  const { token } = useAuth();
  const { isDark, colors } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const [threads, setThreads] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(
    async (asRefresh = false) => {
      if (!token) {
        setThreads([]);
        setError(null);
        if (asRefresh) setRefreshing(false);
        return;
      }
      if (asRefresh) setRefreshing(true);
      setError(null);
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

  const unreadTotal = useMemo(
    () => (threads ?? []).reduce((total, item) => total + (Number(item.unreadCount) || 0), 0),
    [threads]
  );

  const visibleThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (threads ?? []).filter((item) => {
      if (filter === 'unread' && !(Number(item.unreadCount) > 0)) return false;
      if (!query) return true;
      const status = STATUS_UI[item.status]?.label ?? item.status ?? '';
      const searchable = [
        getOtherName(item),
        item.service?.title,
        item.service?.category,
        item.service?.location,
        item.lastMessage?.body,
        status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [filter, search, threads]);

  const onRefresh = useCallback(() => load(true), [load]);
  const hasFilters = search.trim().length > 0 || filter !== 'all';
  const totalConversations = threads?.length ?? 0;
  const conversationLabel = totalConversations === 1 ? 'chat' : 'chats';

  const renderThread = useCallback(
    ({ item, index }) => {
      const otherName = getOtherName(item);
      const status = STATUS_UI[item.status] ?? {
        label: item.status || 'Booking',
        icon: 'ellipse-outline',
        badgeStyle: 'statusDefault',
        textStyle: 'statusDefaultText',
      };
      const unreadCount = Number(item.unreadCount) || 0;
      const lastMessage = item.lastMessage;
      const preview = lastMessage
        ? lastMessage.senderId === item.other?.id
          ? lastMessage.body
          : `You: ${lastMessage.body}`
        : 'Start the conversation';
      const first = index === 0;
      const last = index === visibleThreads.length - 1;

      return (
        <TouchableOpacity
          style={[
            styles.threadRow,
            first && styles.threadRowFirst,
            last && styles.threadRowLast,
            unreadCount > 0 && styles.threadRowUnread,
          ]}
          activeOpacity={0.75}
          onPress={() =>
            router.push({
              pathname: '/chat/[appointmentId]',
              params: { appointmentId: item.appointmentId },
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`Open conversation with ${otherName}`}
        >
          <View style={[styles.avatarFrame, unreadCount > 0 && styles.avatarFrameUnread]}>
            {avatarFor(item.other, styles)}
            {unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
          </View>

          <View style={styles.threadContent}>
            <View style={styles.threadTop}>
              <Text style={[styles.threadName, unreadCount > 0 && styles.threadNameUnread]} numberOfLines={1}>
                {otherName}
              </Text>
              <Text style={styles.threadTime}>{timeAgo(lastMessage?.createdAt ?? item.startsAt)}</Text>
            </View>

            <View style={styles.threadServiceRow}>
              <Ionicons name={status.icon} size={13} color={colors.textMuted} />
              <Text style={styles.threadService} numberOfLines={1}>
                {item.service?.title ?? 'Booking'}
              </Text>
              <View style={[styles.statusPill, styles[status.badgeStyle]]}>
                <Text style={[styles.statusText, styles[status.textStyle]]}>{status.label}</Text>
              </View>
            </View>

            <View style={styles.threadBottom}>
              <Text
                style={[styles.threadPreview, unreadCount > 0 && styles.threadPreviewUnread]}
                numberOfLines={1}
              >
                {preview}
              </Text>
              {unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [colors.textMuted, styles, visibleThreads.length]
  );

  const renderListHeader = useCallback(
    () => (
      <View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people, services or messages"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear message search"
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterBar}>
          {FILTERS.map((item) => {
            const active = filter === item.id;
            const count = item.id === 'unread' ? unreadTotal : totalConversations;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterOption, active && styles.filterOptionActive]}
                onPress={() => setFilter(item.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={17} color="#ef4444" />
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {error}
            </Text>
            <TouchableOpacity onPress={() => load()} activeOpacity={0.8}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {visibleThreads.length > 0 ? (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent conversations</Text>
            <Text style={styles.sectionCount}>{visibleThreads.length}</Text>
          </View>
        ) : null}
      </View>
    ),
    [
      colors.textMuted,
      error,
      filter,
      load,
      search,
      styles,
      totalConversations,
      unreadTotal,
      visibleThreads.length,
    ]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name={hasFilters ? 'search-outline' : 'chatbubbles-outline'}
            size={32}
            color={colors.primary}
          />
        </View>
        <Text style={styles.emptyTitle}>{hasFilters ? 'No matching conversations' : 'No conversations yet'}</Text>
        <Text style={styles.emptySubtitle}>
          {hasFilters
            ? 'Try a different name, service or message.'
            : 'Your booking conversations will appear here.'}
        </Text>
        {hasFilters ? (
          <TouchableOpacity
            style={styles.clearFilters}
            onPress={() => {
              setSearch('');
              setFilter('all');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    ),
    [colors.primary, hasFilters, styles]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            {unreadTotal > 0 ? `${unreadTotal} unread message${unreadTotal === 1 ? '' : 's'}` : 'Your booking conversations'}
          </Text>
        </View>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountValue}>{totalConversations}</Text>
          <Text style={styles.headerCountLabel}>{conversationLabel}</Text>
        </View>
      </View>

      {threads === null ? (
        error ? (
          <View style={styles.center}>
            <View style={styles.centerErrorIcon}>
              <Ionicons name="cloud-offline-outline" size={34} color="#ef4444" />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => load()} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={INDIGO} />
          </View>
        )
      ) : (
        <FlatList
          data={visibleThreads}
          keyExtractor={(item) => item.appointmentId}
          renderItem={renderThread}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerErrorIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { fontSize: 14, fontWeight: '600', color: '#6b7280', textAlign: 'center', marginTop: 14 },
  retryButton: { marginTop: 18, backgroundColor: INDIGO, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  retryButtonText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 27, fontWeight: '800', color: INK, letterSpacing: -0.6 },
  headerSubtitle: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginTop: 2 },
  headerCount: {
    minWidth: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCountValue: { fontSize: 16, fontWeight: '800', color: INDIGO },
  headerCountLabel: { fontSize: 9, fontWeight: '700', color: '#9ca3af', marginTop: -1 },

  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  searchBox: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', color: INK, paddingVertical: 0 },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 15,
    padding: 4,
    marginTop: 14,
  },
  filterOption: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  filterOptionActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  filterText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  filterTextActive: { color: INK },
  filterCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  filterCountActive: { backgroundColor: '#eef2ff' },
  filterCountText: { fontSize: 10, fontWeight: '800', color: '#6b7280' },
  filterCountTextActive: { color: INDIGO },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginTop: 14,
  },
  errorBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#b91c1c' },
  retryText: { fontSize: 12, fontWeight: '800', color: '#dc2626' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: { fontSize: 12, fontWeight: '800', color: '#9ca3af' },

  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eef0f4',
  },
  threadRowFirst: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  threadRowLast: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomWidth: 0,
  },
  threadRowUnread: { backgroundColor: '#eef2ff' },
  avatarFrame: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  avatarFrameUnread: { borderColor: '#c7d2fe' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eef2ff' },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 17, fontWeight: '800', color: INDIGO },
  unreadDot: {
    position: 'absolute',
    right: -1,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  threadContent: { flex: 1, marginLeft: 13 },
  threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  threadName: { flex: 1, fontSize: 15, fontWeight: '700', color: INK },
  threadNameUnread: { fontWeight: '800' },
  threadTime: { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  threadServiceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  threadService: { flex: 1, fontSize: 12, fontWeight: '600', color: '#6b7280' },
  statusPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 4 },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.1 },
  statusPending: { backgroundColor: '#fffbeb' },
  statusPendingText: { color: '#b45309' },
  statusConfirmed: { backgroundColor: '#ecfdf5' },
  statusConfirmedText: { color: '#059669' },
  statusReschedule: { backgroundColor: '#f3e8ff' },
  statusRescheduleText: { color: '#7e22ce' },
  statusCancelled: { backgroundColor: '#fef2f2' },
  statusCancelledText: { color: '#dc2626' },
  statusCompleted: { backgroundColor: '#e0f2fe' },
  statusCompletedText: { color: '#0369a1' },
  statusDefault: { backgroundColor: '#f3f4f6' },
  statusDefaultText: { color: '#6b7280' },
  threadBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  threadPreview: { flex: 1, fontSize: 13, fontWeight: '500', color: '#6b7280' },
  threadPreviewUnread: { color: '#374151', fontWeight: '700' },
  unreadBadge: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: INDIGO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },

  empty: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 58, paddingBottom: 20 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: INK, marginTop: 16, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, fontWeight: '500', color: '#6b7280', textAlign: 'center', lineHeight: 20, marginTop: 6 },
  clearFilters: { marginTop: 18, backgroundColor: '#eef2ff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  clearFiltersText: { fontSize: 13, fontWeight: '800', color: INDIGO },
});
