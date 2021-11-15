"use strict"

const glob = require("glob")
const path = require("path")

// Pull all submodules into one "firestore" module
glob.sync(path.join(__dirname, "*.js")).map(file => {
    if (file === __filename)
        return

    module.exports = {
        ...module.exports,
        ...require(file)
    }
})
