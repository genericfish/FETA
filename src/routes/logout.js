"use strict"

const path = require("path")
const express = require("express")
const router = express.Router()
const { logout } = require(path.join(__basedir, "backend", "utils"))

module.exports = _ => {
    router.get("/", logout)

    return router
}
