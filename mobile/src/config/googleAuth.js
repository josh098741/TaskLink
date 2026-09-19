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
// build time); fall back to the legacy EXPO_PUBLIC env var. In a native build
// an EMPTY web client id makes GoogleSignin.configure() request an id_token
// for an invalid audience → DEVELOPER_ERROR (10) right after the account
// picker closes. We therefore never want these to silently end up empty:
// beginNativeOAuth() asserts CLIENT_ID is present before configuring.
const CLIENT_ID =
  Constants.expoConfig?.extra?.googleClientId ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  "";

// The Android OAuth client id (optional in configure()). Passing it explicitly
// removes any client-resolution ambiguity on Android.
const ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.googleAndroidClientId || "";

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
/**
 * In-memory breadcrumb trail for the native flow. Since the affected builds
 * can't reach a Metro console, the trail is folded into every thrown error's
 * `.detail` so ONE popup screenshot shows the exact step where the flow died
 * and what the SDK reported — no adb, no developer options.
 */
const flowTrail = [];
function trail(step, data) {
  const stamp = new Date().toISOString().slice(11, 23);
  let entry = `${stamp} ${step}`;
  if (data !== undefined) {
    let json;
    try {
      json = JSON.stringify(data);
    } catch {
      json = String(data);
    }
    entry += ` ${json}`;
  }
  flowTrail.push(entry);
  console.log("[auth-google]", entry);
}
function trailText() {
  return flowTrail.join("\n") || "(empty)";
}
function attachTrail(e) {
  let detail = `→ trail:\n${trailText()}`;
  try {
    Object.defineProperty(e, "detail", { value: detail, enumerable: true, configurable: true });
  } catch {
    e.detail = detail;
  }
  return e;
}

/**
 * Build a fully-diagnosable error for a thrown native Google Sign-In failure.
 *
 * The thrown `Error` carries:
 *   • `.message` — a friendly, actionable headline.
 *   • `.detail`  — the resolved runtime config + the raw native error payload
 *                  (code / message / userInfo / stack) + the step-by-step
 *                  trail, shown in the alert so the exact cause can be read
 *                  off the screen without adb.
 */
function describeNativeSignInError(err) {
  // The native Android SDK rejects with `code` as a STRING (e.g. "10") —
  // normalize before comparing so both numeric and string payloads work.
  const code = String(err?.code ?? "").trim();
  const raw = `${code} ${String(err?.message ?? "")}`;

  let headline;
  if (["12501", "12503"].includes(code) || /SIGN_IN_CANCELLED|cancel/i.test(raw)) {
    headline = "Google sign-in was cancelled.";
  } else if (
    ["10", "12500", "12516"].includes(code) ||
    /(^|\s)(10|12500|12516)(\s|$)/.test(raw) ||
    /DEVELOPER_ERROR|INTERNAL_ERROR/i.test(raw)
  ) {
    headline =
      "Google sign-in configuration error (10/12500). This usually means the " +
      "Android signing fingerprint (SHA-1) of THIS build is not registered on " +
      "the Android OAuth client in Google Cloud Console. Add the keystore SHA-1 " +
      "of the build's signing key (App signing key for Play installs; EAS " +
      "keystore for sideloaded APKs) under API & Services -> Credentials, then " +
      "rebuild.";
  } else if (code === "7" || /network|timed out|timeout/i.test(raw)) {
    headline = "Google sign-in failed due to a network error. Please try again.";
  } else {
    headline = `Google sign-in failed${raw.trim() ? ` (${raw.trim()})` : ""}. Please try again.`;
  }

  // Raw native error payload.
  let payload;
  try {
    payload = JSON.stringify(
      {
        code: err?.code ?? null,
        name: err?.name ?? null,
        message: err?.message ?? null,
        userInfo: err?.userInfo ?? null,
        stack: err?.stack ?? null,
      },
      null,
      2
    );
  } catch {
    payload = String(err);
  }

  // Runtime state that explains the failure class (client resolution incl.).
  const runtime = JSON.stringify({
    platform: Platform.OS,
    executionEnvironment: Constants.executionEnvironment,
    nativeModuleLinked: nativeGoogleSignIn,
    sdkVersion: Constants.expoConfig?.sdkVersion ?? "?",
    androidPackage:
      Constants.expoConfig?.android?.package ??
      Constants.expoConfig?.extra?.android?.package ??
      "?",
    clientId: CLIENT_ID || "(missing)",
    androidClientId: ANDROID_CLIENT_ID || "(none)",
  });

  const e = new Error(headline);
  e.detail =
    `Config: ${runtime}\nNative error: ${payload}\n→ trail:\n${trailText()}`.slice(
      0,
      4500
    );
  return e;
}

