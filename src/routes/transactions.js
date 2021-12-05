"use strict"

const express = require("express")
const path = require("path")
const { User } = require(path.join(__basedir, "backend", "firestore"))
const { Money, RFC3339, anyEmpty } = require(path.join(__basedir, "backend", "utils"))
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

            let item_list = await user.getNMTItems()
            let b = []
            let items = []

            for (let i = 0; i < item_list.length; i++) {
                let item = item_list[i].id
                let amount = item_list[i].data().current
                let note = item_list[i].data().note
                items.push([item, amount, note])
            }

            for (let i = 0; i < item_list.length; i++) {
                let NMT_array = await user.getNMTTransactions(item_list[i].id)
                for (let j = 0; j < NMT_array.length; j++) {
                    const { amount, date, note } = NMT_array[j].data()
                    const dateObj = date.toDate()
                    let item = item_list[i].id
                    let id = NMT_array[j].id
                    b.push([id, amount, dateObj.toDateString(), note, item, date, RFC3339(dateObj)])
                }
            }

            a.sort((a, b) => { return b[6] - a[6] })
            b.sort((a, b) => { return b[5] - a[5] })
            items.sort((a, b) => { return a[0] - b[0] })

            let categories = await user.getMonetaryCategories()
            categories = Array.from(categories).map(category => category.id)

            res.send(view({
                header: "Transactions",
                transactions: a,
                NMTs: b,
                items: items,
                categories: categories
            }))
        })
        .post("/add", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { type, category, amount, date, note } = req.body
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
        .post("/addItem", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { name, note } = req.body
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(name)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transactions"))
            }

            await user.addNMT(req.body.name, req.body.note)

            return res.redirect("/transactions")
        })
        .post("/editItem", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { name, amount, note } = req.body
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(name, amount)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transactions"))
            }

            const NMT = { current: parseInt(req.body.amount), note: req.body.note }

            await user.modifyNMT(req.body.name, NMT)

            return res.redirect("/transactions")
        })
        .post("/removeItem", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { name } = req.body
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(name)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transactions"))
            }

            await user.deleteNMT(req.body.name)

            return res.redirect("/transactions")
        })
        .post("/removeNMT", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { item, ID } = req.body
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(item, ID)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transactions"))
            }

            await user.removeNMTTransaction(item, ID)
            return res.redirect("/transactions")
        })
        .post("/editNMT", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { item, ID, date, note, amount } = req.body
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(item, ID, date, amount)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transactions"))
            }

            const NMTtransaction = { amount: parseInt(amount), date: new Date(date), note: note }
            await user.modifyNMTTransaction(item, ID, NMTtransaction)

            return res.redirect("/transactions")
        })
        .post("/addNMT", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { item, amount, date, note } = req.body

            const user = new User(req.session.email)

            // Check to see if any field was left blank
            if (anyEmpty(item, amount, date)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transactions"))
            }


            await user.addNMTTransaction(item, parseInt(amount), new Date(date), note)

            return res.redirect("/transactions")
        })

    return router
}
