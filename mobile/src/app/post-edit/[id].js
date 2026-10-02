import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useThemedStyles } from "../../theme/themeStyles";
import { fetchPost, updatePost, uploadPhotosToCloudinary } from "../../config/api";
import { CATEGORIES } from "../../config/categoriesData";
import {
  CategoryPickerModal,
  ChipRow,
  DatePickerModal,
  EDIT_WINDOW_MS,
  EditCountdown,
  EditScreen,
  ErrorScreen,
  Field,
  LoadingScreen,
  LockedScreen,
  LocationPickerModal,
  POST_DURATIONS,
  POST_PAYMENT_TYPES,
  PhotoEditor,
  SaveButton,
  SectionDivider,
  SegmentedRow,
  SelectField,
  SkillEditor,
  Stepper,
  TextField,
  TimePickerModal,
  ToggleRow,
  formatTimeSlot,
  parseDateNeeded,
  resolveEditability,
} from "../../components/EditUI";

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((item) => [item.id, item.label]));
const MAX_PHOTOS = 5;

function categoryLabel(id) {
  return (id && CATEGORY_MAP[id]) || id || '';
}

/**
 * post-edit/[id]
 * ─────────────────
 * Edits a task post the signed-in user created. Kept entirely separate from the
 * post-create wizard: it hydrates from the existing record, enforces the 24 hour
 * editing window, and never touches the creation store.
 */
