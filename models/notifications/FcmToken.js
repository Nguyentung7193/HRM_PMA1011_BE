// models/FcmToken.js
const mongoose = require('mongoose');

const FcmTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FcmToken', FcmTokenSchema);
