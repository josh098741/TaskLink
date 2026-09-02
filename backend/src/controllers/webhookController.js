import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { env } from "../utils/env.js";

const handleClerkWebhook = async (req, res) => {
    const webhook = new Webhook(env.CLERK_WEBHOOK_SECRET);

    let evt;
    try {
        const payloadString = req.body.toString();
        const svixHeaders = {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"],
        };
        evt = webhook.verify(payloadString, svixHeaders);
    } catch (err) {
        console.error("Webhook verification failed:", err.message);
        return res.status(400).json({ error: "Webhook verification failed" });
    }

    const { id } = evt.data;
    const eventType = evt.type;

    try {
        switch (eventType) {
            case "user.created": {
                const { id: clerkId, email_addresses, first_name, last_name, image_url, phone_numbers } = evt.data;
                const email = email_addresses?.[0]?.email_address || null;
                const phone = phone_numbers?.[0]?.phone_number || null;

                await db.insert(users).values({
                    id: clerkId,
                    clerkId,
                    email,
                    firstName: first_name || null,
                    lastName: last_name || null,
                    imageUrl: image_url || null,
                    phone,
                });

                console.log(`User created: ${clerkId}`);
                break;
            }

            case "user.updated": {
                const { id: clerkId, email_addresses, first_name, last_name, image_url, phone_numbers } = evt.data;
                const email = email_addresses?.[0]?.email_address || null;
                const phone = phone_numbers?.[0]?.phone_number || null;

                await db
                    .update(users)
                    .set({
                        email,
                        firstName: first_name || null,
                        lastName: last_name || null,
                        imageUrl: image_url || null,
                        phone,
                        updatedAt: new Date(),
                    })
                    .where(eq(users.clerkId, clerkId));

                console.log(`User updated: ${clerkId}`);
                break;
            }

            case "user.deleted": {
                const { id: clerkId } = evt.data;

                await db.delete(users).where(eq(users.clerkId, clerkId));

                console.log(`User deleted: ${clerkId}`);
                break;
            }

            default:
                console.log(`Unhandled event type: ${eventType}`);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export { handleClerkWebhook };
