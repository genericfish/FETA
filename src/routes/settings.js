"use strict"

const express = require("express")
const path = require("path")
const bcrypt = require("bcrypt")
const { Database, User } = require(path.join(__basedir, "backend", "firestore"))
const { anyEmpty, isLoggedIn, flash } = require(path.join(__basedir, "backend", "utils"))
const router = express.Router()

module.exports = view => {
    router
        .get("/", async (req, res) => {
            if (!isLoggedIn(req))
                return res.redirect("/login")

            const user = new User(req.session.email)

            let userData = await user.reference.get()
            const { firstname, lastname } = userData.data()

            res.send(view({
                header: "Settings",
                name: firstname,
                lastname: lastname
            }))
        })
        .post("/name", async (req, res) => {
            if (!isLoggedIn(req))
                return res.redirect("/login")

            const { firstname, lastname } = req.body

            if (anyEmpty(firstname, lastname))
                return flash(req, res, "/settings", "You must fill out all fields.")


            console.log(req.body)
        })
        .post("/password", async (req, res) => {
            if (!isLoggedIn(req))
                return res.redirect("/login")

            const { current, password, confirm } = req.body

            if (anyEmpty(current, password, confirm))
                return flash(req, res, "/settings", "You must fill out all fields.")

            const email = req.session.email
            const verified = await Database.verifyCredentials(email, current)

            if (!verified)
                return flash(req, res, "/settings", "Invalid password.")

            if (password !== confirm)
                return flash(req, res, "/settings", "Passwords do not match.")

            const saltRounds = process.env.SALT_ROUNDS || 10
            const hashedPassword = await bcrypt.hash(password, saltRounds)

            await Database.gDatabase.collection("users").doc(email).set({ password: hashedPassword }, { merge: true })

            return res.redirect("/settings")
        })

    return router
}
