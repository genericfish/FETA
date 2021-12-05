"use strict"

const express = require("express")
const path = require("path")
const router = express.Router()

const { Database } = require(path.join(__basedir, "backend", "firestore"))
const { anyEmpty, login, flash } = require(path.join(__basedir, "backend", "utils"))

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
            if (anyEmpty(email, password))
                return flash(req, res, "/login", "Please fill out all fields")

            const isValid = await Database.verifyCredentials(email, password)

            if (isValid)
                return login(req, res, email, "/dashboard")

            return flash(req, res, "/login", "Invalid email or password")
        })
    return router
}
