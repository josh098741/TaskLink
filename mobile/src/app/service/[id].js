import { useState, useCallback, useMemo } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../theme/themeStyles';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { fetchService, createAppointment } from '../../config/api';
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
  const styles = useThemedStyles(baseStyles);
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

// ── Booking helpers ────────────────────────────────────────────────────────
const MEETING_TYPES = [
  { id: 'on_site', label: 'On-site' },
  { id: 'remote', label: 'Remote' },
  { id: 'phone', label: 'Phone' },
  { id: 'video', label: 'Video' },
];

const SERVICE_MODE_MEETINGS = {
  on_site: ['on_site'],
  remote: ['remote', 'phone', 'video'],
  both: ['on_site', 'remote', 'phone', 'video'],
};

function hmToMinutes(hm) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function formatHM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * buildBookingDays
 * Returns the list of bookable calendar days (YYYY-MM-DD) starting from the
 * earliest eligible moment (now + minNotice) out to maxAdvanceBookingDays,
 * filtered to days that have at least one availability window.
 */
function buildBookingDays(service) {
  const windows = Array.isArray(service.availability) ? service.availability : [];
  if (windows.length === 0) return [];

  const earliest = new Date(Date.now() + (service.minNoticeMinutes || 0) * 60000);
  const maxDays = service.maxAdvanceBookingDays || 90;

  const days = [];
  for (let offset = 0; offset <= maxDays && days.length < 45; offset += 1) {
    const d = new Date(earliest);
    d.setDate(earliest.getDate() + offset);
    const dayOfWeek = d.getDay();
    const matching = windows.filter((w) => w.dayOfWeek === dayOfWeek);
    if (matching.length === 0) continue;
    const isoDay =
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({
      isoDay,
      date: d,
      windows: matching,
      label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : DAY_LABELS[dayOfWeek].slice(0, 3),
      sub: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    });
  }
  return days;
}

/**
 * buildSlots
 * Candidate start times for a given day, in minutes-of-day, spaced 30 minutes
 * apart, respecting duration + buffer within each availability window.
 */
function buildSlots(day, service) {
  const duration = service.durationMinutes || 60;
  const buffer = service.bufferMinutes || 0;
  const step = 30;
  const slots = [];
  const seen = new Set();

  for (const window of day.windows) {
    const startMin = hmToMinutes(window.startTime);
    const endMin = hmToMinutes(window.endTime);
    for (let t = startMin; t + duration + buffer <= endMin; t += step) {
      if (!seen.has(t)) {
        seen.add(t);
        slots.push(t);
      }
    }
  }
  return slots.sort((a, b) => a - b);
}

/**
 * zonedToIsoStartsAt
 * Converts wall-clock "YYYY-MM-DD HH:MM" in the given IANA timezone into the
 * absolute ISO instant (UTC) representing that local moment.
 */
function zonedToIsoStartsAt(isoDay, minutesOfDay, timeZone) {
  const tz = timeZone || 'Africa/Nairobi';
  const [y, mo, d] = isoDay.split('-').map(Number);
  const hh = Math.floor(minutesOfDay / 60);
  const mm = minutesOfDay % 60;
  const wallAsUtc = Date.UTC(y, mo - 1, d, hh, mm);

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(wallAsUtc)).map((p) => [p.type, p.value]));
  const zonedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute)
  );
  const offsetMs = zonedAsUtc - wallAsUtc;
  return new Date(wallAsUtc + offsetMs).toISOString();
}

