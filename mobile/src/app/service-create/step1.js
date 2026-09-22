import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useService } from "../../config/useServiceStore";
import {
  CategoryPicker,
  ContinueButton,
  InfoBanner,
  WizardScreen,
} from "../../components/ServiceCreateUI";

export default function ServiceStep1() {
  const { data, update } = useService();
  const [title, setTitle] = useState(data.title);
  const [category, setCategory] = useState(data.category);
  const [errors, setErrors] = useState({});

  const handleContinue = () => {
    const nextErrors = {};
    if (title.trim().length < 3) nextErrors.title = "Enter a service title with at least 3 characters.";
    if (!category) nextErrors.category = "Select the category that best describes your service.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    update({ title: title.trim(), category });
    router.push("/service-create/step2");
  };

  return (
    <WizardScreen step={1} total={7} label="1 of 7">
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What service do you offer?</Text>
        <Text style={styles.subtitle}>Introduce the skill clients can book from you</Text>

        <InfoBanner icon="briefcase-outline" title="Services work differently from posts">
          A post asks for help. A service presents your recurring skill, price and availability so
          clients can discover and book you.
        </InfoBanner>

        <Text style={styles.label}>
          Service title <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputWrapper, errors.title && styles.inputError]}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Professional home cleaning"
            placeholderTextColor="#d1d5db"
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              if (value.trim().length >= 3) {
                setErrors((current) => ({ ...current, title: null }));
              }
            }}
            maxLength={120}
            returnKeyType="next"
          />
        </View>
        {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

        <Text style={[styles.label, styles.categoryLabel]}>
          Category <Text style={styles.required}>*</Text>
        </Text>
        <CategoryPicker
          value={category}
          onSelect={(value) => {
            setCategory(value);
            setErrors((current) => ({ ...current, category: null }));
          }}
          error={errors.category}
        />

        <ContinueButton label="Tell clients more" onPress={handleContinue} />
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
  categoryLabel: { marginTop: 20 },
  required: { color: "#ef4444" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
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
  input: { flex: 1, fontSize: 16, fontWeight: "500", color: "#1e1b4b", paddingVertical: 0 },
  errorText: { fontSize: 12.5, color: "#ef4444", marginTop: 5, fontWeight: "500" },
});
