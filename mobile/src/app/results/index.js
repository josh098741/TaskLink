import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchPosts } from '../../config/api';
import { CATEGORIES } from '../../config/categoriesData';

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
const PAYMENT_LABELS = { fixed: 'Fixed', hourly: 'Hourly', negotiable: 'Negotiable' };

function catLabel(id) {
  return (id && CAT_MAP[id]) || id || 'General';
}

export default function Results() {
  const params = useLocalSearchParams();
  const type = params.type;
  const title = params.title || 'Results';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const queryParams = useRef(
    type === 'category' ? { category: params.id } : { q: params.q }
  ).current;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPosts(queryParams);
      setPosts(list);
    } catch (err) {
      console.warn('[results] load failed:', err);
      setError(err.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    load();
  }, [load]);

  const renderCard = ({ item }) => {
    const photo = Array.isArray(item.photos) && item.photos.length > 0 ? item.photos[0] : null;
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
          <Text style={styles.cardCategory}>{catLabel(item.category)}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            <Ionicons name="location-outline" size={13} color="#9ca3af" /> {item.location}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardBudget}>
              KSh {item.budgetAmount}
              <Text style={styles.cardBudgetType}>
                {' '}({PAYMENT_LABELS[item.paymentType] || 'Fixed'})
              </Text>
            </Text>
            {item.isUrgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>Urgent</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerSubtitle}>
            {type === 'category' ? 'Available tasks' : 'Search results'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={44} color="#c7d2fe" />
          <Text style={styles.emptyTitle}>No tasks found</Text>
          <Text style={styles.emptySubtitle}>
            There are no available tasks matching this {type === 'category' ? 'category' : 'search'} right now.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.listCount}>
              {posts.length} task{posts.length === 1 ? '' : 's'} available
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e1b4b' },
  headerSubtitle: { fontSize: 12.5, color: '#9ca3af', marginTop: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 120 },
  listCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
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
  cardCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  cardMeta: { fontSize: 13, fontWeight: '500', color: '#6b7280', marginBottom: 12 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  cardBudget: { fontSize: 16, fontWeight: '800', color: '#2563eb' },
  cardBudgetType: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  urgentBadge: {
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentText: { fontSize: 11, fontWeight: '700', color: '#ef4444' },
  errorText: { fontSize: 15, color: '#6b7280', marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e1b4b', marginTop: 14 },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
    maxWidth: 260,
  },
});
