"use strict"

const path = require("path")
const { initializeApp, cert, applicationDefault } = require("firebase-admin/app")
const { getFirestore } = require("firebase-admin/firestore")
const bcrypt = require("bcrypt")
const saltRounds = process.env.SALT_ROUNDS || 10

class Database {
    static gDatabase = null

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
    static async addUser(email, firstname, lastname, password) {
        const hashedPassword = await bcrypt.hash(password, saltRounds)
        const data = {
            password: hashedPassword,
            firstname: firstname,
            lastname: lastname,
            total: 0
        }

        await Database.gDatabase.collection("users").doc(email).set(data)
    }

    // Returns true if the user document with the given email exists, otherwise false
    static async userExists(email) {
        const userData = await Database.gDatabase.collection("users").doc(email).get()
        return userData.exists
    }

    // Returns true if the password for a given user email is accurate
    static async verifyCredentials(email, password) {
        const user = await Database.gDatabase.collection("users").doc(email).get()

        if (!user.exists)
            return false

        const hashedPassword = user.data().password

        return await bcrypt.compare(password, hashedPassword)
    }
}

module.exports = { Database: Database }
