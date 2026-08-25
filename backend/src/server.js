import express from "express"
import { env } from "./utils/env.js"

const app = express()






const start = async () => {
    try{
        app.listen(env.PORT, () => {
            console.log(`Server is running on port: ${env.PORT}`)
        })
    }catch(error){
        console.log("Error in starting the server: ",  error)
    }
}

start()