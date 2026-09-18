import "../global.css";
import { Stack } from "expo-router";
import * as Splash from "expo-splash-screen";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { AuthProvider } from "../contexts/AuthContext";

// Keep the native splash up until auth is ready, so there is never a blank
// white frame or a loader between launch and the "Verifying your profile"
// screen. It is hidden in the root index once auth has loaded.
Splash.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
    throw new Error(
        "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. " +
        "Add your Clerk Publishable Key to mobile/.env"
    );
}

// Clerk is kept solely for Google SSO (sign-in / sign-up buttons). All
// email/password auth runs through AuthProvider below.
export default function RootLayout() {
    return (
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
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
        </ClerkProvider>
    );
}