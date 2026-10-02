import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES } from "../config/categoriesData";
import { useTheme } from "../contexts/ThemeContext";
import { useThemedStyles } from "../theme/themeStyles";

/**
 * EditUI
 * ───────
 * Shared building blocks for the post/service edit screens. These are separate
 * from the creation wizards (post-create / service-create) on purpose: editing
 * has a different shape — it is pre-filled from an existing record, it has to
 * surface the 24 hour editing window, and it must never touch the creation
 * stores so a half-finished edit cannot leak into a new listing.
 */

/** Matches EDIT_WINDOW_MS on the backend. */
export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const ALLOWED_LOCATIONS = [
  "Juja, Kiambu",
  "Pace / Section 9, Thika",
  "Thika Town, Kiambu",
  "Ruiru, Kiambu",
  "Kiambu Town, Kiambu",
  "Ruaka, Kiambu",
  "Kahawa Sukari, Kiambu",
  "Kahawa Wendani, Kiambu",
  "Roysambu, Nairobi",
  "Kasarani, Nairobi",
  "Kikuyu, Kiambu",
  "Limuru, Kiambu",
  "Ndenderu, Kiambu",
  "Banana, Kiambu",
  "Westlands, Nairobi",
  "Kilimani, Nairobi",
  "Lavington, Nairobi",
  "Kileleshwa, Nairobi",
  "Parklands, Nairobi",
  "Nairobi CBD",
  "Ngara, Nairobi",
  "Karen, Nairobi",
  "Lang'ata, Nairobi",
  "Ngong, Kajiado",
  "Dagoretti, Nairobi",
  "Riruta, Nairobi",
  "South B, Nairobi",
  "South C, Nairobi",
  "Nairobi West",
  "Syokimau, Machakos",
  "Kitengela, Kajiado",
  "Athi River, Machakos",
  "Donholm, Nairobi",
  "Buruburu, Nairobi",
  "Utawala, Nairobi",
  "Embakasi, Nairobi",
  "Fedha, Nairobi",
];

export const POST_PAYMENT_TYPES = [
  { id: "fixed", label: "Fixed price" },
  { id: "hourly", label: "Hourly" },
  { id: "negotiable", label: "Negotiable" },
];

export const POST_DURATIONS = [
  "Under 1 hour",
  "1-3 hours",
  "Half day",
  "Full day",
  "Multiple days",
];

export const FLEXIBLE_TIME = "Flexible / Anytime";

export const SERVICE_MODES = [
  { id: "on_site", label: "On-site" },
  { id: "remote", label: "Remote" },
  { id: "both", label: "On-site and remote" },
];

export const SERVICE_PRICE_TYPES = [
  { id: "fixed", label: "Fixed" },
  { id: "hourly", label: "Hourly" },
  { id: "negotiable", label: "Negotiable" },
];

export const SERVICE_STATUSES = [
  { id: "draft", label: "Draft" },
  { id: "active", label: "Published" },
  { id: "paused", label: "Paused" },
  { id: "archived", label: "Archived" },
];

export const BOOKING_MODES = [
  { id: "request", label: "Request to book" },
  { id: "instant", label: "Instant booking" },
];

export const WEEKDAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

function useSharedStyles() {
  return useThemedStyles(baseStyles);
}

/**
 * buildTimeSlots
 * Half-hour slots from 06:00 to 21:30, matching the creation wizard.
 */
