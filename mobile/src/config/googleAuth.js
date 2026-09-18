/**
 * googleAuth.js
 * ─────────────
 * Hand-rolled Google OAuth (OpenID "id_token" flow) that replaces Clerk's
 * Google SSO. It works without compiling the app:
 *
 *   • Expo Go  – routed through the legacy auth.expo.io proxy, which deep
 *                links the result back into the dev session (deprecated and
 *                cookie-dependent; a timeout guard prevents endless hangs).
 *   • Web      – full-page browser redirect to Google, back to /sso-callback.
 *   • Any EAS build (dev client, preview, production) – native Google
 *                Sign-In SDK via @react-native-google-signin/google-signin,
 *                which shows a native account picker with no browser URLs.
 *
 * The flow is chosen by whether the `RNGoogleSignin` native module is linked
 * into the running app — not by guessing the environment.
 *
 * The OAuth redirect URI registered on the Google "Web" client must be:
 *   https://auth.expo.io/@josh001/tasklink
 *
 * A Google ID token alone is never trusted client-side — it is posted to
 * POST /api/auth/google, where the backend verifies signature/issuer/audience
 * before minting TaskLink JWTs.
 */

import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import { Platform, TurboModuleRegistry } from "react-native";

// Keeps the web browser session wired up so the auth popup/redirect surface
// resolves (required on web; harmless on native).
WebBrowser.maybeCompleteAuthSession();

// Client IDs — prefer the app.json extra block (available at both bundle and
// build time); fall back to the legacy EXPO_PUBLIC env var.
const CLIENT_ID =
  Constants.expoConfig?.extra?.googleClientId ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  "";

const SCOPES = "openid profile email";
const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

// Fallback project full name; kept in sync with app.json (owner + slug).
const PROJECT_FULL_NAME = "@josh001/tasklink";

/** The auth.expo.io proxy URL — Google's redirect target on mobile. */
export const GOOGLE_PROXY_URL = `https://auth.expo.io/${
  Constants.expoConfig?.originalFullName || PROJECT_FULL_NAME
}`;

// ─── Environment detection ─────────────────────────────────────────────────
/**
 * True when the native Google Sign-In module is actually linked into the app.
 * Detected by presence of the `RNGoogleSignin` TurboModule rather than by
 * guessing the runtime environment:
 *
 *   • Expo Go            → no module → proxy flow
 *   • expo-dev-client    → module linked → native flow
 *   • standalone / prod  → module linked → native flow
 *
 * Note we must NOT rely on `Constants.executionEnvironment`: expo-dev-client
 * builds report `'storeClient'` just like Expo Go, yet they DO have the native
 * module — checking the module directly is unambiguous.
 */
export const nativeGoogleSignIn =
  Platform.OS !== "web" && TurboModuleRegistry.get("RNGoogleSignin") != null;

// Expo Go / bare layering shim for interface parity; kept for callers that
// only care about "the browser proxy is in use".
export const isExpoGo = !nativeGoogleSignIn && Platform.OS !== "web";
export const isStandalone = nativeGoogleSignIn;

// ─── Pending native token holder ──────────────────────────────────────────
// On standalone builds the native SDK resolves with the token directly in JS.
// Rather than round-tripping it through a deep link we stash it here and
// sso-callback picks it up.
export const googleAuthState = { pendingIdToken: null };

export function isGoogleConfigured() {
  return Boolean(CLIENT_ID);
}

