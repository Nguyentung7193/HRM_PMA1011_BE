const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    position: {
        type: String,
        required: true
    },
    fcmToken: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);