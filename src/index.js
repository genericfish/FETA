"use strict"

global.__basedir = __dirname

const { Database } = require("./database/firestore.js")
const db = new Database()

db.getUsers()