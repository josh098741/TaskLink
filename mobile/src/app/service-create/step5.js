import { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useService } from "../../config/useServiceStore";
import { ContinueButton, InfoBanner, WizardScreen } from "../../components/ServiceCreateUI";

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map((item) => [item.value, item.label]));
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function ServiceStep5() {
  const { data, update } = useService();
  const [windows, setWindows] = useState(data.availability);
  const [activeIndex, setActiveIndex] = useState(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [error, setError] = useState(null);

  const addWindow = () => {
    if (windows.length >= 28) return;
    setWindows((current) => [
      ...current,
      {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        timezone: "Africa/Nairobi",
      },
    ]);
    setError(null);
  };

  const updateWindow = (index, field, value) => {
    setWindows((current) =>
      current.map((window, windowIndex) =>
        windowIndex === index ? { ...window, [field]: value } : window
      )
    );
    setError(null);
  };

  const removeWindow = (index) => {
    setWindows((current) => current.filter((_, windowIndex) => windowIndex !== index));
    setError(null);
  };

  const openDayPicker = (index) => {
    setActiveIndex(index);
    setDayModalVisible(true);
  };

  const chooseDay = (dayOfWeek) => {
    if (activeIndex === null) return;
    updateWindow(activeIndex, "dayOfWeek", dayOfWeek);
    setDayModalVisible(false);
    setActiveIndex(null);
  };

  const handleContinue = () => {
    if (!data.bookingEnabled) {
      update({ availability: [] });
      router.push("/service-create/step6");
      return;
    }

    if (windows.length === 0) {
      setError("Add at least one availability window before continuing.");
      return;
    }

    const normalized = windows.map((window) => ({
      ...window,
      startTime: window.startTime.trim(),
      endTime: window.endTime.trim(),
    }));
    const invalid = normalized.find(
      (window) =>
        !TIME_PATTERN.test(window.startTime) ||
        !TIME_PATTERN.test(window.endTime) ||
        window.endTime <= window.startTime
    );

    if (invalid) {
      setError("Each window needs a valid start time and an end time that comes later.");
      return;
    }

    update({ availability: normalized });
    router.push("/service-create/step6");
  };

  return (
    <WizardScreen step={5} total={7} label="5 of 7">
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>When are you available?</Text>
        <Text style={styles.subtitle}>Publish the times clients can reserve</Text>

        {data.bookingEnabled ? (
          <InfoBanner icon="time-outline" title="Availability windows">
            Active bookable services need at least one weekly window. Clients can only request
            times that fit inside these hours.
          </InfoBanner>
        ) : (
          <InfoBanner icon="pause-circle-outline" title="Booking is turned off">
            You can skip availability for now. Add it later when you are ready to accept bookings.
          </InfoBanner>
        )}

        {data.bookingEnabled ? (
          <>
            {windows.map((window, index) => (
              <View key={index} style={styles.windowCard}>
                <View style={styles.windowHeader}>
                  <Text style={styles.windowNumber}>{index + 1}</Text>
                  <View style={styles.windowTitle}>
                    <Text style={styles.windowTitleText}>Availability window</Text>
                    <Text style={styles.windowTimezone}>Africa/Nairobi</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeWindow}
                    onPress={() => removeWindow(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.dayPicker}
                  onPress={() => openDayPicker(index)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color="#4f46e5" />
                  <Text style={styles.dayPickerText}>
                    {DAY_LABELS[window.dayOfWeek] || "Select day"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#6b7280" />
                </TouchableOpacity>

                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Start</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={window.startTime}
                      onChangeText={(value) => updateWindow(index, "startTime", value)}
                      placeholder="HH:mm"
                      placeholderTextColor="#d1d5db"
                      maxLength={5}
                      autoCorrect={false}
                    />
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#9ca3af" style={styles.timeArrow} />
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>End</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={window.endTime}
                      onChangeText={(value) => updateWindow(index, "endTime", value)}
                      placeholder="HH:mm"
                      placeholderTextColor="#d1d5db"
                      maxLength={5}
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addWindowButton, windows.length >= 28 && styles.addWindowDisabled]}
              onPress={addWindow}
              disabled={windows.length >= 28}
              activeOpacity={0.8}
            >
              <Ionicons
                name={windows.length >= 28 ? "lock-closed-outline" : "add-circle-outline"}
                size={20}
                color={windows.length >= 28 ? "#9ca3af" : "#4f46e5"}
              />
              <Text
                style={[
                  styles.addWindowText,
                  windows.length >= 28 && styles.addWindowTextDisabled,
                ]}
              >
                {windows.length >= 28 ? "Maximum windows reached" : "Add another window"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.hint}>Up to 28 weekly windows can be added.</Text>
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <ContinueButton
          label={data.bookingEnabled ? "Add photos and requirements" : "Add photos and requirements"}
          onPress={handleContinue}
        />
      </ScrollView>

      <Modal
        visible={dayModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select a day</Text>
                <Text style={styles.modalSubtitle}>When is this window available?</Text>
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setDayModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {DAY_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={styles.dayOption}
                  onPress={() => chooseDay(item.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dayOptionText}>{item.label}</Text>
                  {windows[activeIndex]?.dayOfWeek === item.value ? (
                    <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e1b4b",
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: { fontSize: 15, color: "#6b7280", marginTop: 4, marginBottom: 24 },
  windowCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  windowHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  windowNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eef2ff",
    color: "#4f46e5",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 28,
  },
  windowTitle: { flex: 1, marginLeft: 10 },
  windowTitleText: { fontSize: 14, fontWeight: "800", color: "#1e1b4b" },
  windowTimezone: { fontSize: 11.5, fontWeight: "500", color: "#9ca3af", marginTop: 2 },
  removeWindow: { padding: 4 },
  dayPicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dayPickerText: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: "700", color: "#1e1b4b" },
  timeRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 11.5, fontWeight: "700", color: "#9ca3af", marginBottom: 5 },
  timeInput: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#1e1b4b",
  },
  timeArrow: { marginTop: 22 },
  addWindowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    borderWidth: 1.5,
    borderColor: "#c7d2fe",
  },
  addWindowDisabled: { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
  addWindowText: { fontSize: 14, fontWeight: "800", color: "#4f46e5" },
  addWindowTextDisabled: { color: "#9ca3af" },
  hint: { fontSize: 12.5, color: "#9ca3af", marginTop: 6, textAlign: "center" },
  errorText: { fontSize: 12.5, color: "#ef4444", marginTop: 8, fontWeight: "500", textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "78%",
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1e1b4b" },
  modalSubtitle: { fontSize: 12.5, color: "#6b7280", marginTop: 2 },
  modalClose: { padding: 6, backgroundColor: "#f3f4f6", borderRadius: 20 },
  dayOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  dayOptionText: { fontSize: 15, fontWeight: "600", color: "#374151" },
});
