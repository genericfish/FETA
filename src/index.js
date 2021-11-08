"use strict"

global.__basedir = __dirname

const { join } = require("path")
const { Database, User } = require(join(__basedir, "database", "firestore.js"))
const db = new Database()