function readParam(str, key) {
  if (!str) return null;
  for (const pair of str.split("&")) {
    if (!pair.includes("=")) continue;
    const [k, ...rest] = pair.split("=");
    if (k === key) {
      const raw = rest.join("=");
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

/**
 * Parse `id_token` / `state` / `error` out of an OAuth return URL. Google's
 * implicit flow puts the payload in the URL fragment; the proxy may relay it
 * as a query string instead — this reads both.
 */
export function parseGoogleReturnUrl(url) {
  if (!url) return null;
  const hash = url.split("#")[1] || "";
  const query = url.split("?")[1] ? url.split("?")[1].split("#")[0] : "";
  return {
    idToken: readParam(hash, "id_token") || readParam(query, "id_token") || null,
    state: readParam(hash, "state") || readParam(query, "state") || null,
    error: readParam(hash, "error") || readParam(query, "error") || null,
  };
}

function randHex() {
  try {
    const uuid = Crypto.randomUUID();
    if (uuid) return uuid.replace(/-/g, ""); // 128 bits of hex
  } catch {
    /* fall through to the Math.random fallback */
  }
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

function toQuery(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

/** Build the Google authorization URL for an implicit id_token response. */
function buildAuthUrl(redirectUri) {
  return `${AUTHORIZATION_ENDPOINT}?${toQuery({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: SCOPES,
    nonce: randHex(),
    state: randHex(),
    prompt: "select_account",
  })}`;
}

// ─── Proxy flow (Expo Go, no native module) ───────────────────────────────

// auth.expo.io is deprecated and relies on cookies to remember the return
// URL; browsers blocking cross-site tracking often leave the flow hanging
// forever. Cap the wait so the UI can always recover with a real error.
const PROXY_FLOW_TIMEOUT_MS = 90000;

async function beginProxyOAuth() {
  const returnUrl = Linking.createURL("/sso-callback");
  const authUrl = buildAuthUrl(GOOGLE_PROXY_URL);
  const startUrl = `${GOOGLE_PROXY_URL}/start?${toQuery({ authUrl, returnUrl })}`;

  let result;
  try {
    result = await Promise.race([
      WebBrowser.openAuthSessionAsync(startUrl, returnUrl),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Google sign-in timed out. Please try again.")),
          PROXY_FLOW_TIMEOUT_MS
        )
      ),
    ]);
  } catch {
    throw new Error(
      "The Google sign-in flow timed out. This can happen in Expo Go because " +
        "the auth.expo.io proxy is deprecated — please retry, or use an EAS " +
        "development build for reliable Google sign-in."
    );
  }

  // Closing the browser (iOS `cancel`/`dismiss`, Android back button →
  // `cancel`) is the normal path when the deprecated proxy shows its
  // "couldn't finish signing in" error page — treat it as a user cancel,
  // never a confusing spinner.
  if (result.type === "cancel" || result.type === "dismiss" || result.type === "locked") {
    throw new Error("Google sign-in was cancelled.");
  }
  if (result.type === "error") {
    throw new Error(
      "The Google sign-in service failed to complete. This is a known " +
        "problem with the deprecated auth.expo.io proxy — please retry, or " +
        "use an EAS development build (native flow) to avoid it entirely."
    );
  }
  // `opened` / `success` are fine — the deep link into /sso-callback finishes
  // the job in either case.
}

// ─── Native flow (standalone builds) ─────────────────────────────────────

/**
 * Translate a thrown native Google Sign-In SDK error into a user-facing
 * message. The fatal, commonly-hit codes get actionable text so a bad
 * release build fails loudly instead of confusing users:
 *
 *   • 10 DEVELOPER_ERROR / 12500 INTERNAL_ERROR — almost always a signing
 *     fingerprint (SHA-1) mismatch on the Android OAuth client.
 *   • 7 NETWORK_ERROR — transient connectivity problem.
 *   • 12502 SIGN_IN_IN_PROGRESS — a flow is already running; retry.
 */
function describeNativeSignInError(err) {
  const code = err?.code;
  const raw = String(code ?? err?.message ?? "");

  if (/cancel/i.test(raw)) {
    return "Google sign-in was cancelled.";
  }
  if (code === 10 || code === 12500 || /DEVELOPER_ERROR|INTERNAL_ERROR/i.test(raw)) {
    return (
      "Google sign-in configuration error (10/12500). This usually means the " +
      "Android signing fingerprint (SHA-1) of THIS build is not registered on " +
      "the Android OAuth client in Google Cloud Console. Add the keystore SHA-1 " +
      "(eas credentials → Android credentials) under API & Services → " +
      "Credentials, then rebuild."
    );
  }
  if (code === 7 || /network|timed out|timeout/i.test(raw)) {
    return "Google sign-in failed due to a network error. Please try again.";
  }
  const detail = raw ? ` (${raw})` : "";
  return `Google sign-in failed${detail}. Please try again.`;
}

async function beginNativeOAuth() {
  // iOS requires a reversed-client-ID URL scheme in the app (added by
  // withGoogleSignInConfig only when extra.googleIOSClientId is set). Without
  // an iOS OAuth client the native SDK fails with a cryptic error — surface
  // the missing config instead.
  if (Platform.OS === "ios" && !Constants.expoConfig?.extra?.googleIOSClientId) {
    throw new Error(
      "Google sign-in is not configured for iOS yet. Create an iOS OAuth " +
        "client in Google Cloud Console and set extra.googleIOSClientId in " +
        "app.json (reversed client ID)."
    );
  }

  // The SDK is only available in standalone EAS / release builds.
  const { GoogleSignin } = require("@react-native-google-signin/google-signin");

  GoogleSignin.configure({
    webClientId: CLIENT_ID,
    offlineAccess: false,
    scopes: SCOPES.split(" "),
  });

  if (Platform.OS === "android") {
    const playServicesOK = await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    }).catch(() => null);
    if (playServicesOK === false) {
      throw new Error("Google Play Services are required for sign-in.");
    }
  }

  let raw;
  try {
    // iOS: { type: 'success', data: { idToken, ... } }
    // Android: { type: 'success', data: { idToken, ... } }
    raw = await GoogleSignin.signIn();
  } catch (err) {
    throw new Error(describeNativeSignInError(err));
  }
  if (raw?.type === "cancel") {
    throw new Error("Google sign-in was cancelled.");
  }
  const user = raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
  const idToken = user?.idToken;

  if (!idToken) {
    throw new Error("Could not obtain a Google ID token.");
  }

  // Stash and let sso-callback handle backend exchange + routing so all auth
  // bookkeeping stays in one place.
  googleAuthState.pendingIdToken = idToken;

  const { router } = require("expo-router");
  router.replace("/sso-callback");
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Open the Google sign-in browser/native flow.
 *
 *   • Expo Go  → auth.expo.io proxy (browser redirect, deep-links back)
 *   • Web      → full-page redirect
 *   • Standalone → native Google account picker (no browser URL screens)
 *
 * The result lands back on the /sso-callback route, which posts the token to
 * the backend and redirects into the app.
 *
 * @throws if Google config is missing or the flow fails to open.
 */
export async function beginGoogleOAuth() {
  if (!isGoogleConfigured()) {
    throw new Error("Missing Google client ID in app.json extra");
  }

  if (Platform.OS === "web") {
    const returnUrl = `${window.location.origin}/sso-callback`;
    const url = buildAuthUrl(returnUrl);
    window.location.assign(url);
    return;
  }

  if (nativeGoogleSignIn) {
    return beginNativeOAuth();
  }

  // If this is a native build (NOT Expo Go) but the native module isn't
  // linked, the proxy flow is unusable and sign-in would fail silently.
  // Ask for a rebuild rather than letting auth break in a shipped app.
  if (Constants.executionEnvironment === "standalone") {
    throw new Error(
      "This build has no native Google Sign-In SDK linked. Rebuild it with " +
        "`eas build --profile development` after `npx expo install " +
        "@react-native-google-signin/google-signin`."
    );
  }

  return beginProxyOAuth();
}