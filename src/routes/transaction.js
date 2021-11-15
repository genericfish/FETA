"use strict"

const express = require("express")
const router = express.Router()

module.exports = view => {
    router.get("/", (req, res) => res.send(view({
        header: "Transactions"
    })))

    return router
}
