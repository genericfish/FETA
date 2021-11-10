"use strict"

const path = require("path")
const { initializeApp, cert, applicationDefault } = require("firebase-admin/app")
const { getFirestore } = require("firebase-admin/firestore")

class Database {
    static gDatabase = null;

    static {
        if (Database.gDatabase == null) {
            let firestoreSettings = {}

            if (process.env.GOOGLE_APPLICATION_CREDENTIALS !== undefined) {
                firestoreSettings.credential = applicationDefault()
            } else {
                const serviceAccount = require(path.join(__basedir, "../private.json"))
                firestoreSettings.credential = cert(serviceAccount)
            }

            initializeApp(firestoreSettings)

            Database.gDatabase = getFirestore()
        }
    }

    // Returns references to all users in the database
    static async getUsers() {
        return await Database.gDatabase.collection("users").get()
    }

    // Adds user document with given email and password. Password overwritten if user exists
    static async addUser(newEmail, newPassword) {
        const data = {
            password: newPassword
        }

        return await Database.gDatabase.collection("users").doc(newEmail).set(data)
    }

    // Returns true if the user document with the given email exists, otherwise false
    static async userExists(email) {
        return await Database.gDatabase.collection("users").doc(email).get().exists
    }

    // Returns true if the password for a given user email is accurate
    static async verifyCredentials(_email, _password) {
        let user = await Database.gDatabase.collection("users").doc(_email).get()

        if (!user.exists)
            return false

        return user.data().password == _password
    }
}

class User {
    constructor(email) {
        this.reference = Database.gDatabase.collection("users").doc(email)
        this.transactions = this.reference.collection("transactions")
        this.income = this.transactions.doc("income")
        this.expenses = this.transactions.doc("expenses")
        this.goals = this.transactions.doc("goals")
        this.savings = this.goals.collection("savings")
        this.amortizations = this.goals.collection("amortizations")
        this.nmt = this.transactions.doc("nmt")
    }

    // Adds a transaction document to income. Provided date should be a JS Date
    async addIncome(category, date, amount, note) {
        const transaction = {
            date: date,
            amount: amount,
            note: note
        }

        return await this.income.collection(category).doc().set(transaction)
    }

    // Adds a transaction document to expenses. Provided date should be a JS Date
    async addExpense(category, date, amount, note) {
        const transaction = {
            date: date,
            amount: amount,
            note: note
        }

        return await this.expenses.collection(category).doc().set(transaction)
    }

    // Modifies income transaction in a given category and gives it new data
    async modifyIncome(category, transactionID, newData) {
        return await this.income.collection(category).doc(transactionID).set(newData)
    }

    // Modifies expense transaction in a given category and gives it new data
    async modifyExpense(category, transactionID, newData) {
        return await this.expenses.collection(category).doc(transactionID).set(newData)
    }

    // Removes income transaction in a given category
    async removeIncome(category, transactionID) {
        return await this.income.collection(category).doc(transactionID).delete()
    }

    // Removes expense transaction in a given category
    async removeExpense(category, transactionID) {
        return await this.expenses.collection(category).doc(transactionID).delete()
    }

    // Returns an array with references to all categories under income
    async getIncomeCategories() {
        return await this.income.listCollections();
    }

    // Returns an array with references to all categories under expenses
    async getExpensesCategories() {
        return await this.expenses.listCollections();
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
        const transactions = await cat
            .where("date", "<=", dateMax)
            .where("date", ">=", dateMin)
            .get()

        return transactions.docs
    }

    // Returns an array of expense transactions within a category and date range. Dates should be JS Dates
    async getExpensesTransactions(category, dateMin, dateMax) {
        const cat = this.expenses.collection(category)
        const transactions = await cat
            .where("date", "<=", dateMax)
            .where("date", ">=", dateMin)
            .get()

        return transactions.docs
    }

    // Adds a savings goal document to expenses. Date should be a JS Date
    async addSavingsGoal(name, amount, date, note){
        const goal = {
            amount: amount,
            current: 0,
            date: date,
            note: note
        }

        return await this.savings.doc(name).set(goal)
    }

