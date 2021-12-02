"use strict"

const express = require("express")
const path = require("path")
const router = express.Router()

const { Database } = require(path.join(__basedir, "backend", "firestore"))

module.exports = view => {
    router
        .get("/", (req, res) => {
            if (req.session.loggedIn == true)
                return res.redirect("/dashboard")

            const render = view({
                header: "Registration",
                error: req.session.error
            })

            delete req.session.error

            res.send(render)
        })
        .post("/", async (req, res) => {
            const { email, password, confirm, firstname, lastname } = req.body;

            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)

            // Check to see if any field was left blank
            if (anyEmpty(email, password, confirm, firstname, lastname)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/registration"))
            }

            // Check to see if email already exists
            if (await Database.userExists(email))
                return res.redirect("/")

            // Check to see if passwords match
            if (password != confirm)
                return res.redirect("/registration")

            Database.addUser(email, firstname, lastname, password)

            req.session.loggedIn = true
            req.session.email = email

            return req.session.save(_ => res.redirect("/dashboard"))
        })

    return router
}
