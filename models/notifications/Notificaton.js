// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // User nhận notification
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Nội dung notification
    title: {
        type: String,
        required: true,
        trim: true
    },

    body: {
        type: String,
        required: true,
        trim: true
    },

    // Data payload (optional)
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Loại notification
    type: {
        type: String,
        enum: [
            'leave_request',
            'leave_approved',
            'leave_rejected',
            'system',
            'reminder',
            'announcement'
        ],
        default: 'system'
    },

    // Trạng thái
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'failed'],
        default: 'sent'
    },

    // Đã đọc chưa
    isRead: {
        type: Boolean,
        default: false
    },

    // Thời gian đọc
    readAt: {
        type: Date,
        default: null
    },

    // FCM message ID (để tracking)
    fcmMessageId: {
        type: String,
        default: null
    },

    // Thông tin thêm
    priority: {
        type: String,
        enum: ['low', 'normal', 'high'],
        default: 'normal'
    }
}, {
    timestamps: true // Tự động tạo createdAt, updatedAt
});

module.exports = mongoose.model('Notification', notificationSchema);