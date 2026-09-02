import express from "express"
import { env } from "./utils/env.js"

const app = express()




app.get("/api/health", (req,res) => {
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