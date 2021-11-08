"use strict"

global.__basedir = __dirname

const path = require("path")
const express = require("express")
const { Database, User } = require(path.join(__basedir, "database", "firestore.js"))

const db = new Database()
const app = express()
const port = 8000

// Serve CSS/JS as static files
app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req, res) => {
    res.send("hi.")
})

app.listen(port, _ => {
    console.log(`Listening at http://localhost:${port}`)
})
