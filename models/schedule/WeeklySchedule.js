const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    }
}, { _id: false });

const DaySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    shifts: {
        morning: [ShiftSchema],
        afternoon: [ShiftSchema]
    }
}, { _id: false });

const WeeklyScheduleSchema = new mongoose.Schema({
    weekStart: {
        type: Date,
        required: true
    },
    weekEnd: {
        type: Date,
        required: true
    },
    days: {
        type: [DaySchema],
        validate: {
            validator: function(days) {
                return days.length === 7;
            },
            message: 'Phải có đúng 7 ngày trong tuần'
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('WeeklySchedule', WeeklyScheduleSchema);
