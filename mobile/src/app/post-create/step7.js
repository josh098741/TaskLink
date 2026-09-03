import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePost } from '../../config/usePostStore';
import { CATEGORIES } from '../../config/categoriesData';
import { uploadPhotosToCloudinary, createPost } from '../../config/api';

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

const PAYMENT_LABELS = { fixed: 'Fixed price', hourly: 'Hourly', negotiable: 'Negotiable' };

export default function Step7() {
  const { data, reset } = usePost();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [posting, setPosting] = useState(false);

  const categoryLabel = data.category ? CATEGORY_MAP[data.category] || data.category : 'Not set';

  const handlePost = async () => {
    setPosting(true);
    try {
      let token = await getToken({ skipCache: true }).catch(() => null);
      if (!token) {
        token = await getToken().catch(() => null);
      }

      const effectiveClerkId = user?.id || '';

      let photoUrls = [];
      if (data.photos.length > 0) {
        photoUrls = await uploadPhotosToCloudinary(data.photos, token, {
          'x-clerk-user-id': effectiveClerkId,
        });
      }

      await createPost(
        {
          clerkId: effectiveClerkId,
          title: data.title,
          category: data.category,
          description: data.description,
          location: data.location,
          budgetAmount: data.budgetAmount,
          paymentType: data.paymentType,
          dateNeeded: data.dateNeeded,
          timeNeeded: data.timeNeeded,
          isUrgent: data.isUrgent,
          duration: data.duration,
          skills: data.skills,
          photos: photoUrls,
          doerCount: data.doerCount,
        },
        token,
        {
          'x-clerk-user-id': effectiveClerkId,
        }
      );

      reset();
      Alert.alert('Success', 'Your task has been posted!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/post') },
      ]);
    } catch (err) {
      console.warn('[step7] Post failed:', err);
      Alert.alert('Post failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const confirmPost = () => {
    Alert.alert(
      'Post Task',
      'Your task will be posted and visible to Doers in your area.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Post', onPress: handlePost },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Task</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Almost there!</Text>
        <Text style={styles.subtitle}>Review your task before posting</Text>

        {/* Summary Card */}
        <View style={styles.card}>
          <Row icon="pencil-outline" label="Title" value={data.title || 'Not set'} />
          <Row icon="grid-outline" label="Category" value={categoryLabel} />
          <Row icon="location-outline" label="Location" value={data.location || 'Not set'} />

          <View style={styles.divider} />

          <Row
            icon="cash-outline"
            label="Budget"
            value={
              data.budgetAmount
                ? `KSh ${data.budgetAmount} (${PAYMENT_LABELS[data.paymentType] || 'Fixed'})`
                : 'Not set'
            }
          />
          <Row
            icon="calendar-outline"
            label="When"
            value={
              data.dateNeeded
                ? `${data.dateNeeded}${data.timeNeeded ? ` at ${data.timeNeeded}` : ''}${data.isUrgent ? ' (Urgent)' : ''}`
                : 'Not set'
            }
          />
          <Row icon="time-outline" label="Duration" value={data.duration || 'Flexible'} />
          <Row icon="people-outline" label="Doers needed" value={String(data.doerCount)} />
        </View>

        {/* Description */}
        {data.description ? (
          <View style={styles.descCard}>
            <Text style={styles.descLabel}>Description</Text>
            <Text style={styles.descText}>{data.description}</Text>
          </View>
        ) : null}

        {/* Skills */}
        {Array.isArray(data.skills) && data.skills.length > 0 ? (
          <View style={styles.descCard}>
            <Text style={styles.descLabel}>Requirements</Text>
            {data.skills.map((s, idx) => (
              <View key={idx} style={styles.skillLine}>
                <View style={styles.skillBullet} />
                <Text style={styles.descText}>{s}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Photos */}
        {data.photos.length > 0 ? (
          <View style={styles.descCard}>
            <Text style={styles.descLabel}>Photos ({data.photos.length})</Text>
            <View style={styles.photosRow}>
              {data.photos.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={styles.photoThumb} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Post Button */}
        <TouchableOpacity
          style={[styles.postBtn, posting && styles.postBtnDisabled]}
          activeOpacity={0.88}
          onPress={confirmPost}
          disabled={posting}
        >
          <LinearGradient
            colors={posting ? ['#94a3b8', '#94a3b8'] : ['#2563eb', '#4f46e5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.postBtnGradient}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            )}
            <Text style={styles.postBtnText}>
              {posting ? 'Posting...' : 'Post Task'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color="#6b7280" style={styles.rowIcon} />
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f1f0ff', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1e1b4b' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  title: {
    fontSize: 28, fontWeight: '800', color: '#1e1b4b',
    letterSpacing: -0.5, marginTop: 8,
  },
  subtitle: { fontSize: 15, color: '#6b7280', marginTop: 4, marginBottom: 24 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
  },
  rowIcon: { marginRight: 12, width: 20, textAlign: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginBottom: 2 },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#1e1b4b' },
  divider: {
    height: 1, backgroundColor: '#f3f4f6', marginVertical: 4,
  },
  descCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 18, marginTop: 12,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  descLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginBottom: 6 },
  descText: { fontSize: 15, fontWeight: '500', color: '#1e1b4b', lineHeight: 22 },
  skillLine: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  skillBullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#4f46e5', marginTop: 8, marginRight: 10,
  },
  photosRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  photoThumb: { width: 64, height: 64, borderRadius: 10 },
  postBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 28 },
  postBtnDisabled: {},
  postBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 17, gap: 8,
  },
  postBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
});
