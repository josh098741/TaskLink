import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchChatMessages,
  markChatRead,
  sendChatMessage,
} from '../config/api';
import { socketManager } from '../config/socket';

const TYPING_TIMEOUT_MS = 3200;
const TYPING_THROTTLE_MS = 1200;
const MESSAGE_LIMIT = 50;

/**
 * ChatPanel
 * ─────────
 * An embedded, WhatsApp-style conversation container.
 *
 * Styling uses daisyUI component classes (`chat`, `chat-start`, `chat-end`,
 * `chat-bubble`, `chat-header`, `chat-footer`, `input`, `btn`) compiled by
 * NativeWind, so the bubbles alternate exactly like WhatsApp: your own
 * messages hug the right in the outgoing colour, theirs hug the left.
 *
 * Delivery:
 *   • The shared `socketManager` WebSocket carries inbound messages, read
 *     receipts and typing indicators.
 *   • Sends go over REST (`sendChatMessage`) so an optimistic row can be
 *     reconciled with the stored message id, which also works if the socket is
 *     reconnecting.
 *
 * Unlike the full-screen chat route this renders inline (inside a service page),
 * so it is height-bounded and never owns the screen chrome.
 */

function formatTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function personName(person) {
  if (!person) return 'Conversation';
  const first = person.firstName ?? '';
  const last = person.lastName ?? '';
  return [first, last].filter(Boolean).join(' ').trim() || 'Conversation';
}

