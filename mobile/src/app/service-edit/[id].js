import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useThemedStyles } from "../../theme/themeStyles";
import { fetchService, updateService, uploadServicePhotos } from "../../config/api";
import { CATEGORIES } from "../../config/categoriesData";
import {
  BOOKING_MODES,
  CategoryPickerModal,
  ChipRow,
  EDIT_WINDOW_MS,
  EditCountdown,
  EditScreen,
  ErrorScreen,
  Field,
  LoadingScreen,
  LocationPickerModal,
  LockedScreen,
  PhotoEditor,
  SaveButton,
  SectionDivider,
  SegmentedRow,
  SelectField,
  SERVICE_MODES,
  SERVICE_PRICE_TYPES,
  SERVICE_STATUSES,
  SkillEditor,
  TextField,
  TimePickerModal,
  ToggleRow,
  WEEKDAYS,
  formatTimeSlot,
  resolveEditability,
} from "../../components/EditUI";

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((item) => [item.id, item.label]));
const MAX_PHOTOS = 5;
const MAX_WINDOWS = 28;

function categoryLabel(id) {
  return (id && CATEGORY_MAP[id]) || id || "";
}

function toWindowValue(window) {
  return { dayOfWeek: window.dayOfWeek, startTime: window.startTime, endTime: window.endTime };
}

function dayLabel(dayOfWeek) {
  return WEEKDAYS.find((day) => day.value === dayOfWeek)?.label ?? "Day";
}

/**
 * service-edit/[id]
 * ─────────────────────
 * Edits a service the signed-in provider created. Separate from the
 * service-create wizard on purpose: it hydrates from the existing record,
 * enforces the 24 hour editing window plus the "nobody has booked it" rule, and
 * never touches the creation store.
 */
