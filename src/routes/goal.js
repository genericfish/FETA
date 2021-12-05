"use strict"

const express = require("express")
const path = require("path")
const { User } = require(path.join(__basedir, "backend", "firestore"))
const { Money, RFC3339, anyEmpty } = require(path.join(__basedir, "backend", "utils"))
const router = express.Router()

module.exports = view => {
    router.get("/", (req, res) => {
        if (req.session.loggedIn !== true)
            return res.redirect("/login")

        res.send(view({
            header: "Financial Excellence Tracking Application"
        }))
    })

    return router
}