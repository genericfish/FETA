"use strict"

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app')
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore')

// Initialize Firebase

const serviceAccount = require('../private.json')

initializeApp({
    credential: cert(serviceAccount)
})

const db = getFirestore()

async function getUsers(db) {
    const snapshot = await db.collection("users").get();

    snapshot.forEach(doc => console.log(doc.id, '=>', doc.data()))
}

getUsers(db)