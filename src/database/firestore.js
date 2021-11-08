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
        const collections = await this.income.listCollections();
        collections.forEach(collection => {
            console.log('Found subcollection with id:', collection.id);
        });
        return collections
    }

    async getExpensesCategories(){
        const collections = await this.income.listCollections();
        collections.forEach(collection => {
            console.log('Found subcollection with id:', collection.id);
        });
        return collections
    }

    async getMonetaryCategories(){
        const incomeCollections = this.getIncomeCategories()
        const expensesCollections = this.getExpensesCategories()
        var result = new Set()
        incomeCollections.forEach(collection => {result.add(collection)})
        expensesCollections.forEach(collection => {result.add(collection)})
        return result
    }

    async getIncomeTransactions(category, dateMin, dateMax){
        const collections = this.getIncomeCategories()
        var result = new Array()
        collections.forEach(category => {
            const transasction = await category.where("date", "<", dateMax).where("date", ">", dateMin).get()
            transasction.forEach(trans => {result.push(trans)})
        })
        return result
    }


    async getExpensesTransactions(category, dateMin, dateMax){
        const collections = this.getExpensesCategories()
        var result = new Array()
        collections.forEach(category => {
            const transasction = await category.where("date", "<", dateMax).where("date", ">", dateMin).get()
            transasction.forEach(trans => {result.push(trans)})
        })
        return result
    }
}


exports.Database = Database
exports.User = User