"use strict"

const express = require("express")
const session = require("express-session")
const pug = require("pug")
const path = require("path")
const glob = require("glob")
const { Database } = require(path.join(__basedir, "backend", "firestore"))
const { FirestoreStore } = require("@google-cloud/connect-firestore")
const router = express.Router()

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

let compiledViews = {}

glob.sync(path.join(__basedir, "views", "*.pug"))
    .forEach(file => {
        const pageName = path.basename(file, path.extname(file)).toLowerCase()
        compiledViews[pageName] = pug.compileFile(file)
    })

glob.sync(path.join(__basedir, "routes", "*.js"))
    .forEach(file => {
        if (file === __filename)
            return

        const routerName = path.basename(file, path.extname(file)).toLowerCase()
        let routerPath = routerName

        if (routerName === "landing")
           routerPath = ""

        router.use(`/${routerPath}`, require(file)(compiledViews[routerName]))
    })

module.exports = router;
