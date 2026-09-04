import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Image,
  FlatList,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { CATEGORIES, CATEGORY_GROUPS } from '../../../config/categoriesData';
import { fetchPosts } from '../../../config/api';

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
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
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
  // new group context, which still fetches all posts.
  const onGroupChange = (id) => {
    setSelectedGroup(id);
    setSelectedCategory('all');
  };

  // Fetch posts whenever the selected category changes (including on mount).
  useEffect(() => {
    let cancelled = false;
    const runId = ++fetchRef.current;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const params = selectedCategory === 'all' ? {} : { category: selectedCategory };
        const list = await fetchPosts(params);
        if (!cancelled && fetchRef.current === runId) setPosts(list);
      } catch (err) {
        console.warn('[home] load posts failed:', err);
        if (!cancelled && fetchRef.current === runId) {
          setPosts([]);
          setError(err.message || 'Failed to load tasks.');
        }
      } finally {
        if (!cancelled && fetchRef.current === runId) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, fetchRef]);

  const onSelectCategory = (id) => {
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

  const renderPost = ({ item }) => {
    const photo =
      Array.isArray(item.photos) && item.photos.length > 0 ? item.photos[0] : null;
    const categoryLabel =
      (item.category && CATEGORIES.find((c) => c.id === item.category)?.label) ||
      item.category;

    return (
      <TouchableOpacity
        style={styles.postCard}
        activeOpacity={0.9}
        onPress={() => router.push(`/post/${item.id}`)}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.postImage} resizeMode="cover" />
        ) : (
          <View style={[styles.postImage, styles.postImagePlaceholder]}>
            <Ionicons name="briefcase-outline" size={36} color="#c7d2fe" />
          </View>
        )}

        {/* Urgent badge floats on top of the blur, top-right */}
        {item.isUrgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>Urgent</Text>
          </View>
        )}

        {/* Blur now covers the ENTIRE photo (absolute fill over the whole
            card), not just a strip at the bottom. The inner content is
            pushed to the bottom of that full-card blur via
            justifyContent: 'flex-end' on detailsPanel. */}
        <BlurView intensity={55} tint="dark" style={styles.detailsPanel}>
          {/* Uniform dark tint across the WHOLE card, sitting under the text
              content, so the darkening is even everywhere and not just
              behind the bottom text. */}
          <View style={styles.detailsTint} pointerEvents="none" />
          <ScrollView
            style={styles.detailsScroll}
            contentContainerStyle={styles.detailsInner}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <Text style={styles.postCategory} numberOfLines={1}>
              {categoryLabel}
            </Text>
            <Text style={styles.postTitle}>
              {item.title}
            </Text>
            <View style={styles.postMetaRow}>
              <Ionicons name="location-outline" size={13} color="#e5e7eb" />
              <Text style={styles.postMeta}>
                {item.location}
              </Text>
            </View>
            <View style={styles.postFooter}>
              <Text style={styles.postBudget}>
                KSh {item.budgetAmount}
                <Text style={styles.postBudgetType}>
                  {' '}({PAYMENT_LABELS[item.paymentType] || 'Fixed'})
                </Text>
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#ffffff" />
            </View>
          </ScrollView>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const activeTabLabel =
    selectedCategory === 'all'
      ? 'All Tasks'
      : CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'Tasks';

  const showAllPill = selectedCategory !== 'all';
  const listHeader =
    posts.length > 0
      ? `${posts.length} task${posts.length === 1 ? '' : 's'} available`
      : 'No tasks available right now';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
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
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text style={styles.loadingText}>Loading tasks...</Text>
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
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptySubtitle}>
                There are no available tasks{selectedCategory !== 'all' ? ' in this category' : ''} right now.
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

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  loadingText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
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

  // --- Post card: full-bleed image with a full-card blur, content docked
  // to the bottom of that blur ---
  postCard: {
    height: 190,
    borderRadius: 18,
    marginHorizontal: 22,
    marginBottom: 14,
    overflow: 'hidden',
    backgroundColor: '#1e1b4b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  postImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  postImagePlaceholder: {
    backgroundColor: '#3730a3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    zIndex: 2,
  },
  urgentText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },

  detailsPanel: {
    // Now covers the ENTIRE post image, not just a strip at the bottom.
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end', // keeps the text content docked to the bottom
    overflow: 'hidden',
  },
  detailsTint: {
    // Even, uniform darkening over the entire card (not just behind the
    // text), so the blur reads the same brightness top-to-bottom.
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.28)',
  },
  detailsScroll: {
    // Cap how tall the details area can grow so long titles/locations
    // scroll internally instead of overflowing or covering the whole photo.
    maxHeight: '68%',
  },
  detailsInner: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  postCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c7d2fe',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  postMeta: { fontSize: 12.5, fontWeight: '500', color: '#e5e7eb' },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 8,
  },
  postBudget: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  postBudgetType: { fontSize: 12, fontWeight: '600', color: '#d1d5db' },

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