const express = require('express');
const router = express.Router();
const notificationController = require('../../controller/notification/notification.controller');
const authenticate = require('../../middleware/authenticate');

router.get('/list', authenticate, notificationController.getUserNotifications);

module.exports = router;