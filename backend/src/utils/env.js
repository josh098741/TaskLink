import dotenv from "dotenv"
dotenv.config({ quiet: true })

export const env = {
    PORT: process.env.PORT || 5000,
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL,
}