export default function ServiceDetail() {
  const { id } = useLocalSearchParams();
  const { token, user } = useAuth();
  const { isDark, colors } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Booking state ───────────────────────────────────────────────────────
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDayIso, setSelectedDayIso] = useState(null);
  const [selectedMinute, setSelectedMinute] = useState(null);
  const [meetingType, setMeetingType] = useState('on_site');
  const [meetingDetails, setMeetingDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  const bookingDays = useMemo(() => (service ? buildBookingDays(service) : []), [service]);
  const selectedDay = useMemo(
    () => bookingDays.find((day) => day.isoDay === selectedDayIso) || null,
    [bookingDays, selectedDayIso]
  );
  const slots = useMemo(
    () => (selectedDay && service ? buildSlots(selectedDay, service) : []),
    [selectedDay, service]
  );

  const meetingOptions = useMemo(
    () => (service ? MEETING_TYPES.filter((m) => (SERVICE_MODE_MEETINGS[service.serviceMode] || ['both']).includes(m.id)) : []),
    [service]
  );
  const meetingDetailsRequired = meetingType === 'remote' || meetingType === 'video';

  const openBooking = useCallback(() => {
    const firstDay = bookingDays[0];
    setBookingError(null);
    setMeetingDetails('');
    setNotes('');
    setSelectedDayIso((prev) => prev ?? firstDay?.isoDay ?? null);
    const day = bookingDays.find((d) => d.isoDay === (selectedDayIso ?? firstDay?.isoDay));
    const daySlots = day ? buildSlots(day, service) : [];
    setSelectedMinute((prev) => (daySlots.includes(prev) ? prev : daySlots[0] ?? null));
    setMeetingType(meetingOptions[0]?.id ?? 'on_site');
    setShowBooking(true);
  }, [bookingDays, selectedDayIso, service, meetingOptions]);

  const handlePickDay = useCallback(
    (isoDay) => {
      const day = bookingDays.find((d) => d.isoDay === isoDay);
      const daySlots = day ? buildSlots(day, service) : [];
      setSelectedDayIso(isoDay);
      setSelectedMinute((prev) => (daySlots.includes(prev) ? prev : daySlots[0] ?? null));
      setBookingError(null);
    },
    [bookingDays, service]
  );

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedDayIso || selectedMinute == null || !service) {
      setBookingError('Pick a day and time first.');
      return;
    }
    if (meetingDetailsRequired && !meetingDetails.trim()) {
      setBookingError(
        meetingType === 'remote'
          ? 'Add a meeting link or address for a remote session.'
          : 'Add a video meeting link.'
      );
      return;
    }
    setBooking(true);
    setBookingError(null);
    try {
      const startsAt = zonedToIsoStartsAt(selectedDayIso, selectedMinute, 'Africa/Nairobi');
      const appointment = await createAppointment(
        {
          serviceId: service.id,
          startsAt,
          timezone: 'Africa/Nairobi',
          meetingType,
          meetingDetails: meetingDetails.trim() || undefined,
          notes: notes.trim() || undefined,
          idempotencyKey: `book_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        },
        token
      );
      // Chat opens the moment a booking succeeds — per-product requirement.
      router.replace({
        pathname: '/chat/[appointmentId]',
        params: { appointmentId: appointment.id },
      });
    } catch (err) {
      console.warn('[booking] failed:', err.message);
      setBookingError(err.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  }, [selectedDayIso, selectedMinute, service, meetingType, meetingDetailsRequired, meetingDetails, notes, token]);

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
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.rootCenter}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
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
  const canBook =
    service.bookingEnabled &&
    !isOwner &&
    service.status === 'active' &&
    bookingDays.length > 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (canBook ? 120 : 40) }]}
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
              <Ionicons name="chevron-back" size={22} color={colors.text} />
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

          <WaveDivider
            style={styles.heroWave}
            fill={colors.background}
            color={isDark ? '#475569' : WAVE_COLOR}
          />
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

      {/* ── Sticky booking bar ──────────────────────────────────────────── */}
      {canBook ? (
        <View style={[styles.bookBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View style={styles.bookPriceWrap}>
            <Text style={styles.bookPriceLabel}>From</Text>
            <Text style={styles.bookPrice}>{formatPrice(service)}</Text>
          </View>
          <TouchableOpacity style={styles.bookBtn} activeOpacity={0.85} onPress={openBooking}>
            <Ionicons name="calendar" size={17} color="#ffffff" />
            <Text style={styles.bookBtnText}>Book now</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Booking sheet ───────────────────────────────────────────────── */}
      <Modal
        visible={showBooking}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBooking(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Book {service.title}</Text>
              <TouchableOpacity
                style={styles.sheetClose}
                onPress={() => setShowBooking(false)}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {bookingDays.length === 0 ? (
                <View style={styles.noSlots}>
                  <Ionicons name="calendar-outline" size={34} color="#c7d2fe" />
                  <Text style={styles.noSlotsTitle}>No available times</Text>
                  <Text style={styles.noSlotsSubtitle}>
                    This provider has no bookable windows right now — try again later.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sheetSection}>Pick a day</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dayRow}
                  >
                    {bookingDays.map((day) => {
                      const active = day.isoDay === selectedDayIso;
                      return (
                        <TouchableOpacity
                          key={day.isoDay}
                          style={[styles.dayChip, active && styles.dayChipActive]}
                          activeOpacity={0.8}
                          onPress={() => handlePickDay(day.isoDay)}
                        >
                          <Text style={[styles.dayChipLabel, active && styles.dayChipTextActive]}>
                            {day.label}
                          </Text>
                          <Text style={[styles.dayChipSub, active && styles.dayChipTextActive]}>
                            {day.sub}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={styles.sheetSection}>Pick a time</Text>
                  <View style={styles.slotGrid}>
                    {slots.length === 0 ? (
                      <Text style={styles.slotEmpty}>No slots on this day.</Text>
                    ) : (
                      slots.map((minute) => {
                        const active = minute === selectedMinute;
                        return (
                          <TouchableOpacity
                            key={minute}
                            style={[styles.slotChip, active && styles.slotChipActive]}
                            activeOpacity={0.8}
                            onPress={() => {
                              setSelectedMinute(minute);
                              setBookingError(null);
                            }}
                          >
                            <Text style={[styles.slotText, active && styles.slotTextActive]}>
                              {formatHM(minute)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>

                  {meetingOptions.length > 1 ? (
                    <>
                      <Text style={styles.sheetSection}>How will you meet?</Text>
                      <View style={styles.meetingRow}>
                        {meetingOptions.map((option) => {
                          const active = option.id === meetingType;
                          return (
                            <TouchableOpacity
                              key={option.id}
                              style={[styles.meetingChip, active && styles.meetingChipActive]}
                              activeOpacity={0.8}
                              onPress={() => {
                                setMeetingType(option.id);
                                setBookingError(null);
                              }}
                            >
                              <Text
                                style={[styles.meetingText, active && styles.meetingTextActive]}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  ) : null}

                  {meetingDetailsRequired ? (
                    <>
                      <Text style={styles.sheetSection}>
                        {meetingType === 'phone' ? 'Contact number' : 'Meeting link / address'}
                      </Text>
                      <TextInput
                        style={styles.sheetInput}
                        placeholder={
                          meetingType === 'remote'
                            ? 'e.g. https://meet.google.com/abc or street address'
                            : 'e.g. https://zoom.us/j/123…'
                        }
                        placeholderTextColor="#9ca3af"
                        value={meetingDetails}
                        onChangeText={(text) => {
                          setMeetingDetails(text);
                          setBookingError(null);
                        }}
                        autoCapitalize="none"
                      />
                    </>
                  ) : null}

                  <Text style={styles.sheetSection}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.sheetInput, styles.sheetInputMultiline]}
                    placeholder="Anything the provider should know…"
                    placeholderTextColor="#9ca3af"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    maxLength={600}
                  />

                  {bookingError ? (
                    <View style={styles.bookingError}>
                      <Ionicons name="alert-circle" size={16} color="#ef4444" />
                      <Text style={styles.bookingErrorText}>{bookingError}</Text>
                    </View>
                  ) : null}

                  <View style={styles.bookingSummary}>
                    <Text style={styles.bookingSummaryText}>
                      {selectedDay
                        ? `${selectedDay.label} · ${selectedMinute != null ? formatHM(selectedMinute) : ''} · ${
                            MEETING_TYPES.find((m) => m.id === meetingType)?.label
                          }`
                        : 'Select a day and time'}
                    </Text>
                    <Text style={styles.bookingSummaryPrice}>{formatPrice(service)}</Text>
                  </View>
                </>
              )}
            </ScrollView>

            {bookingDays.length > 0 ? (
              <View style={styles.sheetFooter}>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    (selectedMinute == null || booking) && styles.confirmBtnDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={handleConfirmBooking}
                  disabled={selectedMinute == null || booking}
                >
                  {booking ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      <Text style={styles.confirmBtnText}>Confirm booking</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const baseStyles = StyleSheet.create({
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

  // ── Booking bar & sheet ─────────────────────────────────────────────────
  bookBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#eef0f4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  bookPriceWrap: { flex: 1 },
  bookPriceLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 },
  bookPrice: { fontSize: 20, fontWeight: '800', color: '#1e1b4b', marginTop: 1 },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 15,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  bookBtnText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(30, 27, 75, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    maxHeight: '92%',
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 6,
  },
  sheetTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#1e1b4b', letterSpacing: -0.3 },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { paddingHorizontal: 22, paddingTop: 6 },
  sheetSection: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 18,
    marginBottom: 10,
  },

  dayRow: { gap: 10, paddingVertical: 2 },
  dayChip: {
    alignItems: 'center',
    backgroundColor: '#f6f6fb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#eef0f4',
  },
  dayChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  dayChipLabel: { fontSize: 14, fontWeight: '800', color: '#1e1b4b' },
  dayChipSub: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginTop: 2 },
  dayChipTextActive: { color: '#ffffff' },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    backgroundColor: '#f6f6fb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#eef0f4',
  },
  slotChipActive: { backgroundColor: '#eef2ff', borderColor: '#4f46e5' },
  slotText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  slotTextActive: { color: '#4f46e5' },
  slotEmpty: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },

  meetingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  meetingChip: {
    backgroundColor: '#f6f6fb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#eef0f4',
  },
  meetingChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  meetingText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  meetingTextActive: { color: '#ffffff' },

  sheetInput: {
    backgroundColor: '#f6f6fb',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#eef0f4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e1b4b',
  },
  sheetInputMultiline: { minHeight: 76, textAlignVertical: 'top' },

  bookingError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  bookingErrorText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#ef4444' },

  bookingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#f5f4ff',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  bookingSummaryText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#3730a3' },
  bookingSummaryPrice: { fontSize: 15, fontWeight: '800', color: '#1e1b4b' },

  noSlots: { alignItems: 'center', paddingVertical: 34 },
  noSlotsTitle: { fontSize: 17, fontWeight: '800', color: '#1e1b4b', marginTop: 12 },
  noSlotsSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 250,
    lineHeight: 19,
  },

  sheetFooter: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#eef0f4',
    backgroundColor: '#ffffff',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmBtnDisabled: { backgroundColor: '#c7d2fe', shadowOpacity: 0, elevation: 0 },
  confirmBtnText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
});
