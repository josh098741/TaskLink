import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { useThemedStyles } from "../../theme/themeStyles";
import { useAuth } from "../../contexts/AuthContext";
import { useService } from "../../config/useServiceStore";
import { CATEGORIES } from "../../config/categoriesData";
import { createService, uploadServicePhotos } from "../../config/api";

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((item) => [item.id, item.label]));
const MODE_LABELS = {
  on_site: "On-site",
  remote: "Remote",
  both: "On-site and remote",
};
const PRICE_LABELS = {
  fixed: "Fixed",
  hourly: "Hourly",
  negotiable: "Negotiable",
};
const BOOKING_LABELS = {
  request: "Request to book",
  instant: "Instant booking",
};

export default function ServiceStep7() {
  const { data, reset } = useService();
  const { token, user, refresh: refreshSession } = useAuth();
  const { isDark, colors } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const [posting, setPosting] = useState(false);

  const canPublish = !data.bookingEnabled || data.availability.length > 0;
  const categoryLabel = data.category ? CATEGORY_MAP[data.category] || data.category : "Not set";
  const priceLabel =
    data.priceType === "negotiable"
      ? "Negotiable"
      : data.priceAmount
        ? `KSh ${data.priceAmount}`
        : "Not set";
  const availabilityLabel = data.availability.length
    ? `${data.availability.length} window${data.availability.length === 1 ? "" : "s"}`
    : "None added";

  const buildPayload = (status) => ({
    title: data.title,
    category: data.category,
    description: data.description,
    location: data.location,
    serviceMode: data.serviceMode,
    priceType: data.priceType,
    priceAmount: data.priceType === "negotiable" ? null : Number(data.priceAmount),
    currency: data.currency || "KES",
    durationMinutes: data.bookingEnabled ? Number(data.durationMinutes) : null,
    bufferMinutes: Number(data.bufferMinutes || 0),
    bookingEnabled: Boolean(data.bookingEnabled),
    bookingMode: data.bookingMode,
    minNoticeMinutes: Number(data.minNoticeMinutes || 0),
    maxAdvanceBookingDays: Number(data.maxAdvanceBookingDays || 90),
    maxConcurrentBookings: Number(data.maxConcurrentBookings || 1),
    status,
    photos: [],
    skills: data.skills,
    availability: data.availability,
  });

  const submit = async () => {
    setPosting(true);
    let activeToken = token;
    let photoUrls = [];
    let photosUploaded = false;
    let retriedAuth = false;

    const publishWithToken = async (authToken) => {
      if (!photosUploaded && data.photos.length > 0) {
        photoUrls = await uploadServicePhotos(
          data.photos.map((photo) => photo.base64).filter(Boolean),
          authToken
        );
        photosUploaded = true;
      }

      await createService(
        {
          ...buildPayload("active"),
          photos: photoUrls,
        },
        authToken
      );
    };

    try {
      if (!activeToken) {
        const refreshed = await refreshSession().catch(() => null);
        activeToken = refreshed?.accessToken ?? null;
      }
      if (!activeToken) {
        throw new Error("Sign in again before publishing this service.");
      }
      if (
        data.bookingEnabled &&
        user?.availableForWork === false
      ) {
        throw new Error("Set yourself as available for work before publishing a bookable service.");
      }

      try {
        await publishWithToken(activeToken);
      } catch (error) {
        const isAuthError = /invalid or expired token/i.test(error?.message || "");
        if (!isAuthError || retriedAuth) throw error;

        const refreshed = await refreshSession().catch(() => null);
        activeToken = refreshed?.accessToken ?? null;
        if (!activeToken) {
          throw new Error("Sign in again before publishing this service.");
        }
        retriedAuth = true;
        await publishWithToken(activeToken);
      }

      reset();
      Alert.alert(
        "Service published",
        "Your service is now visible to clients who are looking for this skill.",
        [{ text: "Done", onPress: () => router.replace("/(tabs)/post") }]
      );
    } catch (error) {
      const needsSignIn = /sign in again/i.test(error?.message || "");
      Alert.alert(
        "Publish failed",
        needsSignIn
          ? "Your session expired. Sign in again before publishing this service."
          : error.message || "Something went wrong. Please try again.",
        needsSignIn
          ? [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign in",
                onPress: () => router.replace("/(auth)/sign-in"),
              },
            ]
          : [{ text: "Done" }]
      );
    } finally {
      setPosting(false);
    }
  };

  const confirmSubmit = () => {
    Alert.alert(
      "Publish service?",
      "Clients will be able to discover this service using the details you reviewed.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Publish", onPress: submit },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review service</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Almost there!</Text>
        <Text style={styles.subtitle}>Check the offer before it reaches clients</Text>

        {data.bookingEnabled && data.availability.length === 0 ? (
          <View style={styles.warning}>
            <Ionicons name="alert-circle-outline" size={19} color="#b45309" />
            <Text style={styles.warningText}>
              Add availability before publishing a bookable service.
            </Text>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <Row icon="pencil-outline" label="Service title" value={data.title || "Not set"} />
          <Row icon="grid-outline" label="Category" value={categoryLabel} />
          <Row icon="map-outline" label="Delivery" value={MODE_LABELS[data.serviceMode] || data.serviceMode} />
          <Row icon="location-outline" label="Service area" value={data.location || "Not set"} />
          <View style={styles.divider} />
          <Row icon="cash-outline" label="Price" value={`${priceLabel} (${PRICE_LABELS[data.priceType] || "Fixed"})`} />
          <Row icon="calendar-outline" label="Booking" value={data.bookingEnabled ? BOOKING_LABELS[data.bookingMode] || "Enabled" : "Off"} />
          <Row icon="time-outline" label="Duration" value={data.bookingEnabled ? `${data.durationMinutes || "Not set"} minutes` : "Not bookable"} />
          <Row icon="repeat-outline" label="Availability" value={availabilityLabel} />
        </View>

        {data.description ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailText}>{data.description}</Text>
          </View>
        ) : null}

        {Array.isArray(data.skills) && data.skills.length > 0 ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Requirements</Text>
            {data.skills.map((skill, index) => (
              <View key={index} style={styles.skillLine}>
                <View style={styles.skillBullet} />
                <Text style={styles.detailText}>{skill}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {data.photos.length > 0 ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Photos ({data.photos.length})</Text>
            <View style={styles.photosRow}>
              {data.photos.map((photo, index) => (
                <Image key={index} source={{ uri: photo.uri }} style={styles.photoThumb} />
              ))}
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, (posting || !canPublish) && styles.buttonDisabled]}
          activeOpacity={0.88}
          onPress={confirmSubmit}
          disabled={posting || !canPublish}
        >
          <LinearGradient
            colors={posting ? ["#94a3b8", "#94a3b8"] : ["#2563eb", "#4f46e5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryGradient}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
            )}
            <Text style={styles.primaryButtonText}>
              {posting ? "Publishing..." : "Publish service"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(baseStyles);
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} style={styles.rowIcon} />
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1e1b4b" },
  headerSpacer: { width: 38 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e1b4b",
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: { fontSize: 15, color: "#6b7280", marginTop: 4, marginBottom: 24 },
  warning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  warningText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#92400e" },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  rowIcon: { marginRight: 12, width: 20, textAlign: "center" },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, fontWeight: "700", color: "#9ca3af", marginBottom: 2 },
  rowValue: { fontSize: 15, fontWeight: "700", color: "#1e1b4b" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 4 },
  detailCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  detailLabel: { fontSize: 12, fontWeight: "800", color: "#9ca3af", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.4 },
  detailText: { fontSize: 15, fontWeight: "500", color: "#1e1b4b", lineHeight: 22 },
  skillLine: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  skillBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4f46e5",
    marginTop: 8,
    marginRight: 10,
  },
  photosRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  photoThumb: { width: 64, height: 64, borderRadius: 10 },
  primaryButton: { borderRadius: 16, overflow: "hidden", marginTop: 28 },
  buttonDisabled: { opacity: 0.65 },
  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 8,
  },
  primaryButtonText: { fontSize: 17, fontWeight: "800", color: "#ffffff" },
});
