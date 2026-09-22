import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useService } from "../../config/useServiceStore";
import { ContinueButton, InfoBanner, ServiceAreaPicker, WizardScreen } from "../../components/ServiceCreateUI";

export default function ServiceStep2() {
  const { data, update } = useService();
  const [description, setDescription] = useState(data.description);
  const [location, setLocation] = useState(data.location);
  const [errors, setErrors] = useState({});

  const handleContinue = () => {
    const nextErrors = {};
    if (description.trim().length < 10) {
      nextErrors.description = "Add at least 10 characters so clients understand the service.";
    }
    if (location.trim().length < 2) {
      nextErrors.location = "Enter the area where you provide this service.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    update({ description: description.trim(), location: location.trim() });
    router.push("/service-create/step3");
  };

  return (
    <WizardScreen step={2} total={7} label="2 of 7">
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Describe your service</Text>
        <Text style={styles.subtitle}>Set expectations before a client books</Text>

        <InfoBanner icon="document-text-outline" title="Make the offer clear">
          Explain what is included, who the service is for and any useful boundaries. Clear
          descriptions reduce back-and-forth messages.
        </InfoBanner>

        <Text style={styles.label}>
          Description <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputWrapper, errors.description && styles.inputError]}>
          <TextInput
            style={styles.textArea}
            placeholder="Describe what you provide, what is included and any important details..."
            placeholderTextColor="#d1d5db"
            value={description}
            onChangeText={(value) => {
              setDescription(value);
              if (value.trim().length >= 10) {
                setErrors((current) => ({ ...current, description: null }));
              }
            }}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={5000}
          />
        </View>
        {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}

        <Text style={[styles.label, styles.locationLabel]}>
          Service area <Text style={styles.required}>*</Text>
        </Text>
        <ServiceAreaPicker
          value={location}
          onSelect={(area) => {
            setLocation(area);
            setErrors((current) => ({ ...current, location: null }));
          }}
          error={errors.location}
        />
        {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
        <Text style={styles.hint}>Clients see this area when discovering your service.</Text>

        <ContinueButton label="Set delivery and pricing" onPress={handleContinue} />
      </ScrollView>
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
  label: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 8 },
  locationLabel: { marginTop: 22 },
  required: { color: "#ef4444" },
  inputWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputError: { borderColor: "#ef4444" },
  textArea: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e1b4b",
    minHeight: 180,
    textAlignVertical: "top",
  },
  input: {
    flexDirection: "row",
    fontSize: 16,
    fontWeight: "500",
    color: "#1e1b4b",
    paddingVertical: 0,
  },
  hint: { fontSize: 12.5, color: "#9ca3af", marginTop: 6 },
  errorText: { fontSize: 12.5, color: "#ef4444", marginTop: 5, fontWeight: "500" },
});
