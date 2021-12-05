"use strict"

const express = require("express")
const path = require("path")
const router = express.Router()

const { Database } = require(path.join(__basedir, "backend", "firestore"))
const { anyEmpty } = require(path.join(__basedir, "backend", "utils"))

module.exports = view => {
    router
        .get("/", (req, res) => {
            if (req.session.loggedIn == true)
                return res.redirect("/dashboard")

            const render = view({
                header: "Login",
                error: req.session.error
            })

            delete req.session.error

            res.send(render)
        })
        .post("/", async (req, res) => {
            const { email, password } = req.body

            // Check to see if any field was left blank
            if (anyEmpty(email, password)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/login"))
            }

            const isValid = await Database.verifyCredentials(email, password)

            if (isValid) {
                // TODO: Make token for user validation instead of setting email
                req.session.loggedIn = true
                req.session.email = email

                req.session.save(_ => res.redirect("/dashboard"))
            } else {
                req.session.error = "Invalid email or password"
                return req.session.save(_ => res.redirect("/login"))
            }
        })
    return router
}
