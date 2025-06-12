const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Changed from 'Employee' to 'User'
        required: true
    },
    name: String,
    position: String
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
        required: true,
        set: function (date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d;
        }
    },
    weekEnd: {
        type: Date,
        required: true,
        set: function (date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d;
        }
    },
    days: {
        type: [DaySchema],
        validate: {
            validator: function (days) {
                return days.length === 7;
            },
            message: 'Phải có đúng 7 ngày trong tuần'
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // người tạo lịch
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('WeeklySchedule', WeeklyScheduleSchema);
