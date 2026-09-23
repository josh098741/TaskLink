/**
 * push.js
 * ───────
 * Delivers push notifications via the Expo push service
 * (https://exp.host/--/api/v2/push/send). The mobile app registers its Expo
 * push token with POST /api/user/push-token, stored on the users row as
 * `expoPushToken`.
 *
 * Pushing is strictly best-effort: failures are logged and swallowed so a
 * notification hiccup can never break a chat send.
 */

import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * sendPushToUser
 * Sends one push notification to a single user's registered device, if they
 * have a token and have chat notifications enabled.
 *
 * @param {string} userId - Recipient.
 * @param {{ title:string, body:string, data?:object }} payload
 * @returns {Promise<boolean>} Whether a push was dispatched.
 */
export async function sendPushToUser(userId, payload) {
  try {
    const [user] = await db
      .select({
        id: users.id,
        expoPushToken: users.expoPushToken,
        bidNotifications: users.bidNotifications,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.expoPushToken) return false;
    // Respect the user's "Bids & Messages" preference toggle.
    if (user.bidNotifications === false) return false;

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          to: user.expoPushToken,
          title: payload.title ?? "TaskLink",
          body: payload.body ?? "",
          data: payload.data ?? {},
          sound: "default",
          channelId: "chat",
        },
      ]),
    });
    if (!response.ok) {
      console.warn(`[push] Expo returned ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[push] send failed:", error.message);
    return false;
  }
}

/**
 * sendPushToTokens
 * Batch push — useful if we later broadcast (e.g. "new matching job" alerts).
 */
export async function sendPushToTokens(tokens, payload) {
  const valid = tokens.filter(Boolean);
  if (valid.length === 0) return 0;
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        valid.map((to) => ({
          to,
          title: payload.title ?? "TaskLink",
          body: payload.body ?? "",
          data: payload.data ?? {},
          sound: "default",
          channelId: "chat",
        }))
      ),
    });
    if (!response.ok) console.warn(`[push] Expo returned ${response.status}`);
    return valid.length;
  } catch (error) {
    console.warn("[push] batch send failed:", error.message);
    return 0;
  }
}