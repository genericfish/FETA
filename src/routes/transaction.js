"use strict"

const express = require("express")
const path = require("path")
const { getSystemErrorMap } = require("util")
const { User } = require(path.join(__basedir, "backend", "firestore"))
const { Money } = require(path.join(__basedir, "backend", "utils"))
const router = express.Router()

module.exports = view => {
    router
        .get("/", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const user = new User(req.session.email)
            let income_categories = await user.getIncomeCategories()
            let expense_categories = await user.getExpensesCategories()
            let a = []
            for (let i = 0; i < income_categories.length; i++) {
                let income_array = await user.getIncomeTransactions(income_categories[i].id)
                for (let j = 0; j < income_array.length; j++) {
                    let income = income_array[j].data().amount
                    let date = income_array[j].data().date.toDate().toDateString()
                    let note = income_array[j].data().note
                    let category = income_categories[i].id
                    let id = income_array[j].id
                    a.push([id, "income", new Money(income).Display, date, note, category, income_array[j].data().date])
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
                    a.push([id, "expense", new Money(expense).Display, date, note, category, expense_array[j].data().date])
                }
            }

            let item_list = await user.getNMTItems() 
            let b = []
            let items = [] 

            for(let i = 0; i < item_list.length; i++) {
                let item = item_list[i].id
                let amount = item_list[i].data().current
                let note = item_list[i].data().note
                items.push([item, amount, note])
            }

            for (let i = 0; i < item_list.length; i++) {
                let NMT_array = await user.getNMTTransactions(item_list[i].id)
                for (let j = 0; j < NMT_array.length; j++) {
                    let amount = NMT_array[j].data().amount
                    let date = NMT_array[j].data().date.toDate().toDateString()
                    let note = NMT_array[j].data().note
                    let item = item_list[i].id
                    let id = NMT_array[j].id
                    b.push([id, amount, date, note, item, NMT_array[j].data().date])
                } 
            }


            a.sort(function (a, b) { return b[6] - a[6] })
            b.sort(function (a, b) { return b[5] - a[5] })
            items.sort(function(a, b) {return a[0] - b[0]})

            res.send(view({
                header: "Transactions",
                transactions: a, 
                NMTs: b,
                items: items
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
                return req.session.save(_ => res.redirect("/transaction"))
            }

            if (req.body.type.toLowerCase() == "income") {
                await user.addIncome(req.body.category, new Date(req.body.date), parseInt(req.body.amount), req.body.note)
            } else if (req.body.type.toLowerCase() == "expense") {
                await user.addExpense(req.body.category, new Date(req.body.date), parseInt(req.body.amount), req.body.note)
            } else {
                req.session.error = "Please enter a valid type of transaction"
                return req.session.save(_ => res.redirect("/transaction"))
            }

            return res.redirect("/transaction")
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
                return req.session.save(_ => res.redirect("/transaction"))
            }

            if (req.body.type == "expense") {
                await user.removeExpense(req.body.category, req.body.ID)
            }
            if (req.body.type == "income") {
                await user.removeIncome(req.body.category, req.body.ID)
            }
            return res.redirect("/transaction")
        })
        .post("/edit", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { ID, type, category, date, amount } = req.body
            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(ID, type, category, date, amount)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transaction"))
            }

            const transaction = { date: new Date(req.body.date), amount: parseInt(req.body.amount), note: req.body.note }

            if (req.body.type == "expense") {
                await user.modifyExpense(req.body.category, req.body.ID, transaction)
            }
            if (req.body.type == "income") {
                await user.modifyIncome(req.body.category, req.body.ID, transaction)
            }
            return res.redirect("/transaction")
        })
        .post("/addItem", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { name, note } = req.body
            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(name)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transaction"))
            }

            await user.addNMT(req.body.name, req.body.note)

            return res.redirect("/transaction")
        })
        .post("/editItem", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { name, amount, note } = req.body
            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(name, amount)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transaction"))
            }

            const NMT = { current: parseInt(req.body.amount), note: req.body.note }

            await user.modifyNMT(req.body.name, NMT)

            return res.redirect("/transaction")
        })
        .post("/removeItem", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { name} = req.body
            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(name)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transaction"))
            }
            
            await user.deleteNMT(req.body.name)

            return res.redirect("/transaction")
        })
        .post("/removeNMT", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { item, ID } = req.body
            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(item, ID)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transaction"))
            }

            await user.removeNMTTransaction(req.body.item, req.body.ID)
            return res.redirect("/transaction")
        })
        .post("/editNMT", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { item, ID, date, note, amount } = req.body
            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User(req.session.email)
            // Check to see if any field was left blank
            if (anyEmpty(item, ID, date, note, amount)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transaction"))
            }

            const NMTtransaction = { amount: parseInt(req.body.amount), date: new Date(req.body.date), note: req.body.note}  
            await user.modifyNMTTransaction(req.body.item, req.body.ID, NMTtransaction)
            
            return res.redirect("/transaction")
        })
        .post("/addNMT", async (req, res) => {
            if (req.session.loggedIn !== true)
                return res.redirect("/login")

            const { item, amount, date, note } = req.body

            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User(req.session.email)

            // Check to see if any field was left blank
            if (anyEmpty(item, amount, date)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transaction"))
            }
            

            await user.addNMTTransaction(req.body.item, parseInt(req.body.amount), new Date(req.body.date), req.body.note)

            return res.redirect("/transaction")
        })

    return router
}
