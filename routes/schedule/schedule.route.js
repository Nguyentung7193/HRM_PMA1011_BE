const express = require('express');
const router = express.Router();
const scheduleController = require('../../controller/schedule/schedule.controller');
const authenticate = require('../../middleware/authenticate');

// Routes available for all authenticated users
router.get('/current', authenticate, scheduleController.getCurrentWeekSchedule);
router.post('/', authenticate, scheduleController.createSchedule);
router.put('/:scheduleId', authenticate, scheduleController.updateSchedule);
router.get('/all', authenticate, scheduleController.getAllSchedules);

module.exports = router;