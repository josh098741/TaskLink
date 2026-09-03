import express from "express"
import cors from "cors"
import { env } from "./utils/env.js"
import webhookRouter from "./routers/webhookRouter.js"
import userRouter from "./routers/userRouter.js"
import postRouter from "./routers/postRouter.js"

const app = express()

app.use(cors())

// ⚠️ Webhook routes MUST come before express.json() so the raw body is
// preserved for Svix signature verification. express.raw() is applied
// per-route inside webhookRouter.
app.use(webhookRouter)

// All other routes get JSON body parsing.
// `limit` is raised (from 100kb default) so base64 photo uploads to
// Cloudinary are accepted.
app.use(express.json({ limit: "12mb" }))

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", userRouter)
app.use("/api", postRouter)

app.get("/api/health", (req, res) => {
    res.status(200).json({ message: "Server is healthy", status: "Success" })
})

const start = async () => {
    try {
        app.listen(env.PORT, () => {
            console.log(`Server is running on port: ${env.PORT}`)
        })
    } catch (error) {
        console.log("Error in starting the server: ", error)
    }
}

if (process.env.VERCEL !== '1') {
    start()
}

export default app
