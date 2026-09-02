import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { env } from "../utils/env.js";

const handleClerkWebhook = async (req, res) => {
    // ── Guard: secret must be present ────────────────────────────────────────
    if (!env.CLERK_WEBHOOK_SECRET) {
        console.error("[webhook] CLERK_WEBHOOK_SECRET is not set – aborting");
        return res.status(500).json({ error: "Server misconfiguration: missing webhook secret" });
    }

    // ── Guard: Vercel auto-parses JSON bodies before our handler runs. ────────
    // If req.body is already an object (not a Buffer) the raw bytes are gone
    // and svix verification will always fail.  We must reject early so the
    // problem is obvious in logs rather than a silent 400.
    if (!Buffer.isBuffer(req.body)) {
        console.error(
            "[webhook] req.body is not a raw Buffer – it is:",
            typeof req.body,
            ". This usually means a JSON body-parser ran before express.raw(). " +
            "On Vercel, set bodyParser:false in vercel.json or move the route outside Express."
        );
        return res.status(500).json({ error: "Server misconfiguration: raw body unavailable" });
    }

    // ── Svix signature verification ───────────────────────────────────────────
    // Svix 2 verifies the supplied payload but intentionally does not parse
    // or return it. Keep the raw Buffer for verification, then parse the
    // exact same bytes only after the signature has been accepted.
    const webhook = new Webhook(env.CLERK_WEBHOOK_SECRET);
    let evt;
    try {
        webhook.verify(req.body, {
            "svix-id":        req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"],
        });
        evt = JSON.parse(req.body.toString("utf8"));
    } catch (err) {
        console.error("[webhook] Verification or payload parsing failed:", err.message);
        return res.status(400).json({ error: "Webhook verification failed" });
    }

    const eventType = evt.type;
    console.log(`[webhook] Received event: ${eventType}`);

    try {
        switch (eventType) {
            case "user.created": {
                const {
                    id: clerkId,
                    email_addresses,
                    first_name,
                    last_name,
                    image_url,
                    phone_numbers,
                } = evt.data;

                const email = email_addresses?.[0]?.email_address ?? null;
                const phone = phone_numbers?.[0]?.phone_number ?? null;

                console.log(`[webhook] user.created – clerkId=${clerkId} email=${email}`);

                // onConflictDoNothing makes the insert idempotent.
                // Svix retries failed deliveries, so we may receive the same
                // event more than once; a duplicate insert must not throw.
                await db
                    .insert(users)
                    .values({
                        id: clerkId,
                        clerkId,
                        email,
                        firstName: first_name ?? null,
                        lastName:  last_name  ?? null,
                        imageUrl:  image_url  ?? null,
                        phone,
                    })
                    .onConflictDoNothing();

                console.log(`[webhook] user.created – inserted clerkId=${clerkId}`);
                break;
            }

            case "user.updated": {
                const {
                    id: clerkId,
                    email_addresses,
                    first_name,
                    last_name,
                    image_url,
                    phone_numbers,
                } = evt.data;

                const email = email_addresses?.[0]?.email_address ?? null;
                const phone = phone_numbers?.[0]?.phone_number ?? null;

                console.log(`[webhook] user.updated – clerkId=${clerkId}`);

                await db
                    .update(users)
                    .set({
                        email,
                        firstName: first_name ?? null,
                        lastName:  last_name  ?? null,
                        imageUrl:  image_url  ?? null,
                        phone,
                        updatedAt: new Date(),
                    })
                    .where(eq(users.clerkId, clerkId));

                console.log(`[webhook] user.updated – done clerkId=${clerkId}`);
                break;
            }

            case "user.deleted": {
                // Clerk marks deleted users with a `deleted: true` flag.
                // The `id` field may be absent on soft-delete events; use the
                // top-level id as a fallback.
                const clerkId = evt.data.id;

                if (!clerkId) {
                    console.warn("[webhook] user.deleted – no clerkId in payload, skipping");
                    break;
                }

                console.log(`[webhook] user.deleted – clerkId=${clerkId}`);
                await db.delete(users).where(eq(users.clerkId, clerkId));
                console.log(`[webhook] user.deleted – done clerkId=${clerkId}`);
                break;
            }

            default:
                console.log(`[webhook] Unhandled event type: ${eventType}`);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("[webhook] Error processing event:", eventType, error);
        // Return 500 so Svix retries delivery
        return res.status(500).json({ error: "Internal server error" });
    }
};

export { handleClerkWebhook };
