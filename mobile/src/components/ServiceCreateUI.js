import { useState } from "react";
import {
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
import { CATEGORIES, CATEGORY_GROUPS } from "../config/categoriesData";

export function WizardScreen({ step, total, label, children }) {
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <WizardHeader step={step} total={total} label={label} />
      {children}
    </KeyboardAvoidingView>
  );
}

export function WizardHeader({ step, total, label }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
      </TouchableOpacity>
      <View style={styles.progress}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={[styles.progressTrack, index < step && styles.progressTrackActive]}
          />
        ))}
      </View>
      <Text style={styles.progressLabel}>{label || `${step} of ${total}`}</Text>
    </View>
  );
}

export function ContinueButton({ label = "Continue", onPress, disabled = false }) {
  return (
    <TouchableOpacity
      style={[styles.continueButton, disabled && styles.continueButtonDisabled]}
      activeOpacity={0.88}
      onPress={onPress}
      disabled={disabled}
    >
      <LinearGradient
        colors={disabled ? ["#94a3b8", "#94a3b8"] : ["#4f46e5", "#7c3aed"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.continueGradient}
      >
        <Text style={styles.continueText}>{label}</Text>
        <Ionicons name="arrow-forward" size={18} color="#ffffff" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function InfoBanner({ icon = "information-circle-outline", title, children }) {
  return (
    <View style={styles.infoBanner}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#4f46e5" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{children}</Text>
      </View>
    </View>
  );
}

const SERVICE_AREAS = [
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

export function ServiceAreaPicker({ value, onSelect, error }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const areas = SERVICE_AREAS.filter((area) =>
    area.toLowerCase().includes(query.toLowerCase())
  );

  const choose = (area) => {
    onSelect(area);
    setQuery("");
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.inputWrapper, error && styles.inputError]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons
          name="location-outline"
          size={18}
          color={value ? "#4f46e5" : "#9ca3af"}
          style={styles.inputIcon}
        />
        <Text style={[styles.selectText, !value && styles.placeholderText]}>
          {value || "Select your service area"}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#6b7280" />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select service area</Text>
                <Text style={styles.modalSubtitle}>Where do you provide this service?</Text>
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setVisible(false)}
              >
                <Ionicons name="close" size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search areas"
                placeholderTextColor="#9ca3af"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={17} color="#9ca3af" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              style={styles.areaList}
              contentContainerStyle={styles.areaListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {areas.map((item) => {
                const isSelected = item === value;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.areaItem, isSelected && styles.areaItemSelected]}
                    onPress={() => choose(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSelected ? "location" : "location-outline"}
                      size={19}
                      color={isSelected ? "#4f46e5" : "#6b7280"}
                    />
                    <Text
                      style={[styles.areaItemText, isSelected && styles.areaItemTextSelected]}
                      numberOfLines={1}
                    >
                      {item}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
              {areas.length === 0 ? (
                <View style={styles.emptyArea}>
                  <Ionicons name="search-outline" size={32} color="#9ca3af" />
                  <Text style={styles.emptyAreaText}>No areas found</Text>
                </View>
              ) : null}
              <View style={{ height: 12 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function CategoryPicker({ value, onSelect, error }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const selected = CATEGORIES.find((item) => item.id === value);

  const categories = CATEGORIES.filter((item) => {
    const matchesGroup = group === "all" || item.group === group;
    const matchesQuery = `${item.label} ${item.id}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesGroup && matchesQuery;
  });

  const choose = (id) => {
    onSelect(id);
    setQuery("");
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.inputWrapper, error && styles.inputError]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons
          name="grid-outline"
          size={18}
          color={selected ? "#4f46e5" : "#9ca3af"}
          style={styles.inputIcon}
        />
        <Text style={[styles.selectText, !selected && styles.placeholderText]}>
          {selected?.label || "Select a category"}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#6b7280" />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select a category</Text>
                <Text style={styles.modalSubtitle}>What do you offer?</Text>
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setVisible(false)}
              >
                <Ionicons name="close" size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories"
                placeholderTextColor="#9ca3af"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={17} color="#9ca3af" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groupRow}
            >
              {CATEGORY_GROUPS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.groupPill, group === item.id && styles.groupPillActive]}
                  onPress={() => setGroup(item.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.groupPillText,
                      group === item.id && styles.groupPillTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView
              contentContainerStyle={styles.categoryScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.categoryGrid}>
                {categories.map((item) => {
                  const isSelected = item.id === value;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                      ]}
                      onPress={() => choose(item.id)}
                      activeOpacity={0.8}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={[`${item.color}26`, `${item.color}0a`]}
                          style={StyleSheet.absoluteFill}
                          borderRadius={14}
                        />
                      ) : null}
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: isSelected ? item.color : "#f3f4f6" },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={isSelected ? "#ffffff" : "#6b7280"}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryLabel,
                          isSelected && { color: item.color, fontWeight: "700" },
                        ]}
                        numberOfLines={2}
                      >
                        {item.label}
                      </Text>
                      {isSelected ? (
                        <View style={[styles.checkmark, { backgroundColor: item.color }]}>
                          <Ionicons name="checkmark" size={10} color="#ffffff" />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {categories.length === 0 ? (
                <View style={styles.emptyCategory}>
                  <Ionicons name="search-outline" size={32} color="#9ca3af" />
                  <Text style={styles.emptyCategoryText}>No categories found</Text>
                </View>
              ) : null}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
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
  progress: { flex: 1, flexDirection: "row", gap: 5 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb" },
  progressTrackActive: { backgroundColor: "#4f46e5" },
  progressLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
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
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, fontWeight: "500", color: "#1e1b4b", paddingVertical: 0 },
  textArea: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e1b4b",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 180,
  },
  selectText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1e1b4b" },
  placeholderText: { fontWeight: "400", color: "#9ca3af" },
  hint: { fontSize: 12.5, color: "#9ca3af", marginTop: 6 },
  errorText: { fontSize: 12.5, color: "#ef4444", marginTop: 5, fontWeight: "500" },
  continueButton: { borderRadius: 16, overflow: "hidden", marginTop: 32 },
  continueButtonDisabled: { opacity: 0.65 },
  continueGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 8,
  },
  continueText: { fontSize: 17, fontWeight: "700", color: "#ffffff" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#eef2ff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: "800", color: "#1e1b4b", marginBottom: 3 },
  infoText: { fontSize: 13, fontWeight: "500", color: "#4b5563", lineHeight: 19 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: 650,
    overflow: "hidden",
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
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#d1d5db",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1e1b4b" },
  areaList: { height: 320, minHeight: 0 },
  areaListContent: { paddingBottom: 12 },
  areaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  areaItemSelected: { backgroundColor: "#f5f3ff" },
  areaItemText: { flex: 1, fontSize: 15, fontWeight: "500", color: "#374151" },
  areaItemTextSelected: { fontWeight: "700", color: "#4f46e5" },
  emptyArea: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyAreaText: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  groupRow: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  groupPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  groupPillActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  groupPillText: { fontSize: 12.5, fontWeight: "600", color: "#6b7280" },
  groupPillTextActive: { color: "#ffffff" },
  categoryScroll: { paddingHorizontal: 16, paddingBottom: 32 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    width: "31.5%",
    minHeight: 92,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#f3f4f6",
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryChipSelected: {
    borderColor: "#4f46e5",
    shadowColor: "#4f46e5",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    lineHeight: 14,
  },
  checkmark: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCategory: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyCategoryText: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
});
