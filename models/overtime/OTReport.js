const mongoose = require('mongoose');

const otReportSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    totalHours: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    project: {
        type: String,
        required: true
    },
    tasks: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('OTReport', otReportSchema);