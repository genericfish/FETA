"use strict"

global.__basedir = __dirname

const express = require("express")
const session = require("express-session")
const path = require("path")
const pug = require("pug")
const { Database, User } = require(path.join(__basedir, "database", "firestore.js"))
const { FirestoreStore } = require("@google-cloud/connect-firestore")

const app = express()
const port = process.env.PORT || 8000
const compileView = view => pug.compileFile(path.join(__basedir, "/views/", view))

app.set("trust proxy", 1)
app.use(
    session({
        secret: "fetacheese",
        resave: true,
        saveUninitialized: false,
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

const compiledViews = {
    Landing: compileView("Landing.pug"),
    Dashboard: compileView("Dashboard.pug"),
    Login: compileView("LogIn.pug"),
    Registration: compileView("Registration.pug"),
    Statistics: compileView("Statistics.pug"),
    Transaction: compileView("Transaction.pug"),
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve CSS/JS as static files
app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req, res) => res.send(compiledViews.Landing({
    header: "Financial Excellence Tracking Application"
})))

app.get("/dashboard", (req, res) => res.send(compiledViews.Dashboard({
    header: "Dashboard"
})))

app.get("/login", (req, res) => res.send(compiledViews.Login({
    header: "Login"
})))

app.post("/login", function (req, res) {
    // db.verifyCredentials(req.body.username, req.body.password); 

    res.json(req.body)
    console.log(req.body)
})

app.get("/registration", (req, res) => res.send(compiledViews.Registration({
    header: "Registration"
})))

app.post("/registration", function (req, res) {
    // db.verifyCredentials(req.body.username, req.body.password); 

    res.json(req.body)
    console.log(req.body)
})

app.get("/statistics", (req, res) => res.send(compiledViews.Statistics({
    header: "Statistics"
})))

app.get("/transactions", (req, res) => res.send(compiledViews.Transaction({
    header: "Transactions"
})))

app.listen(port, _ => {
    console.log(`Listening at http://localhost:${port}`)
})
