const OTReport = require('../../models/overtime/OTReport');
const { sendNotificationToUser } = require('../../routes/notifications/notification.fun');

// Create OT Report
exports.createOTReport = async (req, res) => {
    try {
        const employeeId = req.user.userId;
        const { date, startTime, endTime, totalHours, reason, project, tasks } = req.body;

        if (!date || !startTime || !endTime || !totalHours || !reason || !project || !tasks) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        const newOTReport = new OTReport({
            employeeId,
            date,
            startTime,
            endTime,
            totalHours,
            reason,
            project,
            tasks
        });

        await newOTReport.save();

        // Send notification
        try {
            await sendNotificationToUser(
                employeeId,
                'Báo cáo OT đã được tạo',
                `Báo cáo OT ngày ${date} đã được tạo và đang chờ phê duyệt.`,
                {
                    reportId: newOTReport._id.toString(),
                    type: 'ot_report',
                    status: 'pending'
                }
            );
        } catch (notificationError) {
            console.error('Lỗi khi gửi thông báo:', notificationError);
        }

        return res.status(201).json({
            success: true,
            message: 'Tạo báo cáo OT thành công',
            data: newOTReport
        });

    } catch (err) {
        console.error('Lỗi khi tạo báo cáo OT:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Get all OT Reports
exports.getOTReports = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            startDate,
            endDate
        } = req.query;

        const filter = {};

        if (!req.user.isAdmin) {
            filter.employeeId = req.user.userId;
        }

        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const [reports, total] = await Promise.all([
            OTReport.find(filter)
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .populate('employeeId', 'email'),
            OTReport.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            data: {
                reports,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalRecords: total,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (err) {
        console.error('Lỗi khi lấy danh sách báo cáo OT:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Get all OT Reports for admin
exports.getAllEmployeeOTReports = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            startDate,
            endDate,
            employeeEmail
        } = req.query;

        // Build aggregation pipeline
        const aggregationPipeline = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'employeeId',
                    foreignField: '_id',
                    as: 'employee'
                }
            },
            { $unwind: '$employee' }
        ];

        // Add filters
        const filter = {};
        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        if (employeeEmail) {
            aggregationPipeline.push({
                $match: {
                    'employee.email': { $regex: employeeEmail, $options: 'i' }
                }
            });
        }

        if (Object.keys(filter).length > 0) {
            aggregationPipeline.push({ $match: filter });
        }

        // Get total count
        const totalDocs = await OTReport.aggregate([
            ...aggregationPipeline,
            { $count: 'total' }
        ]);

        // Add pagination
        aggregationPipeline.push(
            { $sort: { createdAt: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        );

        const reports = await OTReport.aggregate(aggregationPipeline);
        const total = totalDocs[0]?.total || 0;

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách báo cáo OT thành công',
            data: {
                reports: reports.map(report => ({
                    ...report,
                    employeeEmail: report.employee.email,
                    employeeId: report.employee._id
                })),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalRecords: total,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (err) {
        console.error('Lỗi khi lấy danh sách báo cáo OT:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Get OT Report Detail
exports.getOTReportDetail = async (req, res) => {
    try {
        const report = await OTReport.findById(req.params.id)
            .populate('employeeId', 'email');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo OT'
            });
        }

        return res.status(200).json({
            success: true,
            data: report
        });

    } catch (err) {
        console.error('Lỗi khi lấy chi tiết báo cáo OT:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Get OT Report Detail for admin
exports.getOTReportDetailAdmin = async (req, res) => {
    try {
        const reportId = req.params.id;

        const report = await OTReport.findById(reportId)
            .populate({
                path: 'employeeId',
                select: 'email name role fcmToken createdAt'
            });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo OT'
            });
        }

        const response = {
            success: true,
            message: 'Lấy chi tiết báo cáo OT thành công',
            data: {
                ...report.toObject(),
                canApprove: report.status === 'pending',
                reportAge: Math.floor((Date.now() - report.createdAt) / (1000 * 60 * 60 * 24)),
                employee: {
                    id: report.employeeId._id,
                    email: report.employeeId.email,
                    name: report.employeeId.name,
                    role: report.employeeId.role,
                    accountCreated: report.employeeId.createdAt
                }
            }
        };

        return res.status(200).json(response);

    } catch (err) {
        console.error('Lỗi khi lấy chi tiết báo cáo OT:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Update OT Report
exports.updateOTReport = async (req, res) => {
    try {
        const { date, startTime, endTime, totalHours, reason, project, tasks } = req.body;
        const reportId = req.params.id;
        const userId = req.user.userId;

        const report = await OTReport.findById(reportId);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo OT'
            });
        }

        if (report.employeeId.toString() !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền cập nhật báo cáo này'
            });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể cập nhật báo cáo đang chờ duyệt'
            });
        }

        const updatedReport = await OTReport.findByIdAndUpdate(
            reportId,
            {
                date,
                startTime,
                endTime,
                totalHours,
                reason,
                project,
                tasks
            },
            { new: true }
        ).populate('employeeId', 'email');

        return res.status(200).json({
            success: true,
            message: 'Cập nhật báo cáo OT thành công',
            data: updatedReport
        });

    } catch (err) {
        console.error('Lỗi khi cập nhật báo cáo OT:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Approve OT Report
exports.approveOTReport = async (req, res) => {
    try {
        const reportId = req.params.id;
        const adminId = req.user.userId;
        const { note } = req.body;

        const report = await OTReport.findById(reportId)
            .populate('employeeId', 'email fcmToken');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo OT'
            });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể phê duyệt báo cáo đang chờ duyệt'
            });
        }

        report.status = 'approved';
        report.adminNote = note;
        report.approvedBy = adminId;
        report.approvedAt = new Date();

        await report.save();

        // Send notification
        try {
            await sendNotificationToUser(
                report.employeeId._id,
                'Báo cáo OT được chấp thuận',
                `Báo cáo OT ngày ${report.date.toLocaleDateString()} đã được phê duyệt`,
                {
                    type: 'ot_report_approved',
                    reportId: report._id,
                    note: note
                }
            );
        } catch (notifyError) {
            console.error('Lỗi gửi thông báo:', notifyError);
        }

        return res.status(200).json({
            success: true,
            message: 'Phê duyệt báo cáo OT thành công',
            data: report
        });

    } catch (error) {
        console.error('Lỗi khi phê duyệt báo cáo:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Reject OT Report
exports.rejectOTReport = async (req, res) => {
    try {
        const reportId = req.params.id;
        const adminId = req.user.userId;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp lý do từ chối'
            });
        }

        const report = await OTReport.findById(reportId)
            .populate('employeeId', 'email fcmToken');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo OT'
            });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể từ chối báo cáo đang chờ duyệt'
            });
        }

        report.status = 'rejected';
        report.rejectionReason = reason;
        report.rejectedBy = adminId;
        report.rejectedAt = new Date();

        await report.save();

        // Send notification
        try {
            await sendNotificationToUser(
                report.employeeId._id,
                'Báo cáo OT bị từ chối',
                `Báo cáo OT ngày ${report.date.toLocaleDateString()} đã bị từ chối`,
                {
                    type: 'ot_report_rejected',
                    reportId: report._id,
                    reason: reason
                }
            );
        } catch (notifyError) {
            console.error('Lỗi gửi thông báo:', notifyError);
        }

        return res.status(200).json({
            success: true,
            message: 'Từ chối báo cáo OT thành công',
            data: report
        });

    } catch (error) {
        console.error('Lỗi khi từ chối báo cáo:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Delete OT Report
exports.deleteOTReport = async (req, res) => {
    try {
        const reportId = req.params.id;
        const userId = req.user.userId;

        const report = await OTReport.findById(reportId);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo OT'
            });
        }

        if (report.employeeId.toString() !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền xóa báo cáo này'
            });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể xóa báo cáo đang chờ duyệt'
            });
        }

        await OTReport.findByIdAndDelete(reportId);

        return res.status(200).json({
            success: true,
            message: 'Xóa báo cáo OT thành công'
        });

    } catch (err) {
        console.error('Lỗi khi xóa báo cáo OT:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};