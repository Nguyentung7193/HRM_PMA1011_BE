const admin = require("firebase-admin");
const serviceAccount = require("../config/pma1011-d9be6-firebase-adminsdk-fbsvc-7c46a194e2.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
