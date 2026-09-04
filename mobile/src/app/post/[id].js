import { useState, useCallback, useRef } from 'react';
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
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { fetchPost, acceptPost, deletePost } from '../../config/api';
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
const PAGE_BG = '#fafafa';
const WAVE_COLOR = '#a3a7b8'; // soft grayish-navy, visible but not stark black
const WAVE_STROKE_WIDTH = 2.5;
const HERO_HEIGHT = Math.round(width * 1.0);
const WAVE_HEIGHT = 64;

function catLabel(id) {
  return (id && CAT_MAP[id]) || id || 'General';
}

function buildSCurvePath(waveWidth, height, amplitude) {
  const mid = height / 2;
  const half = waveWidth / 2;
  return (
    `M0,${mid} ` +
    `C${half * 0.5},${mid + amplitude} ${half * 0.5},${mid + amplitude} ${half},${mid} ` +
    `C${half + half * 0.5},${mid - amplitude} ${half + half * 0.5},${mid - amplitude} ${waveWidth},${mid}`
  );
}

function WaveDivider({ waveWidth = width, height = WAVE_HEIGHT, color = WAVE_COLOR, fill = PAGE_BG, style }) {
  const amplitude = height * 0.5;
  const linePath = buildSCurvePath(waveWidth, height, amplitude);
  const fillPath = `${linePath} L${waveWidth},${height} L0,${height} Z`;

  return (
    <View style={[{ height, width: waveWidth }, style]}>
      <Svg width={waveWidth} height={height} viewBox={`0 0 ${waveWidth} ${height}`}>
        <Path d={fillPath} fill={fill} />
        <Path d={linePath} stroke={color} strokeWidth={WAVE_STROKE_WIDTH} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPost = useCallback(async () => {
    const found = await fetchPost(id);
    return { found };
  }, [id]);

  const loadPostRef = useRef(loadPost);
  loadPostRef.current = loadPost;

  const isOwner = post?.posterId === user?.id;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          setLoading(true);
          const { found } = await loadPostRef.current();
          if (!cancelled) {
            if (found) {
              setPost(found);
              setError(null);
            } else {
              setError('Post not found.');
            }
          }
        } catch (err) {
          console.warn('[post-detail] load failed:', err);
          if (!cancelled) setError(err.message || 'Failed to load post.');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const { found } = await loadPostRef.current();
      if (found) {
        setPost(found);
      } else {
        setError('Post not found.');
      }
    } catch (err) {
      console.warn('[post-detail] retry failed:', err);
      setError(err.message || 'Failed to load post.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    Alert.alert(
      'Accept this job?',
      'Once you accept, your details will be shared with the poster and the job is marked as taken.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Job',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              let token = await getToken({ skipCache: true }).catch(() => null);
              if (!token) token = await getToken().catch(() => null);
              const updated = await acceptPost(id, token, {
                'x-clerk-user-id': user?.id || '',
              });
              setPost(updated);
              Alert.alert('Accepted', 'You have accepted this job.');
            } catch (err) {
              console.warn('[post-detail] accept failed:', err);
              Alert.alert('Accept failed', err.message || 'Something went wrong.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete this post?',
      'This will permanently remove the task. Only open posts can be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              let token = await getToken({ skipCache: true }).catch(() => null);
              if (!token) token = await getToken().catch(() => null);
              await deletePost(id, token, {
                'x-clerk-user-id': user?.id || '',
              });
              Alert.alert('Deleted', 'Your post has been deleted.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/post') },
              ]);
            } catch (err) {
              console.warn('[post-detail] delete failed:', err);
              Alert.alert('Delete failed', err.message || 'Something went wrong.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

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
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const photos = (Array.isArray(post.photos) ? post.photos : []).filter(Boolean);
  const skills = Array.isArray(post.skills) ? post.skills : [];
  const acceptors = Array.isArray(post.acceptedBy) ? post.acceptedBy : [];
  const acceptedByMe = acceptors.includes(user?.id);

  const canEdit = isOwner && post.status === 'open';
  const canDelete = isOwner && post.status === 'open';
  const canAccept = !isOwner && post.status === 'open' && !acceptedByMe;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View style={styles.heroWrap}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.heroScroller}
            >
              {photos.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={styles.heroImage} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="image-outline" size={40} color="#c7c5f5" />
            </View>
          )}

          <View style={styles.heroOverlay} pointerEvents="box-none">
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
            </TouchableOpacity>

            <View
              style={[
                styles.statusPill,
                { backgroundColor: post.isUrgent ? '#ef4444' : '#ffffff' },
              ]}
            >
              <Ionicons
                name={post.isUrgent ? 'flash' : 'checkmark-circle'}
                size={14}
                color={post.isUrgent ? '#ffffff' : '#059669'}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: post.isUrgent ? '#ffffff' : '#059669' },
                ]}
              >
                {post.isUrgent ? 'URGENT' : STATUS_LABELS[post.status] || post.status}
              </Text>
            </View>
          </View>

          <WaveDivider style={styles.heroWave} />
        </View>

        <View style={styles.body}>
          <Text style={styles.category}>{catLabel(post.category)}</Text>
          <Text style={styles.title}>{post.title}</Text>

          {/* Description */}
          <View style={styles.sectionPlain}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{post.description}</Text>
          </View>

          {/* Key details — border removed */}
          <View style={styles.detailsContainer}>
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
            <View style={styles.sectionPlain}>
              <Text style={styles.sectionLabel}>Requirements</Text>
              {skills.map((s, idx) => (
                <View key={idx} style={styles.skillLine}>
                  <View style={styles.skillBullet} />
                  <Text style={styles.skillText}>{s}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Acceptance status */}
          {post.status !== 'open' && (
            <View style={styles.statusInfo}>
              <Ionicons
                name={post.status === 'in_progress' ? 'people-outline' : 'checkmark-done'}
                size={18}
                color={post.status === 'in_progress' ? '#f59e0b' : '#10b981'}
              />
              <Text style={styles.statusInfoText}>
                {post.status === 'completed'
                  ? 'This job has been completed.'
                  : post.status === 'cancelled'
                  ? 'This job has been cancelled.'
                  : acceptors.length > 0
                  ? `This job is in progress — ${acceptors.length} doer${acceptors.length === 1 ? '' : 's'} accepted${acceptedByMe ? ' (you).' : '.'}`
                  : 'This job is in progress.'}
              </Text>
            </View>
          )}

          {/* Actions — placed in normal flow at the bottom of the page */}
          <View style={styles.actions}>
            {canEdit && (
              <TouchableOpacity
                style={styles.editBtn}
                activeOpacity={0.85}
                onPress={() => router.push(`/post-edit/${post.id}`)}
                disabled={actionLoading}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.accentBtnText}>Edit Post</Text>
              </TouchableOpacity>
            )}

            {canDelete && (
              <TouchableOpacity
                style={styles.dangerBtn}
                activeOpacity={0.7}
                onPress={handleDelete}
                disabled={actionLoading}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={styles.dangerBtnText}>Delete Post</Text>
              </TouchableOpacity>
            )}

            {canAccept && (
              <TouchableOpacity
                style={styles.acceptBtn}
                activeOpacity={0.85}
                onPress={handleAccept}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.accentBtnText}>Accept Job</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isOwner && post.status === 'in_progress' && (
              <View style={styles.lockedBar}>
                <Ionicons name="lock-closed" size={16} color="#10b981" />
                <Text style={styles.lockedBarText}>
                  Accepted by {acceptors.length} doer{acceptors.length === 1 ? '' : 's'} — locked
                </Text>
              </View>
            )}

            {!isOwner && acceptedByMe && post.status !== 'open' && (
              <View style={styles.lockedBar}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.lockedBarText}>You accepted this job</Text>
              </View>
            )}

            {!isOwner && post.status === 'open' && !canAccept && !acceptedByMe && (
              <View style={styles.lockedBar}>
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                <Text style={[styles.lockedBarText, { color: '#6b7280' }]}>
                  Only the poster can edit or delete this open post.
                </Text>
              </View>
            )}
          </View>
        </View>
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
  root: { 
    flex: 1, 
    backgroundColor: PAGE_BG 
  },
  rootCenter: {
    flex: 1,
    backgroundColor: PAGE_BG,
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

  scrollContent: { paddingBottom: 40 },

  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#eef0f4',
  },
  statusInfoText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#4b5563' },

  heroWrap: {
    width,
    height: HERO_HEIGHT,
    backgroundColor: '#f5f4ff',
  },
  heroScroller: { width, height: HERO_HEIGHT },
  heroImage: { width, height: HERO_HEIGHT },
  heroPlaceholder: {
    width,
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f4ff',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(30,27,75,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#1e1b4b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
    }),
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#1e1b4b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  statusPillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  heroWave: {
    position: 'absolute',
    bottom: -1,
    left: 0,
  },

  body: { paddingHorizontal: 20, paddingTop: 4 },
  category: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.4,
    lineHeight: 32,
    marginBottom: 16,
  },

  sectionPlain: {
    paddingHorizontal: 2,
    marginTop: 16,
  },

  // Key details — no border now, just background + radius + padding
  detailsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 4,
    marginTop: 16,
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

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
  detailContent: { flex: 1, justifyContent: 'center', minHeight: 36 },
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

  actions: {
    marginTop: 24,
    gap: 10,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    gap: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    gap: 8,
  },
  accentBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fee2e2',
    gap: 8,
  },
  dangerBtnText: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
  lockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 14,
  },
  lockedBarText: { fontSize: 13, fontWeight: '700', color: '#059669', textAlign: 'center' },
});