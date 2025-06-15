const express = require('express');
const router = express.Router();
const otReportController = require('../../controller/overtime/otReport.controller');
const authenticate = require('../../middleware/authenticate');

router.post('/', authenticate, otReportController.createOTReport);
router.get('/', authenticate, otReportController.getOTReports);
router.get('/:id', authenticate, otReportController.getOTReportDetail);
router.put('/:id', authenticate, otReportController.updateOTReport);
router.delete('/:id', authenticate, otReportController.deleteOTReport);
// Admin routes
router.get('/admin/all', authenticate, otReportController.getAllEmployeeOTReports);
router.get('/admin/details/:id', authenticate, otReportController.getOTReportDetailAdmin);
router.post('/admin/approve/:id', authenticate, otReportController.approveOTReport);
router.post('/admin/reject/:id', authenticate, otReportController.rejectOTReport);


module.exports = router;