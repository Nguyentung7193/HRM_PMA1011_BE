// src/routes/leaveRequest.route.js
const express = require('express');
const router = express.Router();
const leaveRequestController = require('../../controller/leave/leaveRequest.controller');

router.post('/', leaveRequestController.createLeaveRequest);
router.get('/leaves', leaveRequestController.getLeaveRequests);

module.exports = router;
