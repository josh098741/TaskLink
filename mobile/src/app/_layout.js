import "../global.css";
import "../config/deeplink"; // boot-time deep-link capture (side effect)
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as Splash from "expo-splash-screen";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import {
    setupPushNotifications,
    attachPushListeners,
} from "../config/notifications";

// Keep the native splash up until auth is ready, so there is never a blank
// white frame or a loader between launch and the "Verifying your profile"
// screen. It is hidden in the root index once auth has loaded.
Splash.preventAutoHideAsync();

/**
 * PushBridge
 * Once authenticated, registers the device's Expo push token with the
 * backend and attaches the notification listeners (foreground banner +
 * tap-to-open-chat routing). Rendered inside AuthProvider.
 */
function PushBridge() {
    const { token } = useAuth();

    useEffect(() => {
        if (!token) return;
        setupPushNotifications(token);
        const detach = attachPushListeners();
        return detach;
    }, [token]);

    return null;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <PushBridge />
            <Stack>
                <Stack.Screen name="index"     options={{ headerShown: false }} />
                <Stack.Screen name="gateway"   options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="setup"     options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
                <Stack.Screen name="(auth)"    options={{ headerShown: false }} />
                <Stack.Screen name="post-create" options={{ headerShown: false }} />
                <Stack.Screen name="service-create" options={{ headerShown: false }} />
                <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="service/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="post-edit/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="results" options={{ headerShown: false }} />
                <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
                <Stack.Screen name="messages/index" options={{ headerShown: false }} />
                <Stack.Screen name="chat/[appointmentId]" options={{ headerShown: false }} />
            </Stack>
        </AuthProvider>
    );
}