"use strict"

const express = require("express")
const path = require("path")
const { database } = require("firebase-admin")
const { User } = require("../backend/firestore/user")
const { Database } = require("../backend/firestore/database")
const router = express.Router()

module.exports = view => {
    router.get("/", async(req, res) => {
        if(req.session.loggedIn == false) {
            return res.redirect("/login")
        } else {
            const user = new User("kornelharm@gmail.com") 
            let income_categories = await user.getIncomeCategories() 
            let expense_categories = await user.getExpensesCategories() 
            let income_sum = 0
            let expense_sum = 0
            let net = 0
            for(let i = 0; i < income_categories.length; i++) {
                let income_array = await user.getIncomeTransactions(income_categories[i].id, new Date("1970-01-01"), new Date("2021-11-15"))
                for(let j = 0; j < income_array.length; j++) {
                    let income_amount = income_array[j].data().amount
                    income_sum += income_amount
                }
    
            }
            for(let i = 0; i < expense_categories.length; i++) {
                let expense_array = await user.getExpensesTransactions(expense_categories[i].id, new Date("1970-01-01"), new Date("2021-11-15"))
                for(let j = 0; j < expense_array.length; j++) {
                    let expense_amount = expense_array[j].data().amount
                    expense_sum += expense_amount
                }
            }
            net = income_sum - expense_sum
            let message = ""
            if(net < 0) {
                message = "You are in debt!"
            } else if(net == 0) {
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
        }
        
    })

    return router
}
