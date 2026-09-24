import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useService } from "../../config/useServiceStore";
import { useThemedStyles } from "../../theme/themeStyles";
import { ContinueButton, InfoBanner, WizardScreen } from "../../components/ServiceCreateUI";

const SERVICE_MODES = [
  { id: "on_site", label: "On-site", icon: "location" },
  { id: "remote", label: "Remote", icon: "laptop" },
  { id: "both", label: "Both", icon: "swap-horizontal" },
];

const PRICE_TYPES = [
  { id: "fixed", label: "Fixed" },
  { id: "hourly", label: "Hourly" },
  { id: "negotiable", label: "Negotiable" },
];

export default function ServiceStep3() {
  const { data, update } = useService();
  const styles = useThemedStyles(baseStyles);
  const [serviceMode, setServiceMode] = useState(data.serviceMode);
  const [priceType, setPriceType] = useState(data.priceType);
  const [priceAmount, setPriceAmount] = useState(
    data.priceAmount === null || data.priceAmount === undefined ? "" : String(data.priceAmount)
  );
  const [error, setError] = useState(null);

  const handleContinue = () => {
    if (priceType !== "negotiable") {
      const cleaned = priceAmount.trim();
      const amount = Number(cleaned);
      if (!cleaned || !Number.isInteger(amount) || amount <= 0) {
        setError("Enter a whole-number price greater than zero.");
        return;
      }
      update({
        serviceMode,
        priceType,
        currency: "KES",
        priceAmount: amount,
      });
    } else {
      update({
        serviceMode,
        priceType,
        currency: "KES",
        priceAmount: null,
      });
    }
    router.push("/service-create/step4");
  };

  const modeDescription =
    serviceMode === "remote"
      ? "Remote services are delivered by phone, video or online."
      : serviceMode === "both"
        ? "Clients can choose an on-site visit or a remote session."
        : "On-site services are delivered at the client location you selected.";

  return (
    <WizardScreen step={3} total={7} label="3 of 7">
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>How is it delivered?</Text>
        <Text style={styles.subtitle}>Choose where and how clients receive the service</Text>

        <InfoBanner icon="map-outline" title="Delivery mode">
          {modeDescription}
        </InfoBanner>

        <Text style={styles.label}>Service mode</Text>
        <View style={styles.optionGrid}>
          {SERVICE_MODES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.optionCard, serviceMode === item.id && styles.optionCardActive]}
              onPress={() => setServiceMode(item.id)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.optionIcon,
                  serviceMode === item.id && styles.optionIconActive,
                ]}
              >
                <Ionicons name={item.icon} size={20} color={serviceMode === item.id ? "#ffffff" : "#64748b"} />
              </View>
              <Text
                style={[
                  styles.optionText,
                  serviceMode === item.id && styles.optionTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, styles.priceLabel]}>Price type</Text>
        <View style={styles.priceTypeRow}>
          {PRICE_TYPES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.priceChip, priceType === item.id && styles.priceChipActive]}
              onPress={() => {
                setPriceType(item.id);
                setError(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.priceChipText,
                  priceType === item.id && styles.priceChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {priceType !== "negotiable" ? (
          <>
            <Text style={[styles.label, styles.amountLabel]}>
              Price <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.amountWrapper, error && styles.inputError]}>
              <Text style={styles.currency}>KSh</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#d1d5db"
                value={priceAmount}
                onChangeText={(value) => {
                  setPriceAmount(value.replace(/[^0-9]/g, ""));
                  setError(null);
                }}
                keyboardType="numeric"
                maxLength={10}
                returnKeyType="next"
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Text style={styles.hint}>
              {priceType === "hourly"
                ? "This is the amount charged for each hour."
                : "This is the starting price clients see for the service."}
            </Text>
          </>
        ) : (
          <InfoBanner icon="cash-outline" title="Negotiable pricing">
            Clients will see that the price is negotiable and can discuss the final amount before
            booking.
          </InfoBanner>
        )}

        <ContinueButton label="Configure booking" onPress={handleContinue} />
      </ScrollView>
    </WizardScreen>
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
  priceLabel: { marginTop: 24 },
  amountLabel: { marginTop: 24 },
  required: { color: "#ef4444" },
  optionGrid: { flexDirection: "row", gap: 10 },
  optionCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  optionCardActive: { backgroundColor: "#eef2ff", borderColor: "#4f46e5" },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  optionIconActive: { backgroundColor: "#4f46e5" },
  optionText: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  optionTextActive: { color: "#4f46e5" },
  priceTypeRow: { flexDirection: "row", gap: 10 },
  priceChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  priceChipActive: { backgroundColor: "#eef2ff", borderColor: "#4f46e5" },
  priceChipText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  priceChipTextActive: { color: "#4f46e5" },
  amountWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputError: { borderColor: "#ef4444" },
  currency: { fontSize: 18, fontWeight: "800", color: "#4f46e5", marginRight: 8 },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#1e1b4b",
    paddingVertical: 0,
  },
  hint: { fontSize: 12.5, color: "#9ca3af", marginTop: 6 },
  errorText: { fontSize: 12.5, color: "#ef4444", marginTop: 5, fontWeight: "500" },
});
