const mongoose = require('mongoose');

const timeLogSchema = new mongoose.Schema({
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: {
        type: Date,
        default: null
    },
    duration: {
        type: Number,
        default: 0
    }
});

const attendanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true,
        get: (date) => {
            if (date) {
                return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            }
            return date;
        }
    },
    timeLogs: {
        type: [timeLogSchema],
        default: []
    },
    totalHours: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'completed'],
        default: 'active'
    }
}, {
    timestamps: true,
    toJSON: { getters: true }
});

module.exports = mongoose.model('Attendance', attendanceSchema);