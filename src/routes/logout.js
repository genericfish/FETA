"use strict"

const express = require("express")
const router = express.Router()

module.exports = _ => {
    router.get("/", (req, res) => {
        if (req.session.loggedIn !== true)
            return res.redirect("/")

        req.session.destroy(_ => res.redirect("/"))
    })

    return router
}
