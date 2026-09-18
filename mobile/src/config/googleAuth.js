/**
 * googleAuth.js
 * ─────────────
 * Hand-rolled Google OAuth (OpenID "id_token" flow) that replaces Clerk's
 * Google SSO. It works without compiling the app:
 *
 *   • Expo Go  – routed through the legacy auth.expo.io proxy, which deep
 *                links the result back into the dev session (exactly how
 *                Clerk behaved in Expo Go).
 *   • Web      – full-page browser redirect to Google, back to /sso-callback.
 *   • Standalone builds (EAS) – native Google Sign-In SDK via
 *                @react-native-google-signin/google-signin, which shows a
 *                native account picker with no browser URL screens.
 *
 * The environment is detected via `Constants.executionEnvironment`:
 *   'storeClient' = Expo Go  → proxy flow
 *   'standalone'   = any EAS / release build → native SDK
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
import { Platform } from "react-native";

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
const executionEnv =
  Constants.executionEnvironment /** @type {string} */ || "storeClient";

/**
 * True when running inside Expo Go / expo-dev-client (no compiled native
 * module). In this environment we must fall back to the browser proxy.
 */
export const isExpoGo = executionEnv === "storeClient";

/**
 * True inside any EAS / standalone build (both dev client and production).
 * The native Google Sign-In SDK is available here.
 */
export const isStandalone = executionEnv === "standalone";

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

// ─── Proxy flow (Expo Go / web) ───────────────────────────────────────────

async function beginProxyOAuth() {
  const returnUrl = Linking.createURL("/sso-callback");
  const authUrl = buildAuthUrl(GOOGLE_PROXY_URL);
  const startUrl = `${GOOGLE_PROXY_URL}/start?${toQuery({ authUrl, returnUrl })}`;

  const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);

  if (result.type === "cancel") {
    throw new Error("Google sign-in was cancelled.");
  }
  if (result.type === "error") {
    throw new Error("Google sign-in could not be completed.");
  }
  // `opened` / `success` are fine — the deep link into /sso-callback finishes
  // the job in either case.
}

// ─── Native flow (standalone builds) ─────────────────────────────────────

async function beginNativeOAuth() {
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

  // iOS: { type: 'success', data: { idToken, ... } }
  // Android: { type: 'success', data: { idToken, ... } }
  const raw = await GoogleSignin.signIn();
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

  if (isStandalone) {
    return beginNativeOAuth();
  }

  // Expo Go / dev-client (native module unavailable) → proxy flow.
  return beginProxyOAuth();
}