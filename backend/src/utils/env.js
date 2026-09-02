import dotenv from "dotenv"
dotenv.config({ quiet: true })

export const env = {
    PORT: process.env.PORT || 5000,
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
}