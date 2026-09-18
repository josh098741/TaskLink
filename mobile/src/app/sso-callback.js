import { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, View, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLinkingURL } from "expo-linking";
import { useAuth } from "../contexts/AuthContext";
import { parseGoogleReturnUrl } from "../config/googleAuth";

/**
 * Post-Google-OAuth landing screen (sign in / sign up).
 *
 * The deep link / browser redirect arrives here carrying Google's `id_token`.
 * Google's implicit flow delivers it in the URL *fragment* (`#id_token=...`),
 * which expo-router's useLocalSearchParams does NOT parse (it only reads the
 * query string). We therefore read the raw linking URL via useLinkingURL() and
 * parse both query and fragment ourselves before posting the token to
 * POST /api/auth/google.
 */

const MAX_WAIT_MS = 5000;

export default function SSOCallback() {
  const { signInWithGoogle, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const linkingUrl = useLinkingURL();

  const finished = useRef(false);
  const startedAt = useRef(0);

  const finish = useCallback(
    (ok, message) => {
      if (finished.current) return;
      finished.current = true;
      if (ok) return;
      console.warn("[sso-callback] abort:", message);
      Alert.alert("Google sign-in failed", message, [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    },
    [router]
  );

  useEffect(() => {
    if (finished.current || !isLoaded) return;
    if (!startedAt.current) startedAt.current = Date.now();

    (async () => {
      // 1) query params handled by the router (query-delivered tokens)
      let idToken = searchParams.id_token ?? searchParams.idToken ?? null;
      let error = searchParams.error ?? null;

      // 2) fragment-delivered tokens appear only on the raw linking URL
      if (!idToken && !error && linkingUrl) {
        const parsed = parseGoogleReturnUrl(linkingUrl);
        if (parsed) {
          idToken = parsed.idToken;
          error = parsed.error;
        }
        console.log("[sso-callback] linking url:", linkingUrl);
      }

      if (error) {
        finish(false, `Google returned an error: ${error}`);
        return;
      }

      if (!idToken) {
        // Fragment may still be on its way — give the linking URL event a
        // chance to land before bailing.
        if (Date.now() - startedAt.current > MAX_WAIT_MS) {
          finish(false, "Did not receive an identity token from Google.");
        }
        return;
      }

      try {
        await signInWithGoogle(idToken);
        finished.current = true;
        router.replace("/gateway");
      } catch (err) {
        finish(false, (err?.message || "Could not sign in with Google.").replace(/^Error:\s*/, ""));
      }
    })();
  }, [isLoaded, linkingUrl, searchParams, signInWithGoogle, router, finish]);

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