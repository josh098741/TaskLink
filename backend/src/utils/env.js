import dotenv from "dotenv"
dotenv.config({ quiet: true })

export const env = {
    PORT: process.env.PORT || 5000,
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL,
    // Custom auth (replaces Clerk)
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    // Google OAuth — audiences the backend will accept when verifying idTokens
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_ANDROID_CLIENT_ID: process.env.GOOGLE_ANDROID_CLIENT_ID,
    // Cloudinary
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
}