"use strict"

const express = require("express")
const path = require("path")
const { User } = require(path.join(__basedir, "backend", "firestore"))
const { Money, RFC3339, anyEmpty } = require(path.join(__basedir, "backend", "utils"))
const router = express.Router()

module.exports = view => {
    router.get("/", async (req, res) => {
        if (req.session.loggedIn !== true)
            return res.redirect("/login")

        const user = new User(req.session.email)

        let name = await user.reference.get()

        res.send(view({
            header: "Goals",
            name: name.data().firstname
        }))
    })

    return router
}
