import "../global.css";
import { Stack } from "expo-router";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error(
    "Add your Clerk Publishable Key to the .env file"
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <Stack>
        <Stack.Screen name="index"     options={{ headerShown: false }} />
        <Stack.Screen name="gateway"   options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="setup"     options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"    options={{ headerShown: false }} />
        <Stack.Screen name="post-create" options={{ headerShown: false }} />
        <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
      </Stack>
    </ClerkProvider>
  );
}
