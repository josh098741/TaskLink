import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { fetchPosts } from '../../../config/api';
import { CATEGORIES } from '../../../config/categoriesData';

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
const PAYMENT_LABELS = { fixed: 'Fixed', hourly: 'Hourly', negotiable: 'Negotiable' };

function catLabel(id) {
  return (id && CAT_MAP[id]) || id || 'General';
}

export default function Jobs() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const list = await fetchPosts({ status: 'open' });
    return list;
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          setLoading(true);
          setError(null);
          const list = await loadRef.current();
          if (!cancelled) {
            setPosts(list);
          }
        } catch (err) {
          console.warn('[jobs] load failed:', err);
          if (!cancelled) setError(err.message || 'Failed to load jobs.');
        } finally {
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
      const list = await loadRef.current();
      setPosts(list);
    } catch (err) {
      console.warn('[jobs] refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

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
          <View style={styles.cardTopRow}>
            <Text style={styles.cardCategory} numberOfLines={1}>
              {catLabel(item.category)}
            </Text>
            {item.isUrgent && (
              <View style={styles.urgentBadge}>
                <Ionicons name="flash" size={11} color="#fff" />
                <Text style={styles.urgentText}>Urgent</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.cardMeta} numberOfLines={1}>
            <Ionicons name="location-outline" size={13} color="#9ca3af" /> {item.location}
            {item.dateNeeded ? `  ·  ${item.dateNeeded}` : ''}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.cardBudget}>
              KSh {item.budgetAmount}
              <Text style={styles.cardBudgetType}>
                {' '}({PAYMENT_LABELS[item.paymentType] || 'Fixed'})
              </Text>
            </Text>
            <View style={styles.detailHint}>
              <Text style={styles.detailHintText}>Accept</Text>
              <Ionicons name="chevron-forward" size={14} color="#4f46e5" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Jobs</Text>
        <Text style={styles.headerSub}>Find a task near you and accept it</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="briefcase-outline" size={44} color="#c7d2fe" />
          <Text style={styles.emptyTitle}>No open jobs right now</Text>
          <Text style={styles.emptySubtitle}>
            Check back soon — new tasks are posted all the time.
          </Text>
        </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  header: {
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
  headerSub: { fontSize: 13, fontWeight: '500', color: '#6b7280', marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: '#6b7280', marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e1b4b',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
    maxWidth: 280,
  },
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
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  urgentText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
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
});
