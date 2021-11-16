"use strict"

const express = require("express")
const router = express.Router()

module.exports = view => {
    router.get("/", (req, res) => {
        req.session.destroy(err => res.redirect("/"))
    })

    return router
}
