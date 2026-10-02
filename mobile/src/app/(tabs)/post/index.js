import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useThemedStyles } from '../../../theme/themeStyles';
import { useAuth } from '../../../contexts/AuthContext';
import { deletePost, deleteService, fetchMyListings } from '../../../config/api';
import { CATEGORIES } from '../../../config/categoriesData';
import { resolveEditability } from '../../../components/EditUI';

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
const PAYMENT_LABELS = { fixed: 'Fixed', hourly: 'Hourly', negotiable: 'Negotiable' };
const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
const STATUS_COLORS = {
  open: '#10b981',
  in_progress: '#f59e0b',
  completed: '#6b7280',
  cancelled: '#ef4444',
};
const SERVICE_STATUS_LABELS = { draft: 'Draft', active: 'Live', paused: 'Paused', archived: 'Archived' };
const SERVICE_STATUS_COLORS = {
  draft: '#6b7280',
  active: '#10b981',
  paused: '#f59e0b',
  archived: '#94a3b8',
};
const SERVICE_MODE_LABELS = {
  on_site: 'On-site',
  remote: 'Remote',
  both: 'On-site and remote',
};

function catLabel(id) {
  return (id && CAT_MAP[id]) || id || 'General';
}

/**
 * Count the doers who accepted a post. `acceptedBy` may arrive as an array or as
 * a JSON string depending on the endpoint.
 */
