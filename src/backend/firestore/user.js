"use strict"

const path = require("path")
const { firestore } = require("firebase-admin")
const { Database } = require("./")
const { Gmail } = require(path.join(__basedir, "backend", "gmail"))

class User {
    constructor(email) {
        this.email = email
        this.reference = Database.gDatabase.collection("users").doc(email)
        this.transactions = this.reference.collection("transactions")
        this.income = this.transactions.doc("income")
        this.expenses = this.transactions.doc("expenses")
        this.goals = this.transactions.doc("goals")
        this.savings = this.goals.collection("savings")
        this.amortizations = this.goals.collection("amortizations")
        this.nmt = this.transactions.doc("nmt")
    }

    // Returns an array of transactions from a collection within [dateMin, dateMax], where dates are JS Date objects
    async #getTransaction(collection, dateMin, dateMax) {
        let query = collection

        // dateMax and dateMin are optional parameters
        if (dateMax !== undefined)
            query = query.where("date", "<=", dateMax)

        if (dateMin !== undefined)
            query = query.where("date", ">=", dateMin)

        const transactions = await query.get()

        return transactions.docs
    }

    // Adds a transaction document to income. Provided date should be a JS Date
    async addIncome(category, date, amount, note) {
        amount = Math.round(amount * 100, 2)

        const transaction = {
            date: date,
            amount: amount,
            note: note
        }

        this.reference.set({ total: firestore.FieldValue.increment(amount) }, { merge: true })

        return await this.income.collection(category).doc().set(transaction, { merge: true })
    }

    // Adds a transaction document to expenses. Provided date should be a JS Date
    async addExpense(category, date, amount, note) {
        amount = Math.round(amount * 100, 2)

        const transaction = {
            date: date,
            amount: amount,
            note: note
        }

        this.reference.set({ total: firestore.FieldValue.increment(-amount) }, { merge: true })

        return await this.expenses.collection(category).doc().set(transaction, { merge: true })
    }

    // Modifies income transaction in a given category and gives it new data
    async modifyIncome(category, transactionID, newData) {
        const transaction = await this.income.collection(category).doc(transactionID).get()
        if (transaction.exists) {
            let change = newData.amount = Math.round(newData.amount * 100, 2)

            if (change != undefined) {
                change -= transaction.data().amount
                this.reference.set({ total: firestore.FieldValue.increment(change) }, { merge: true })
            }
        }

        return await this.income.collection(category).doc(transactionID).set(newData, { merge: true })
    }

    // Modifies expense transaction in a given category and gives it new data
    async modifyExpense(category, transactionID, newData) {
        const transaction = await this.expenses.collection(category).doc(transactionID).get()
        if (transaction.exists) {
            let change = newData.amount = Math.round(newData.amount * 100, 2)

            if (change != undefined) {
                change -= transaction.data().amount
                this.reference.set({ total: firestore.FieldValue.increment(-change) }, { merge: true })
            }
        }

        return await this.expenses.collection(category).doc(transactionID).set(newData, { merge: true })
    }

    // Removes income transaction in a given category
    async removeIncome(category, transactionID) {
        const transaction = await this.income.collection(category).doc(transactionID).get()
        let change = transaction.data().amount

        if (change != undefined)
            this.reference.set({ total: firestore.FieldValue.increment(-change) }, { merge: true })

        return await this.income.collection(category).doc(transactionID).delete()
    }

    // Removes expense transaction in a given category
    async removeExpense(category, transactionID) {
        const transaction = await this.expenses.collection(category).doc(transactionID).get()
        let change = transaction.data().amount

        if (change != undefined)
            this.reference.set({ total: firestore.FieldValue.increment(change) }, { merge: true })

        return await this.expenses.collection(category).doc(transactionID).delete()
    }

    // Returns an array with references to all categories under income
    async getIncomeCategories() {
        return await this.income.listCollections()
    }

    // Returns an array with references to all categories under expenses
    async getExpensesCategories() {
        return await this.expenses.listCollections()
    }

    // Returns a set with references to all categories under income and expenses
    async getMonetaryCategories() {
        const incomeCollections = await this.getIncomeCategories()
        const expensesCollections = await this.getExpensesCategories()

        return new Set([...incomeCollections, ...expensesCollections])
    }

    // Returns an array of income transactions within a category and date range. Dates should be JS Dates
    async getIncomeTransactions(category, dateMin, dateMax) {
        const cat = this.income.collection(category)
        return await this.#getTransaction(cat, dateMin, dateMax)
    }

    // Returns an array of expense transactions within a category and date range. Dates should be JS Dates
    async getExpensesTransactions(category, dateMin, dateMax) {
        const cat = this.expenses.collection(category)
        return await this.#getTransaction(cat, dateMin, dateMax)
    }

    // Adds a savings goal document to expenses. Date should be a JS Date
    async addSavingsGoal(name, amount, date, note) {
        const goal = {
            amount: amount,
            current: 0,
            date: date,
            note: note
        }

        return await this.savings.doc(name).set(goal, { merge: true })
    }

    // Adds a savings goal document to expenses. Date should be a JS Date
    async addAmortizationsGoal(name, amount, date, note) {
        const goal = {
            amount: amount,
            current: 0,
            date: date,
            note: note
        }

        return await this.savings.doc(name).set(goal, { merge: true })
    }

    // Modifies goal in a given category and gives it new data
    async modifyGoal(category, name, newData) {
        if (category == "savings")
            return await this.savings.doc(name).set(newData, { merge: true })

        if (category == "amortizations")
            return await this.savings.doc(name).set(newData, { merge: true })
    }

    // Recursively deletes the specified document reference
    async deleteDocument(docRef) {
        let subcollections = await docRef.listCollections()
        for (let i = 0; i < subcollections.length; i++) {
            process.nextTick(() => {
                deleteCollection(subcollections[i])
            })
        }
        docRef.delete()
    }

    // Recursively deletes the specified collection reference
    async deleteCollection(collRef) {
        let documents = await collRef.get().docs
        for (let i = 0; i < documents.length; i++) {
            this.deleteDocument(documents[i])
        }
    }

    // Removes goal in a given category and gives it new data
    async removeGoal(category, name) {
        if (category == "savings") {
            this.deleteDocument(this.savings.doc(name))
        }
        else if (category == "amortizations") {
            this.deleteDocument(this.amortizations.doc(name))
        }
    }

    // Add a savings transaction which contributes to a goal. Date should be a JS Date
    async addSavingsTransaction(goal, date, amount, note) {
        const data = {
            date: date,
            amount: amount,
            note: note
        }
        this.savings.doc(goal).collection("changes").doc().set(data, { merge: true })
        this.savings.doc(goal).update({ "current": firestore.FieldValue.increment(amount) })
    }

    // Add an amortizations transaction which contributes to a goal. Date should be a JS Date
    async addAmortizationsTransaction(goal, date, amount, note) {
        const data = {
            date: date,
            amount: amount,
            note: note
        }
        this.amortizations.doc(goal).collection("changes").doc().set(data, { merge: true })
        this.amortizations.doc(goal).update({ "current": firestore.FieldValue.increment(amount) })
    }

    // Modifies a savings transaction which contributes to a goal.
    // NOT INTENDED TO MODIFY TRANSACTION AMOUNT, MAY CAUSE UNEXPECTED PROBLEMS
    async modifySavingsTransaction(goal, transactionID, newData) {
        this.savings.doc(goal).collection("changes").doc(transactionID).set(newData, { merge: true })
        let transaction = await this.savings.doc(goal).collection("changes").doc(transactionID).get()
        let change = newData.amount
        if (transaction.exists) {
            if (change != undefined) {
                change -= transaction.data().amount
                this.savings.doc(goal).update({ "current": firestore.FieldValue.increment(change) })
            }
        }
        this.savings.doc(goal).collection("changes").doc(transactionID).set(newData, { merge: true })
    }

    // Modifies an amortizations transaction which contributes to a goal.
    // NOT INTENDED TO MODIFY TRANSACTION AMOUNT, MAY CAUSE UNEXPECTED PROBLEMS
    async modifyAmortizationsTransaction(goal, transactionID, newData) {
        let transaction = await this.amortizations.doc(goal).collection("changes").doc(transactionID).get()
        let change = newData.amount
        if (transaction.exists) {
            if (change != undefined) {
                change -= transaction.data().amount
                this.amortizations.doc(goal).update({ "current": firestore.FieldValue.increment(change) })
            }
        }
        this.amortizations.doc(goal).collection("changes").doc(transactionID).set(newData, { merge: true })
    }

    // Removes a savings transaction which contributes to a goal
    async removeSavingsTransaction(goal, transactionID) {
        let doc = await this.savings.doc(goal).collection("changes").doc(transactionID).get()
        let change = doc.data().amount
        this.savings.doc(goal).collection("changes").doc(transactionID).delete()
        this.savings.doc(goal).update({ "current": firestore.FieldValue.increment(-change) })
    }

    // Removes an amortizations transaction which contributes to a goal
    async removeAmortizationsTransaction(goal, transactionID) {
        let doc = await this.amortizations.doc(goal).collection("changes").doc(transactionID).get()
        let change = doc.data().amount
        this.amortizations.doc(goal).collection("changes").doc(transactionID).delete()
        this.amortizations.doc(goal).update({ "current": firestore.FieldValue.increment(-change) })
    }

    // Adds a new item to track as a NMT
    async addNMT(name, note) {
        const data = {
            current: 0,
            note: note
        }
        this.nmt.collection("items").doc(name).set(data, { merge: true })
    }

    // Modifies an NMT item
    async modifyNMT(name, newData) {
        this.nmt.collection("items").doc(name).set(newData, { merge: true })
    }

    // Deletes an NFT item recursively
    async deleteNMT(name) {
        this.deleteDocument(this.nmt.collection("items").doc(name))
    }

    // Adds a transaction for a specified NMT
    async addNMTTransaction(nmt, amount, date, note) {
        const data = {
            amount: amount,
            date: date,
            note: note
        }
        this.nmt.collection("items").doc(nmt).update({ "current": firestore.FieldValue.increment(amount) })
        this.nmt.collection("items").doc(nmt).collection("changes").doc().set(data, { merge: true })
    }

    // Modifies a transaction for a specified NMT
    async modifyNMTTransaction(nmt, transactionID, newData) {
        let transaction = await this.nmt.doc(nmt).collection("changes").doc(transactionID).get()
        let change = newData.amount
        if (transaction.exists) {
            if (change != undefined) {
                change -= transaction.data().amount
                this.nmt.doc(goal).update({ "current": firestore.FieldValue.increment(change) })
            }
        }
        this.nmt.doc(nmt).collection("changes").doc(transactionID).set(newData, { merge: true })
    }

    // Deletes a transaction for a specified NMT
    async removeNMTTransaction(nmt, transactionID) {
        let doc = await this.nmt.doc(nmt).collection("changes").doc(transactionID).get()
        let change = doc.data().amount
        this.nmt.doc(nmt).collection("changes").doc(transactionID).delete()
        this.nmt.doc(nmt).update({ "current": firestore.FieldValue.increment(-change) })
    }
}

module.exports = { User: User }
