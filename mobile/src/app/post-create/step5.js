import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePost } from '../../config/usePostStore';

const DURATION_OPTIONS = [
  'Under 1 hour',
  '1-3 hours',
  'Half day',
  'Full day',
  'Multiple days',
];

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Generate time slots every 30 minutes from 6:00 AM to 10:00 PM
const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 6; h < 22; h++) {
    for (const m of ['00', '30']) {
      const hh = h < 10 ? `0${h}` : `${h}`;
      slots.push(`${hh}:${m}`);
    }
  }
  slots.push('Flexible / Anytime');
  return slots;
})();

function formatDate(d) {
  const dd = d.getDate() < 10 ? `0${d.getDate()}` : `${d.getDate()}`;
  const mm = d.getMonth() + 1 < 10 ? `0${d.getMonth() + 1}` : `${d.getMonth() + 1}`;
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function todayAtMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Step5() {
  const { data, update } = usePost();
  const [dateNeeded, setDateNeeded] = useState(data.dateNeeded);
  const [timeNeeded, setTimeNeeded] = useState(data.timeNeeded);
  const [isUrgent, setIsUrgent] = useState(data.isUrgent);
  const [duration, setDuration] = useState(data.duration);
  const [durationModalVisible, setDurationModalVisible] = useState(false);

  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [error, setError] = useState(null);

  // Calendar state
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const handleContinue = () => {
    if (!dateNeeded.trim()) {
      setError('Date is required.');
      return;
    }
    update({ dateNeeded: dateNeeded.trim(), timeNeeded: timeNeeded.trim(), isUrgent, duration });
    router.push('/post-create/step6');
  };

  const monthsBack = (current) =>
    new Date(current.getFullYear(), current.getMonth() - 1, 1);

  const monthsForward = (current) =>
    new Date(current.getFullYear(), current.getMonth() + 1, 1);

  const changeMonth = (dir) => {
    const base = new Date(viewYear, viewMonth, 1);
    const next = dir < 0 ? monthsBack(base) : monthsForward(base);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const buildCalendarCells = () => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d));
    }
    return cells;
  };

  const parseDateNeeded = () => {
    const m = (data.dateNeeded || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  };

  const selectDate = (date) => {
    setDateNeeded(formatDate(date));
    setDateModalVisible(false);
    setError(null);
  };

  // Initialise the calendar view to the currently selected date (or today)
  const openDateModal = () => {
    const d = parseDateNeeded() || todayAtMidnight();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setDateModalVisible(true);
  };

  const today = todayAtMidnight();
  const cells = buildCalendarCells();
  const selectedDate = parseDateNeeded();

  const isSameDay = (a, b) =>
    !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isToday = (d) => isSameDay(d, today);
  const isSelected = (d) => isSameDay(d, selectedDate);

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
        <Text style={styles.stepLabel}>5 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>When is it needed?</Text>
        <Text style={styles.subtitle}>Set the date, time and duration</Text>

        <Text style={styles.label}>
          Date <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.inputWrapper, error && styles.inputError]}
          onPress={openDateModal}
          activeOpacity={0.8}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={dateNeeded ? '#4f46e5' : '#9ca3af'}
            style={styles.inputIcon}
          />
          <Text style={[styles.selectText, !dateNeeded && styles.placeholderText]}>
            {dateNeeded || 'Select a date'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={[styles.label, { marginTop: 18 }]}>Preferred Time</Text>
        <TouchableOpacity
          style={styles.inputWrapper}
          onPress={() => setTimeModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={timeNeeded ? '#4f46e5' : '#9ca3af'}
            style={styles.inputIcon}
          />
          <Text style={[styles.selectText, !timeNeeded && styles.placeholderText]}>
            {timeNeeded || 'Select preferred time'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.urgentToggle}
          onPress={() => setIsUrgent(!isUrgent)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, isUrgent && styles.checkboxActive]}>
            {isUrgent && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Ionicons name="flash-outline" size={18} color={isUrgent ? '#ef4444' : '#6b7280'} />
          <Text style={[styles.urgentLabel, isUrgent && styles.urgentLabelActive]}>
            Urgent
          </Text>
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 22 }]}>Estimated Duration</Text>
        <TouchableOpacity
          style={styles.inputWrapper}
          onPress={() => setDurationModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="hourglass-outline"
            size={18}
            color={duration ? '#4f46e5' : '#9ca3af'}
            style={styles.inputIcon}
          />
          <Text style={[styles.selectText, !duration && styles.placeholderText]}>
            {duration || 'Select estimated duration'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>

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
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Date Picker Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={dateModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Date</Text>
                <Text style={styles.modalSubtitle}>When do you need this done?</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDateModalVisible(false)}>
                <Ionicons name="close" size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {/* Month navigator */}
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={20} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={20} color="#4f46e5" />
              </TouchableOpacity>
            </View>

            {/* Weekday header */}
            <View style={styles.weekRow}>
              {DAY_NAMES.map((d, i) => (
                <Text key={i} style={styles.weekDay}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
              {cells.map((d, i) => {
                if (!d) return <View key={i} style={styles.dayCell} />;
                const past = d < today;
                const sel = isSelected(d);
                const tday = isToday(d);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayCell, sel && styles.dayCellSelected]}
                    onPress={() => selectDate(d)}
                    disabled={past}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        sel && styles.dayTextSelected,
                        tday && !sel && styles.dayTextToday,
                        past && styles.dayTextPast,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                if (selectedDate) selectDate(selectedDate);
                else setDateModalVisible(false);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Time Picker Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={timeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Preferred Time</Text>
                <Text style={styles.modalSubtitle}>Pick a convenient time slot</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setTimeModalVisible(false)}>
                <Ionicons name="close" size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TIME_SLOTS}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              numColumns={3}
              contentContainerStyle={styles.timeGrid}
              columnWrapperStyle={styles.timeRow}
              renderItem={({ item }) => {
                const isSelected = item === timeNeeded;
                const isFlexible = item === 'Flexible / Anytime';
                return (
                  <TouchableOpacity
                    style={[
                      styles.timeSlot,
                      isSelected && styles.timeSlotSelected,
                      isFlexible && styles.timeSlotFlexible,
                    ]}
                    onPress={() => {
                      setTimeNeeded(item);
                      setTimeModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isFlexible ? 'infinite-outline' : 'time-outline'}
                      size={14}
                      color={isSelected ? '#fff' : '#6b7280'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.timeSlotText,
                        isSelected && styles.timeSlotTextSelected,
                        isFlexible && styles.timeSlotTextFlexible,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Duration Picker Modal ──────────────────────────────────────────── */}
      <Modal
        visible={durationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDurationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Estimated Duration</Text>
                <Text style={styles.modalSubtitle}>How long will this take?</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDurationModalVisible(false)}>
                <Ionicons name="close" size={22} color="#4b5563" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DURATION_OPTIONS}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item === duration;
                return (
                  <TouchableOpacity
                    style={[styles.locationItem, isSelected && styles.locationItemSelected]}
                    onPress={() => {
                      setDuration(item);
                      setDurationModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={isSelected ? '#4f46e5' : '#9ca3af'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.locationText, isSelected && styles.locationTextSelected]}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
  required: { color: '#ef4444' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 2, borderColor: '#e5e7eb',
    paddingHorizontal: 14, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  inputError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 10 },
  selectText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e1b4b' },
  placeholderText: { fontWeight: '400', color: '#9ca3af' },
  errorText: { fontSize: 12.5, color: '#ef4444', marginTop: 5, fontWeight: '500' },
  urgentToggle: {
    flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  urgentLabel: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  urgentLabelActive: { color: '#ef4444' },
  continueBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 32 },
  continueBtnGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 17, gap: 8,
  },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e1b4b' },
  modalSubtitle: { fontSize: 12.5, color: '#6b7280', marginTop: 2 },
  closeBtn: { padding: 6, backgroundColor: '#f3f4f6', borderRadius: 20 },
  locationItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  locationItemSelected: { backgroundColor: '#f5f3ff' },
  locationText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#374151' },
  locationTextSelected: { fontWeight: '700', color: '#4f46e5' },

  // ── Date picker ────────────────────────────────────────────────────────
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f1f0ff', alignItems: 'center', justifyContent: 'center',
  },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#1e1b4b' },
  weekRow: {
    flexDirection: 'row', paddingHorizontal: 16, marginBottom: 6,
  },
  weekDay: {
    width: `${100 / 7}%`, textAlign: 'center',
    fontSize: 13, fontWeight: '700', color: '#9ca3af',
  },
  calendarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: '#4f46e5', borderRadius: 24,
  },
  dayText: {
    fontSize: 15, fontWeight: '600', color: '#1e1b4b',
  },
  dayTextSelected: { color: '#ffffff', fontWeight: '700' },
  dayTextToday: { color: '#4f46e5', fontWeight: '800' },
  dayTextPast: { color: '#d1d5db' },
  doneBtn: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: '#4f46e5', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },

  // ── Time picker ───────────────────────────────────────────────────────
  timeGrid: { paddingHorizontal: 16, paddingVertical: 16 },
  timeRow: { gap: 8, marginBottom: 8 },
  timeSlot: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6,
  },
  timeSlotSelected: {
    backgroundColor: '#4f46e5', borderColor: '#4f46e5',
  },
  timeSlotFlexible: { borderStyle: 'dashed', borderColor: '#c7d2fe' },
  timeSlotText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  timeSlotTextSelected: { color: '#ffffff' },
  timeSlotTextFlexible: { color: '#4f46e5' },
});
