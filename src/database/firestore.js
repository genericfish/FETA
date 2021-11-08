"use strict"

const { join } = require('path')
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app')
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore')

class Database {
    static gInitialized = false
    static gDatabase = null

    constructor() {
        if (!Database.gInitialized) {
            const serviceAccount = require(join(__basedir, '../private.json'))

            initializeApp({
                credential: cert(serviceAccount)
            })

            Database.gDatabase = getFirestore()
            Database.gInitialized = true
        }
    }

    // Returns references to all users in the database
    async getUsers() {
        const snapshot = await Database.gDatabase.collection("users").get();
        return snapshot
    }

    // Adds user document with given email and password. Password overwritten if user exists
    async addUser(newEmail, newPassword) {
        const data = {
            password: newPassword
        }

        await Database.gDatabase.collection("users").doc(newEmail).set(data)
    }

    // Returns true if the user document with the given email exists, otherwise false
    async userExists(email){
        return await Database.gDatabase.collection("users").doc(email).get().exists
    }

    // Returns true if the password for a given user email is accurate
    async verifyCredentials(_email, _password){
        let user = await Database.gDatabase.collection("users").doc(_email).get()
        if(user.exists){
            return user.data().password == _password
        }
        return false
    }

}

class User {
    constructor(email){
        this.reference = Database.gDatabase.collection("users").doc(email)
        this.transactions =  this.reference.collection("transactions")
        this.income = this.transactions.doc("income")
        this.expenses = this.transactions.doc("expenses")
        this.goals = this.transactions.doc("goals")
        this.nmt = this.transactions.doc("nmt")
    }

    // Adds a transaction document to income. Provided date should be a JS Date
    async addIncome(category, _date, _amount, _note){
        const transaction = {
            date: _date,
            amount: _amount,
            note: _note
        }
        await this.income.collection(category).doc().set(transaction)
    }

    // Adds a transaction document to expenses. Provided date should be a JS Date
    async addExpense(category, _date, _amount, _note){
        const transaction = {
            date: _date,
            amount: _amount,
            note: _note
        }
        await this.expenses.collection(category).doc().set(transaction)
    }

    // Modifies income transaction in a given category and gives it new data
    async modifyIncome(category, transactionID, newData){
        await this.income.collection(category).doc(transactionID).set(newData)
    }

    // Modifies expense transaction in a given category and gives it new data
    async modifyExpense(category, transactionID, newData){
        await this.expenses.collection(category).doc(transactionID).set(newData)
    }

    // Removes income transaction in a given category
    async removeIncome(category, transactionID){
        await this.income.collection(category).doc(transactionID).delete()
    }

    // Removes expense transaction in a given category
    async removeExpense(category, transactionID){
        await this.expenses.collection(category).doc(transactionID).delete()
    }

    // Returns an array with references to all categories under income
    async getIncomeCategories(){
        return await this.income.listCollections();
    }

    // Returns an array with references to all categories under expenses
    async getExpensesCategories(){
        return await this.expenses.listCollections();
    }

    // Returns a set with references to all categories under income and expenses
    async getMonetaryCategories(){
        const incomeCollections = await this.getIncomeCategories()
        const expensesCollections = await this.getExpensesCategories()
        let result = new Set()
        incomeCollections.forEach(collection => {result.add(collection)})
        expensesCollections.forEach(collection => {result.add(collection)})
        return result
    }

    // Returns an array of income transactions within a category and date range. Dates should be JS Dates
    async getIncomeTransactions(category, dateMin, dateMax){
        const cat = this.income.collection(category)
        const transasction = await cat.where("date", "<=", dateMax).where("date", ">=", dateMin).get()
        let result = new Array()
        transasction.forEach(trans => {result.push(trans)})
        return result
    }

    // Returns an array of expense transactions within a category and date range. Dates should be JS Dates
    async getExpensesTransactions(category, dateMin, dateMax){
        const cat = this.expenses.collection(category)
        const transasction = await cat.where("date", "<=", dateMax).where("date", ">=", dateMin).get()
        let result = new Array()
        transasction.forEach(trans => {result.push(trans)})
        return result
    }
}


exports.Database = Database
exports.User = User