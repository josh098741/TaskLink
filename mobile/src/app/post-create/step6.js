import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usePost } from '../../config/usePostStore';

export default function Step6() {
  const { data, update } = usePost();
  const [skills, setSkills] = useState(data.skills);
  const [photos, setPhotos] = useState(data.photos);
  const [doerCount, setDoerCount] = useState(data.doerCount);

  const handlePickPhotos = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets) {
      const picked = result.assets.map((a) => ({
        uri: a.uri,
        base64: a.base64 ? `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}` : null,
      }));
      setPhotos((prev) => [...prev, ...picked].slice(0, 5));
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    update({ skills: skills.trim(), photos: photos.map((p) => p.base64), doerCount });
    router.push('/post-create/step7');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
        </TouchableOpacity>
        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View key={s} style={[styles.stepDot, s <= 5 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Extras</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Optional details</Text>
        <Text style={styles.subtitle}>Add extra info to attract better applicants</Text>

        {/* Skills */}
        <Text style={styles.label}>Requirements</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="ribbon-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder='e.g. "Must know basic plumbing"'
            placeholderTextColor="#d1d5db"
            value={skills}
            onChangeText={setSkills}
          />
        </View>
        <Text style={styles.hint}>Optional — add any skills or requirements</Text>

        {/* Photos */}
        <Text style={[styles.label, { marginTop: 22 }]}>Add Photos</Text>
        <View style={styles.photosRow}>
          {photos.map((p, idx) => (
            <View key={idx} style={styles.photoThumb}>
              <Image source={{ uri: p.uri }} style={styles.photoImage} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(idx)}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 5 && (
            <TouchableOpacity style={styles.photoAdd} onPress={handlePickPhotos} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={24} color="#9ca3af" />
              <Text style={styles.photoAddText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.hint}>Up to 5 photos — helps Doers understand the task</Text>

        {/* Doer count */}
        <Text style={[styles.label, { marginTop: 22 }]}>How many people do you need?</Text>
        <View style={styles.doerRow}>
          <TouchableOpacity
            style={[styles.doerBtn, doerCount <= 1 && styles.doerBtnDisabled]}
            onPress={() => doerCount > 1 && setDoerCount(doerCount - 1)}
            disabled={doerCount <= 1}
          >
            <Ionicons name="remove" size={20} color={doerCount <= 1 ? '#d1d5db' : '#4f46e5'} />
          </TouchableOpacity>
          <Text style={styles.doerCount}>{doerCount}</Text>
          <TouchableOpacity
            style={[styles.doerBtn, doerCount >= 5 && styles.doerBtnDisabled]}
            onPress={() => doerCount < 5 && setDoerCount(doerCount + 1)}
            disabled={doerCount >= 5}
          >
            <Ionicons name="add" size={20} color={doerCount >= 5 ? '#d1d5db' : '#4f46e5'} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.88}
          onPress={handleContinue}
        >
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnGradient}
          >
            <Text style={styles.continueBtnText}>Review Task</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f1f0ff', alignItems: 'center', justifyContent: 'center',
  },
  stepRow: { flex: 1, flexDirection: 'row', gap: 5 },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' },
  stepDotActive: { backgroundColor: '#4f46e5' },
  stepLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  title: {
    fontSize: 28, fontWeight: '800', color: '#1e1b4b',
    letterSpacing: -0.5, marginTop: 8,
  },
  subtitle: { fontSize: 15, color: '#6b7280', marginTop: 4, marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 2, borderColor: '#e5e7eb',
    paddingHorizontal: 14, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontSize: 16, fontWeight: '500',
    color: '#1e1b4b', paddingVertical: 0,
  },
  hint: { fontSize: 12.5, color: '#9ca3af', marginTop: 6 },
  photosRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  photoThumb: { position: 'relative' },
  photoImage: { width: 72, height: 72, borderRadius: 12 },
  photoRemove: { position: 'absolute', top: -6, right: -6 },
  photoAdd: {
    width: 72, height: 72, borderRadius: 12,
    borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb',
  },
  photoAddText: { fontSize: 11, fontWeight: '600', color: '#9ca3af', marginTop: 2 },
  doerRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4 },
  doerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  doerBtnDisabled: { backgroundColor: '#f9fafb', borderColor: '#f1f5f9' },
  doerCount: { fontSize: 22, fontWeight: '800', color: '#1e1b4b' },
  continueBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 32 },
  continueBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 17, gap: 8,
  },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
});
