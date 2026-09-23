/**
 * notifications.js
 * ────────────────
 * Expo push notification registration + tap routing.
 *
 * Flow:
 *   1. request notification permission
 *   2. obtain the device Expo push token
 *   3. register it with the backend (PATCH /api/user/push-token)
 *   4. attach listeners so that:
 *        • foreground  → show the notification banner (setNotificationHandler)
 *        • tap        → navigate straight into the appointment's chat thread
 *
 * The backend sends chat pushes with data = { type: "chat", appointmentId }.
 *
 * IMPORTANT: expo-notifications must NOT be statically imported. On Android,
 * importing the module throws inside Expo Go (remote push was removed in
 * SDK 53), which would crash the whole app bundle at startup. It is therefore
 * loaded lazily via require() inside a try/catch; on Expo Go the import fails,
 * we log once, and push is gracefully disabled — the in-app socket channel
 * still delivers live messages.
 */

import { Platform } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { registerPushToken } from './api';

let notificationsModule = null;
let loadAttempted = false;

/**
 * isExpoGo
 * True when the running app is hosted inside Expo Go (vs a development or
 * production build). Expo Go removed remote-push support in SDK 53 and
 * expo-notifications aborts its module load there, so we must never even
 * require it in that environment.
 */
function isExpoGo() {
  try {
    if (Constants.executionEnvironment === 'storeClient') return true;
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
}

/**
 * loadNotifications
 * Lazily requires expo-notifications exactly once. Returns null when the
 * platform has no push support (web), the app is running in Expo Go, or the
 * module cannot be loaded.
 */
function loadNotifications() {
  if (Platform.OS === 'web') return null;
  if (loadAttempted) return notificationsModule;
  loadAttempted = true;

  if (isExpoGo()) {
    console.warn('[push] disabled in Expo Go — build with a development build for push notifications.');
    return null;
  }

  try {
    notificationsModule = require('expo-notifications');
    if (notificationsModule) {
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: true,
        }),
      });
    }
  } catch (err) {
    console.warn('[push] expo-notifications unavailable:', err?.message);
    notificationsModule = null;
  }
  return notificationsModule;
}

/**
 * setupPushNotifications
 * Ensures permissions are granted, fetches the Expo push token, and
 * registers it with the backend. Safe to call on every app start — it is a
 * no-op after the first successful registration (same token re-registered
 * is harmless). Returns null when push is unavailable.
 *
 * @param {string} token - access JWT
 * @returns {Promise<string|null>} The Expo push token, or null on failure.
 */
export async function setupPushNotifications(token) {
  const Notifications = loadNotifications();
  if (!Notifications || !token) return null;
  try {
    // 1. Permission
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') {
      console.warn('[push] permission not granted');
      return null;
    }

    // 2. Android needs a channel for remote push
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('chat', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#4f46e5',
      });
    }

    const result = await Notifications.getExpoPushTokenAsync();
    const pushToken = typeof result?.data === 'string' ? result.data : result;

    // 3. Register with backend
    if (pushToken) {
      await registerPushToken(pushToken, token);
      console.log('[push] registered');
    }
    return pushToken ?? null;
  } catch (err) {
    console.warn('[push] setup failed:', err?.message);
    return null;
  }
}

/**
 * attachPushListeners
 * Registers foreground + tap-response listeners. Returns a cleanup function.
 *
 * Tapping a chat notification navigates to that appointment's chat thread.
 *
 * @param {object} options - { onReceived?: (notification) => void }
 * @returns {() => void} unsubscribe
 */
export function attachPushListeners(options = {}) {
  const Notifications = loadNotifications();
  if (!Notifications) return () => {};

  const subscriptions = [];

  subscriptions.push(
    Notifications.addNotificationReceivedListener((notification) => {
      try {
        options.onReceived?.(notification);
      } catch (err) {
        console.warn('[push] onReceived error:', err?.message);
      }
    })
  );

  subscriptions.push(
    Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response?.notification?.request?.content?.data;
        if (data?.type === 'chat' && data?.appointmentId) {
          router.push({
            pathname: '/chat/[appointmentId]',
            params: { appointmentId: String(data.appointmentId) },
          });
        }
      } catch (err) {
        console.warn('[push] tap routing error:', err?.message);
      }
    })
  );

  return () => {
    for (const sub of subscriptions) {
      try {
        sub.remove();
      } catch {
        /* noop */
      }
    }
  };
}