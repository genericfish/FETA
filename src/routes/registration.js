"use strict"

const express = require("express")
const path = require("path")
const router = express.Router()

const { Database } = require(path.join(__basedir, "database", "firestore.js"))

module.exports = view => {
    router
        .get("/", (req, res) => {
            const error = req.session.error

            delete req.session.error

            res.send(view({
                header: "Registration",
                error: error
            }))
        })
        .post("/", async (req, res) => {
            const { email, password, confirm, firstname, lastname } = req.body;

            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)

            // Check to see if any field was left blank
            if (anyEmpty(email, password, confirm, firstname, lastname)) {
                req.session.error = "Please fill out all fields"
                return res.redirect("/registration")
            }

            // Check to see if email already exists
            if (await Database.userExists(req.body.email))
                return res.redirect("/")

            // Check to see if passwords match
            if (req.body.password != req.body.confirm)
                return res.redirect("/registration")

            Database.addUser(req.body.email, req.body.password)

            return res.redirect("/dashboard")
        })

    return router
}
