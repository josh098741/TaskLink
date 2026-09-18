import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View, StyleSheet, Alert, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLinkingURL } from "expo-linking";
import { useAuth } from "../contexts/AuthContext";
import { parseGoogleReturnUrl, googleAuthState } from "../config/googleAuth";

/**
 * Post-Google-OAuth landing screen (sign in / sign up).
 *
 * Sources for the Google `id_token`, in order:
 *   1. Native (standalone/ESAS build) flow → stashed in googleAuthState
 *   2. Query params from the browser redirect (expo-router)
 *   3. Raw linking URL — Google's implicit flow delivers `#id_token=...` as a
 *      URL fragment, which expo-router does NOT parse; useLinkingURL() exposes
 *      the raw URL so we can read the fragment ourselves.
 *
 * The token is DERIVED during render (no state dance to keep it in sync with
 * the linking URL). A hard timeout is always armed so this screen can never
 * sit on a spinner forever: whatever happens, the user gets a clear message
 * within a few seconds.
 */

const MAX_WAIT_MS = 8000;

export default function SSOCallback() {
  const { signInWithGoogle, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const linkingUrl = useLinkingURL();

  // Claim the in-memory token from the native flow exactly once (during the
  // initializer — no re-runs, no renders).
  const [pendingToken] = useState(() => {
    const pending = googleAuthState.pendingIdToken;
    googleAuthState.pendingIdToken = null;
    return pending || null;
  });

  // Derive the token/error each render from every available source.
  const linked = linkingUrl ? parseGoogleReturnUrl(linkingUrl) : null;
  const idToken =
    searchParams.id_token ??
    searchParams.idToken ??
    pendingToken ??
    linked?.idToken ??
    null;
  const googleError = searchParams.error ?? linked?.error ?? null;

  const finished = useRef(false);
  const exchanged = useRef(false);

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

  // Debug aid: surface exactly what came back from the redirect flow.
  useEffect(() => {
    console.log(
      "[sso-callback] params:", JSON.stringify(searchParams),
      "linkingUrl:", linkingUrl
    );
  }, [linkingUrl, searchParams]);

  // ─── Exchange the token for TaskLink JWTs and route ─────────────────────
  useEffect(() => {
    if (!isLoaded || exchanged.current) return;

    if (googleError) {
      finish(false, `Google returned an error: ${googleError}`);
      return;
    }
    if (!idToken) return;

    exchanged.current = true;
    (async () => {
      try {
        await signInWithGoogle(idToken);
        finished.current = true;
        router.replace("/gateway");
      } catch (err) {
        finish(
          false,
          (err?.message || "Could not sign in with Google.").replace(/^Error:\s*/, "")
        );
      }
    })();
  }, [isLoaded, idToken, googleError, finish, signInWithGoogle, router]);

  // ─── Hard bail-out: never allow an infinite spinner ─────────────────────
  useEffect(() => {
    if (!isLoaded || idToken || googleError) return;
    const timer = setTimeout(
      () => finish(false, "Google didn't send an identity token back to the app."),
      MAX_WAIT_MS
    );
    return () => clearTimeout(timer);
  }, [isLoaded, idToken, googleError, finish]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text style={styles.label}>Finishing sign-in…</Text>
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
  label: {
    marginTop: 14,
    fontSize: 13.5,
    color: "rgba(20, 20, 28, 0.6)",
    fontWeight: "500",
  },
});