export default function PostEdit() {
  const { id } = useLocalSearchParams();
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(baseStyles);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState(null);
  const [notOwner, setNotOwner] = useState(false);
  const [post, setPost] = useState(null);

  const [form, setForm] = useState({
    title: '',
    category: null,
    description: '',
    location: '',
    budgetAmount: '',
    paymentType: 'fixed',
    dateNeeded: '',
    timeNeeded: '',
    isUrgent: false,
    duration: null,
    skills: [],
    doerCount: 1,
  });

  // Photos already stored on the server vs newly picked ones awaiting upload.
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [addedPhotos, setAddedPhotos] = useState([]);

  const [picker, setPicker] = useState(null);

  const set = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hydrate = useCallback((found) => {
    setPost(found);
    setForm({
      title: found.title || '',
      category: found.category || null,
      description: found.description || '',
      location: found.location || '',
      budgetAmount: String(found.budgetAmount ?? ''),
      paymentType: POST_PAYMENT_TYPES.some((t) => t.id === found.paymentType)
        ? found.paymentType
        : 'fixed',
      dateNeeded: found.dateNeeded || '',
      timeNeeded: found.timeNeeded || '',
      isUrgent: Boolean(found.isUrgent),
      duration: found.duration || null,
      skills: Array.isArray(found.skills) ? found.skills : [],
      doerCount: found.doerCount || 1,
    });
    setExistingPhotos(Array.isArray(found.photos) ? found.photos : []);
    setAddedPhotos([]);
  }, []);

  // `runLoad` performs the fetch. The effect below drives it on mount so the
  // state updates land asynchronously rather than during the effect body.
  const userId = user?.id ?? null;

  const runLoad = useCallback(async () => {
    try {
      const found = await fetchPost(id, token);
      if (!found) {
        setError('Post not found.');
        return;
      }
      if (found.posterId !== userId) {
        setNotOwner(true);
        return;
      }
      hydrate(found);
    } catch (err) {
      console.warn('[post-edit] load failed:', err);
      setError(err.message || 'Failed to load post.');
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

  // A post counts as booked once any doer has accepted it.
  const acceptors = useMemo(() => {
    const raw = post?.acceptedBy;
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== 'string' || !raw.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [post?.acceptedBy]);

  const editability = useMemo(() => {
    if (!post) return null;
    return resolveEditability(post, acceptors.length > 0);
  }, [post, acceptors.length]);

  // The countdown can close the window while the user is on this screen, so it
  // re-evaluates every 30s. Everything time-derived flows from `now`.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const createdAtMs = post?.createdAt ? new Date(post.createdAt).getTime() : NaN;
  const msRemaining = Number.isNaN(createdAtMs) ? 0 : Math.max(0, createdAtMs + EDIT_WINDOW_MS - now);
  const windowClosed = !Number.isNaN(createdAtMs) && msRemaining <= 0;

  const pickPhotos = useCallback(async () => {
    const remaining = MAX_PHOTOS - (existingPhotos.length + addedPhotos.length);
    if (remaining <= 0) {
      Alert.alert('Photo limit reached', `A post can have up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach images to your post.');
      return;
    }

    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
          base64: asset.base64.startsWith('data:')
            ? asset.base64
            : `data:image/jpeg;base64,${asset.base64}`,
        }));

      if (picked.length === 0) return;
      setAddedPhotos((prev) => [...prev, ...picked].slice(0, remaining));
    } catch (err) {
      console.warn('[post-edit] photo pick failed:', err);
      Alert.alert('Could not add photos', err.message || 'Something went wrong.');
    } finally {
      setPicking(false);
    }
  }, [existingPhotos.length, addedPhotos.length]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Missing title', 'Please enter a job title.');
      return;
    }
    if (!form.category) {
      Alert.alert('Missing category', 'Please choose a category.');
      return;
    }
    if (!String(form.budgetAmount).trim()) {
      Alert.alert('Missing budget', 'Please enter a budget amount.');
      return;
    }
    if (form.dateNeeded && !parseDateNeeded(form.dateNeeded)) {
      Alert.alert('Invalid date', 'Use the date picker to choose a valid date.');
      return;
    }

    setSaving(true);
    try {
      let photos = existingPhotos;
      if (addedPhotos.length > 0) {
        const uploaded = await uploadPhotosToCloudinary(
          addedPhotos.map((photo) => photo.base64).filter(Boolean),
          token
        );
        photos = [...existingPhotos, ...(uploaded ?? [])];
      }

      await updatePost(
        id,
        {
          title: form.title.trim(),
          category: form.category,
          description: form.description.trim(),
          location: form.location.trim(),
          budgetAmount: String(form.budgetAmount).replace(/[^0-9]/g, ''),
          paymentType: form.paymentType,
          dateNeeded: form.dateNeeded.trim(),
          timeNeeded: form.timeNeeded || null,
          isUrgent: form.isUrgent,
          duration: form.duration || null,
          skills: form.skills.map((s) => s.trim()).filter(Boolean),
          photos,
          doerCount: form.doerCount,
        },
        token
      );

      Alert.alert('Saved', 'Your post has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.warn('[post-edit] save failed:', err);
      Alert.alert('Save failed', err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return <ErrorScreen title="Could not load post" message={error} onRetry={load} />;
  }

  if (notOwner) {
    return (
      <LockedScreen
        icon="person-outline"
        title="Not your post"
        message="You can only edit posts you created yourself."
      />
    );
  }

  if (!editability?.canEdit || windowClosed) {
    const message = windowClosed && !editability.hasBooking
      ? 'The 24 hour editing window for this post has closed, so it can no longer be changed.'
      : editability.message;

    return (
      <LockedScreen
        icon={editability.hasBooking ? 'calendar-outline' : 'time-outline'}
        title={editability.hasBooking ? 'Already booked' : 'Editing closed'}
        message={message}
      />
    );
  }

  return (
    <EditScreen
      title="Edit post"
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
        label="Job title"
        required
        value={form.title}
        onChangeText={(v) => set('title', v)}
        placeholder="e.g. Fix leaking kitchen tap"
        maxLength={80}
      />

      <SelectField
        label="Category"
        required
        icon="grid-outline"
        value={categoryLabel(form.category)}
        placeholder="Choose a category"
        onPress={() => setPicker('category')}
      />

      <TextField
        label="Description"
        value={form.description}
        onChangeText={(v) => set('description', v)}
        placeholder="Describe the task in detail"
        multiline
      />

      <SelectField
        label="Location"
        icon="location-outline"
        value={form.location}
        placeholder="Choose a location"
        onPress={() => setPicker('location')}
      />

      <TextField
        label="Budget (KSh)"
        required
        value={form.budgetAmount}
        onChangeText={(v) => set('budgetAmount', v.replace(/[^0-9]/g, ''))}
        placeholder="e.g. 5000"
        keyboardType="numeric"
        maxLength={10}
      />

      <Field label="Payment type">
        <SegmentedRow
          options={POST_PAYMENT_TYPES}
          value={form.paymentType}
          onChange={(v) => set('paymentType', v)}
        />
      </Field>

      <SelectField
        label="Date needed"
        required
        icon="calendar-outline"
        value={form.dateNeeded}
        placeholder="Choose a date"
        onPress={() => setPicker('date')}
      />

      <SelectField
        label="Preferred time"
        icon="time-outline"
        value={form.timeNeeded ? formatTimeSlot(form.timeNeeded) : ''}
        placeholder="Any time"
        onPress={() => setPicker('time')}
      />

      <Field label="Duration" hint="Leave empty if the duration is flexible.">
        <ChipRow
          options={POST_DURATIONS}
          value={form.duration}
          onChange={(v) => set('duration', v)}
          keyExtractor={(option) => option}
          allowClear
        />
      </Field>

      <Field label="People needed">
        <Stepper value={form.doerCount} onChange={(v) => set('doerCount', v)} min={1} max={5} />
      </Field>

      <ToggleRow
        label="Mark as urgent"
        description="Urgent posts are highlighted for doers."
        value={form.isUrgent}
        onChange={(v) => set('isUrgent', v)}
      />

      <SectionDivider label="Photos" />

      <PhotoEditor
        existing={existingPhotos}
        added={addedPhotos}
        onPick={pickPhotos}
        onRemoveExisting={(index) =>
          setExistingPhotos((prev) => prev.filter((_, i) => i !== index))
        }
        onRemoveAdded={(index) => setAddedPhotos((prev) => prev.filter((_, i) => i !== index))}
        max={MAX_PHOTOS}
      />

      {picking ? <Text style={styles.inlineHint}>Opening your gallery…</Text> : null}

      <SectionDivider label="Requirements" />

      <SkillEditor
        value={form.skills}
        onChange={(skills) => set('skills', skills)}
        max={20}
      />

      <SaveButton onPress={handleSave} saving={saving} label="Save changes" />

      <CategoryPickerModal
        visible={picker === 'category'}
        value={form.category}
        onSelect={(v) => set('category', v)}
        onClose={() => setPicker(null)}
      />

      <LocationPickerModal
        visible={picker === 'location'}
        value={form.location}
        onSelect={(v) => set('location', v)}
        onClose={() => setPicker(null)}
      />

      <DatePickerModal
        visible={picker === 'date'}
        value={form.dateNeeded}
        onSelect={(v) => set('dateNeeded', v)}
        onClose={() => setPicker(null)}
      />

      <TimePickerModal
        visible={picker === 'time'}
        value={form.timeNeeded}
        onSelect={(v) => set('timeNeeded', v)}
        onClose={() => setPicker(null)}
      />
    </EditScreen>
  );
}

const baseStyles = StyleSheet.create({
  inlineHint: { fontSize: 12.5, color: '#9ca3af', marginTop: -8, marginBottom: 14 },
});