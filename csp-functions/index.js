const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

exports.helloWorld = onRequest((request, response) => {
  logger.info("Function called", {structuredData: true});
  response.send("CSP Firebase Functions");
});
