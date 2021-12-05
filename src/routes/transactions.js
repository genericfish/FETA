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

            let transactions = []

            for (let category of income_categories) {
                let incomeList = await user.getIncomeTransactions(category.id)

                incomeList.forEach(transaction => {
                    const {amount, date, note} = transaction.data()
                    const id = transaction.id
                    const dateObj = date.toDate()

                    transactions.push([id, "income", new Money(amount).Display, dateObj.toDateString(), note, category.id, date, RFC3339(dateObj)])
                })
            }

            for (let category of expense_categories) {
                let expenseList = await user.getExpensesTransactions(category.id)

                expenseList.forEach(transaction => {
                    const {amount, date, note} = transaction.data()
                    const id = transaction.id
                    const dateObj = date.toDate()

                    transactions.push([id, "expense", new Money(-amount).Display, dateObj.toDateString(), note, category.id, date, RFC3339(dateObj)])
                })
            }

            let NMTItems = await user.getNMTItems()
            let items = []
            let transactionsNM = []

            for (let item of NMTItems) {
                const { current, note } = item.data()

                items.push([item.id, current, note])

                const NMTTransactions = await user.getNMTTransactions(item.id)

                NMTTransactions.forEach(transaction => {
                    const { amount, date, note } = transaction.data()
                    const dateObj = date.toDate()

                    transactionsNM.push([transaction.id, amount, dateObj.toDateString(), note, item.id, date, RFC3339(dateObj)])
                })
            }

            transactions.sort((a, b) => { return b[6] - a[6] })
            transactionsNM.sort((a, b) => { return b[5] - a[5] })
            items.sort((a, b) => { return a[0] - b[0] })

            let categories = await user.getMonetaryCategories()
            categories = Array.from(categories).map(category => category.id)

            let name = await user.reference.get()

            res.send(view({
                header: "Transactions",
                transactions: transactions,
                NMTs: transactionsNM,
                items: items,
                categories: categories,
                name: name.data().firstname
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

            switch (type.toLowerCase()) {
                case "income":
                    await user.addIncome(category, new Date(date), parseInt(amount), note)
                    break
                case "expense":
                    await user.addExpense(category, new Date(date), parseInt(amount), note)
                    break
                default:
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

            switch (type.toLowerCase()) {
                case "expense":
                    await user.removeExpense(category, ID)
                    break
                case "income":
                    await user.removeIncome(category, ID)
                    break
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

            switch (type.toLowerCase()) {
                case "expense":
                    await user.modifyExpense(category, ID, transaction)
                    break
                case "income":
                    await user.modifyIncome(category, ID, transaction)
                    break
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

            await user.addNMT(name, note)

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

            const NMT = { current: parseInt(amount), note: note }

            await user.modifyNMT(name, NMT)

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

            await user.deleteNMT(name)

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
