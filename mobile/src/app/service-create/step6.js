import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useService } from "../../config/useServiceStore";
import { ContinueButton, InfoBanner, WizardScreen } from "../../components/ServiceCreateUI";

export default function ServiceStep6() {
  const { data, update } = useService();
  const [skills, setSkills] = useState(
    Array.isArray(data.skills) && data.skills.length > 0 ? data.skills : [""]
  );
  const [photos, setPhotos] = useState(data.photos);

  const handlePickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo library access to add service photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const picked = result.assets
        .map((asset) => ({
          uri: asset.uri,
          base64: asset.base64
            ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
            : null,
        }))
        .filter((photo) => photo.base64);
      setPhotos((current) => [...current, ...picked].slice(0, 5));
    }
  };

  const removePhoto = (index) => {
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  };

  const updateSkill = (index, value) => {
    setSkills((current) =>
      current.map((skill, skillIndex) => (skillIndex === index ? value : skill))
    );
  };

  const addSkill = () => {
    if (skills.length >= 20 || skills.some((skill) => !skill.trim())) return;
    setSkills((current) => [...current, ""]);
  };

  const removeSkill = (index) => {
    setSkills((current) => current.filter((_, skillIndex) => skillIndex !== index));
  };

  const handleContinue = () => {
    update({
      skills: skills.map((skill) => skill.trim()).filter(Boolean),
      photos,
    });
    router.push("/service-create/step7");
  };

  return (
    <WizardScreen step={6} total={7} label="6 of 7">
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Showcase your work</Text>
        <Text style={styles.subtitle}>Add proof, requirements and details clients should know</Text>

        <InfoBanner icon="images-outline" title="Optional but valuable">
          Photos and requirements help clients judge fit before they book. You can publish a
          service without them if you prefer.
        </InfoBanner>

        <Text style={styles.label}>Requirements</Text>
        {skills.map((skill, index) => (
          <View key={index} style={styles.skillRow}>
            <View style={styles.skillNumber}>
              <Text style={styles.skillNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.skillInput}>
              <Ionicons name="ribbon-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.skillTextInput}
                placeholder="e.g. Bring your own cleaning supplies"
                placeholderTextColor="#d1d5db"
                value={skill}
                onChangeText={(value) => updateSkill(index, value)}
                maxLength={80}
              />
              {index > 0 ? (
                <TouchableOpacity
                  onPress={() => removeSkill(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))}
        <TouchableOpacity
          style={[styles.addSkillButton, skills.length >= 20 && styles.addSkillDisabled]}
          onPress={addSkill}
          disabled={skills.length >= 20}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={18} color="#4f46e5" />
          <Text style={styles.addSkillText}>Add another requirement</Text>
        </TouchableOpacity>

        <Text style={[styles.label, styles.photosLabel]}>Service photos</Text>
        <View style={styles.photosRow}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoThumb}>
              <Image source={{ uri: photo.uri }} style={styles.photoImage} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => removePhoto(index)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 5 ? (
            <TouchableOpacity style={styles.photoAdd} onPress={handlePickPhotos} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={24} color="#9ca3af" />
              <Text style={styles.photoAddText}>Add</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.hint}>Up to 5 photos. Photos are uploaded only when you publish.</Text>

        <ContinueButton label="Review your service" onPress={handleContinue} />
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
  photosLabel: { marginTop: 24 },
  skillRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  skillNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#f1f0ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  skillNumberText: { fontSize: 13, fontWeight: "800", color: "#4f46e5" },
  skillInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    gap: 6,
  },
  inputIcon: { marginLeft: 2 },
  skillTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#1e1b4b",
    paddingVertical: 13,
  },
  addSkillButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 2,
    padding: 4,
  },
  addSkillText: { fontSize: 14, fontWeight: "700", color: "#4f46e5" },
  addSkillDisabled: { opacity: 0.5 },
  photosRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  photoThumb: { position: "relative" },
  photoImage: { width: 72, height: 72, borderRadius: 12 },
  photoRemove: { position: "absolute", top: -7, right: -7 },
  photoAdd: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  photoAddText: { fontSize: 11, fontWeight: "700", color: "#9ca3af", marginTop: 2 },
  hint: { fontSize: 12.5, color: "#9ca3af", marginTop: 6 },
});
