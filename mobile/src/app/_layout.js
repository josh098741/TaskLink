import "../global.css";
import "../config/deeplink"; // boot-time deep-link capture (side effect)
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as Splash from "expo-splash-screen";
import { StatusBar } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import {
    setupPushNotifications,
    attachPushListeners,
} from "../config/notifications";
import ActivityBridge from "../components/ActivityBridge";

Splash.preventAutoHideAsync();

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

function AppStatusBar() {
    const { isDark, colors } = useTheme();
    return (
        <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor={colors.background}
        />
    );
}

function ThemedStack() {
    const { colors } = useTheme();
    return (
        <Stack
            screenOptions={{
                contentStyle: { backgroundColor: colors.background },
            }}
        >
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
            <Stack.Screen name="admin/analytics" options={{ headerShown: false }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppStatusBar />
                <PushBridge />
                <ActivityBridge />
                <ThemedStack />
            </AuthProvider>
        </ThemeProvider>
    );
}
