// src/controllers/leaveRequest.controller.js
const LeaveRequest = require('../../models/leave/LeaveRequest');
const { sendNotificationToUser } = require('../../routes/notifications/notification.fun');

exports.createLeaveRequest = async (req, res) => {
    try {

        console.log('req.user:', req.user);
        const employeeId = req.user.userId; // Lấy từ token
        const { type, reason, startDate, endDate } = req.body;

        if (!type || !reason || !startDate || !endDate) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
        }

        const newRequest = new LeaveRequest({
            employeeId,
            type,
            reason,
            startDate,
            endDate,
        });

        await newRequest.save();

        // Gửi thông báo cho người dùng
        try {
            console.log('Bắt đầu gửi thông báo cho user:', employeeId);
            const notificationResult = await sendNotificationToUser(
                employeeId,
                'Yêu cầu xin nghỉ đã được tạo',
                `Yêu cầu xin nghỉ từ ${startDate} đến ${endDate} đã được tạo thành công và đang chờ phê duyệt.`,
                {
                    requestId: newRequest._id.toString(),
                    type: 'leave_request',
                    status: 'pending'
                }
            );

            console.log('Kết quả gửi thông báo:', notificationResult);

            return res.status(201).json({
                message: 'Tạo yêu cầu xin nghỉ thành công.',
                data: newRequest,
                notification: notificationResult.notification
            });
        } catch (notificationError) {
            console.error('Chi tiết lỗi khi gửi thông báo:', {
                error: notificationError.message,
                stack: notificationError.stack,
                userId: employeeId
            });
        }

        return res.status(201).json({
            message: 'Tạo yêu cầu xin nghỉ thành công.',
            data: newRequest,
        });
    } catch (err) {
        console.error('Lỗi khi tạo yêu cầu xin nghỉ:', err);
        return res.status(500).json({ message: 'Lỗi server.' });
    }
};

exports.getLeaveRequests = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            startDate,
            endDate,
            type
        } = req.query;

        const filter = {};

        if (!req.user.isAdmin) {
            filter.employeeId = req.user.userId;
        }

        if (status) filter.status = status;
        if (type) filter.type = type;

        if (startDate || endDate) {
            filter.startDate = {};
            if (startDate) filter.startDate.$gte = new Date(startDate);
            if (endDate) filter.startDate.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [requests, total] = await Promise.all([
            LeaveRequest.find(filter)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 })
                .populate('employeeId', 'email') // Populate từ User model
                .exec(),
            LeaveRequest.countDocuments(filter)
        ]);

        return res.status(200).json({
            message: 'Lấy danh sách yêu cầu xin nghỉ thành công',
            data: {
                requests,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalRecords: total,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (err) {
        console.error('Lỗi khi lấy danh sách yêu cầu xin nghỉ:', err);
        return res.status(500).json({ message: 'Lỗi server.' });
    }
};

exports.getLeaveRequestDetail = async (req, res) => {
    try {
        const requestId = req.params.id;

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: 'ID yêu cầu xin nghỉ không được cung cấp'
            });
        }

        const leaveRequest = await LeaveRequest.findById(requestId)
            .populate('employeeId', 'email')
            .exec();

        if (!leaveRequest) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu xin nghỉ'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết yêu cầu xin nghỉ thành công',
            data: leaveRequest
        });

    } catch (err) {
        console.error('Lỗi khi lấy chi tiết yêu cầu xin nghỉ:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};
