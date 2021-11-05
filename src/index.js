"use strict"

global.__basedir = __dirname

const { Database, User } = require("./database/firestore.js")
const db = new Database()