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

    async getUsers() {
        const snapshot = await Database.gDatabase.collection("users").get();
    
        snapshot.forEach(doc => console.log(doc.id, '=>', doc.data()))
    }

    async addUser(newEmail, newPassword) {
        const data = {
            password: newPassword
        }

        const result = await Database.gDatabase.collection("users").doc(newEmail).set(data)
    }

    async userExists(email){
        return await Database.gDatabase.collection("users").doc(email).get().exists
    }

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

    async addIncome(category, _date, _amount, _note){
        const transaction = {
            date: _date,
            amount: _amount,
            note: _note
        }
        await this.income.collection(category).doc().set(transaction)
    }

    async addExpense(category, _date, _amount, _note){
        const transaction = {
            date: _date,
            amount: _amount,
            note: _note
        }
        await this.expenses.collection(category).doc().set(transaction)
    }

    async modifyIncome(category, transactionID, newData){
        await this.income.collection(category).doc(transactionID).set(newData)
    }

    async modifyExpense(category, transactionID, newData){
        await this.expenses.collection(category).doc(transactionID).set(newData)
    }

    async removeIncome(category, transactionID){
        await this.income.collection(category).doc(transactionID).delete()
    }

    async removeExpense(category, transactionID){
        await this.expenses.collection(category).doc(transactionID).delete()
    }

    async getIncomeCategories(){
        return await this.income.listCollections();
    }

    async getExpensesCategories(){
        return await this.expenses.listCollections();
    }

    async getMonetaryCategories(){
        const incomeCollections = await this.getIncomeCategories()
        const expensesCollections = await this.getExpensesCategories()
        let result = new Set()
        incomeCollections.forEach(collection => {result.add(collection)})
        expensesCollections.forEach(collection => {result.add(collection)})
        return result
    }

    async getIncomeTransactions(category, dateMin, dateMax){
        const cat = this.income.collection(category)
        const transasction = await cat.where("date", "<=", dateMax).where("date", ">=", dateMin).get()
        let result = new Array()
        transasction.forEach(trans => {result.push(trans)})
        return result
    }


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