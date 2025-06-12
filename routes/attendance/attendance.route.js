const express = require('express');
const router = express.Router();
const attendanceController = require('../../controller/attendance/attendance.controller');
const authenticate = require('../../middleware/authenticate');

router.post('/check', authenticate, attendanceController.checkInOut);
router.get('/history', authenticate, attendanceController.getAttendanceHistory);

module.exports = router;