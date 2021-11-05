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



exports.Database = Database