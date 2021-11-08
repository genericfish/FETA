"use strict"

global.__basedir = __dirname

const path = require("path")
const express = require("express")
const pug = require("pug")
const { Database, User } = require(path.join(__basedir, "database", "firestore.js"))

const db = new Database()
const app = express()
const port = 8000

const compileView = view => pug.compileFile(path.join(__basedir, "/views/", view))

const compiledViews = {
    Landing: compileView("Landing.pug"),
    Dashboard: compileView("Dashboard.pug"),
    Login: compileView("LogIn.pug"),
    Registration: compileView("Registration.pug"),
    Statistics: compileView("Statistics.pug"),
    Transaction: compileView("Transaction.pug"),
}

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
app.get("/registration", (req, res) => res.send(compiledViews.Registration({
    header: "Registration"
})))
app.get("/statistics", (req, res) => res.send(compiledViews.Statistics({
    header: "Statistics"
})))
app.get("/transactions", (req, res) => res.send(compiledViews.Transaction({
    header: "Transactions"
})))

app.listen(port, _ => {
    console.log(`Listening at http://localhost:${port}`)
})