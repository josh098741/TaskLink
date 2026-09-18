import "../global.css";
import "../config/deeplink"; // boot-time deep-link capture (side effect)
import { Stack } from "expo-router";
import * as Splash from "expo-splash-screen";
import { AuthProvider } from "../contexts/AuthContext";

// Keep the native splash up until auth is ready, so there is never a blank
// white frame or a loader between launch and the "Verifying your profile"
// screen. It is hidden in the root index once auth has loaded.
Splash.preventAutoHideAsync();

export default function RootLayout() {
    return (
        <AuthProvider>
            <Stack>
                <Stack.Screen name="index"     options={{ headerShown: false }} />
                <Stack.Screen name="gateway"   options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="setup"     options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
                <Stack.Screen name="(auth)"    options={{ headerShown: false }} />
                <Stack.Screen name="post-create" options={{ headerShown: false }} />
                <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="post-edit/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="results" options={{ headerShown: false }} />
                <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
            </Stack>
        </AuthProvider>
    );
}