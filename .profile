# This is to be run on the Heroku dyno
echo ${GOOGLE_CREDENTIALS} > /app/google-credentials.json
echo ${GMAIL_CREDENTIALS} > /app/gmail-credentials.json
echo ${GMAIL_TOKEN} > /app/gmail-token.json
