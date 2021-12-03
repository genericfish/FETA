"use strict"

const express = require("express")
const path = require("path")
const { User } = require(path.join(__basedir, "backend", "firestore"))
const { Money, getLastMonth } = require(path.join(__basedir, "backend", "utils"))
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
                    income_sum += income_amount
                }

            }
            for (let i = 0; i < expense_categories.length; i++) {
                let expense_array = await user.getExpensesTransactions(expense_categories[i].id)
                for (let j = 0; j < expense_array.length; j++) {
                    let expense_amount = expense_array[j].data().amount
                    expense_sum += expense_amount
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

            let total = await user.getMonthlyAggregate()
            let total_table = [["time", "amount", { role: "style" }], ["Start Balance", total[1]/100, "red"], ["End Balance", total[0]/100, "blue"]]
            let end_balance = total[0]
            let start_balance = total[1]
            let gain = end_balance - start_balance
            let percent_gain = (gain/start_balance)*100
            if (start_balance==0) 
                percent_gain = undefined

            let a=[]
            for (let i = 0; i < income_categories.length; i++) {
                let income_array = await user.getIncomeTransactions(income_categories[i].id, getLastMonth(), new Date())
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
                let expense_array = await user.getExpensesTransactions(expense_categories[i].id, getLastMonth(), new Date())
                for (let j = 0; j < expense_array.length; j++) {
                    let expense = -expense_array[j].data().amount
                    let date = expense_array[j].data().date.toDate().toDateString()
                    let note = expense_array[j].data().note
                    let category = expense_categories[i].id
                    let id = expense_array[j].id
                    a.push([id, "expense", new Money(expense).Display, date, note, category, expense_array[j].data().date])
                }
            }
            a.sort(function (a, b) { return b[6] - a[6]})

            let b = []
            let c = []
            for (let i = 0; i < income_categories.length; i++) {
                let income_array = await user.getIncomeTransactions(income_categories[i].id, getLastMonth(), new Date())
                let income = 0
                for (let j = 0; j < income_array.length; j++) {
                    let income_amount = income_array[j].data().amount
                    income += income_amount
                }
                b.push([income_categories[i].id, income])

            }
            for (let i = 0; i < expense_categories.length; i++) {
                let expense_array = await user.getExpensesTransactions(expense_categories[i].id, getLastMonth(), new Date())
                let expense = 0
                for (let j = 0; j < expense_array.length; j++) {
                    let expense_amount = expense_array[j].data().amount
                    expense += expense_amount
                }
                c.push([expense_categories[i].id, expense])
            }

            res.send(view({
                header: "Dashboard",
                income_sum: new Money(income_sum).Display,
                expense_sum: new Money(expense_sum).Display,
                net: new Money(net).Display,
                message: message,
                total: total_table,
                gain: new Money(gain).Display,
                percent_gain: percent_gain,
                transactions: a,
                incomes: b,
                expenses: c
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