export default function ChatPanel({
  appointment,
  other,
  maxHeight = 460,
  title,
  subtitle,
}) {
  const { token, user } = useAuth();
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const appointmentId = appointment?.id ? String(appointment.id) : null;
  const meId = user?.id ?? null;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [olderAvailable, setOlderAvailable] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [connection, setConnection] = useState('idle');

  const listRef = useRef(null);
  const typingThrottle = useRef(0);
  const typingClear = useRef(null);

  // ── Loading ────────────────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const page = await fetchChatMessages(appointmentId, { limit: MESSAGE_LIMIT }, token);
      setMessages(page.messages ?? []);
      setOlderAvailable(Boolean(page.olderAvailable));
      // Opening a thread counts as reading it.
      socketManager.markRead(appointmentId);
      markChatRead(appointmentId, token).catch(() => {});
    } catch (err) {
      console.warn('[chat-panel] load failed:', err);
      setLoadError(err.message || 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId, token]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        return loadInitial();
      });
    return () => {
      cancelled = true;
    };
  }, [loadInitial]);

  // ── Realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return undefined;
    socketManager.connect(token);
    const unsubscribeStatus = socketManager.onStatus(setConnection);
    // The socket is shared app-wide, so never disconnect it from here.
    return () => {
      unsubscribeStatus();
    };
  }, [token]);

  useEffect(() => {
    if (!appointmentId) return undefined;

    const unsubscribe = socketManager.subscribe(appointmentId, (frame) => {
      if (frame?.type === 'message:new' && frame.message) {
        const incoming = frame.message;

        setMessages((prev) => {
          const withoutDuplicate = prev.filter((m) => String(m.id) !== String(incoming.id));
          // Our own message echoed back: swap it for the stored version.
          const replaced = withoutDuplicate.map((m) =>
            String(m.id).startsWith('local_') && m.senderId === incoming.senderId && m.body === incoming.body
              ? { ...incoming }
              : m
          );
          if (replaced.some((m) => String(m.id) === String(incoming.id))) {
            return replaced;
          }
          return [...replaced, { ...incoming }];
        });

        if (incoming.senderId !== meId) {
          socketManager.markRead(appointmentId);
          markChatRead(appointmentId, token).catch(() => {});
        }
      }

      if (frame?.type === 'message:read' && frame.by !== meId) {
        const readAt = new Date().toISOString();
        setMessages((prev) =>
          prev.map((m) => (m.senderId === meId && !m.readAt ? { ...m, readAt } : m))
        );
      }

      if (frame?.type === 'typing' && frame.by !== meId) {
        setOtherTyping(true);
        if (typingClear.current) clearTimeout(typingClear.current);
        typingClear.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT_MS);
      }
    });

    return () => {
      unsubscribe();
      if (typingClear.current) clearTimeout(typingClear.current);
    };
  }, [appointmentId, token, meId]);

  // ── Typing indicator (outgoing) ────────────────────────────────────────────
  const signalTyping = useCallback(() => {
    if (!appointmentId) return;
    const now = Date.now();
    if (now - typingThrottle.current < TYPING_THROTTLE_MS) return;
    typingThrottle.current = now;
    socketManager.sendTyping(appointmentId);
  }, [appointmentId]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const loadOlder = useCallback(async () => {
    if (!appointmentId || loadingOlder || !olderAvailable || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const page = await fetchChatMessages(
        appointmentId,
        { before: messages[0].createdAt, limit: MESSAGE_LIMIT },
        token
      );
      setMessages((prev) => [...(page.messages ?? []), ...prev]);
      setOlderAvailable(Boolean(page.olderAvailable));
    } catch (err) {
      console.warn('[chat-panel] pagination failed:', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [appointmentId, loadingOlder, olderAvailable, messages, token]);

  // ── Sending ────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const body = input.trim();
    if (!body || sending || !appointmentId) return;

    const temp = {
      id: `local_${Date.now()}`,
      appointmentId,
      senderId: meId,
      body,
      createdAt: new Date().toISOString(),
      pending: true,
      failed: false,
      deliveredAt: null,
      readAt: null,
    };

    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, temp]);

    try {
      const stored = await sendChatMessage(appointmentId, body, token);
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === temp.id
            ? { ...stored, pending: false, failed: false }
            : m
        )
      );
    } catch (err) {
      console.warn('[chat-panel] send failed:', err);
      setMessages((prev) =>
        prev.map((m) => (String(m.id) === temp.id ? { ...m, pending: false, failed: true } : m))
      );
      setInput(body);
      Alert.alert('Message not sent', err.message || 'Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }, [input, sending, appointmentId, meId, token]);

  const retryMessage = useCallback(
    (failed) => {
      setMessages((prev) => prev.filter((m) => String(m.id) !== String(failed.id)));
      setInput(failed.body);
    },
    []
  );

  // ── Rows ───────────────────────────────────────────────────────────────────
  // Interleave day separators into the message list.
  const rows = useMemo(() => {
    const result = [];
    let lastDay = null;
    for (const message of messages) {
      const label = dayLabel(message.createdAt);
      if (label && label !== lastDay) {
        result.push({ type: 'day', id: `day-${label}-${message.createdAt}`, label });
        lastDay = label;
      }
      result.push({ type: 'message', ...message });
    }
    return result;
  }, [messages]);

  const connectionTone =
    connection === 'live'
      ? { bg: isDark ? '#052e16' : '#dcfce7', fg: isDark ? '#86efac' : '#15803d', label: 'Live' }
      : connection === 'connecting' || connection === 'reconnecting'
      ? { bg: isDark ? '#422006' : '#fef3c7', fg: isDark ? '#fcd34d' : '#b45309', label: 'Connecting…' }
      : { bg: isDark ? '#1f2937' : '#f3f4f6', fg: isDark ? '#9ca3af' : '#6b7280', label: 'Offline' };

  const renderRow = useCallback(
    ({ item }) => {
      if (item.type === 'day') {
        return (
          <View className="my-3 flex-row items-center gap-2">
            <View className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
            <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {item.label}
            </Text>
            <View className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
          </View>
        );
      }

      const mine = item.senderId === meId;

      return (
        // daisyUI's chat/chat-start/chat-end gives the WhatsApp alternating
        // alignment; chat-bubble styles the bubble itself.
        <View className={`chat ${mine ? 'chat-end' : 'chat-start'}`}>
          {!mine && other?.imageUrl ? (
            <View className="chat-image">
              <Image
                source={{ uri: other.imageUrl }}
                className="h-8 w-8 rounded-full"
                resizeMode="cover"
              />
            </View>
          ) : null}

          <View
            className={`chat-header text-[11px] ${
              mine
                ? 'text-emerald-900/70 dark:text-emerald-50/70'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {mine ? 'You' : personName(other).split(' ')[0]}
          </View>

          <View
            className={`chat-bubble min-h-0 break-words px-3 py-2 text-sm shadow-sm ${
              mine
                ? 'bg-wa-bubbleOut text-slate-900'
                : 'bg-wa-bubbleIn text-slate-900 dark:bg-slate-700 dark:text-slate-50'
            } ${item.failed ? 'border border-error' : ''}`}
          >
            <Text className="text-[15px] leading-5">{item.body}</Text>
          </View>

          <View
            className={`chat-footer items-center gap-1 pt-0.5 text-[10px] ${
              mine ? 'text-emerald-900/60 dark:text-emerald-50/60' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Text>{formatTime(item.createdAt)}</Text>
            {mine ? (
              item.pending ? (
                <ActivityIndicator size={9} color="#9ca3af" />
              ) : item.failed ? (
                <Pressable onPress={() => retryMessage(item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="alert-circle" size={12} color="#ef4444" />
                </Pressable>
              ) : (
                <Ionicons
                  name={item.readAt ? 'checkmark-done' : 'checkmark'}
                  size={13}
                  color={item.readAt ? '#2563eb' : '#9ca3af'}
                />
              )
            ) : null}
          </View>
        </View>
      );
    },
    [meId, other, retryMessage]
  );

  if (!appointmentId) return null;

  const headerName = title ?? personName(other);
  const headerSub = subtitle ?? appointment.service?.title ?? 'Booking conversation';

  return (
    // daisyUI/Tailwind emit `dark:` variants as `.dark\:x:is(.dark *)`, so the
    // `dark` class has to be on this element or an ancestor. This app toggles
    // `darkMode: "class"`, so carry it here rather than depending on whatever
    // host screen renders the panel.
    <View
      className={`${isDark ? 'dark ' : ''}overflow-hidden rounded-2xl border border-slate-200 bg-base-100 dark:border-slate-700`}
    >
      {/* daisyUI chat-header: avatar + identity + live status */}
      <View className="flex-row items-center gap-3 border-b border-slate-200 bg-base-200 px-4 py-3 dark:border-slate-700">
        {other?.imageUrl ? (
          <Image
            source={{ uri: other.imageUrl }}
            className="h-10 w-10 rounded-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-neutral">
            <Text className="text-sm font-bold text-neutral-content">
              {personName(other).charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="flex-1">
          <Text className="text-[15px] font-bold text-base-content" numberOfLines={1}>
            {headerName}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
            {headerSub}
          </Text>
        </View>

        <View
          className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ backgroundColor: connectionTone.bg }}
        >
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: connectionTone.fg }}
          />
          <Text className="text-[11px] font-bold" style={{ color: connectionTone.fg }}>
            {connectionTone.label}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="grow bg-wa-light dark:bg-[#0b141a]"
        style={{ maxHeight }}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center py-10">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : loadError ? (
          <View className="flex-1 items-center justify-center gap-3 px-6 py-10">
            <Ionicons name="alert-circle-outline" size={30} color="#ef4444" />
            <Text className="text-center text-sm text-slate-500 dark:text-slate-400">
              {loadError}
            </Text>
            <Pressable className="btn btn-sm btn-primary" onPress={loadInitial}>
              <Text className="text-primary-content">Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderRow}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onEndReached={loadOlder}
            onEndReachedThreshold={0.4}
            ListHeaderComponent={
              loadingOlder ? (
                <ActivityIndicator size="small" color="#9ca3af" style={styles.loader} />
              ) : null
            }
            ListEmptyComponent={
              <View className="items-center gap-2 px-6 py-10">
                <Ionicons name="chatbubbles-outline" size={28} color="#c7d2fe" />
                <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No messages yet
                </Text>
                <Text className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Send a message to {personName(other).split(' ')[0]} about your booking.
                </Text>
              </View>
            }
          />
        )}

        {otherTyping ? (
          <View className="flex-row items-center gap-2 px-4 pb-1">
            <View className="flex-row gap-1 rounded-full bg-slate-200 px-3 py-2 dark:bg-slate-700">
              {[0, 150, 300].map((delay) => (
                <View
                  key={delay}
                  className="h-1.5 w-1.5 rounded-full bg-slate-400"
                  style={{ opacity: 0.9 }}
                />
              ))}
            </View>
            <Text className="text-[11px] italic text-slate-500 dark:text-slate-400">
              typing…
            </Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {/* daisyUI chat-footer + input: WhatsApp-style composer */}
      <View className="chat-footer border-t border-slate-200 bg-base-200 px-3 py-2.5 dark:border-slate-700">
        <View className="flex w-full items-end gap-2">
          <TextInput
            className="input input-bordered min-h-[2.75rem] flex-1 rounded-full border-slate-300 bg-base-100 text-sm dark:border-slate-600"
            style={{ maxHeight: 110 }}
            value={input}
            onChangeText={(text) => {
              setInput(text);
              signalTyping();
            }}
            onFocus={signalTyping}
            placeholder="Type a message…"
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={4000}
            editable={!loading && !loadError}
          />
          <Pressable
            className={`btn btn-circle btn-sm ${
              input.trim() && !sending ? 'btn-primary' : 'btn-disabled'
            }`}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="arrow-up" size={17} color="#ffffff" />
            )}
          </Pressable>
        </View>
        <View style={{ height: Math.max(insets.bottom, 0) }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 12, paddingVertical: 12, gap: 2 },
  loader: { paddingVertical: 8 },
});