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
}


exports.Database = Database
exports.User = User