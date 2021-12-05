"use strict"

const express = require("express")
const path = require("path")
const { User } = require(path.join(__basedir, "backend", "firestore"))
const { Money, RFC3339, anyEmpty } = require(path.join(__basedir, "backend", "utils"))
const router = express.Router()

module.exports = view => {
    router.get("/", async (req, res) => {
        if (req.session.loggedIn !== true)
            return res.redirect("/login")

        const user = new User(req.session.email)

        let name = await user.reference.get()

        let saving_list = await user.getSavingsGoals()
        let amortization_list = await user.getAmortizationsGoals()
        let Goals = []
        let Savings = []
        let Amortizations = []
        let status

        for(let goal of saving_list) {

            const {amount, current, date, note} = goal.data()
            
            if(parseInt(amount)-parseInt(current) > 0) {
                let percent = Math.round((parseInt(current)/parseInt(amount))*100)
                status = percent+"% Completed"
            } else {
                status = "Completed"
            }

            Goals.push([goal.id, "savings", amount, current, note, status, RFC3339(date.toDate())])

            const saving = await user.getSavingsTransactions(goal.id)
            saving.forEach(transaction => {
                const{ date, amount, note } = transaction.data()
                const dateObj = date.toDate()
                Savings.push([transaction.id, amount, dateObj.toDateString(), note, goal.id, RFC3339(dateObj), "savings"])
            })
        }

        for(let goal of amortization_list) {

            const {amount, current, date, note} = goal.data()
            
            if(parseInt(amount)-parseInt(current) > 0) {
                let percent = Math.round((parseInt(current)/parseInt(amount))*100)
                status = percent+"% Completed"
            } else {
                status = "Completed"
            }

            Goals.push([goal.id, "amortizations", amount, current, note, status, RFC3339(date.toDate())])

            const amortization = await user.getAmortizationsTransactions(goal.id)
            amortization.forEach(transaction => {
                const{ date, amount, note } = transaction.data()
                const dateObj = date.toDate()
                Amortizations.push([transaction.id, amount, dateObj.toDateString(), note, goal.id, RFC3339(dateObj), "amortizations"])
            })
        }

        

        Savings.sort ((a,b) => { return b[5] - a[5] })
        Amortizations.sort ((a,b) => { return b[5] - a[5]})
        Goals.sort((a, b) => { return a[1] - b[1]})

        res.send(view({
            header: "Goals",
            name: name.data().firstname, 
            Amortizations: Amortizations,
            Savings: Savings,
            Goals: Goals

        }))
    })
    .post("/addGoal", async (req, res) => {
        if (req.session.loggedIn !== true)
            return res.redirect("/login")

        const { type, name, amount, date, note } = req.body
        const user = new User(req.session.email)
        // Check to see if any field was left blank
        if (anyEmpty(type, name, amount, date)) {
            req.session.error = "Please fill out all fields"
            return req.session.save(_ => res.redirect("/goal"))
        }
        
        switch (type.toLowerCase()) {
            case "saving":
                await user.addSavingsGoal(name, parseInt(amount), new Date(date), note)
                break
            case "amortization":
                await user.addAmortizationsGoal(name, parseInt(amount), new Date(date), note)
                break
            default:
                req.session.error = "Please enter a valid type of goal"
                return req.session.save(_ => res.redirect("/goal"))
        }
        
        return res.redirect("/goal")
    })
    .post("/removeGoal", async (req, res) => {
        if (req.session.loggedIn !== true)
            return res.redirect("/login")

        const { category, name } = req.body
        const user = new User(req.session.email)
        // Check to see if any field was left blank
        if (anyEmpty(category, name)) {
            req.session.error = "Please fill out all fields"
            return req.session.save(_ => res.redirect("/goal"))
        }

        await user.removeGoal(category, name)
        return res.redirect("/goal")
    })
    .post("/editGoal", async (req, res) => {
        if (req.session.loggedIn !== true)
            return res.redirect("/login")

        const { category, name, amount, current, date, note } = req.body
        const user = new User(req.session.email)
        // Check to see if any field was left blank
        if (anyEmpty(category, name, amount, current, date)) {
            req.session.error = "Please fill out all fields"
            return req.session.save(_ => res.redirect("/goal"))
        }

        const goal = {amount: parseInt(amount), current: parseInt(current), date: new Date(date), note: note}
    
        await user.modifyGoal(category, name, goal)

        return res.redirect("/goal")
    })
    .post("/add", async (req, res) => {
        if (req.session.loggedIn !== true)
            return res.redirect("/login")

        const { goal, category, date, amount, note } = req.body
        const user = new User(req.session.email)
        // Check to see if any field was left blank
        if (anyEmpty(goal, category, date, amount)) {
            req.session.error = "Please fill out all fields"
            return req.session.save(_ => res.redirect("/goal"))
        }
        
        switch (category.toLowerCase()) {
            case "savings":
                await user.addSavingsTransaction(goal, new Date(date), parseInt(amount), note)
                break
            case "amortizations":
                await user.addAmortizationsTransaction(goal, new Date(date), parseInt(amount), note)
                break
            default:
                req.session.error = "Please enter a valid type of goal"
                return req.session.save(_ => res.redirect("/goal"))
        }
        
        return res.redirect("/goal")
    })
    .post("/edit", async (req, res) => {
        if (req.session.loggedIn !== true)
            return res.redirect("/login")

        const { goal, ID, category, date, amount, note } = req.body
        const user = new User(req.session.email)
        // Check to see if any field was left blank
        if (anyEmpty(goal, ID, category, date, amount)) {
            req.session.error = "Please fill out all fields"
            return req.session.save(_ => res.redirect("/goal"))
        }

        const data = {date: new Date(date), amount: parseInt(amount), note: note}

        switch (category.toLowerCase()) {
            case "savings":
                await user.modifySavingsTransaction(goal, ID, data)
                break
            case "amortizations":
                await user.modifyAmortizationsTransaction(goal, ID, data)
                break
            default:
                req.session.error = "Please enter a valid type of goal"
                return req.session.save(_ => res.redirect("/goal"))
        }
        

        return res.redirect("/goal")
    })
    .post("/remove", async (req, res) => {
        if (req.session.loggedIn !== true)
            return res.redirect("/login")

        const { goal, ID, category } = req.body
        const user = new User(req.session.email)
        // Check to see if any field was left blank
        if (anyEmpty(goal, ID, category)) {
            req.session.error = "Please fill out all fields"
            return req.session.save(_ => res.redirect("/goal"))
        }

        switch (category.toLowerCase()) {
            case "savings":
                await user.removeSavingsTransaction(goal, ID)
                break
            case "amortizations":
                await user.removeAmortizationsTransaction(goal, ID)
                break
            default:
                req.session.error = "Please enter a valid type of goal"
                return req.session.save(_ => res.redirect("/goal"))
        }
        

        return res.redirect("/goal")
    })

    return router
}
