"use strict"

module.exports = {
    Display: value => Math.round(value / 100, 2),
    Undisplay: value => Math.round(value * 100, 2)
}
