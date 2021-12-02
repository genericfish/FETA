"use strict"

const express = require("express")
const path = require("path")
const { User } = require(path.join(__basedir, "backend", "firestore"))
const { Display } = require(path.join(__basedir, "backend", "money"))
const router = express.Router()

module.exports = view => {
    router.
        get("/", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const user = new User(req.session.email)
            let income_categories = await user.getIncomeCategories()
            let expense_categories = await user.getExpensesCategories()
            let income_sum = 0
            let expense_sum = 0
            let net = 0
            for (let i = 0; i < income_categories.length; i++) {
                let income_array = await user.getIncomeTransactions(income_categories[i].id)
                for (let j = 0; j < income_array.length; j++) {
                    let income_amount = income_array[j].data().amount
                    income_sum += Display(income_amount)
                }

            }
            for (let i = 0; i < expense_categories.length; i++) {
                let expense_array = await user.getExpensesTransactions(expense_categories[i].id)
                for (let j = 0; j < expense_array.length; j++) {
                    let expense_amount = expense_array[j].data().amount
                    expense_sum += Display(expense_amount)
                }
            }
            net = income_sum - expense_sum
            let message = ""
            if (net < 0) {
                message = "You are in debt!"
            } else if (net == 0) {
                message = "You can do better"
            } else {
                message = "Good Job!"
            }
            res.send(view({
                header: "Dashboard",
                income_sum: income_sum,
                expense_sum: expense_sum,
                net: net,
                message: message
            }))
        })
        .post("/add", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { type, category, amount, date, note } = req.body

            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User(req.session.email)

            // Check to see if any field was left blank
            if (anyEmpty(type, category, amount, date)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/dashboard"))
            }

            if (req.body.type.toLowerCase() == "income") {
                await user.addIncome(req.body.category, new Date(req.body.date), parseInt(req.body.amount), req.body.note)
            } else if (req.body.type.toLowerCase() == "expense") {
                await user.addExpense(req.body.category, new Date(req.body.date), parseInt(req.body.amount), req.body.note)
            } else {
                req.session.error = "Please enter a valid type of transaction"
                return req.session.save(_ => res.redirect("/dashboard"))
            }

            return res.redirect("/dashboard")
        })

    return router
}