function acceptorCount(item) {
  const raw = item?.acceptedBy;
  if (Array.isArray(raw)) return raw.length;
  if (typeof raw !== 'string' || !raw.trim()) return 0;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export default function Post() {
  const { token } = useAuth();
  const { isDark } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Bumped on every refresh so the 24h window re-evaluates live.
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const list = await fetchMyListings(token);
    return list;
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          const list = await load();
          if (!cancelled) setItems(list);
        } catch (err) {
          console.warn('[post] load failed:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [load])
  );

  // Re-evaluate the countdown every 30s so edit actions disappear the moment
  // the 24 hour window closes.
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await load();
      setItems(list);
    } catch (err) {
      console.warn('[post] refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const removeItem = useCallback(
    (item) => {
      const isService = item.type === 'service';
      Alert.alert(
        isService ? 'Delete this service?' : 'Delete this post?',
        isService
          ? 'This will permanently remove the service listing.'
          : 'This will permanently remove the task. Only open posts can be deleted.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                if (isService) {
                  await deleteService(item.id, token);
                } else {
                  await deletePost(item.id, token);
                }
                setItems((prev) => prev.filter((entry) => entry.id !== item.id));
              } catch (err) {
                console.warn('[post] delete failed:', err);
                Alert.alert('Delete failed', err.message || 'Something went wrong.');
              }
            },
          },
        ]
      );
    },
    [token]
  );

  const openItem = useCallback((item) => {
    if (item.type === 'service') {
      router.push(`/service/${item.id}`);
    } else {
      router.push(`/post/${item.id}`);
    }
  }, []);

  const openEdit = useCallback((item) => {
    if (item.type === 'service') {
      router.push(`/service-edit/${item.id}`);
    } else {
      router.push(`/post-edit/${item.id}`);
    }
  }, []);

  const renderServiceCard = useCallback(
    ({ item }) => {
      const photo = Array.isArray(item.photos) && item.photos.length > 0 ? item.photos[0] : null;
      const statusColor = SERVICE_STATUS_COLORS[item.status] || '#6b7280';
      const edit = resolveEditability(item, Boolean(item.hasBooking));
      const priceLabel =
        item.priceType === 'negotiable' || !item.priceAmount
          ? 'Negotiable'
          : `KSh ${item.priceAmount}`;

      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => openItem(item)}
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
              <View style={styles.typeTag}>
                <Ionicons name="briefcase-outline" size={12} color="#4f46e5" />
                <Text style={styles.typeTagText}>Service</Text>
              </View>

              <View style={styles.cardActions}>
                {edit.canEdit ? (
                  <TouchableOpacity
                    style={styles.iconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => openEdit(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={17} color="#f59e0b" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.iconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => removeItem(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={17} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.cardCategory} numberOfLines={1}>
              {catLabel(item.category)}
            </Text>

            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <Text style={styles.cardMeta} numberOfLines={1}>
              <Ionicons name="location-outline" size={13} color="#9ca3af" /> {item.location}
              {'  ·  '}
              {SERVICE_MODE_LABELS[item.serviceMode] || item.serviceMode}
            </Text>

            <View style={styles.cardFooter}>
              <Text style={styles.cardBudget}>
                {priceLabel}
                <Text style={styles.cardBudgetType}> ({PAYMENT_LABELS[item.priceType] || 'Fixed'})</Text>
              </Text>
              <View style={styles.footerRight}>
                {edit.canEdit ? (
                  <View style={styles.editWindowTag}>
                    <Ionicons name="time-outline" size={11} color="#4f46e5" />
                    <Text style={styles.editWindowText}>Editable</Text>
                  </View>
                ) : null}
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1a` }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {SERVICE_STATUS_LABELS[item.status] || item.status}
                  </Text>
                </View>
              </View>
            </View>

            {edit.locked ? (
              <View style={styles.lockNotice}>
                <Ionicons name="lock-closed-outline" size={12} color="#9ca3af" />
                <Text style={styles.lockNoticeText} numberOfLines={2}>
                  {edit.message}
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [openEdit, openItem, removeItem, styles]
  );

  const renderPostCard = useCallback(
    ({ item }) => {
      const photo = Array.isArray(item.photos) && item.photos.length > 0 ? item.photos[0] : null;
      const statusColor = STATUS_COLORS[item.status] || '#6b7280';
      const booked = acceptorCount(item) > 0;
      const edit = resolveEditability(item, booked);
      const when = item.dateNeeded
        ? `${item.dateNeeded}${item.timeNeeded ? ` @ ${item.timeNeeded}` : ''}`
        : null;
      const canDelete = item.status === 'open' && !booked;

      return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => openItem(item)}
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
                <View style={styles.typeTag}>
                  <Ionicons name="clipboard-outline" size={12} color="#2563eb" />
                  <Text style={[styles.typeTagText, styles.typeTagTextTask]}>Task</Text>
                </View>

                <View style={styles.cardActions}>
                  {edit.canEdit ? (
                    <TouchableOpacity
                      style={styles.iconBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => openEdit(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={17} color="#f59e0b" />
                    </TouchableOpacity>
                  ) : null}
                  {canDelete ? (
                    <TouchableOpacity
                      style={styles.iconBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => removeItem(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={17} color="#ef4444" />
                    </TouchableOpacity>
                  ) : null}
                  {booked || item.status !== 'open' ? (
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1a` }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {STATUS_LABELS[item.status] || item.status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <Text style={styles.cardCategory} numberOfLines={1}>
                {catLabel(item.category)}
              </Text>

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
                <View style={styles.footerRight}>
                  {edit.canEdit ? (
                    <View style={styles.editWindowTag}>
                      <Ionicons name="time-outline" size={11} color="#4f46e5" />
                      <Text style={styles.editWindowText}>Editable</Text>
                    </View>
                  ) : null}
                  <View style={styles.detailHint}>
                    <Text style={styles.detailHintText}>
                      {item.status === 'open' ? 'Open' : STATUS_LABELS[item.status] || item.status}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#4f46e5" />
                  </View>
                </View>
              </View>

              {edit.locked ? (
                <View style={styles.lockNotice}>
                  <Ionicons name="lock-closed-outline" size={12} color="#9ca3af" />
                  <Text style={styles.lockNoticeText} numberOfLines={2}>
                    {edit.message}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        );
    },
    [openEdit, openItem, removeItem, styles]
  );

  const renderItem = useCallback(
    ({ item }) =>
      item.type === 'service' ? renderServiceCard({ item }) : renderPostCard({ item }),
    [renderPostCard, renderServiceCard]
  );

  const emptyState = (
    <View style={styles.empty}>
      <Image
        source={require('../../../../assets/images/post-background.png')}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyTitle}>Nothing here yet</Text>
      <Text style={styles.emptySubtitle}>
        Post a task or publish a service. You can edit either one for 24 hours, as long as
        nobody has booked it.
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
        style={styles.serviceCtaBtn}
        onPress={() => router.push('/service-create')}
        activeOpacity={0.88}
      >
        <Ionicons name="briefcase-outline" size={20} color="#4f46e5" />
        <Text style={styles.serviceCtaBtnText}>Create a service</Text>
      </TouchableOpacity>
    </View>
  );

  const headerRight = (
    <View style={styles.createActions}>
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => router.push('/post-create')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.createBtnText}>Post</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.serviceBtn}
        onPress={() => router.push('/service-create')}
        activeOpacity={0.8}
      >
        <Ionicons name="briefcase-outline" size={18} color="#4f46e5" />
        <Text style={styles.serviceBtnText}>Service</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Listings</Text>
        {headerRight}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : items.length === 0 ? (
        emptyState
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          extraData={tick}
        />
      )}
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.5,
  },
  createActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 11,
    gap: 5,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  createBtnText: { fontSize: 12.5, fontWeight: '800', color: '#ffffff' },
  serviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    gap: 5,
  },
  serviceBtnText: { fontSize: 12.5, fontWeight: '800', color: '#4f46e5' },

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
    gap: 8,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeTagText: { fontSize: 10.5, fontWeight: '800', color: '#4f46e5', letterSpacing: 0.4 },
  typeTagTextTask: { color: '#2563eb' },

  cardCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
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
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editWindowTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  editWindowText: { fontSize: 10.5, fontWeight: '800', color: '#4f46e5' },

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
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardBudget: { fontSize: 16, fontWeight: '800', color: '#2563eb' },
  cardBudgetType: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  detailHint: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailHintText: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },

  lockNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lockNoticeText: { flex: 1, fontSize: 11.5, color: '#9ca3af', lineHeight: 16 },

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
  serviceCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 26,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#c7d2fe',
    gap: 8,
  },
  serviceCtaBtnText: { fontSize: 16, fontWeight: '800', color: '#4f46e5' },
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
});