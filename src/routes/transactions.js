"use strict"

const express = require("express")
const path = require("path")
const { User } = require(path.join(__basedir, "backend", "firestore"))
const { Money, RFC3339 } = require(path.join(__basedir, "backend", "utils"))
const router = express.Router()

module.exports = view => {
    router
        .get("/", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const user = new User(req.session.email)
            const income_categories = await user.getIncomeCategories()
            const expense_categories = await user.getExpensesCategories()

            let a = []
            for (let i = 0; i < income_categories.length; i++) {
                let income_array = await user.getIncomeTransactions(income_categories[i].id)
                for (let j = 0; j < income_array.length; j++) {
                    let income = income_array[j].data().amount
                    let date = income_array[j].data().date.toDate().toDateString()
                    let note = income_array[j].data().note
                    let category = income_categories[i].id
                    let id = income_array[j].id
                    a.push([id, "income", new Money(income).Display, date, note, category, income_array[j].data().date, RFC3339(income_array[j].data().date.toDate())])
                }
            }

            for (let i = 0; i < expense_categories.length; i++) {
                let expense_array = await user.getExpensesTransactions(expense_categories[i].id)
                for (let j = 0; j < expense_array.length; j++) {
                    let expense = -expense_array[j].data().amount
                    let date = expense_array[j].data().date.toDate().toDateString()
                    let note = expense_array[j].data().note
                    let category = expense_categories[i].id
                    let id = expense_array[j].id
                    a.push([id, "expense", new Money(expense).Display, date, note, category, expense_array[j].data().date, RFC3339(expense_array[j].data().date.toDate())])
                }
            }

            a.sort(function (a, b) { return b[6] - a[6] })

            let categories = await user.getMonetaryCategories()
            categories = Array.from(categories).map(category => category.id)

            res.send(view({
                header: "Transactions",
                transactions: a,
                categories: categories
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
                return req.session.save(_ => res.redirect("/transactions"))
            }

            if (req.body.type.toLowerCase() == "income") {
                await user.addIncome(category, new Date(date), parseInt(amount), note)
            } else if (req.body.type.toLowerCase() == "expense") {
                await user.addExpense(category, new Date(date), parseInt(amount), note)
            } else {
                req.session.error = "Please enter a valid type of transaction"
                return req.session.save(_ => res.redirect("/transactions"))
            }

            return res.redirect("/transactions")
        })
        .post("/remove", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { ID, type, category } = req.body
            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(ID, type, category)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transactions"))
            }

            if (req.body.type == "expense") {
                await user.removeExpense(category, ID)
            }
            if (req.body.type == "income") {
                await user.removeIncome(category, ID)
            }
            return res.redirect("/transactions")
        })
        .post("/edit", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { ID, type, category, date, amount, note } = req.body
            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(ID, type, category, date, amount)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transactions"))
            }

            const transaction = { date: new Date(date), amount: amount, note: note }

            if (type == "expense") {
                await user.modifyExpense(category, ID, transaction)
            }
            if (type == "income") {
                await user.modifyIncome(category, ID, transaction)
            }
            return res.redirect("/transactions")
        })
    return router
}
