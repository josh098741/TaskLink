import express from "express"
import http from "http"
import cors from "cors"
import { env } from "./utils/env.js"
import authRouter from "./routers/authRouter.js"
import userRouter from "./routers/userRouter.js"
import postRouter from "./routers/postRouter.js"
import searchRouter from "./routers/searchRouter.js"
import serviceRouter from "./routers/serviceRouter.js"
import chatRouter from "./routers/chatRouter.js"
import analyticsRouter from "./routers/analyticsRouter.js"
import { hub } from "./realtime/index.js"
import { attachWebSocket } from "./ws/server.js"
import { bootstrapAdmins } from "./utils/bootstrapAdmin.js"

const app = express()

app.use(cors())

// Public health check — registered BEFORE the routers so the auth
// middleware on userRouter / postRouter can never intercept it.
app.get("/api/health", (req, res) => {
    res.status(200).json({ message: "Server is healthy", status: "Success" })
})

// All routes get JSON body parsing.
// `limit` is raised (from 100kb default) so base64 photo uploads to
// Cloudinary are accepted.
app.use(express.json({ limit: "12mb" }))

// ── API routes ────────────────────────────────────────────────────────────────
// authRouter is mounted at /api/auth so its routes become
// /api/auth/register, /api/auth/login, etc. — matching the mobile client.
//
// Order matters: searchRouter (public: popular & suggest) and serviceRouter's
// public service-listing routes must be mounted BEFORE the routers that apply
// the `authenticate` middleware globally (userRouter, postRouter, chatRouter),
// otherwise every matching path — including the public ones — is 401'd.
// Idempotent: promotes ADMIN_EMAILS users to is_admin on startup. Fail-silent;
// never affects auth or sessions.
bootstrapAdmins()

app.use("/api/auth", authRouter)
app.use("/api", searchRouter)
app.use("/api", serviceRouter)
app.use("/api", userRouter)
app.use("/api", postRouter)
app.use("/api", chatRouter)
app.use("/api", analyticsRouter)

// The WebSocket endpoint upgrades live on the same HTTP server, so local
// `npm run dev` gets full realtime chat. When deploying source to Vercel the
// exported `app` below keeps the existing HTTP routing intact; Vercel's
// Fluid compute / WebSocket beta serves upgrades from the same Function into
// this Express app, and the Upstash bridge relays events across instances.
const server = http.createServer(app)
attachWebSocket(server, hub)

const start = async () => {
    try {
        server.listen(env.PORT, () => {
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