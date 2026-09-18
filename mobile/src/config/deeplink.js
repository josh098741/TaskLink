/**
 * deeplink.js
 * ───────────
 * Boot-time deep-link capture.
 *
 * Problem: hooks like `useLinkingURL()` only reflect a linking URL if the
 * native `url` event fires *after* the hook's screen mounts. On a warm Expo
 * Go session the event almost always fires BEFORE the target screen mounts
 * (exp-router must receive the link, then navigate, then render) — so the
 * fragment carrying the Google `id_token` (`exp://...#id_token=...`) is lost.
 *
 * Solution: subscribe at module load (imported by the root layout, evaluated
 * before any deep link can arrive) and remember the raw URL in a plain
 * module-level variable. Any screen can then read it synchronously.
 *
 * The whole URL is preserved — including the `#fragment` — so callers can
 * parse query AND fragment params from it.
 */

import * as Linking from "expo-linking";
import { Platform } from "react-native";

let lastLinkingUrl = null;

export function getLastLinkingUrl() {
  return lastLinkingUrl;
}

if (Platform.OS !== "web") {
  Linking.getInitialURL()
    .then((url) => {
      if (url) lastLinkingUrl = String(url);
    })
    .catch(() => {});

  Linking.addEventListener("url", (event) => {
    if (event?.url) lastLinkingUrl = String(event.url);
  });
}