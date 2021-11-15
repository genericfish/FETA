"use strict"

global.__basedir = __dirname

const express = require("express")
const path = require("path")

const app = express()
const port = process.env.PORT || 8000
const router = require(path.join(__basedir, "routes", "router.js"))

app
    .set("trust proxy", 1)
    // Serve CSS/JS as static files
    .use(express.static(path.join(__dirname, "public")))
    .use("/", router)
    .listen(port, _ => {
        console.log(`Listening at http://localhost:${port}`)
    })
