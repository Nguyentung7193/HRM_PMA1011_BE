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