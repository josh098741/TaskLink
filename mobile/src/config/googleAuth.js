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
 *   • Native builds (EAS) – same proxy flow; it deep links back via the
 *                app's registered `tasklink://` scheme.
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

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const SCOPES = "openid profile email";
const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

// Fallback project full name; kept in sync with app.json (owner + slug).
const PROJECT_FULL_NAME = "@josh001/tasklink";

/** The auth.expo.io proxy URL — Google's redirect target on mobile. */
export const GOOGLE_PROXY_URL = `https://auth.expo.io/${
  Constants.expoConfig?.originalFullName || PROJECT_FULL_NAME
}`;

export function isGoogleConfigured() {
  return Boolean(GOOGLE_CLIENT_ID);
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
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: SCOPES,
    nonce: randHex(),
    state: randHex(),
    prompt: "select_account",
  })}`;
}

/**
 * Open the Google sign-in browser flow. The result lands back on the
 * /sso-callback route (deep link on mobile, page redirect on web), which is
 * responsible for reading the idToken and handing it to the backend.
 *
 * @throws if Google config is missing or the flow fails to open.
 */
export async function beginGoogleOAuth() {
  if (!isGoogleConfigured()) {
    throw new Error("Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID in mobile/.env");
  }

  if (Platform.OS === "web") {
    const returnUrl = `${window.location.origin}/sso-callback`;
    const url = buildAuthUrl(returnUrl);
    window.location.assign(url);
    return;
  }

  // Google redirects to the proxy; the proxy relays the result back into the
  // app by navigating the browser to `returnUrl` (the app's deep link).
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