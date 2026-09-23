import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchAppointment,
  fetchChatMessages,
  markChatRead,
  sendChatMessage,
} from '../../config/api';
import { socketManager } from '../../config/socket';

const PAGE_BG = '#f7f7fb';
const INDIGO = '#4f46e5';
const INK = '#1e1b4b';

const CONNECTION_LABELS = {
  live: 'Live',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  off: 'Offline',
};

function avatarFor(person, size) {
  if (person?.imageUrl) {
    return <Image source={{ uri: person.imageUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const initial = ((person?.firstName?.[0] ?? '') + (person?.lastName?.[0] ?? '')).toUpperCase() || '?';
  return (
    <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarLetter, { fontSize: size * 0.38 }]}>{initial}</Text>
    </View>
  );
}

function formatDayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * buildRows — inserts day-separator markers between messages on different days
 * so the flat list renders clean thread grouping while remaining inverted.
 */
function buildRows(messages) {
  const rows = [];
  let lastDay = null;
  for (const message of messages) {
    const day = formatDayLabel(message.createdAt);
    if (day !== lastDay) {
      rows.push({ type: 'day', id: `day-${message.createdAt}`, label: day });
      lastDay = day;
    }
    rows.push({ type: 'message', ...message });
  }
  return rows;
}

export default function ChatScreen() {
  const { appointmentId } = useLocalSearchParams();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [appointment, setAppointment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState(null);
  const [olderAvailable, setOlderAvailable] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [connection, setConnection] = useState('connecting');

  const listRef = useRef(null);
  const typingThrottle = useRef(0);
  const typingClear = useRef(null);

  const isMine = useCallback((senderId) => senderId === user?.id, [user?.id]);

  const meId = user?.id;
  const other = useMemo(() => {
    if (!appointment || !meId) return null;
    return appointment.providerId === meId ? appointment.client : appointment.provider;
  }, [appointment, meId]);

  const roomKey = appointmentId ? String(appointmentId) : null;

  // ── Socket connection + subscription ─────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    socketManager.connect(token);
    const unsubscribeStatus = socketManager.onStatus(setConnection);
    return () => {
      unsubscribeStatus();
      // The socket is shared app-wide — never close it from one screen.
    };
  }, [token]);

  useEffect(() => {
    if (!roomKey || !token) return;
    const unsubscribe = socketManager.subscribe(roomKey, (frame) => {
      if (frame?.type === 'message:new' && frame.message) {
        const incoming = frame.message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          // Replace the optimistic placeholder for /our/ own sent message.
          if (incoming.senderId === meId) {
            const idx = prev.findIndex((m) => String(m.id).startsWith('local_'));
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = incoming;
              return next;
            }
          }
          return [...prev, incoming];
        });
        if (incoming.senderId !== meId) {
          socketManager.markRead(roomKey);
          markChatRead(roomKey, token).catch(() => {});
        }
      }
      if (frame?.type === 'message:read' && frame.by !== meId) {
        const readAt = new Date().toISOString();
        setMessages((prev) =>
          prev.map((m) => (m.senderId === meId ? { ...m, readAt } : m))
        );
      }
      if (frame?.type === 'typing' && frame.by !== meId) {
        setOtherTyping(true);
        if (typingClear.current) clearTimeout(typingClear.current);
        typingClear.current = setTimeout(() => setOtherTyping(false), 3200);
      }
    });
    return () => {
      unsubscribe();
      if (typingClear.current) clearTimeout(typingClear.current);
    };
  }, [roomKey, token, meId]);

  // ── Initial load: appointment meta + first message page ──────────────────
  const loadInitial = useCallback(async () => {
    if (!roomKey || !token) return;
    setLoading(true);
    setError(null);
    try {
      const [appt, page] = await Promise.all([
        fetchAppointment(roomKey, token),
        fetchChatMessages(roomKey, {}, token),
      ]);
      if (appt) setAppointment(appt);
      setMessages(page.messages ?? []);
      setOlderAvailable(page.olderAvailable);
      // Opening the thread marks it read.
      socketManager.markRead(roomKey);
      markChatRead(roomKey, token).catch(() => {});
    } catch (err) {
      console.warn('[chat] load failed:', err.message);
      setError(err.message || 'Failed to load conversation.');
    } finally {
      setLoading(false);
    }
  }, [roomKey, token]);

  useEffect(() => {
    if (!roomKey || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const [appt, page] = await Promise.all([
          fetchAppointment(roomKey, token),
          fetchChatMessages(roomKey, {}, token),
        ]);
        if (cancelled) return;
        if (appt) setAppointment(appt);
        setMessages(page.messages ?? []);
        setOlderAvailable(page.olderAvailable);
        // Opening the thread marks it read.
        socketManager.markRead(roomKey);
        markChatRead(roomKey, token).catch(() => {});
      } catch (err) {
        if (cancelled) return;
        console.warn('[chat] load failed:', err.message);
        setError(err.message || 'Failed to load conversation.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomKey, token]);

  // ── Load older messages (inverted list "top" pagination) ─────────────────
  const loadOlder = useCallback(async () => {
    if (!olderAvailable || loadingOlder || messages.length === 0 || !token) return;
    setLoadingOlder(true);
    try {
      const page = await fetchChatMessages(
        roomKey,
        { before: messages[0].createdAt },
        token
      );
      setMessages((prev) => [...page.messages, ...prev]);
      setOlderAvailable(page.olderAvailable);
    } catch (err) {
      console.warn('[chat] load older failed:', err.message);
    } finally {
      setLoadingOlder(false);
    }
  }, [olderAvailable, loadingOlder, messages, token, roomKey]);

  // ── Typing indicator (throttled) ─────────────────────────────────────────
  const onChangeInput = useCallback(
    (text) => {
      setInput(text);
      const now = Date.now();
      if (roomKey && now - typingThrottle.current > 1200) {
        typingThrottle.current = now;
        socketManager.sendTyping(roomKey);
      }
    },
    [roomKey]
  );

  // ── Send ─────────────────────────────────────────────────────────────────
  const onSend = useCallback(async () => {
    const body = input.trim();
    if (!body || !roomKey || !token) return;
    setInput('');
    setSending(true);

    const temp = {
      id: `local_${Date.now()}`,
      appointmentId: roomKey,
      senderId: meId,
      body,
      createdAt: new Date().toISOString(),
      pending: true,
      deliveredAt: null,
      readAt: null,
    };
    setMessages((prev) => [...prev, temp]);

    try {
      const stored = await sendChatMessage(roomKey, body, token);
      setMessages((prev) =>
        prev.map((m) => (String(m.id) === temp.id ? { ...m, id: stored.id, pending: false } : m))
      );
    } catch (err) {
      console.warn('[chat] send failed:', err.message);
      // Roll back the optimistic row and restore the text so nothing is lost.
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setInput((current) => (current ? current : body));
      alert(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }, [input, roomKey, token, meId]);

  const rows = useMemo(() => buildRows(messages), [messages]);

  const renderRow = useCallback(
    ({ item }) => {
      if (item.type === 'day') {
        return (
          <View style={styles.dayRow}>
            <View style={styles.dayLine} />
            <Text style={styles.dayLabel}>{item.label}</Text>
            <View style={styles.dayLine} />
          </View>
        );
      }

      const mine = isMine(item.senderId);
      const showTicks = mine && !item.pending;
      const read = !!item.readAt;
      const delivered = !!item.deliveredAt;

      return (
        <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaTime}>{formatTime(item.createdAt)}</Text>
            {showTicks ? (
              <Ionicons
                name={read ? 'checkmark-done' : delivered ? 'checkmark' : 'checkmark'}
                size={13}
                color={read ? '#2563eb' : '#a5b4fc'}
              />
            ) : null}
            {item.pending ? (
              <ActivityIndicator size={9} color="#a5b4fc" style={{ marginLeft: 4 }} />
            ) : null}
          </View>
        </View>
      );
    },
    [isMine]
  );

  // ── Render states ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={INDIGO} />
      </View>
    );
  }

  if (error && !appointment) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Ionicons name="chatbubble-ellipses-outline" size={40} color="#c7d2fe" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadInitial} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const otherName = other
    ? [other.firstName, other.lastName].filter(Boolean).join(' ') || 'Participant'
    : 'Participant';
  const serviceTitle = appointment?.service?.title ?? 'Booking';
  const connectionLabel = CONNECTION_LABELS[connection] || CONNECTION_LABELS.off;
  const connected = connection === 'live';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </TouchableOpacity>

        {avatarFor(other, 38)}

        <View style={styles.headerContent}>
          <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
          <Text style={styles.headerMeta} numberOfLines={1}>{serviceTitle}</Text>
        </View>

        <View style={[styles.connectionPill, { backgroundColor: connected ? '#ecfdf5' : '#fef3c7' }]}>
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: connected ? '#10b981' : '#f59e0b' },
            ]}
          />
          <Text
            style={[
              styles.connectionText,
              { color: connected ? '#059669' : '#b45309' },
            ]}
          >
            {connectionLabel}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item, index) => item.id ?? `${index}`}
          renderItem={renderRow}
          inverted
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.4}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !loading && !error ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color="#a5b4fc" />
                </View>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>
                  Say hello and agree the details for this booking.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingOlder ? (
              <View style={styles.loadingOlder}>
                <ActivityIndicator size="small" color={INDIGO} />
              </View>
            ) : null
          }
        />

        {otherTyping ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size={9} color={INDIGO} />
            <Text style={styles.typingText}>{otherName} is typing…</Text>
          </View>
        ) : null}

        {/* ── Input bar ────────────────────────────────────────────────── */}
        <View style={[styles.inputWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor="#9ca3af"
            value={input}
            onChangeText={onChangeInput}
            multiline
            maxLength={4000}
            onFocus={() => socketManager.sendTyping(roomKey)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={onSend}
            activeOpacity={0.85}
            disabled={!input.trim() || sending}
          >
            <Ionicons name="arrow-up" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  flex: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: PAGE_BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: { fontSize: 15, color: '#6b7280', marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: INDIGO,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef0f4',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: { flex: 1 },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: INK,
    letterSpacing: -0.2,
  },
  headerMeta: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginTop: 1 },
  avatarPlaceholder: {
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c7d2fe',
  },
  avatarLetter: { fontWeight: '800', color: INDIGO },
  connectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  connectionDot: { width: 7, height: 7, borderRadius: 4 },
  connectionText: { fontSize: 11, fontWeight: '700' },

  // List
  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, flexGrow: 1 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  dayLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dayLabel: { fontSize: 11, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 },

  bubbleRow: { marginBottom: 4, maxWidth: '82%' },
  bubbleRowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleRowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: INDIGO,
    borderBottomRightRadius: 5,
  },
  bubbleTheirs: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: '#e9e7f5',
  },
  bubbleText: { fontSize: 15, lineHeight: 21, color: INK },
  bubbleTextMine: { color: '#ffffff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2, paddingHorizontal: 4 },
  metaTime: { fontSize: 10, fontWeight: '600', color: '#9ca3af' },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    transform: [{ scaleY: -1 }],
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: INK, marginTop: 12 },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 230,
    lineHeight: 19,
    marginTop: 4,
  },

  loadingOlder: { alignItems: 'center', paddingVertical: 8, transform: [{ scaleY: -1 }] },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  typingText: { fontSize: 12, fontWeight: '600', color: '#6b7280', fontStyle: 'italic' },

  // Input bar
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#eef0f4',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: '#f1f0f8',
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 10,
    fontSize: 15,
    fontWeight: '500',
    color: INK,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: INDIGO,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: INDIGO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: '#c7d2fe' },
});