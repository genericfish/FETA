"use strict"

class Money {
    constructor (value) {
        this.value = value
    }

    get Display() {
        let predisplay = this.value

        if (this.value < 0)
            predisplay = Math.abs(predisplay)

        predisplay = Math.round(predisplay / 100, 2).toFixed(2)

        return (this.value < 0 ? "-" : "") + "$" + predisplay
    }

    get Undisplay() {
        return Math.round(this.value * 100, 2)
    }
}

function getLastMonth() {
    const begin = new Date()

    begin.setDate(begin.getDate() - 30)

    begin.setHours(0)
    begin.setMinutes(0)
    begin.setSeconds(0)
    begin.setMilliseconds(0)

    return begin
}

module.exports = { Money: Money, getLastMonth: getLastMonth }
