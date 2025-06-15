const express = require('express');
const router = express.Router();
const leaveRequestController = require('../../controller/leave/leaveRequest.controller');
const authenticate = require('../../middleware/authenticate');
const isAdmin = require('../../middleware/isAdmin');

router.post('/', leaveRequestController.createLeaveRequest);
router.get('/leaves', leaveRequestController.getLeaveRequests);
router.get('/:id', leaveRequestController.getLeaveRequestDetail);
router.delete('/:id', leaveRequestController.deleteLeaveRequest);
router.put('/:id', leaveRequestController.updateLeaveRequest);
// router cho admin
router.get('/admin/all', authenticate, leaveRequestController.getAllEmployeeLeaveRequests);
router.get('/admin/details/:id', authenticate, leaveRequestController.getLeaveRequestDetailAdmin);
// Admin routes for approval/rejection
router.post('/admin/approve/:id', authenticate, leaveRequestController.approveLeaveRequest);
router.post('/admin/reject/:id', authenticate, leaveRequestController.rejectLeaveRequest);
module.exports = router;
