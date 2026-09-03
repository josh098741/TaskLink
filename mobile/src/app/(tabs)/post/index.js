import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMyPosts } from '../../../config/api';
import { CATEGORIES } from '../../../config/categoriesData';

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
const PAYMENT_LABELS = { fixed: 'Fixed', hourly: 'Hourly', negotiable: 'Negotiable' };
const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
const STATUS_COLORS = {
  open: '#10b981',
  in_progress: '#f59e0b',
  completed: '#6b7280',
  cancelled: '#ef4444',
};

function catLabel(id) {
  return (id && CAT_MAP[id]) || id || 'General';
}

export default function Post() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    let token = await getToken({ skipCache: true }).catch(() => null);
    if (!token) token = await getToken().catch(() => null);
    const list = await fetchMyPosts(token, {
      'x-clerk-user-id': user?.id || '',
    });
    return list;
  }, [getToken, user]);

  // Keep a ref to the latest fetch so the focus effect never restarts
  // due to unstable getToken/user identities.
  const fetchPostsRef = useRef(fetchPosts);
  fetchPostsRef.current = fetchPosts;

  // Load on mount and refresh whenever the screen regains focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          const list = await fetchPostsRef.current();
          if (!cancelled) {
            setPosts(list);
            setLoading(false);
          }
        } catch (err) {
          console.warn('[post] load failed:', err);
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await fetchPostsRef.current();
      setPosts(list);
    } catch (err) {
      console.warn('[post] refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const renderCard = ({ item }) => {
    const photo = Array.isArray(item.photos) && item.photos.length > 0 ? item.photos[0] : null;
    const statusColor = STATUS_COLORS[item.status] || '#6b7280';
    const when = item.dateNeeded
      ? `${item.dateNeeded}${item.timeNeeded ? ` @ ${item.timeNeeded}` : ''}`
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/post/${item.id}`)}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="briefcase-outline" size={30} color="#c7d2fe" />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardCategory} numberOfLines={1}>
              {catLabel(item.category)}
            </Text>
            <View
              style={[styles.statusBadge, { backgroundColor: `${statusColor}1a` }]}
            >
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[item.status] || item.status}
              </Text>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.cardMeta} numberOfLines={1}>
            <Ionicons name="location-outline" size={13} color="#9ca3af" /> {item.location}
            {when ? `  ·  ${when}` : ''}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.cardBudget}>
              KSh {item.budgetAmount}
              <Text style={styles.cardBudgetType}>
                {' '}
                ({PAYMENT_LABELS[item.paymentType] || 'Fixed'})
              </Text>
            </Text>
            <View style={styles.detailHint}>
              <Text style={styles.detailHintText}>View details</Text>
              <Ionicons name="chevron-forward" size={14} color="#4f46e5" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const emptyState = (
    <View style={styles.empty}>
      <Image
        source={require('../../../../assets/images/post-background.png')}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyTitle}>No Posts yet</Text>
      <Text style={styles.emptySubtitle}>
        Looks like you have not shared any task yet. Be the first to post and connect
        with doers nearby.
      </Text>

      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={() => router.push('/post-create')}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.ctaBtnText}>Create your first post</Text>
      </TouchableOpacity>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.orLine} />
      </View>

      <TouchableOpacity
        style={styles.exploreBtn}
        onPress={() => router.navigate('/(tabs)/jobs')}
        activeOpacity={0.8}
      >
        <Ionicons name="briefcase-outline" size={18} color="#4f46e5" />
        <Text style={styles.exploreText}>Explore Tasks</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Posts</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/post-create')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Create Post</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : posts.length === 0 ? (
        emptyState
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = {
  safe: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.5,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 120 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: { width: '100%', height: 140 },
  cardImagePlaceholder: {
    backgroundColor: '#f3f1ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 16 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e1b4b',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  cardMeta: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  cardBudget: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
  },
  cardBudgetType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  detailHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailHintText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  emptyImage: { width: 220, height: 220, marginBottom: 24 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e1b4b',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14.5,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 26,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    alignSelf: 'stretch',
  },
  orLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    marginHorizontal: 14,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    gap: 8,
  },
  exploreText: { fontSize: 16, fontWeight: '700', color: '#4f46e5' },
};
