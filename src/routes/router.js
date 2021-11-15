"use strict"

const express = require("express")
const session = require("express-session")
const pug = require("pug")
const path = require("path")
const { Database } = require(path.join(__basedir, "backend", "firestore"))
const { FirestoreStore } = require("@google-cloud/connect-firestore")
const router = express.Router()

const compileView = view => pug.compileFile(path.join(__basedir, "/views/", view))
const getRouter = route => path.join(__dirname, route)

const compiledViews = {
    Dashboard: compileView("Dashboard.pug"),
    Landing: compileView("Landing.pug"),
    Login: compileView("LogIn.pug"),
    Registration: compileView("Registration.pug"),
    Statistics: compileView("Statistics.pug"),
    Transaction: compileView("Transaction.pug"),
}

const dashboard = require(getRouter("dashboard.js"))(compiledViews.Dashboard)
const landing = require(getRouter("landing.js"))(compiledViews.Landing)
const login = require(getRouter("login.js"))(compiledViews.Login)
const registration = require(getRouter("registration.js"))(compiledViews.Registration)
const statistics = require(getRouter("statistics.js"))(compiledViews.Statistics)
const transactions = require(getRouter("transaction.js"))(compiledViews.Transaction)

router
    .use(
        session({
            secret: process.env.SESSION_SECRET || "fetacheese",
            resave: true,
            saveUninitialized: true,
            store: new FirestoreStore({
                dataset: Database.gDatabase,
                kind: "express-sessions"
            }),
            cookie: {
                secure: false,
                httpOnly: true,
                maxAge: 1000 * 60 * 15
            }
        })
    )
    // Add ability to send JSON responses
    .use(express.json())
    .use(express.urlencoded({ extended: true }))

    .use('/', landing)
    .use('/dashboard', dashboard)
    .use('/login', login)
    .use('/registration', registration)
    .use('/statistics', statistics)
    .use('/transactions', transactions)

module.exports = router;
