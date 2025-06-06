const express = require('express');
const router = express.Router();
const notificationController = require('../../controller/notification/notification.controller');
const authenticate = require('../../middleware/authenticate');
const User = require('../../models/auth/User');
const Notification = require('../../models/notifications/Notificaton');
const admin = require('../../utils/firebase');


/**
 * Gửi notification cho một user cụ thể
 * @param {string} userId - ID của user
 * @param {string} title - Tiêu đề notification
 * @param {string} body - Nội dung notification
 * @param {object} data - Data tùy chọn để gửi kèm (optional)
 * @returns {Promise<object>} - Response từ Firebase
 */
/**
 * Gửi notification cho nhiều users cùng lúc
 * @param {string[]} userIds - Array các user IDs
 * @param {string} title - Tiêu đề notification
 * @param {string} body - Nội dung notification
 * @param {object} data - Data tùy chọn để gửi kèm (optional)
 * @returns {Promise<object>} - Kết quả gửi notification
 */
const sendNotificationToUser = async (userId, title, body, data = null) => {
  try {
    if (!userId || !title || !body) {
      throw new Error('Missing required parameters');
    }

    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      throw new Error('User not found or FCM token not available');
    }

    const message = {
      notification: { title, body },
      token: user.fcmToken,
    };
    if (data) {
      message.data = data;
    }

    // Gửi notification qua Firebase
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);

    // Lưu notification vào database
    const notification = new Notification({
      userId,
      title,
      body,
      data,
      type: data?.type || 'system',
      fcmMessageId: response,
      status: 'sent',
      priority: 'normal'
    });

    await notification.save();

    return {
      success: true,
      response,
      notification,
      message: 'Notification sent and saved successfully'
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};
const sendNotificationToMultipleUsers = async (userIds, title, body, data = null) => {
  try {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('userIds phải là một array không rỗng');
    }

    const results = await Promise.allSettled(
      userIds.map(userId => sendNotificationToUser(userId, title, body, data))
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    return {
      success: true,
      total: userIds.length,
      successful,
      failed,
      results
    };
  } catch (error) {
    console.error('Error sending notifications to multiple users:', error);
    throw error;
  }
};


module.exports = {
  sendNotificationToUser,
  sendNotificationToMultipleUsers
};
