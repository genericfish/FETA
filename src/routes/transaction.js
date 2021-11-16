"use strict"

const express = require("express")
const path = require("path")
const { database } = require("firebase-admin")
const { User } = require("../backend/firestore/user")
const { Database } = require("../backend/firestore/database")
const router = express.Router()

module.exports = view => {
    router
        .get("/", async(req, res) => {
            if(req.session.loggedIn == false) {
                return res.redirect("/login")
            } else {
                const user = new User("kornelharm@gmail.com") 
                let income_categories = await user.getIncomeCategories() 
                let expense_categories = await user.getExpensesCategories() 
                let a = []
                for(let i = 0; i < income_categories.length; i++) {
                    let income_array = await user.getIncomeTransactions(income_categories[i].id, new Date("1970-01-01"), new Date("2021-11-15"))
                    for(let j = 0; j < income_array.length; j++) {
                        let income = income_array[j].data().amount
                        let date = income_array[j].data().date.toDate().toDateString()
                        let note = income_array[j].data().note
                        let category = income_categories[i].id
                        a.push([income,date,note,category])
                    }
                }
                for(let i = 0; i < expense_categories.length; i++) {
                    let expense_array = await user.getExpensesTransactions(expense_categories[i].id, new Date("1970-01-01"), new Date("2021-11-15"))
                    for(let j = 0; j < expense_array.length; j++) {
                        let expense = -expense_array[j].data().amount
                        let date = expense_array[j].data().date.toDate().toDateString()
                        let note = expense_array[j].data().note
                        let category = expense_categories[i].id
                        a.push([expense,date,note,category])
                    }
                }
                a.sort(function(a,b) {return b[2] - a[2]})
                res.send(view({
                    header: "Transactions", 
                    transactions: a
                }))
            }
            
        })
        .post("/add", async(req, res) => {
            const { type, category, amount, date, note } = req.body;

            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User("kornelharm@gmail.com") 
            // Check to see if any field was left blank
            if (anyEmpty(type, category, amount, date)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transaction"))
            }
            
            //not working 

            /*if(req.body.type == "income" || req.body.type == "Income" || req.body.type == "INCOME") {
                await user.addIncome(req.body.category,req.body.date,req.body.amount,req.body.note)
            } else if (req.body.type == "expense" || req.body.type == "Expense" || req.body.type == "EXPENSE") {
                await user.addExpense(req.body.category,req.body.date,req.body.amount,req.body.note)
            } else {
                req.session.error = "Please enter a valid type of transaction"
                return req.session.save(_ => res.redirect("/transaction"))
            }*/

            return res.redirect("/transaction")
        })
        .post("/remove", async(req,res) =>{
            const { type, category, amount, date} = req.body;
            const anyEmpty = (...args) => Array.from(args).reduce((acc, cur) => acc |= cur === "", false)
            const user = new User("kornelharm@gmail.com") 
            // Check to see if any field was left blank
            if (anyEmpty(type, category, amount, date)) {
                req.session.error = "Please fill out all fields"
                return req.session.save(_ => res.redirect("/transaction"))
            }
            return res.redirect("/transaction")
        })
    return router
}
