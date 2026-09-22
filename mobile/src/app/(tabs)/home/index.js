import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ImageBackground,
  FlatList,
  StyleSheet,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { CATEGORIES, CATEGORY_GROUPS } from '../../../config/categoriesData';
import { fetchPosts, fetchServices } from '../../../config/api';

const SKELETON_COUNT = 4;

function SkeletonCard() {
  const shimmer = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.5],
  });

  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonOverlay}>
        <View style={styles.skeletonDetails}>
          <View style={styles.skeletonTagRow}>
            <Animated.View
              style={[styles.skeletonChip, { width: 72, height: 23, opacity }]}
            />
            <Animated.View
              style={[styles.skeletonUrgentChip, { width: 58, height: 23, opacity }]}
            />
          </View>

          <View style={styles.skeletonTitle}>
            <Animated.View
              style={[styles.skeletonBar, { width: '82%', height: 16, opacity }]}
            />
            <Animated.View
              style={[styles.skeletonBar, { width: '58%', height: 16, opacity, marginTop: 6 }]}
            />
          </View>

          <View style={styles.skeletonMetaRow}>
            <View style={styles.skeletonIcon} />
            <Animated.View
              style={[styles.skeletonBar, { width: '42%', height: 12, opacity }]}
            />
          </View>

          <View style={styles.skeletonFooter}>
            <View style={styles.skeletonBudgetRow}>
              <Animated.View
                style={[styles.skeletonBar, { width: 72, height: 16, opacity }]}
              />
              <Animated.View
                style={[styles.skeletonBar, { width: 42, height: 11, opacity, marginLeft: 4 }]}
              />
            </View>
            <Animated.View
              style={[styles.skeletonViewPill, { width: 82, height: 28, opacity }]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const GROUP_COLORS = {
  home: '#0ea5e9',
  tech: '#8b5cf6',
  events: '#ec4899',
  transport: '#f59e0b',
  wellness: '#10b981',
  business: '#4f46e5',
};

const PAYMENT_LABELS = { fixed: 'Fixed', hourly: 'Hourly', negotiable: 'Negotiable' };

export default function Home() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const groups = useMemo(
    () => [{ id: 'all', label: 'All' }, ...CATEGORY_GROUPS.filter((g) => g.id !== 'all')],
    []
  );

  // Filter category circles by the selected group pill.
  const visibleCategories = useMemo(
    () =>
      selectedGroup === 'all'
        ? CATEGORIES
        : CATEGORIES.filter((c) => c.group === selectedGroup),
    [selectedGroup]
  );

  const fetchRef = useRef(0);

  // When the group changes, reset back to browsing all categories within the
  // new group context, which still fetches the complete feed.
  const onGroupChange = (id) => {
    setLoading(true);
    setError(null);
    setSelectedGroup(id);
    setSelectedCategory('all');
  };

  // Fetch posts and services whenever the selected category changes (including on mount).
  useEffect(() => {
    let cancelled = false;
    const runId = ++fetchRef.current;
    (async () => {
      try {
        const params = selectedCategory === 'all' ? {} : { category: selectedCategory };
        const results = await Promise.allSettled([
          fetchPosts(params, token),
          fetchServices(params, token),
        ]);
        const postResult = results[0];
        const serviceResult = results[1];
        const postList = postResult.status === 'fulfilled' ? postResult.value : [];
        const serviceList = serviceResult.status === 'fulfilled' ? serviceResult.value : [];
        const failed = results.filter((result) => result.status === 'rejected');

        if (postResult.status === 'rejected') {
          console.warn('[home] load posts failed:', postResult.reason);
        }
        if (serviceResult.status === 'rejected') {
          console.warn('[home] load services failed:', serviceResult.reason);
        }

        const list = [
          ...postList.map((item) => ({ ...item, type: 'post' })),
          ...serviceList.map((item) => ({ ...item, type: 'service' })),
        ].sort((a, b) => {
          const aTime = new Date(a.publishedAt ?? a.createdAt ?? 0).getTime();
          const bTime = new Date(b.publishedAt ?? b.createdAt ?? 0).getTime();
          return bTime - aTime;
        });

        if (!cancelled && fetchRef.current === runId) {
          setFeed(list);
          if (failed.length === results.length) {
            setError('Failed to load posts and services.');
          } else {
            setError(null);
          }
        }
      } catch (err) {
        console.warn('[home] load feed failed:', err);
        if (!cancelled && fetchRef.current === runId) {
          setFeed([]);
          setError(err.message || 'Failed to load posts and services.');
        }
      } finally {
        if (!cancelled && fetchRef.current === runId) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, token]);

  const onSelectCategory = (id) => {
    setLoading(true);
    setError(null);
    setSelectedCategory((prev) => (prev === id ? 'all' : id));
  };

  const onSearch = () => {
    const q = search.trim();
    if (!q) return;
    Keyboard.dismiss();
    router.push({
      pathname: '/results',
      params: { type: 'search', q, title: `"${q}"` },
    });
  };

  const renderCategory = (item) => {
    const active = selectedCategory === item.id;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.catItem, active && styles.catItemActive]}
        activeOpacity={0.7}
        onPress={() => onSelectCategory(item.id)}
      >
        <View style={[styles.catCircle, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={26} color="#ffffff" />
        </View>
        <Text style={[styles.catName, active && styles.catNameActive]} numberOfLines={2}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFeedItem = ({ item }) => {
    const isService = item.type === 'service';
    const photo =
      Array.isArray(item.photos) && item.photos.length > 0 ? item.photos[0] : null;
    const categoryLabel =
      (item.category && CATEGORIES.find((c) => c.id === item.category)?.label) ||
      item.category;
    const priceLabel = isService
      ? item.priceType === 'negotiable'
        ? 'Negotiable'
        : item.priceAmount != null
          ? `KSh ${item.priceAmount}`
          : 'Not set'
      : `KSh ${item.budgetAmount}`;
    const priceTypeLabel = isService
      ? item.priceType === 'hourly' ? '/hour' : ''
      : ` (${PAYMENT_LABELS[item.paymentType] || 'Fixed'})`;
    const providerLabel = isService && item.provider
      ? [item.provider.firstName, item.provider.lastName].filter(Boolean).join(' ')
      : null;

    const info = (
      <View style={styles.detailsInner}>
        <View style={[styles.typeBadge, isService && styles.serviceTypeBadge]} pointerEvents="none">
          <Ionicons
            name={isService ? 'briefcase-outline' : 'document-text-outline'}
            size={10}
            color="#ffffff"
          />
          <Text style={styles.typeBadgeText}>{isService ? 'Service' : 'Task'}</Text>
        </View>

        <View style={styles.tagRow}>
          <View style={styles.categoryChip}>
            <Text style={styles.postCategory} numberOfLines={1}>
              {categoryLabel}
            </Text>
          </View>
          {item.isUrgent && (
            <View style={styles.urgentChip}>
              <Ionicons name="flash" size={10} color="#ffffff" />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
        </View>

        <Text style={styles.postTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.postMetaRow}>
          <Ionicons name="location-outline" size={14} color="#e2e8f0" />
          <Text style={styles.postMeta} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        {providerLabel ? (
          <View style={styles.postMetaRow}>
            <Ionicons name="person-outline" size={14} color="#e2e8f0" />
            <Text style={styles.postMeta} numberOfLines={1}>
              {providerLabel}
            </Text>
          </View>
        ) : null}

        <View style={styles.postFooter}>
          <Text style={styles.postBudget} numberOfLines={1}>
            {priceLabel}
            <Text style={styles.postBudgetType}>
              {priceTypeLabel}
            </Text>
          </Text>
          <View style={styles.viewPill}>
            <Text style={styles.viewPillText}>{isService ? 'View Service' : 'View Task'}</Text>
            <Ionicons name="arrow-forward" size={13} color="#ffffff" />
          </View>
        </View>
      </View>
    );

    return (
      <TouchableOpacity
        style={styles.postCard}
        activeOpacity={0.9}
        onPress={() => router.push(
          isService
            ? { pathname: '/service/[id]', params: { id: item.id } }
            : `/post/${item.id}`
        )}
      >
        {photo ? (
          <View style={styles.postImageWrap}>
            <ImageBackground
              source={{ uri: photo }}
              style={styles.postImage}
              imageStyle={styles.postImageInner}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>{info}</View>
          </View>
        ) : (
          <View style={[styles.postImage, styles.postImagePlaceholder]}>
            {info}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const activeTabLabel =
    selectedCategory === 'all'
      ? 'All Tasks & Services'
      : CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'Tasks & Services';

  const showAllPill = selectedCategory !== 'all';
  const listHeader =
    feed.length > 0
      ? `${feed.length} item${feed.length === 1 ? '' : 's'} available`
      : 'No posts or services available right now';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderFeedItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Welcome back 👋</Text>
                <Text style={styles.title}>TaskLink</Text>
              </View>
              <TouchableOpacity style={styles.avatar} activeOpacity={0.8}>
                <Ionicons name="person" size={22} color="#4f46e5" />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a task or service..."
                placeholderTextColor="#9ca3af"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                onSubmitEditing={onSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color="#c4b5fd" />
                </TouchableOpacity>
              )}
            </View>

            {/* Group filter pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groupRow}
            >
              {groups.map((g) => {
                const active = g.id === selectedGroup;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.groupPill, active && styles.groupPillActive]}
                    activeOpacity={0.8}
                    onPress={() => onGroupChange(g.id)}
                  >
                    <View
                      style={[
                        styles.groupDot,
                        { backgroundColor: active ? '#ffffff' : GROUP_COLORS[g.id] || '#4f46e5' },
                      ]}
                    />
                    <Text style={[styles.groupText, active && styles.groupTextActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Categories section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <Text style={styles.sectionCount}>
                Tap a category to see its tasks
              </Text>
            </View>

            <View style={styles.catsBox}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catsRow}
              >
                {visibleCategories.map((item) => renderCategory(item))}
              </ScrollView>
            </View>

            {/* Active tab + posts heading */}
            <View style={styles.postsHeader}>
              <View style={styles.postsTitleRow}>
                <Text style={styles.postsTitle}>{activeTabLabel}</Text>
                {showAllPill && (
                  <TouchableOpacity
                    style={styles.allPill}
                    activeOpacity={0.8}
                    onPress={() => onSelectCategory('all')}
                  >
                    <Text style={styles.allPillText}>All</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {loading ? (
              <View style={styles.skeletonContainer}>
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </View>
            ) : error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <Text style={styles.listCount}>{listHeader}</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={44} color="#c7d2fe" />
              <Text style={styles.emptyTitle}>No posts or services found</Text>
              <Text style={styles.emptySubtitle}>
                There are no available posts or services{selectedCategory !== 'all' ? ' in this category' : ''} right now.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  content: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  greeting: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 2 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.5,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eef2ff',
    borderWidth: 2,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 22,
    marginTop: 20,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1e1b4b' },

  groupRow: { paddingHorizontal: 22, paddingTop: 18, gap: 10 },
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 38,
    borderWidth: 1.5,
    borderColor: '#eef0f4',
    gap: 8,
  },
  groupPillActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  groupTextActive: { color: '#ffffff' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginTop: 28,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.3,
  },
  sectionCount: { fontSize: 12.5, fontWeight: '600', color: '#9ca3af', maxWidth: 200 },

  catsBox: { marginBottom: 8 },
  catsRow: { paddingHorizontal: 22, gap: 18 },

  catItem: { alignItems: 'center', width: 74 },
  catItemActive: { opacity: 1 },
  catCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  catName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
    maxWidth: 74,
  },
  catNameActive: { color: '#4f46e5', fontWeight: '800' },

  postsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginTop: 24,
    marginBottom: 12,
  },
  postsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postsTitle: { fontSize: 20, fontWeight: '800', color: '#1e1b4b', letterSpacing: -0.3 },
  allPill: {
    backgroundColor: '#eef2ff',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  allPillText: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  errorText: { fontSize: 13, fontWeight: '600', color: '#ef4444', flex: 1 },
  listCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    paddingHorizontal: 22,
    marginBottom: 12,
  },

  skeletonContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonCard: {
    height: 220,
    borderRadius: 20,
    marginBottom: 0,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  skeletonImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#d1d5db',
  },
  skeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
    justifyContent: 'flex-end',
  },
  skeletonDetails: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  skeletonTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  skeletonTitle: {
    marginBottom: 7,
  },
  skeletonChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.45)',
    backgroundColor: 'rgba(156, 163, 175, 0.55)',
  },
  skeletonUrgentChip: {
    borderRadius: 10,
    backgroundColor: 'rgba(107, 114, 128, 0.65)',
  },
  skeletonBar: {
    borderRadius: 6,
    backgroundColor: 'rgba(156, 163, 175, 0.65)',
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  skeletonIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(156, 163, 175, 0.65)',
  },
  skeletonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 163, 175, 0.35)',
    paddingTop: 10,
  },
  skeletonBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skeletonViewPill: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.45)',
    backgroundColor: 'rgba(156, 163, 175, 0.55)',
  },

  // --- Post card: rounded full-image card with screen-edge padding ---
  postCard: {
    height: 220,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#1e1b4b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  postImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end', // docks the info to the bottom border
  },
  postImageWrap: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  postImageInner: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  postImagePlaceholder: {
    backgroundColor: '#3730a3',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    justifyContent: 'flex-end',
  },
  urgentText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },

  detailsInner: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(79, 70, 229, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase' },
  serviceTypeBadge: { backgroundColor: 'rgba(5, 150, 105, 0.95)' },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  postCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  urgentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
    marginBottom: 7,
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  postMeta: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.9)' },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 10,
  },
  postBudget: { fontSize: 16, fontWeight: '800', color: '#ffffff', flexShrink: 1 },
  postBudgetType: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  viewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
  },
  viewPillText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },

  empty: {
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingTop: 30,
    paddingBottom: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e1b4b', marginTop: 14 },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
    maxWidth: 280,
  },
});