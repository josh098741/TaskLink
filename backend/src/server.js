import express from "express"
import cors from "cors"
import { env } from "./utils/env.js"
import webhookRouter from "./routers/webhookRouter.js"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/api/health", (req, res) => {
    res.status(200).json({ message: "Server is healthy", status: "Success" })
})

app.use(webhookRouter)

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
