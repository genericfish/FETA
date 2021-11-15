"use strict"

const express = require("express")
const path = require("path")
const router = express.Router()

const { Database } = require(path.join(__basedir, "backend", "firestore.js"))

module.exports = view => {
    router
        .get("/", (req, res) => res.send(view({
            header: "Login"
        })))
        .post("/", async (req, res) => {
            const isValid = await Database.verifyCredentials(req.body.email, req.body.password)

            res.send(isValid ? "Yes" : "Failed")
        })
    return router
}
