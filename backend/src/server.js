import express from "express"
import cors from "cors"
import { env } from "./utils/env.js"
import authRouter from "./routers/authRouter.js"
import userRouter from "./routers/userRouter.js"
import postRouter from "./routers/postRouter.js"
import searchRouter from "./routers/searchRouter.js"
import serviceRouter from "./routers/serviceRouter.js"

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
app.use("/api/auth", authRouter)
app.use("/api", userRouter)
app.use("/api", postRouter)
app.use("/api", searchRouter)
app.use("/api", serviceRouter)

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