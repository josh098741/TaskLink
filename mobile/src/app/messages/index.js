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
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../theme/themeStyles';
import { useAuth } from '../../contexts/AuthContext';
import { fetchChatThreads } from '../../config/api';

const PAGE_BG = '#fafafa';
const INDIGO = '#4f46e5';
const INK = '#1e1b4b';

const STATUS_UI = {
  pending: {
    label: 'Pending',
    icon: 'time-outline',
    badgeStyle: 'statusPending',
    textStyle: 'statusPendingText',
    railStyle: 'railPending',
  },
  confirmed: {
    label: 'Confirmed',
    icon: 'checkmark-circle-outline',
    badgeStyle: 'statusConfirmed',
    textStyle: 'statusConfirmedText',
    railStyle: 'railConfirmed',
  },
  reschedule_requested: {
    label: 'Reschedule',
    icon: 'calendar-outline',
    badgeStyle: 'statusReschedule',
    textStyle: 'statusRescheduleText',
    railStyle: 'railReschedule',
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'close-circle-outline',
    badgeStyle: 'statusCancelled',
    textStyle: 'statusCancelledText',
    railStyle: 'railCancelled',
  },
  completed: {
    label: 'Completed',
    icon: 'checkmark-done-outline',
    badgeStyle: 'statusCompleted',
    textStyle: 'statusCompletedText',
    railStyle: 'railCompleted',
  },
  no_show: {
    label: 'No-show',
    icon: 'alert-circle-outline',
    badgeStyle: 'statusCancelled',
    textStyle: 'statusCancelledText',
    railStyle: 'railCancelled',
  },
  'no-show': {
    label: 'No-show',
    icon: 'alert-circle-outline',
    badgeStyle: 'statusCancelled',
    textStyle: 'statusCancelledText',
    railStyle: 'railCancelled',
  },
  declined: {
    label: 'Declined',
    icon: 'close-circle-outline',
    badgeStyle: 'statusCancelled',
    textStyle: 'statusCancelledText',
    railStyle: 'railCancelled',
  },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
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

function getActivityTime(item) {
  return item.lastMessage?.createdAt ?? item.updatedAt ?? item.startsAt ?? '';
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

function ThreadSkeleton({ styles }) {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonLineLong} />
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonLinePreview} />
      </View>
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

  const filterCounts = useMemo(
    () => ({
      all: threads?.length ?? 0,
      unread: unreadTotal,
      pending: (threads ?? []).filter((item) => item.status === 'pending').length,
      confirmed: (threads ?? []).filter((item) => item.status === 'confirmed').length,
    }),
    [threads, unreadTotal]
  );

  const visibleThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (threads ?? [])
      .filter((item) => {
        const unreadCount = Number(item.unreadCount) || 0;
        if (filter === 'unread' && unreadCount === 0) return false;
        if (filter === 'pending' && item.status !== 'pending') return false;
        if (filter === 'confirmed' && item.status !== 'confirmed') return false;
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
      })
      .sort((a, b) => {
        const unreadDifference = (Number(b.unreadCount) || 0) - (Number(a.unreadCount) || 0);
        if (unreadDifference !== 0) return unreadDifference;
        return new Date(getActivityTime(b)).getTime() - new Date(getActivityTime(a)).getTime();
      });
  }, [filter, search, threads]);

  const onRefresh = useCallback(() => load(true), [load]);
  const hasFilters = search.trim().length > 0 || filter !== 'all';
  const totalConversations = threads?.length ?? 0;
  const conversationLabel = totalConversations === 1 ? 'chat' : 'chats';
  const heroText = isDark ? colors.background : '#ffffff';
  const heroMuted = isDark ? 'rgba(15, 23, 42, 0.66)' : 'rgba(255, 255, 255, 0.72)';
  const heroSoft = isDark ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.14)';
  const heroBorder = isDark ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.22)';

  const renderThread = useCallback(
    ({ item }) => {
      const otherName = getOtherName(item);
      const status = STATUS_UI[item.status] ?? {
        label: item.status || 'Booking',
        icon: 'ellipse-outline',
        badgeStyle: 'statusDefault',
        textStyle: 'statusDefaultText',
        railStyle: 'railDefault',
      };
      const unreadCount = Number(item.unreadCount) || 0;
      const lastMessage = item.lastMessage;
      const preview = lastMessage
        ? lastMessage.senderId === item.other?.id
          ? lastMessage.body
          : `You: ${lastMessage.body}`
        : 'Start the conversation';

      return (
        <TouchableOpacity
          style={[styles.threadCard, unreadCount > 0 && styles.threadCardUnread]}
          activeOpacity={0.78}
          onPress={() =>
            router.push({
              pathname: '/chat/[appointmentId]',
              params: { appointmentId: item.appointmentId },
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`Open conversation with ${otherName}`}
        >
          <View style={[styles.statusRail, styles[status.railStyle]]} />
          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <View style={styles.avatarFrame}>
                {avatarFor(item.other, styles)}
                {unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
              </View>
              <View style={styles.identity}>
                <Text style={[styles.threadName, unreadCount > 0 && styles.threadNameUnread]} numberOfLines={1}>
                  {otherName}
                </Text>
                <View style={styles.serviceLine}>
                  <Ionicons name={status.icon} size={13} color={colors.textMuted} />
                  <Text style={styles.serviceText} numberOfLines={1}>
                    {item.service?.title ?? 'Booking'}
                  </Text>
                </View>
              </View>
              <View style={styles.timeColumn}>
                <Text style={styles.threadTime}>{timeAgo(getActivityTime(item))}</Text>
                {unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.previewRow}>
              <Text
                style={[styles.threadPreview, unreadCount > 0 && styles.threadPreviewUnread]}
                numberOfLines={1}
              >
                {preview}
              </Text>
              <View style={[styles.statusPill, styles[status.badgeStyle]]}>
                <Text style={[styles.statusText, styles[status.textStyle]]}>{status.label}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [colors.textMuted, styles]
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((item) => {
            const active = filter === item.id;
            const count = filterCounts[item.id];
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
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
        </ScrollView>

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
            <View>
              <Text style={styles.sectionTitle}>Your inbox</Text>
              <Text style={styles.sectionSubtitle}>Stay on top of every booking</Text>
            </View>
            <Text style={styles.sectionCount}>{visibleThreads.length}</Text>
          </View>
        ) : null}
      </View>
    ),
    [colors.textMuted, error, filter, filterCounts, load, search, styles, visibleThreads.length]
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={styles.heroTop}>
          <TouchableOpacity
            style={[styles.heroBack, { backgroundColor: heroSoft, borderColor: heroBorder }]}
            onPress={() => router.back()}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={heroText} />
          </TouchableOpacity>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroEyebrow, { color: heroMuted }]}>INBOX</Text>
            <Text style={[styles.heroTitle, { color: heroText }]}>Messages</Text>
          </View>
          <View style={[styles.heroCount, { backgroundColor: heroSoft, borderColor: heroBorder }]}>
            <Text style={[styles.heroCountValue, { color: heroText }]}>{totalConversations}</Text>
            <Text style={[styles.heroCountLabel, { color: heroMuted }]}>{conversationLabel}</Text>
          </View>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatValue, { color: heroText }]}>{unreadTotal}</Text>
            <Text style={[styles.heroStatLabel, { color: heroMuted }]}>Unread</Text>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: heroBorder }]} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatValue, { color: heroText }]}>{filterCounts.pending}</Text>
            <Text style={[styles.heroStatLabel, { color: heroMuted }]}>Pending</Text>
          </View>
          <View style={[styles.heroHint, { backgroundColor: heroSoft }]}>
            <Ionicons name={unreadTotal > 0 ? 'notifications-outline' : 'checkmark-circle-outline'} size={16} color={heroText} />
            <Text style={[styles.heroHintText, { color: heroText }]} numberOfLines={1}>
              {unreadTotal > 0 ? 'You have new messages' : 'You’re all caught up'}
            </Text>
          </View>
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
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={INDIGO} />
            <Text style={styles.loadingText}>Loading your inbox…</Text>
            <ThreadSkeleton styles={styles} />
            <ThreadSkeleton styles={styles} />
            <ThreadSkeleton styles={styles} />
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
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 28,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroBack: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, marginLeft: 12 },
  heroEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  heroTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7, marginTop: 1 },
  heroCount: {
    minWidth: 50,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCountValue: { fontSize: 17, fontWeight: '800' },
  heroCountLabel: { fontSize: 9, fontWeight: '700', marginTop: -1 },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  heroStat: { minWidth: 55 },
  heroStatValue: { fontSize: 20, fontWeight: '800' },
  heroStatLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  heroDivider: { width: 1, height: 32, marginHorizontal: 12 },
  heroHint: {
    flex: 1,
    minHeight: 36,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 7,
    marginLeft: 14,
  },
  heroHintText: { flex: 1, fontSize: 10, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
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
  loadingState: { paddingHorizontal: 16, paddingTop: 22 },
  loadingText: { fontSize: 12, fontWeight: '700', color: '#6b7280', textAlign: 'center', marginVertical: 14 },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eef0f4',
  },
  skeletonAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#eef2ff' },
  skeletonContent: { flex: 1, marginLeft: 13 },
  skeletonLineLong: { width: '48%', height: 13, borderRadius: 7, backgroundColor: '#e5e7eb' },
  skeletonLineShort: { width: '72%', height: 10, borderRadius: 5, backgroundColor: '#eef2f6', marginTop: 9 },
  skeletonLinePreview: { width: '88%', height: 10, borderRadius: 5, backgroundColor: '#eef2f6', marginTop: 12 },

  listContent: { paddingHorizontal: 16, paddingTop: 18 },
  searchBox: {
    height: 52,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', color: INK, paddingVertical: 0 },
  filterRow: { paddingTop: 14, paddingBottom: 4, gap: 8 },
  filterChip: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  filterTextActive: { color: INDIGO },
  filterCount: {
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  filterCountActive: { backgroundColor: '#c7d2fe' },
  filterCountText: { fontSize: 9, fontWeight: '800', color: '#6b7280' },
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
    marginTop: 22,
    marginBottom: 11,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: INK, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 11, fontWeight: '600', color: '#9ca3af', marginTop: 2 },
  sectionCount: { fontSize: 12, fontWeight: '800', color: '#9ca3af' },

  threadCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef0f4',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    overflow: 'hidden',
  },
  threadCardUnread: { backgroundColor: '#eef2ff', borderColor: '#e0e7ff' },
  statusRail: { width: 4, borderRadius: 4, marginRight: 12, alignSelf: 'stretch' },
  railPending: { backgroundColor: '#f59e0b' },
  railConfirmed: { backgroundColor: '#10b981' },
  railReschedule: { backgroundColor: '#8b5cf6' },
  railCancelled: { backgroundColor: '#ef4444' },
  railCompleted: { backgroundColor: '#0ea5e9' },
  railDefault: { backgroundColor: '#94a3af' },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatarFrame: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 3,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eef2ff' },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 16, fontWeight: '800', color: INDIGO },
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
  identity: { flex: 1, marginLeft: 12, minWidth: 0 },
  threadName: { fontSize: 15, fontWeight: '700', color: INK },
  threadNameUnread: { fontWeight: '800' },
  serviceLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  serviceText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#6b7280' },
  timeColumn: { alignItems: 'flex-end', gap: 8, marginLeft: 8 },
  threadTime: { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  threadPreview: { flex: 1, fontSize: 13, fontWeight: '500', color: '#6b7280' },
  threadPreviewUnread: { color: '#374151', fontWeight: '700' },
  statusPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
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
