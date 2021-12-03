"use strict"

const express = require("express")
const path = require("path")
const { User } = require(path.join(__basedir, "backend", "firestore"))
const { Money } = require(path.join(__basedir, "backend", "utils"))
const router = express.Router()

module.exports = view => {
    router.get("/", async (req, res) => {
        if (req.session.loggedIn !== true)
            return res.redirect("/login")

        const user = new User(req.session.email)
        let income_categories = await user.getIncomeCategories()
        let expense_categories = await user.getExpensesCategories()
        let a = []
        let b = []
        let income_sum = 0
        let expense_sum = 0
        let net = 0
        for (let i = 0; i < income_categories.length; i++) {
            let income_array = await user.getIncomeTransactions(income_categories[i].id)
            let income = 0
            for (let j = 0; j < income_array.length; j++) {
                let income_amount = income_array[j].data().amount
                income_sum += income_amount
                income += income_amount
            }
            a.push([income_categories[i].id, income])

        }
        for (let i = 0; i < expense_categories.length; i++) {
            let expense_array = await user.getExpensesTransactions(expense_categories[i].id)
            let expense = 0
            for (let j = 0; j < expense_array.length; j++) {
                let expense_amount = expense_array[j].data().amount
                expense_sum += expense_amount
                expense += expense_amount
            }
            b.push([expense_categories[i].id, expense])
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
            header: "Statistics",
            incomes: a,
            expenses: b,
            income_sum: new Money(income_sum).Display,
            expense_sum: new Money(expense_sum).Display,
            net: new Money(net).Display,
            message: message
        }))
    })

    return router
}
