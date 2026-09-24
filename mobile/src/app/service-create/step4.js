import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useService } from "../../config/useServiceStore";
import { useThemedStyles } from "../../theme/themeStyles";
import { ContinueButton, FieldHelp, InfoBanner, WizardScreen } from "../../components/ServiceCreateUI";

const BOOKING_MODES = [
  { id: "request", label: "Request to book" },
  { id: "instant", label: "Instant booking" },
];

export default function ServiceStep4() {
  const { data, update } = useService();
  const styles = useThemedStyles(baseStyles);
  const [bookingEnabled, setBookingEnabled] = useState(data.bookingEnabled);
  const [bookingMode, setBookingMode] = useState(data.bookingMode);
  const [durationMinutes, setDurationMinutes] = useState(
    data.durationMinutes === null || data.durationMinutes === undefined ? "" : String(data.durationMinutes)
  );
  const [bufferMinutes, setBufferMinutes] = useState(String(data.bufferMinutes ?? 0));
  const [minNoticeMinutes, setMinNoticeMinutes] = useState(String(data.minNoticeMinutes ?? 0));
  const [maxAdvanceBookingDays, setMaxAdvanceBookingDays] = useState(
    String(data.maxAdvanceBookingDays ?? 90)
  );
  const [maxConcurrentBookings, setMaxConcurrentBookings] = useState(
    String(data.maxConcurrentBookings ?? 1)
  );
  const [error, setError] = useState(null);

  const handleContinue = () => {
    if (!bookingEnabled) {
      update({
        bookingEnabled: false,
        bookingMode: "request",
        durationMinutes: null,
        bufferMinutes: 0,
        minNoticeMinutes: 60,
        maxAdvanceBookingDays: 90,
        maxConcurrentBookings: 1,
      });
      router.push("/service-create/step5");
      return;
    }

    const duration = Number(durationMinutes);
    const buffer = Number(bufferMinutes);
    const notice = Number(minNoticeMinutes);
    const advance = Number(maxAdvanceBookingDays);
    const concurrent = Number(maxConcurrentBookings);

    if (!Number.isInteger(duration) || duration < 15 || duration > 1440) {
      setError("Duration must be a whole number between 15 and 1440 minutes.");
      return;
    }
    if (!Number.isInteger(buffer) || buffer < 0 || buffer > 240) {
      setError("Buffer time must be between 0 and 240 minutes.");
      return;
    }
    if (!Number.isInteger(notice) || notice < 0 || notice > 10080) {
      setError("Minimum notice must be between 0 and 10080 minutes.");
      return;
    }
    if (!Number.isInteger(advance) || advance < 1 || advance > 365) {
      setError("Advance booking must be between 1 and 365 days.");
      return;
    }
    if (!Number.isInteger(concurrent) || concurrent < 1 || concurrent > 20) {
      setError("Concurrent bookings must be between 1 and 20.");
      return;
    }

    setError(null);
    update({
      bookingEnabled: true,
      bookingMode,
      durationMinutes: duration,
      bufferMinutes: buffer,
      minNoticeMinutes: notice,
      maxAdvanceBookingDays: advance,
      maxConcurrentBookings: concurrent,
    });
    router.push("/service-create/step5");
  };

  return (
    <WizardScreen step={4} total={7} label="4 of 7">
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>How should booking work?</Text>
        <Text style={styles.subtitle}>Control how clients request your time</Text>

        <InfoBanner icon="calendar-outline" title="Booking settings">
          Request bookings let you approve each client. Instant bookings are reserved immediately
          when a client selects an available time.
        </InfoBanner>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => {
            setBookingEnabled((current) => !current);
            setError(null);
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.toggle, bookingEnabled && styles.toggleActive]}>
            <View style={[styles.toggleThumb, bookingEnabled && styles.toggleThumbActive]} />
          </View>
          <View style={styles.toggleContent}>
            <Text style={styles.toggleTitle}>Accept bookings</Text>
            <Text style={styles.toggleSubtitle}>
              {bookingEnabled ? "Clients can reserve this service" : "Show the service without a calendar"}
            </Text>
          </View>
        </TouchableOpacity>

        {bookingEnabled ? (
          <>
            <Text style={[styles.label, styles.modeLabel]}>Booking mode</Text>
            <View style={styles.modeRow}>
              {BOOKING_MODES.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.modeChip, bookingMode === item.id && styles.modeChipActive]}
                  onPress={() => setBookingMode(item.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.modeChipText,
                      bookingMode === item.id && styles.modeChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FieldLabel
              helpTitle="Service duration"
              help="This is the length of one appointment. For example, a 60-minute cleaning creates a 60-minute booking slot for the client."
            >
              Service duration (minutes) <Text style={styles.required}>*</Text>
            </FieldLabel>
            <NumberField
              value={durationMinutes}
              onChange={(value) => {
                setDurationMinutes(value.replace(/[^0-9]/g, ""));
                setError(null);
              }}
              placeholder="60"
            />

            <FieldLabel
              helpTitle="Buffer time"
              help="Buffer time is extra time added around each appointment for travel, setup, cleanup or a short break. A 30-minute buffer after a 60-minute service blocks 90 minutes in your calendar."
            >
              Buffer time (minutes)
            </FieldLabel>
            <NumberField
              value={bufferMinutes}
              onChange={(value) => {
                setBufferMinutes(value.replace(/[^0-9]/g, ""));
                setError(null);
              }}
              placeholder="0"
            />

            <FieldLabel
              helpTitle="Minimum notice"
              help="Minimum notice is the shortest time a client must book before the appointment starts. With 60 minutes of notice, a client cannot book a slot beginning less than one hour from now."
            >
              Minimum notice (minutes)
            </FieldLabel>
            <NumberField
              value={minNoticeMinutes}
              onChange={(value) => {
                setMinNoticeMinutes(value.replace(/[^0-9]/g, ""));
                setError(null);
              }}
              placeholder="60"
            />

            <FieldLabel
              helpTitle="Advance booking"
              help="This controls how far into the future clients can book. With 90 days selected, clients can choose appointment dates up to 90 days ahead."
            >
              How far ahead can clients book? (days)
            </FieldLabel>
            <NumberField
              value={maxAdvanceBookingDays}
              onChange={(value) => {
                setMaxAdvanceBookingDays(value.replace(/[^0-9]/g, ""));
                setError(null);
              }}
              placeholder="90"
            />

            <FieldLabel
              helpTitle="Concurrent bookings"
              help="This is the number of clients who can book the same available time. Use 1 when you can serve only one client at a time."
            >
              Concurrent bookings
            </FieldLabel>
            <NumberField
              value={maxConcurrentBookings}
              onChange={(value) => {
                setMaxConcurrentBookings(value.replace(/[^0-9]/g, ""));
                setError(null);
              }}
              placeholder="1"
            />
          </>
        ) : (
          <InfoBanner icon="pause-circle-outline" title="Contact-based enquiries">
            Clients can still discover this service, but they will need to contact you to arrange
            the details.
          </InfoBanner>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <ContinueButton label="Add your availability" onPress={handleContinue} />
      </ScrollView>
    </WizardScreen>
  );
}

function NumberField({ value, onChange, placeholder }) {
  const styles = useThemedStyles(baseStyles);
  return (
    <View style={styles.numberWrapper}>
      <TextInput
        style={styles.numberInput}
        placeholder={placeholder}
        placeholderTextColor="#d1d5db"
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        maxLength={5}
        returnKeyType="next"
      />
    </View>
  );
}

function FieldLabel({ children, helpTitle, help }) {
  const styles = useThemedStyles(baseStyles);
  return (
    <View style={styles.labelWithHelp}>
      <Text style={[styles.label, styles.fieldLabel]}>{children}</Text>
      <FieldHelp title={helpTitle}>{help}</FieldHelp>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e1b4b",
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: { fontSize: 15, color: "#6b7280", marginTop: 4, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 8 },
  modeLabel: { marginTop: 24 },
  fieldLabel: { flex: 1, flexWrap: "wrap", marginTop: 18, marginBottom: 0 },
  labelWithHelp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 18,
  },
  required: { color: "#ef4444" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    gap: 12,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e5e7eb",
    padding: 3,
  },
  toggleActive: { backgroundColor: "#4f46e5" },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
  },
  toggleThumbActive: { marginLeft: 20 },
  toggleContent: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: "800", color: "#1e1b4b" },
  toggleSubtitle: { fontSize: 12.5, fontWeight: "500", color: "#6b7280", marginTop: 2 },
  modeRow: { flexDirection: "row", gap: 10 },
  modeChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  modeChipActive: { backgroundColor: "#eef2ff", borderColor: "#4f46e5" },
  modeChipText: { fontSize: 13, fontWeight: "700", color: "#64748b", textAlign: "center" },
  modeChipTextActive: { color: "#4f46e5" },
  numberWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  numberInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e1b4b",
    paddingVertical: 12,
  },
  errorText: { fontSize: 12.5, color: "#ef4444", marginTop: 8, fontWeight: "500" },
});
