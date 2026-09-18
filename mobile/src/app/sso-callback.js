import { useEffect, useRef } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useAuth } from "../contexts/AuthContext";
import { parseGoogleReturnUrl } from "../config/googleAuth";

/**
 * Post-Google-OAuth landing screen (sign in / sign up).
 *
 * The browser / deep link arrives here holding Google's `id_token`. The
 * token is posted to POST /api/auth/google, which verifies it server-side
 * and returns the normal TaskLink JWT pair. From there we route through the
 * gateway, which sends first-time users through onboarding before the tabs.
 */
export default function SSOCallback() {
  const { signInWithGoogle, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !isLoaded) return;
    started.current = true;

    (async () => {
      try {
        let parsed = {
          idToken:
            searchParams.id_token ?? searchParams.idToken ?? null,
          error: searchParams.error ?? null,
        };

        // Fallback: the deep link may not have surfaced params to the router
        // (e.g. fragment-delivered tokens). Read the raw URL as a backup.
        if (!parsed.idToken && !parsed.error) {
          const initial = await Linking.getInitialURL();
          if (initial) {
            const fromUrl = parseGoogleReturnUrl(initial);
            if (fromUrl) parsed = fromUrl;
          }
        }

        if (parsed.error || !parsed.idToken) {
          router.replace("/");
          return;
        }

        await signInWithGoogle(parsed.idToken);
        router.replace("/gateway");
      } catch (err) {
        console.warn("[sso-callback] google sign-in failed:", err?.message);
        router.replace("/");
      }
    })();
  }, [isLoaded, searchParams, signInWithGoogle, router]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
});