export default function ServiceEdit() {
  const { id } = useLocalSearchParams();
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(baseStyles);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState(null);
  const [notOwner, setNotOwner] = useState(false);
  const [service, setService] = useState(null);

  const [form, setForm] = useState({
    title: "",
    category: null,
    description: "",
    location: "",
    serviceMode: "on_site",
    priceType: "fixed",
    priceAmount: "",
    durationMinutes: "",
    bufferMinutes: "0",
    bookingEnabled: true,
    bookingMode: "request",
    minNoticeMinutes: "60",
    maxAdvanceBookingDays: "90",
    maxConcurrentBookings: "1",
    status: "draft",
    skills: [],
  });

  const [availability, setAvailability] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [addedPhotos, setAddedPhotos] = useState([]);
  const [picker, setPicker] = useState(null);
  const [windowDraft, setWindowDraft] = useState({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });

  const set = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hydrate = useCallback((found) => {
    setService(found);
    setForm({
      title: found.title || "",
      category: found.category || null,
      description: found.description || "",
      location: found.location || "",
      serviceMode: found.serviceMode || "on_site",
      priceType: found.priceType || "fixed",
      priceAmount: found.priceAmount == null ? "" : String(found.priceAmount),
      durationMinutes: found.durationMinutes == null ? "" : String(found.durationMinutes),
      bufferMinutes: String(found.bufferMinutes ?? 0),
      bookingEnabled: Boolean(found.bookingEnabled),
      bookingMode: found.bookingMode || "request",
      minNoticeMinutes: String(found.minNoticeMinutes ?? 60),
      maxAdvanceBookingDays: String(found.maxAdvanceBookingDays ?? 90),
      maxConcurrentBookings: String(found.maxConcurrentBookings ?? 1),
      status: found.status || "draft",
      skills: Array.isArray(found.skills) ? found.skills : [],
    });
    setAvailability(
      Array.isArray(found.availability) ? found.availability.map(toWindowValue) : []
    );
    setExistingPhotos(Array.isArray(found.photos) ? found.photos : []);
    setAddedPhotos([]);
  }, []);

  // `runLoad` performs the fetch. The effect below drives it on mount so the
  // state updates land asynchronously rather than during the effect body.
  const userId = user?.id ?? null;

  const runLoad = useCallback(async () => {
    try {
      const found = await fetchService(id, token);
      if (!found) {
        setError("Service not found.");
        return;
      }
      if (found.providerId !== userId) {
        setNotOwner(true);
        return;
      }
      hydrate(found);
    } catch (err) {
      console.warn("[service-edit] load failed:", err);
      setError(err.message || "Failed to load service.");
    }
  }, [id, token, userId, hydrate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotOwner(false);
    try {
      await runLoad();
    } finally {
      setLoading(false);
    }
  }, [runLoad]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoading(true);
        return runLoad();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runLoad]);

  // `hasBooking` comes from the backend, which counts real appointments.
  const editability = useMemo(() => {
    if (!service) return null;
    return resolveEditability(service, Boolean(service.hasBooking));
  }, [service]);

  // The countdown can close the window while the user is on this screen, so it
  // re-evaluates every 30s. Everything time-derived flows from `now`.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const createdAtMs = service?.createdAt ? new Date(service.createdAt).getTime() : NaN;
  const msRemaining = Number.isNaN(createdAtMs) ? 0 : Math.max(0, createdAtMs + EDIT_WINDOW_MS - now);
  const windowClosed = !Number.isNaN(createdAtMs) && msRemaining <= 0;

  const addWindow = useCallback(() => {
    if (availability.length >= MAX_WINDOWS) {
      Alert.alert("Limit reached", `You can add up to ${MAX_WINDOWS} availability windows.`);
      return;
    }
    const start = windowDraft.startTime;
    const end = windowDraft.endTime;
    if (toMinutes(end) <= toMinutes(start)) {
      Alert.alert("Invalid window", "The end time must be after the start time.");
      return;
    }
    setAvailability((prev) => [...prev, { ...windowDraft }]);
    setWindowDraft({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
  }, [availability.length, windowDraft]);

  const removeWindow = useCallback((index) => {
    setAvailability((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const pickPhotos = useCallback(async () => {
    const remaining = MAX_PHOTOS - (existingPhotos.length + addedPhotos.length);
    if (remaining <= 0) {
      Alert.alert("Photo limit reached", `A service can have up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to attach images to your service.");
      return;
    }

    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;

      const picked = (result.assets ?? [])
        .filter((asset) => asset?.base64)
        .map((asset) => ({
          uri: asset.uri,
          base64: asset.base64.startsWith("data:")
            ? asset.base64
            : `data:image/jpeg;base64,${asset.base64}`,
        }));

      if (picked.length === 0) return;
      setAddedPhotos((prev) => [...prev, ...picked].slice(0, remaining));
    } catch (err) {
      console.warn("[service-edit] photo pick failed:", err);
      Alert.alert("Could not add photos", err.message || "Something went wrong.");
    } finally {
      setPicking(false);
    }
  }, [existingPhotos.length, addedPhotos.length]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert("Missing title", "Please enter a service title.");
      return;
    }
    if (!form.category) {
      Alert.alert("Missing category", "Please choose a category.");
      return;
    }
    if (form.priceType !== "negotiable" && !String(form.priceAmount).trim()) {
      Alert.alert("Missing price", "Please enter a price, or mark it as negotiable.");
      return;
    }
    if (form.bookingEnabled && !String(form.durationMinutes).trim()) {
      Alert.alert("Missing duration", "Set how long each session lasts so clients can book.");
      return;
    }
    if (form.status === "active" && form.bookingEnabled && availability.length === 0) {
      Alert.alert("Missing availability", "Add at least one availability window before publishing.");
      return;
    }

    setSaving(true);
    try {
      let photos = existingPhotos;
      if (addedPhotos.length > 0) {
        const uploaded = await uploadServicePhotos(
          addedPhotos.map((photo) => photo.base64).filter(Boolean),
          token
        );
        photos = [...existingPhotos, ...(uploaded ?? [])];
      }

      await updateService(
        id,
        {
          title: form.title.trim(),
          category: form.category,
          description: form.description.trim(),
          location: form.location.trim(),
          serviceMode: form.serviceMode,
          priceType: form.priceType,
          priceAmount: form.priceType === "negotiable" ? null : Number(form.priceAmount),
          currency: "KES",
          durationMinutes: form.bookingEnabled ? Number(form.durationMinutes) : null,
          bufferMinutes: Number(form.bufferMinutes || 0),
          bookingEnabled: Boolean(form.bookingEnabled),
          bookingMode: form.bookingMode,
          minNoticeMinutes: Number(form.minNoticeMinutes || 0),
          maxAdvanceBookingDays: Number(form.maxAdvanceBookingDays || 90),
          maxConcurrentBookings: Number(form.maxConcurrentBookings || 1),
          status: form.status,
          photos,
          skills: form.skills.map((s) => s.trim()).filter(Boolean),
          availability,
        },
        token
      );

      Alert.alert("Saved", "Your service has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.warn("[service-edit] save failed:", err);
      Alert.alert("Save failed", err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return <ErrorScreen title="Could not load service" message={error} onRetry={load} />;
  }

  if (notOwner) {
    return (
      <LockedScreen
        icon="person-outline"
        title="Not your service"
        message="You can only edit services you published yourself."
      />
    );
  }

  if (!editability?.canEdit || windowClosed) {
    const message =
      windowClosed && !editability.hasBooking
        ? "The 24 hour editing window for this service has closed, so it can no longer be changed."
        : editability.message;

    return (
      <LockedScreen
        icon={editability.hasBooking ? "calendar-outline" : "time-outline"}
        title={editability.hasBooking ? "Already booked" : "Editing closed"}
        message={message}
      />
    );
  }

  return (
    <EditScreen
      title="Edit service"
      onBack={() => router.back()}
      headerRight={
        saving ? null : (
          <TouchableOpacity onPress={pickPhotos} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="camera-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        )
      }
    >
      <EditCountdown msRemaining={msRemaining} />

      <TextField
        label="Service title"
        required
        value={form.title}
        onChangeText={(v) => set("title", v)}
        placeholder="e.g. Basic house plumbing"
        maxLength={80}
      />

      <SelectField
        label="Category"
        required
        icon="grid-outline"
        value={categoryLabel(form.category)}
        placeholder="Choose a category"
        onPress={() => setPicker("category")}
      />

      <TextField
        label="Description"
        value={form.description}
        onChangeText={(v) => set("description", v)}
        placeholder="Describe what the service includes"
        multiline
      />

      <SelectField
        label="Service area"
        icon="location-outline"
        value={form.location}
        placeholder="Choose a location"
        onPress={() => setPicker("location")}
      />

      <Field label="Delivery mode">
        <SegmentedRow
          options={SERVICE_MODES}
          value={form.serviceMode}
          onChange={(v) => set("serviceMode", v)}
        />
      </Field>

      <SectionDivider label="Pricing" />

      <Field label="Price type">
        <SegmentedRow
          options={SERVICE_PRICE_TYPES}
          value={form.priceType}
          onChange={(v) => {
            set("priceType", v);
            if (v === "negotiable") set("priceAmount", "");
          }}
        />
      </Field>

      {form.priceType === "negotiable" ? (
        <Text style={styles.inlineHint}>Clients will negotiate the price with you.</Text>
      ) : (
        <TextField
          label="Price (KSh)"
          required
          value={form.priceAmount}
          onChangeText={(v) => set("priceAmount", v.replace(/[^0-9]/g, ""))}
          placeholder="e.g. 2500"
          keyboardType="numeric"
          maxLength={9}
        />
      )}

      <SectionDivider label="Booking" />

      <ToggleRow
        label="Accept bookings"
        description="Turn this off if you only want to be contacted."
        value={form.bookingEnabled}
        onChange={(v) => {
          set("bookingEnabled", v);
          if (!v) set("durationMinutes", "");
        }}
      />

      {form.bookingEnabled ? (
        <>
          <Field label="Booking type">
            <SegmentedRow
              options={BOOKING_MODES}
              value={form.bookingMode}
              onChange={(v) => set("bookingMode", v)}
            />
          </Field>

          <TextField
            label="Duration (minutes)"
            required
            value={form.durationMinutes}
            onChangeText={(v) => set("durationMinutes", v.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 60"
            keyboardType="numeric"
            maxLength={5}
          />

          <TextField
            label="Buffer between sessions (minutes)"
            hint="0 to 240"
            value={form.bufferMinutes}
            onChangeText={(v) => set("bufferMinutes", v.replace(/[^0-9]/g, ""))}
            placeholder="0"
            keyboardType="numeric"
            maxLength={4}
          />

          <TextField
            label="Minimum notice (minutes)"
            hint="How early a client must book. 0 to 10080"
            value={form.minNoticeMinutes}
            onChangeText={(v) => set("minNoticeMinutes", v.replace(/[^0-9]/g, ""))}
            placeholder="60"
            keyboardType="numeric"
            maxLength={6}
          />

          <TextField
            label="Book up to (days ahead)"
            hint="1 to 365"
            value={form.maxAdvanceBookingDays}
            onChangeText={(v) => set("maxAdvanceBookingDays", v.replace(/[^0-9]/g, ""))}
            placeholder="90"
            keyboardType="numeric"
            maxLength={4}
          />

          <TextField
            label="Maximum concurrent bookings"
            hint="1 to 20"
            value={form.maxConcurrentBookings}
            onChangeText={(v) => set("maxConcurrentBookings", v.replace(/[^0-9]/g, ""))}
            placeholder="1"
            keyboardType="numeric"
            maxLength={3}
          />
        </>
      ) : null}

      <SectionDivider label="Availability" />

      {form.bookingEnabled ? (
        <>
          {availability.length === 0 ? (
            <Text style={styles.inlineHint}>No availability windows yet.</Text>
          ) : (
            availability.map((window, index) => (
              <View key={`${window.dayOfWeek}-${window.startTime}-${index}`} style={styles.windowRow}>
                <View style={styles.windowText}>
                  <Text style={styles.windowDay}>{dayLabel(window.dayOfWeek)}</Text>
                  <Text style={styles.windowTime}>
                    {formatTimeSlot(window.startTime)} – {formatTimeSlot(window.endTime)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeWindow(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={19} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={styles.windowForm}>
            <Field label="Day">
              <ChipRow
                options={WEEKDAYS}
                value={windowDraft.dayOfWeek}
                onChange={(v) => setWindowDraft((prev) => ({ ...prev, dayOfWeek: v }))}
                keyExtractor={(option) => option.value}
              />
            </Field>

            <View style={styles.windowTimesRow}>
              <View style={styles.windowTimeField}>
                <SelectField
                  label="Start"
                  icon="time-outline"
                  value={formatTimeSlot(windowDraft.startTime)}
                  onPress={() => setPicker("startTime")}
                />
              </View>
              <View style={styles.windowTimeField}>
                <SelectField
                  label="End"
                  icon="time-outline"
                  value={formatTimeSlot(windowDraft.endTime)}
                  onPress={() => setPicker("endTime")}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.addWindowBtn} onPress={addWindow} activeOpacity={0.85}>
              <Ionicons name="add" size={17} color="#4f46e5" />
              <Text style={styles.addWindowText}>Add window</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={styles.inlineHint}>Turn bookings on to manage availability.</Text>
      )}

      <SectionDivider label="Status" />

      <Field label="Listing status">
        <SegmentedRow
          options={SERVICE_STATUSES}
          value={form.status}
          onChange={(v) => set("status", v)}
        />
      </Field>

      <SectionDivider label="Photos" />

      <PhotoEditor
        existing={existingPhotos}
        added={addedPhotos}
        onPick={pickPhotos}
        onRemoveExisting={(index) => setExistingPhotos((prev) => prev.filter((_, i) => i !== index))}
        onRemoveAdded={(index) => setAddedPhotos((prev) => prev.filter((_, i) => i !== index))}
        max={MAX_PHOTOS}
      />

      {picking ? <Text style={styles.inlineHint}>Opening your gallery…</Text> : null}

      <SectionDivider label="Requirements" />

      <SkillEditor value={form.skills} onChange={(skills) => set("skills", skills)} max={20} />

      <SaveButton onPress={handleSave} saving={saving} label="Save changes" />

      <CategoryPickerModal
        visible={picker === "category"}
        value={form.category}
        onSelect={(v) => set("category", v)}
        onClose={() => setPicker(null)}
      />

      <LocationPickerModal
        visible={picker === "location"}
        value={form.location}
        onSelect={(v) => set("location", v)}
        onClose={() => setPicker(null)}
      />

      <TimePickerModal
        visible={picker === "startTime"}
        value={windowDraft.startTime}
        allowFlexible={false}
        onSelect={(v) => {
          setWindowDraft((prev) => ({ ...prev, startTime: v }));
          setPicker("endTime");
        }}
        onClose={() => setPicker(null)}
      />

      <TimePickerModal
        visible={picker === "endTime"}
        value={windowDraft.endTime}
        allowFlexible={false}
        onSelect={(v) => setWindowDraft((prev) => ({ ...prev, endTime: v }))}
        onClose={() => setPicker(null)}
      />
    </EditScreen>
  );
}

function toMinutes(value) {
  const [h, m] = String(value ?? "0:0").split(":");
  return Number(h) * 60 + Number(m);
}

const baseStyles = StyleSheet.create({
  inlineHint: { fontSize: 12.5, color: "#9ca3af", marginTop: -4, marginBottom: 14 },
  windowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  windowText: { flex: 1 },
  windowDay: { fontSize: 15, fontWeight: "700", color: "#1e1b4b" },
  windowTime: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  windowForm: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  windowTimesRow: { flexDirection: "row", gap: 12 },
  windowTimeField: { flex: 1 },
  addWindowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#eef2ff",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  addWindowText: { fontSize: 14, fontWeight: "700", color: "#4f46e5" },
});