export function buildTimeSlots() {
  const slots = [FLEXIBLE_TIME];
  for (let minutes = 6 * 60; minutes <= 21 * 60 + 30; minutes += 30) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

export function formatTimeSlot(value) {
  if (!value || value === FLEXIBLE_TIME) return FLEXIBLE_TIME;
  const [h, m] = String(value).split(":");
  if (h === undefined) return String(value);
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}

/**
 * parseDateNeeded
 * Accepts the DD/MM/YYYY format used by the creation wizard.
 */
export function parseDateNeeded(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatDateNeeded(date) {
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * resolveEditability
 * Client-side mirror of the backend policy. The server remains the source of
 * truth; this only decides what to render.
 *
 * @param {object} item        - A post or service record.
 * @param {boolean} hasBooking - Whether anyone has booked/accepted it.
 * @returns {{
 *   canEdit: boolean,
 *   locked: boolean,
 *   expired: boolean,
 *   hasBooking: boolean,
 *   reason: string|null,
 *   msRemaining: number,
 *   message: string,
 * }}
 */
export function resolveEditability(item, hasBooking) {
  const booked = hasBooking ?? item?.hasBooking ?? false;
  const createdAt = item?.createdAt ? new Date(item.createdAt).getTime() : NaN;
  const msRemaining = Number.isNaN(createdAt) ? 0 : Math.max(0, createdAt + EDIT_WINDOW_MS - Date.now());
  const expired = Number.isNaN(createdAt) ? false : msRemaining <= 0;
  const canEdit = !expired && !booked;

  let message = "You can edit this for the first 24 hours, as long as nobody has booked it.";
  if (expired && booked) {
    message = "This has been booked and its 24 hour editing window has closed.";
  } else if (expired) {
    message = "The 24 hour editing window for this has closed.";
  } else if (booked) {
    message = "This has already been booked, so it can no longer be edited.";
  }

  return {
    canEdit,
    locked: !canEdit,
    expired,
    hasBooking: booked,
    msRemaining,
    message,
  };
}

/**
 * Countdown
 * Renders the live "edit until" countdown. Ticks every 30s so the button hides
 * itself the moment the window closes without needing a refetch.
 */
export function EditCountdown({ msRemaining }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (msRemaining <= 0) return undefined;
    const timer = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(timer);
  }, [msRemaining]);

  const styles = useSharedStyles();
  if (msRemaining <= 0) return null;

  const totalMinutes = Math.floor(msRemaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <View style={styles.countdown}>
      <Ionicons name="time-outline" size={15} color="#4f46e5" />
      <Text style={styles.countdownText}>Editable for {label} more</Text>
    </View>
  );
}

/**
 * LockedScreen
 * Shown when the item can no longer be edited.
 */
export function LockedScreen({ icon, title, message, backLabel = "Go back" }) {
  const { isDark } = useTheme();
  const styles = useSharedStyles();

  return (
    <View style={styles.center}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.lockIcon}>
        <Ionicons name={icon ?? "lock-closed-outline"} size={34} color="#f59e0b" />
      </View>
      <Text style={styles.lockTitle}>{title}</Text>
      <Text style={styles.lockMessage}>{message}</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()} activeOpacity={0.88}>
        <Text style={styles.primaryButtonText}>{backLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * ErrorScreen
 */
export function ErrorScreen({ title, message, onRetry, backLabel = "Go back" }) {
  const { isDark } = useTheme();
  const styles = useSharedStyles();

  return (
    <View style={styles.center}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
      <Text style={styles.lockTitle}>{title}</Text>
      <Text style={styles.lockMessage}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onRetry} activeOpacity={0.88}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()} activeOpacity={0.88}>
          <Text style={styles.primaryButtonText}>{backLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * LoadingScreen
 */
export function LoadingScreen() {
  const { isDark } = useTheme();
  const styles = useSharedStyles();

  return (
    <View style={styles.center}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  );
}

/**
 * EditHeader
 */
export function EditHeader({ title, onBack, right }) {
  const { colors } = useTheme();
  const styles = useSharedStyles();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack ?? (() => router.back())}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

/**
 * EditScreen
 * Standard chrome for an edit form.
 */
export function EditScreen({ title, onBack, headerRight, children, onScrollRef }) {
  const { isDark } = useTheme();
  const styles = useSharedStyles();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <EditHeader title={title} onBack={onBack} right={headerRight} />
      <ScrollView
        ref={onScrollRef}
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Field
 */
export function Field({ label, hint, required, children, error }) {
  const styles = useSharedStyles();
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>
          {label}
          {required ? <Text style={styles.requiredMark}> *</Text> : null}
        </Text>
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/**
 * TextField
 */
export function TextField({ label, value, onChangeText, ...rest }) {
  const styles = useSharedStyles();
  return (
    <Field label={label} required={rest.required}>
      <TextInput
        style={[styles.input, rest.multiline && styles.textArea]}
        value={value ?? ""}
        onChangeText={onChangeText}
        placeholderTextColor="#9ca3af"
        {...rest}
      />
    </Field>
  );
}

/**
 * SelectField
 * A tappable field that opens one of the picker modals below.
 */
export function SelectField({ label, value, placeholder = "Select", onPress, required, icon }) {
  const { colors } = useTheme();
  const styles = useSharedStyles();
  const hasValue = Boolean(value);

  return (
    <Field label={label} required={required}>
      <TouchableOpacity
        style={[styles.input, styles.selectInput]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons name={icon ?? "chevron-down"} size={16} color={colors.textSecondary} />
        <Text style={[styles.selectValue, !hasValue && styles.selectPlaceholder]} numberOfLines={1}>
          {hasValue ? value : placeholder}
        </Text>
      </TouchableOpacity>
    </Field>
  );
}

/**
 * ChipRow
 */
export function ChipRow({ options, value, onChange, keyExtractor = (o) => o.id, allowClear = false, wrap = true }) {
  const styles = useSharedStyles();
  return (
    <View style={[styles.chipRow, wrap && styles.chipRowWrap]}>
      {options.map((option) => {
        const key = keyExtractor(option);
        const label = typeof option === "string" ? option : option.label;
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(active && allowClear ? null : key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * SegmentedRow
 */
export function SegmentedRow({ options, value, onChange, keyExtractor = (o) => o.id, allowClear = false }) {
  const styles = useSharedStyles();
  return (
    <View style={styles.segmentRow}>
      {options.map((option) => {
        const key = keyExtractor(option);
        const label = typeof option === "string" ? option : option.label;
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(active && allowClear ? null : key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * ToggleRow
 */
export function ToggleRow({ label, description, value, onChange }) {
  const styles = useSharedStyles();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleDescription}>{description}</Text> : null}
      </View>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleOn]}
        onPress={() => onChange(!value)}
        activeOpacity={0.8}
      >
        <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Stepper
 */
export function Stepper({ value, onChange, min = 1, max = 5 }) {
  const styles = useSharedStyles();
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={20} color={value <= min ? "#c7d2fe" : "#4f46e5"} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={20} color={value >= max ? "#c7d2fe" : "#4f46e5"} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * SectionDivider
 */
export function SectionDivider({ label }) {
  const styles = useSharedStyles();
  if (!label) return <View style={styles.divider} />;
  return (
    <View style={styles.sectionDivider}>
      <Text style={styles.sectionDividerText}>{label}</Text>
    </View>
  );
}

/**
 * SaveButton
 */
export function SaveButton({ onPress, saving, disabled = false, label = "Save changes" }) {
  const styles = useSharedStyles();
  return (
    <TouchableOpacity
      style={[styles.saveButton, (saving || disabled) && styles.saveButtonDisabled]}
      onPress={onPress}
      disabled={saving || disabled}
      activeOpacity={0.88}
    >
      <LinearGradient
        colors={saving || disabled ? ["#94a3b8", "#94a3b8"] : ["#2563eb", "#4f46e5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.saveGradient}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
        )}
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Pickers ────────────────────────────────────────────────────────────────────

/**
 * CategoryPickerModal
 */
export function CategoryPickerModal({ visible, value, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const styles = useSharedStyles();

  // Reset on close rather than in an effect, so reopening starts clean without
  // an extra render.
  const close = () => {
    setQuery("");
    onClose();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter(
      (c) => c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [query]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.pickerBackdrop}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choose a category</Text>
            <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerSearch}>
            <Ionicons name="search" size={16} color="#9ca3af" />
            <TextInput
              style={styles.pickerSearchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search categories"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <FlatList
            data={groups}
            keyExtractor={(entry) => entry[0]}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.pickerEmpty}>No categories found.</Text>}
            renderItem={({ item: [group, items] }) => (
              <View>
                <Text style={styles.pickerGroup}>{group}</Text>
                <View style={styles.chipRowWrap}>
                  {items.map((item) => {
                    const active = item.id === value;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => {
                          onSelect(item.id);
                          close();
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

/**
 * LocationPickerModal
 */
export function LocationPickerModal({ visible, value, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const styles = useSharedStyles();

  const close = () => {
    setQuery("");
    onClose();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALLOWED_LOCATIONS;
    return ALLOWED_LOCATIONS.filter((l) => l.toLowerCase().includes(q));
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.pickerBackdrop}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choose a location</Text>
            <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerSearch}>
            <Ionicons name="search" size={16} color="#9ca3af" />
            <TextInput
              style={styles.pickerSearchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search locations"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.pickerEmpty}>No locations found.</Text>}
            renderItem={({ item }) => {
              const active = item === value;
              return (
                <TouchableOpacity
                  style={[styles.pickerRow, active && styles.pickerRowActive]}
                  onPress={() => {
                    onSelect(item);
                    close();
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="location-outline" size={16} color={active ? "#4f46e5" : "#9ca3af"} />
                  <Text style={[styles.pickerRowText, active && styles.pickerRowTextActive]}>
                    {item}
                  </Text>
                  {active ? <Ionicons name="checkmark-circle" size={18} color="#4f46e5" /> : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

/**
 * DatePickerModal
 * Calendar grid restricted to today and later, matching the creation wizard.
 */
export function DatePickerModal({ visible, value, onSelect, onClose }) {
  const { colors } = useTheme();
  const styles = useSharedStyles();
  const [viewDate, setViewDate] = useState(() => parseDateNeeded(value) ?? new Date());

  // Re-sync the visible month on close rather than in an effect, so reopening
  // lands on the selected month without an extra render.
  const close = () => {
    setViewDate(parseDateNeeded(value) ?? new Date());
    onClose();
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const cells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // JS weeks start on Sunday; the grid renders Monday-first.
    const leading = (first.getDay() + 6) % 7;

    const list = [];
    for (let i = 0; i < leading; i += 1) list.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push(new Date(year, month, day));
    }
    return list;
  }, [viewDate]);

  const selected = parseDateNeeded(value);

  const shiftMonth = (delta) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.pickerBackdrop}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choose a date</Text>
            <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={{ top: 10, bottom: 10 }}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>
              {viewDate.toLocaleString("en-GB", { month: "long", year: "numeric" })}
            </Text>
            <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={{ top: 10, bottom: 10 }}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarWeekRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day.value} style={styles.calendarWeekLabel}>
                {day.short}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {cells.map((date, index) => {
              if (!date) return <View key={`empty-${index}`} style={styles.calendarCell} />;
              const isPast = date.getTime() < today.getTime();
              const isSelected = selected
                ? selected.toDateString() === date.toDateString()
                : false;
              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[styles.calendarCell, isSelected && styles.calendarCellSelected]}
                  disabled={isPast}
                  onPress={() => {
                    setViewDate(date);
                    onSelect(formatDateNeeded(date));
                    close();
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      isPast && styles.calendarDayTextDisabled,
                      isSelected && styles.calendarDayTextSelected,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * TimePickerModal
 */
export function TimePickerModal({ visible, value, onSelect, onClose, allowFlexible = true }) {
  const styles = useSharedStyles();
  const slots = useMemo(() => {
    const all = buildTimeSlots();
    return allowFlexible ? all : all.filter((s) => s !== FLEXIBLE_TIME);
  }, [allowFlexible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.pickerBackdrop}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choose a time</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={slots}
            keyExtractor={(item) => item}
            numColumns={3}
            keyboardShouldPersistTaps="handled"
            columnWrapperStyle={styles.timeRow}
            renderItem={({ item }) => {
              const active = item === value;
              return (
                <TouchableOpacity
                  style={[styles.timeChip, active && styles.timeChipActive]}
                  onPress={() => {
                    onSelect(item);
                    close();
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>
                    {formatTimeSlot(item)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

/**
 * SkillEditor
 * Add/remove list of short requirement strings.
 */
export function SkillEditor({ value, onChange, max = 20 }) {
  const styles = useSharedStyles();
  const skills = Array.isArray(value) ? value : [];

  const updateAt = (index, next) => {
    const copy = [...skills];
    copy[index] = next;
    onChange(copy);
  };

  const removeAt = (index) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  const addRow = () => {
    if (skills.length >= max) return;
    onChange([...skills, ""]);
  };

  return (
    <View>
      {skills.map((skill, index) => (
        <View key={index} style={styles.skillRow}>
          <View style={styles.skillIndex}>
            <Text style={styles.skillIndexText}>{index + 1}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={skill}
            onChangeText={(text) => updateAt(index, text)}
            placeholder="e.g. Own transport"
            placeholderTextColor="#9ca3af"
            maxLength={60}
          />
          <TouchableOpacity
            style={styles.skillRemove}
            onPress={() => removeAt(index)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ))}

      {skills.length === 0 ? (
        <Text style={styles.emptyHint}>No requirements added yet.</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.secondaryButton, skills.length >= max && styles.secondaryButtonDisabled]}
        onPress={addRow}
        disabled={skills.length >= max}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={17} color="#4f46e5" />
        <Text style={styles.secondaryButtonText}>
          {skills.length >= max ? `Limit of ${max} reached` : "Add requirement"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * PhotoEditor
 * Existing remote URLs plus newly picked images awaiting upload.
 */
export function PhotoEditor({ existing, added, onPick, onRemoveExisting, onRemoveAdded, max = 5 }) {
  const styles = useSharedStyles();
  const existingPhotos = Array.isArray(existing) ? existing : [];
  const addedPhotos = Array.isArray(added) ? added : [];
  const total = existingPhotos.length + addedPhotos.length;

  return (
    <View>
      <View style={styles.photoGrid}>
        {existingPhotos.map((uri, index) => (
          <View key={`existing-${uri}`} style={styles.photoWrap}>
            <PhotoThumb uri={uri} />
            <TouchableOpacity
              style={styles.photoRemove}
              onPress={() => onRemoveExisting(index)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}

        {addedPhotos.map((photo, index) => (
          <View key={`added-${index}`} style={styles.photoWrap}>
            <PhotoThumb uri={photo.uri} />
            <TouchableOpacity
              style={styles.photoRemove}
              onPress={() => onRemoveAdded(index)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}

        {total < max ? (
          <TouchableOpacity style={styles.photoAdd} onPress={onPick} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={22} color="#4f46e5" />
            <Text style={styles.photoAddText}>Add</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.fieldHint}>
        {total} of {max} photos. New photos upload when you save.
      </Text>
    </View>
  );
}

function PhotoThumb({ uri }) {
  const styles = useSharedStyles();
  return <Image source={{ uri }} style={styles.photoThumb} />;
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "800", color: "#1e1b4b" },
  headerRight: { minWidth: 38, alignItems: "flex-end" },

  center: {
    flex: 1,
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  lockIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  lockTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1e1b4b",
    marginTop: 18,
    textAlign: "center",
  },
  lockMessage: {
    fontSize: 14.5,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 24,
  },

  countdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#eef2ff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 18,
  },
  countdownText: { fontSize: 12.5, fontWeight: "700", color: "#4f46e5" },

  field: { marginBottom: 18 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center" },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9ca3af",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  requiredMark: { color: "#ef4444" },
  fieldHint: { fontSize: 12, color: "#9ca3af", marginBottom: 8, marginTop: -4 },
  fieldError: { fontSize: 12.5, color: "#ef4444", marginTop: 6, fontWeight: "600" },

  input: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e1b4b",
  },
  textArea: { minHeight: 110, textAlignVertical: "top" },
  selectInput: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectValue: { flex: 1, fontSize: 15, color: "#1e1b4b", fontWeight: "600" },
  selectPlaceholder: { color: "#9ca3af", fontWeight: "500" },

  chipRow: { flexDirection: "row", alignItems: "center" },
  chipRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  chipTextActive: { color: "#4f46e5", fontWeight: "700" },

  segmentRow: { flexDirection: "row", gap: 8 },
  segment: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
  segmentText: { fontSize: 13.5, fontWeight: "600", color: "#6b7280" },
  segmentTextActive: { color: "#4f46e5", fontWeight: "700" },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    padding: 14,
  },
  toggleTextWrap: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: "700", color: "#1e1b4b" },
  toggleDescription: { fontSize: 12.5, color: "#6b7280", marginTop: 3 },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e5e7eb",
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: "#4f46e5" },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  toggleKnobOn: { alignSelf: "flex-end" },

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 16,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f1f0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: { backgroundColor: "#f5f5f7" },
  stepperValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e1b4b",
    minWidth: 24,
    textAlign: "center",
  },

  divider: { height: 1, backgroundColor: "#eef0f4", marginVertical: 4 },
  sectionDivider: { marginTop: 8, marginBottom: 16 },
  sectionDividerText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  saveButton: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  saveButtonDisabled: { opacity: 0.65 },
  saveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 8,
  },
  saveButtonText: { fontSize: 16.5, fontWeight: "800", color: "#ffffff" },

  primaryButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  primaryButtonText: { fontSize: 15.5, fontWeight: "700", color: "#ffffff" },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#eef2ff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#c7d2fe",
    paddingVertical: 12,
  },
  secondaryButtonDisabled: { opacity: 0.6 },
  secondaryButtonText: { fontSize: 14, fontWeight: "700", color: "#4f46e5" },

  pickerBackdrop: { flex: 1, backgroundColor: "rgba(30, 27, 75, 0.45)", justifyContent: "flex-end" },
  pickerSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: "82%",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pickerTitle: { fontSize: 17, fontWeight: "800", color: "#1e1b4b" },
  pickerSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  pickerSearchInput: { flex: 1, fontSize: 15, color: "#1e1b4b" },
  pickerGroup: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pickerRowActive: { backgroundColor: "#eef2ff" },
  pickerRowText: { flex: 1, fontSize: 15, color: "#1e1b4b" },
  pickerRowTextActive: { fontWeight: "700" },
  pickerEmpty: { fontSize: 14, color: "#9ca3af", textAlign: "center", paddingVertical: 24 },

  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calendarTitle: { fontSize: 15.5, fontWeight: "800", color: "#1e1b4b" },
  calendarWeekRow: { flexDirection: "row", marginBottom: 6 },
  calendarWeekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11.5,
    fontWeight: "700",
    color: "#9ca3af",
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
    borderRadius: 10,
  },
  calendarCellSelected: { backgroundColor: "#4f46e5" },
  calendarDayText: { fontSize: 14.5, fontWeight: "600", color: "#1e1b4b" },
  calendarDayTextDisabled: { color: "#d1d5db" },
  calendarDayTextSelected: { color: "#ffffff", fontWeight: "800" },

  timeRow: { gap: 8, marginBottom: 8 },
  timeChip: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  timeChipActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  timeChipText: { fontSize: 12.5, fontWeight: "600", color: "#4b5563" },
  timeChipTextActive: { color: "#ffffff", fontWeight: "700" },

  skillRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  skillIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  skillIndexText: { fontSize: 12.5, fontWeight: "800", color: "#4f46e5" },
  skillRemove: { padding: 4 },
  emptyHint: { fontSize: 13, color: "#9ca3af", marginBottom: 12 },

  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  photoWrap: { position: "relative" },
  photoThumb: { width: 78, height: 78, borderRadius: 12, backgroundColor: "#f1f0ff" },
  photoRemove: { position: "absolute", top: -6, right: -6 },
  photoAdd: {
    width: 78,
    height: 78,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#c7d2fe",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  photoAddText: { fontSize: 11.5, fontWeight: "700", color: "#4f46e5" },
});