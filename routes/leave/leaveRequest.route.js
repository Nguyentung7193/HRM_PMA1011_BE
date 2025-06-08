// src/routes/leaveRequest.route.js
const express = require('express');
const router = express.Router();
const leaveRequestController = require('../../controller/leave/leaveRequest.controller');

router.post('/', leaveRequestController.createLeaveRequest);
router.get('/leaves', leaveRequestController.getLeaveRequests);
router.get('/:id', leaveRequestController.getLeaveRequestDetail);
router.delete('/:id', leaveRequestController.deleteLeaveRequest);
router.put('/:id', leaveRequestController.updateLeaveRequest);

module.exports = router;