    // Adds a savings goal document to expenses. Date should be a JS Date
    async addAmortizationsGoal(name, amount, date, note){
        const goal = {
            amount: amount,
            current: 0,
            date: date,
            note: note
        }

        return await this.savings.doc(name).set(goal)
    }

    // Modifies goal in a given category and gives it new data
    
    async modifyGoal(category, name, newData) {
        if(category == "savings"){
            return await this.savings.doc(name).set(newData)
        }
        else if(category == "amortizations"){
            return await this.savings.doc(name).set(newData)
        }
    }

    // Recursively deletes the specified document reference
    async deleteDocument(docRef){
        let subcollections = await docRef.listCollections()
        for (let i = 0; i < subcollections.length; i++){
            process.nextTick(() => {
                deleteCollection(subcollections[i])
            })
        }
        docRef.delete()
    }

    // Recursively deletes the specified collection reference
    async deleteCollection(collRef){
        let documents = await collRef.get().docs
        for (let i = 0; i < documents.length; i++){
            this.deleteDocument(documents[i])
        }
    }

    // Removes goal in a given category and gives it new data
    async removeGoal(category, name) {
        if(category == "savings"){
            this.deleteDocument(this.savings.doc(name))
        }
        else if(category == "amortizations"){
            this.deleteDocument(this.amortizations.doc(name))
        }
    }

    // Add a savings transaction which contributes to a goal. Date should be a JS Date
    async addSavingsTransaction(goal, date, amount, note){
        const data = {
            date: date,
            amount: amount,
            note: note
        }
        this.savings.doc(goal).collection("changes").doc().set(data)
        this.savings.doc(goal).update({amount: FieldValue.increment(amount)})
    }

    // Add an amortizations transaction which contributes to a goal. Date should be a JS Date
    async addAmortizationsTransaction(goal, date, amount, note){
        const data = {
            date: date,
            amount: amount,
            note: note
        }
        this.amortizations.doc(goal).collection("changes").doc().set(data)
        this.amortizations.doc(goal).update({amount: FieldValue.increment(amount)})
    }

    // Modifies a savings transaction which contributes to a goal.
    // NOT INTENDED TO MODIFY TRANSACTION AMOUNT, MAY CAUSE UNEXPECTED PROBLEMS
    async modifySavingsTransaction(goal, transactionID, newData){
        this.savings.doc(goal).collection("changes").doc(transactionID).set(newData)
        let transaction = await this.savings.doc(goal).collection("changes").doc(transactionID).get()
        let change = newData.amount
        if(transaction.exists){
            if(change != undefined){
                change -= transaction.data().amount
                this.savings.doc(goal).update({amount: FieldValue.increment(change)})
            }
        }
        this.savings.doc(goal).collection("changes").doc(transactionID).set(newData)
    }

    // Modifies an amortizations transaction which contributes to a goal.
    // NOT INTENDED TO MODIFY TRANSACTION AMOUNT, MAY CAUSE UNEXPECTED PROBLEMS
    async modifyAmortizationsTransaction(goal, transactionID, newData){
        let transaction = await this.amortizations.doc(goal).collection("changes").doc(transactionID).get()
        let change = newData.amount
        if(transaction.exists){
            if(change != undefined){
                change -= transaction.data().amount
                this.amortizations.doc(goal).update({amount: FieldValue.increment(change)})
            }
        }
        this.amortizations.doc(goal).collection("changes").doc(transactionID).set(newData)
    }

    // Removes a savings transaction which contributes to a goal
    async removeSavingsTransaction(goal, transactionID){
        let change = await this.savings.doc(goal).collection("changes").doc(transactionID).get().data().amount
        this.savings.doc(goal).collection("changes").doc(transactionID).delete()
        this.savings.doc(goal).update({amount: FieldValue.increment(-change)})
    }

    // Removes an amortizations transaction which contributes to a goal
    async removeAmortizationsTransaction(goal, transactionID){
        let change = await this.amortizations.doc(goal).collection("changes").doc(transactionID).get().data().amount
        this.amortizations.doc(goal).collection("changes").doc(transactionID).delete()
        this.amortizations.doc(goal).update({amount: FieldValue.increment(-change)})
    }

}

module.exports = {
    Database: Database,
    User: User
}
