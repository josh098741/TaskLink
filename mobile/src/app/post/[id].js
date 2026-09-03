import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchMyPosts } from '../../config/api';
import { CATEGORIES } from '../../config/categoriesData';

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
const PAYMENT_LABELS = { fixed: 'Fixed price', hourly: 'Hourly', negotiable: 'Negotiable' };
const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const { width } = Dimensions.get('window');

function catLabel(id) {
  return (id && CAT_MAP[id]) || id || 'General';
}

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let token = await getToken({ skipCache: true }).catch(() => null);
      if (!token) token = await getToken().catch(() => null);
      const list = await fetchMyPosts(token, {
        'x-clerk-user-id': user?.id || '',
      });
      const found = list.find((p) => p.id === id);
      if (found) {
        setPost(found);
      } else {
        setError('Post not found.');
      }
    } catch (err) {
      console.warn('[post-detail] load failed:', err);
      setError(err.message || 'Failed to load post.');
    } finally {
      setLoading(false);
    }
  }, [getToken, user, id]);

  useFocusEffect(
    useCallback(() => {
      loadPost();
    }, [loadPost])
  );

  if (loading) {
    return (
      <View style={styles.rootCenter}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.rootCenter}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
        <Text style={styles.errorText}>{error || 'Post not found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadPost} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const photos = (Array.isArray(post.photos) ? post.photos : []).filter(Boolean);
  const skills = Array.isArray(post.skills) ? post.skills : [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Status / category hero */}
        <View style={styles.hero}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: post.isUrgent ? '#fee2e2' : '#ecfdf5' },
            ]}
          >
            <Ionicons
              name={post.isUrgent ? 'flash' : 'checkmark-circle'}
              size={14}
              color={post.isUrgent ? '#ef4444' : '#059669'}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: post.isUrgent ? '#ef4444' : '#059669' },
              ]}
            >
              {post.isUrgent ? 'URGENT' : STATUS_LABELS[post.status] || post.status}
            </Text>
          </View>
          <Text style={styles.category}>{catLabel(post.category)}</Text>
        </View>

        <Text style={styles.title}>{post.title}</Text>

        {/* Photos */}
        {photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photosScroller}
            contentContainerStyle={styles.photosContent}
          >
            {photos.map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={styles.photo} resizeMode="cover" />
            ))}
          </ScrollView>
        ) : null}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{post.description}</Text>
        </View>

        {/* Key details */}
        <View style={styles.card}>
          <DetailRow
            icon="cash-outline"
            label="Budget"
            value={`KSh ${post.budgetAmount} · ${PAYMENT_LABELS[post.paymentType] || 'Fixed'}`}
          />
          <DetailRow icon="location-outline" label="Location" value={post.location} />
          <DetailRow
            icon="calendar-outline"
            label="Date needed"
            value={`${post.dateNeeded}${post.timeNeeded ? ` at ${post.timeNeeded}` : ''}`}
          />
          <DetailRow icon="time-outline" label="Duration" value={post.duration || 'Flexible'} />
          <DetailRow icon="people-outline" label="People needed" value={String(post.doerCount)} />
        </View>

        {/* Requirements */}
        {skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Requirements</Text>
            {skills.map((s, idx) => (
              <View key={idx} style={styles.skillLine}>
                <View style={styles.skillBullet} />
                <Text style={styles.skillText}>{s}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={18} color="#4f46e5" />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  rootCenter: {
    flex: 1,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: { fontSize: 15, color: '#6b7280', marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1e1b4b' },
  scroll: { padding: 20, paddingBottom: 40 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  statusPillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  category: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.4,
    lineHeight: 32,
    marginBottom: 14,
  },
  photosScroller: { marginHorizontal: -20 },
  photosContent: { paddingHorizontal: 20, gap: 10 },
  photo: { width: width - 80, height: 200, borderRadius: 16, backgroundColor: '#f3f1ff' },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  description: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e1b4b',
    lineHeight: 23,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '700', color: '#1e1b4b' },
  skillLine: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  skillBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4f46e5',
    marginTop: 8,
    marginRight: 10,
  },
  skillText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1e1b4b', lineHeight: 22 },
});
