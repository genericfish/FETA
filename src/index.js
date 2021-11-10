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

app.post("/login", async (req, res) => {
    const isValid = await Database.verifyCredentials(req.body.email, req.body.password)

    res.send(isValid ? "Yes" : "Failed")
})

app.get("/registration", (req, res) => res.send(compiledViews.Registration({
    header: "Registration"
})))

app.post("/registration", async (req, res) => {
    // TODO: Add error messages

    // Check to see if email already exists
    if (await Database.userExists(req.body.email))
        return res.redirect("/")

    // Check to see if passwords match
    if (req.body.password != req.body.confirm)
        return res.redirect("/registration")

    Database.addUser(req.body.email, req.body.password)

    return res.redirect("/dashboard")
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
