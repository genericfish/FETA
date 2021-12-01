const fs = require('fs')
const readline = require('readline')
const { google } = require('googleapis')
class Gmail {
    static gScopes = ["https://www.googleapis.com/auth/gmail.send"]
    static gCredentialsPath = process.env.OAUTH_CLIENT_CREDENTIALS || "credentials.json"
    static gTokenPath = process.env.OAUTH_CLIENT_TOKEN || "token.json"
    static gSender = process.env.MAILING_LIST_SENDER || "taeleshotsauce@gmail.com"
    static gOAuthClient = null

    static {
        if (!fs.existsSync(this.gCredentialsPath)) {
            console.error(`[Gmail] Cannot find credentials file "${this.gCredentialsPath}"`)
            process.exit(1)
        }

        this.#authorize()
    }

    static #authorize() {
        const credentials = fs.readFileSync(this.gCredentialsPath)
        const { client_secret, client_id, redirect_uris } = JSON.parse(credentials).installed
        this.gOAuthClient = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

        if (!fs.existsSync(this.gTokenPath))
            return this.#getNewToken()

        const token = fs.readFileSync(this.gTokenPath)

        this.gOAuthClient.setCredentials(JSON.parse(token))
    }

    static #getNewToken() {
        const authURL = gOAuthClient.generateAuthUrl({
            access_type: "offline",
            scope: this.gScopes
        })

        console.log("Open this URL for authorization token: ", authURL)

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        rl.question("Enter token: ", code => {
            rl.close()

            this.gOAuthClient.getToken(code, (err, token) => {
                if (err) {
                    console.error("[GMail] Error retrieving access token")
                    process.exit(1)
                }

                this.gOAuthClient.setCredentials(token)

                fs.writeFile(this.gTokenPath, JSON.stringify(token), err => {
                    if (err)
                        return console.error(err)

                    console.log("Stored token at", this.gTokenPath)
                })
            })
        })
    }

    static #createEmail(recipient, subject, message) {
        const request = [
            'Content-Type: text/plain; charset="UTF-8"\n',
            'MIME-Version: 1.0\n',
            'Content-Transfer-Encoding: 7bit\n',
            `to: ${recipient}\n`,
            `from: ${this.gSender}\n`,
            `subject: ${subject}\n\n`,
            message
        ].join('')

        return Buffer.from(request, "utf8").toString("base64")
    }

    static send(recipient, subject, message) {
        if (this.gOAuthClient === null)
            return console.error("[Gmail] Cannot send email because gOAuthClient is not setup.")

        const gmail = google.gmail({ version: "v1", auth: this.gOAuthClient })
        gmail.users.messages.send({
            userId: "me",
            resource: {
                raw: this.#createEmail(recipient, `FETA: ${subject}`, message)
            }
        }, (err, res) => {
            if (err) {
                console.error(`[Gmail] Failed to send email to "${recipient}" with subject "${subject}".`)
                console.error(err)
                return
            }
        })
    }
}

module.exports = { Gmail: Gmail }
