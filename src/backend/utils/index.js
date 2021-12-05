"use strict"

const path = require("path")
const { Database } = require(path.join(__basedir, "backend", "firestore"))

class Money {
    constructor (value) {
        // Regex from https://stackoverflow.com/questions/354044
        if (typeof value === "string")
            value = value.match(/(?:\d{1,3},)*\d{1,3}(?:\.\d+)?/)

        this.value = parseFloat(value)
    }

    get Display() {
        let predisplay = this.value

        if (this.value < 0)
            predisplay = Math.abs(predisplay)

        predisplay = Math.round(predisplay / 100, 2).toFixed(2)

        return (this.value < 0 ? "-" : "") + "$" + predisplay
    }

    get Undisplay() {
        return Math.round(this.value * 100, 2)
    }
}

function getLastMonth() {
    const begin = new Date()

    begin.setDate(begin.getDate() - 30)

    begin.setHours(0)
    begin.setMinutes(0)
    begin.setSeconds(0)
    begin.setMilliseconds(0)

    return begin
}

async function isLoggedIn(req) {
    const sessionID = req.sessionID

    if (sessionID == undefined || sessionID == null)
        return false

    if (req.session == undefined || req.session == null)
        return false

    return req.session.loggedIn === true
}

function login(req, res, email, redirect) {
    req.session.loggedIn = true
    req.session.email = email

    req.session.save(_ => res.redirect(redirect))
}

async function logout(req, res) {
    if (!isLoggedIn(req))
        return req.redirect('/')

    await Database.gDatabase.collection("express-sessions").doc(req.sessionID).delete()

    req.session.destroy(_ => res.redirect('/'))
}

function flash(req, res, redirect, message) {
    req.session.error = message
    return req.session.save(_ => res.redirect(redirect))
}

module.exports = {
    Money: Money,
    getLastMonth: getLastMonth,
    RFC3339: date => date.toISOString().split('T')[0],
    dateString: date => date.toLocaleString("en-US", {timeZone: "UTC"}).split(',')[0],
    anyEmpty: (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false),
    login: login,
    logout: logout,
    isLoggedIn: isLoggedIn,
    flash: flash
}
