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
  Platform,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { fetchService } from '../../config/api';
import { CATEGORIES } from '../../config/categoriesData';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CAT_MAP = Object.fromEntries(CATEGORIES.map((item) => [item.id, item.label]));
const SERVICE_MODE_LABELS = {
  on_site: 'On-site',
  remote: 'Remote',
  both: 'On-site and remote',
};
const BOOKING_LABELS = { request: 'Request to book', instant: 'Instant booking' };
const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
};
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const { width } = Dimensions.get('window');
const PAGE_BG = '#fafafa';
const WAVE_COLOR = '#a3a7b8';
const WAVE_STROKE_WIDTH = 2.5;
const HERO_HEIGHT = Math.round(width * 0.78);

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

function WaveDivider({ waveWidth = width, height = 64, color = WAVE_COLOR, fill = PAGE_BG, style }) {
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

function formatPrice(service) {
  if (service.priceType === 'negotiable') return 'Negotiable';
  if (service.priceAmount == null) return 'Not set';
  const suffix = service.priceType === 'hourly' ? '/hour' : '';
  return `KSh ${service.priceAmount}${suffix}`;
}

function formatAvailability(window) {
  const day = DAY_LABELS[window.dayOfWeek] || `Day ${window.dayOfWeek + 1}`;
  const timezone = window.timezone ? ` · ${window.timezone}` : '';
  return `${day} · ${window.startTime}–${window.endTime}${timezone}`;
}

export default function ServiceDetail() {
  const { id } = useLocalSearchParams();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadService = useCallback(async () => {
    const found = await fetchService(id, token);
    return { found };
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          setLoading(true);
          setError(null);
          const { found } = await loadService();
          if (!cancelled) {
            if (found) {
              setService(found);
            } else {
              setError('Service not found.');
            }
          }
        } catch (err) {
          console.warn('[service-detail] load failed:', err);
          if (!cancelled) setError(err.message || 'Failed to load service.');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [loadService])
  );

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const { found } = await loadService();
      if (found) {
        setService(found);
      } else {
        setError('Service not found.');
      }
    } catch (err) {
      console.warn('[service-detail] retry failed:', err);
      setError(err.message || 'Failed to load service.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.rootCenter}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.rootCenter}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
        <Text style={styles.errorText}>{error || 'Service not found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const photos = (Array.isArray(service.photos) ? service.photos : []).filter(Boolean);
  const skills = Array.isArray(service.skills) ? service.skills : [];
  const availability = Array.isArray(service.availability) ? service.availability : [];
  const isOwner = service.providerId === user?.id;
  const providerName = service.provider
    ? [service.provider.firstName, service.provider.lastName].filter(Boolean).join(' ') || 'Service provider'
    : 'Service provider';
  const statusLabel = STATUS_LABELS[service.status] || service.status || 'Service';
  const bookingLabel = service.bookingEnabled
    ? BOOKING_LABELS[service.bookingMode] || 'Booking enabled'
    : 'Contact to arrange';
  const serviceModeLabel = SERVICE_MODE_LABELS[service.serviceMode] || service.serviceMode;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.heroScroller}
            >
              {photos.map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.heroImage} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="briefcase-outline" size={44} color="#c7c5f5" />
            </View>
          )}

          <View style={styles.heroOverlay} pointerEvents="box-none">
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
            </TouchableOpacity>

            <View
              style={[
                styles.statusPill,
                { backgroundColor: service.status === 'active' ? '#ecfdf5' : '#ffffff' },
              ]}
            >
              <Ionicons
                name={service.status === 'active' ? 'checkmark-circle' : 'information-circle-outline'}
                size={14}
                color={service.status === 'active' ? '#059669' : '#6b7280'}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: service.status === 'active' ? '#059669' : '#6b7280' },
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>

          <WaveDivider style={styles.heroWave} />
        </View>

        <View style={styles.body}>
          <Text style={styles.category}>{catLabel(service.category)} · Service</Text>
          <Text style={styles.title}>{service.title}</Text>

          {service.provider ? (
            <View style={styles.providerCard}>
              {service.provider.imageUrl ? (
                <Image source={{ uri: service.provider.imageUrl }} style={styles.providerImage} />
              ) : (
                <View style={styles.providerImagePlaceholder}>
                  <Ionicons name="person" size={24} color="#4f46e5" />
                </View>
              )}
              <View style={styles.providerContent}>
                <Text style={styles.providerName}>{providerName}</Text>
                <Text style={styles.providerMeta}>
                  <Ionicons name="location-outline" size={13} color="#9ca3af" />{' '}
                  {service.provider.location || service.location}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.sectionPlain}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{service.description}</Text>
          </View>

          <View style={styles.detailsContainer}>
            <DetailRow icon="cash-outline" label="Price" value={formatPrice(service)} />
            <DetailRow icon="map-outline" label="Delivery" value={serviceModeLabel} />
            <DetailRow icon="location-outline" label="Service area" value={service.location} />
            <DetailRow icon="calendar-outline" label="Booking" value={bookingLabel} />
            {service.bookingEnabled ? (
              <>
                <DetailRow
                  icon="time-outline"
                  label="Duration"
                  value={service.durationMinutes ? `${service.durationMinutes} minutes` : 'Not set'}
                />
                <DetailRow
                  icon="pause-outline"
                  label="Buffer"
                  value={service.bufferMinutes ? `${service.bufferMinutes} minutes` : 'None'}
                />
                <DetailRow
                  icon="calendar-number-outline"
                  label="Advance booking"
                  value={`Up to ${service.maxAdvanceBookingDays || 90} days`}
                />
              </>
            ) : null}
          </View>

          {skills.length > 0 ? (
            <View style={styles.sectionPlain}>
              <Text style={styles.sectionLabel}>What is included</Text>
              {skills.map((skill, index) => (
                <View key={index} style={styles.skillLine}>
                  <View style={styles.skillBullet} />
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {availability.length > 0 ? (
            <View style={styles.sectionPlain}>
              <Text style={styles.sectionLabel}>Availability</Text>
              <View style={styles.availabilityCard}>
                {availability.map((window) => (
                  <View key={window.id || `${window.dayOfWeek}-${window.startTime}`} style={styles.availabilityRow}>
                    <Ionicons name="calendar-outline" size={16} color="#4f46e5" />
                    <Text style={styles.availabilityText}>{formatAvailability(window)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {service.bookingEnabled && availability.length === 0 ? (
            <View style={styles.infoBar}>
              <Ionicons name="information-circle-outline" size={18} color="#f59e0b" />
              <Text style={styles.infoText}>This service does not currently have booking times available.</Text>
            </View>
          ) : null}

          {!service.bookingEnabled ? (
            <View style={styles.infoBar}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#4f46e5" />
              <Text style={styles.infoText}>Contact the provider to arrange this service.</Text>
            </View>
          ) : null}

          {isOwner ? (
            <View style={styles.ownerBar}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
              <Text style={styles.ownerText}>This is one of your published services.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
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
  heroWave: { position: 'absolute', bottom: -1, left: 0 },

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
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef0f4',
  },
  providerImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eef2ff',
  },
  providerImagePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerContent: { flex: 1 },
  providerName: { fontSize: 15, fontWeight: '800', color: '#1e1b4b' },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 3,
  },
  sectionPlain: { paddingHorizontal: 2, marginTop: 18 },
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
  detailsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 4,
    marginTop: 16,
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
  availabilityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: '#eef0f4',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  availabilityText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#eef0f4',
  },
  infoText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#4b5563' },
  ownerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  ownerText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#059669' },
});