async function beginNativeOAuth() {
  trail("begin", {
    platform: Platform.OS,
    executionEnvironment: Constants.executionEnvironment,
    nativeModuleLinked: nativeGoogleSignIn,
    androidPackage: Constants.expoConfig?.android?.package ?? "?",
    clientId: CLIENT_ID || "(missing)",
    androidClientId: ANDROID_CLIENT_ID || "(none)",
  });

  // iOS requires a reversed-client-ID URL scheme in the app (added by
  // withGoogleSignInConfig only when extra.googleIOSClientId is set). Without
  // an iOS OAuth client the native SDK fails with a cryptic error — surface
  // the missing config instead.
  if (Platform.OS === "ios" && !Constants.expoConfig?.extra?.googleIOSClientId) {
    throw attachTrail(
      new Error(
        "Google sign-in is not configured for iOS yet. Create an iOS OAuth " +
          "client in Google Cloud Console and set extra.googleIOSClientId in " +
          "app.json (reversed client ID)."
      )
    );
  }

  // The SDK is only available in standalone EAS / release builds.
  const { GoogleSignin } = require("@react-native-google-signin/google-signin");

  // Fail fast instead of letting the SDK open the picker and then die with
  // DEVELOPER_ERROR (10) on account selection. A missing client id here means
  // this build was produced from a config without extra.googleClientId.
  if (!CLIENT_ID) {
    throw attachTrail(
      new Error(
        "This build has no Google client ID baked in (extra.googleClientId is " +
          "missing from app.json). Rebuild with the current config — the app " +
          "cannot start Google sign-in without it."
      )
    );
  }

  trail("configure", {
    webClientId: CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID || null,
    offlineAccess: false,
  });
  GoogleSignin.configure({
    webClientId: CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID || undefined,
    offlineAccess: false,
    scopes: SCOPES.split(" "),
  });

  if (Platform.OS === "android") {
    trail("playServices:check");
    try {
      const ps = await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      trail("playServices:ok", { result: ps ?? "(undefined/OK)" });
    } catch (psErr) {
      trail("playServices:error", {
        code: String(psErr?.code ?? ""),
        message: String(psErr?.message ?? ""),
      });
      throw attachTrail(
        new Error(
          String(psErr?.message ?? "Google Play Services are required for sign-in.")
        )
      );
    }
  }

  trail("picker:open");
  let raw;
  try {
    // iOS: { type: 'success', data: { idToken, ... } }
    // Android: { type: 'success', data: { idToken, ... } }
    raw = await GoogleSignin.signIn();
  } catch (err) {
    // Probe: a token refresh tells us whether the failure is token-request-
    // specific (audience/fingerprint at the token endpoint) rather than purely
    // account-selection-specific.
    let probe = null;
    try {
      await GoogleSignin.getTokens();
      probe = "ok";
    } catch (probeErr) {
      probe = {
        code: String(probeErr?.code ?? ""),
        message: String(probeErr?.message ?? ""),
      };
    }
    trail("picker:error", { probe });
    throw describeNativeSignInError(err);
  }
  if (raw?.type === "cancel" || raw?.type === "dismiss") {
    trail("picker:done", { type: raw.type });
    throw attachTrail(new Error("Google sign-in was cancelled."));
  }
  const user = raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
  const idToken = user?.idToken;
  trail("picker:done", {
    type: raw?.type ?? "?",
    hasData: Boolean(user),
    hasIdToken: Boolean(idToken),
    email: user?.email ?? null,
  });

  if (!idToken) {
    throw attachTrail(new Error("Could not obtain a Google ID token."));
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