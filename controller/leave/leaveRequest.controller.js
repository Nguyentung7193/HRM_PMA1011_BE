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

exports.deleteLeaveRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const userId = req.user.userId;

        const leaveRequest = await LeaveRequest.findById(requestId);

        if (!leaveRequest) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu xin nghỉ'
            });
        }

        // Chỉ cho phép xóa nếu là người tạo yêu cầu hoặc admin
        if (leaveRequest.employeeId.toString() !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền xóa yêu cầu này'
            });
        }

        // Chỉ cho phép xóa các yêu cầu đang ở trạng thái pending
        if (leaveRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể xóa yêu cầu đang chờ duyệt'
            });
        }

        await LeaveRequest.findByIdAndDelete(requestId);

        return res.status(200).json({
            success: true,
            message: 'Xóa yêu cầu xin nghỉ thành công'
        });

    } catch (err) {
        console.error('Lỗi khi xóa yêu cầu xin nghỉ:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

exports.updateLeaveRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const userId = req.user.userId;
        const { type, reason, startDate, endDate } = req.body;

        const leaveRequest = await LeaveRequest.findById(requestId);

        if (!leaveRequest) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu xin nghỉ'
            });
        }

        // Kiểm tra quyền cập nhật
        if (leaveRequest.employeeId.toString() !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền cập nhật yêu cầu này'
            });
        }

        // Chỉ cho phép cập nhật các yêu cầu đang ở trạng thái pending
        if (leaveRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể cập nhật yêu cầu đang chờ duyệt'
            });
        }

        // Validate dữ liệu đầu vào
        if (!type || !reason || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        const updatedRequest = await LeaveRequest.findByIdAndUpdate(
            requestId,
            {
                type,
                reason,
                startDate,
                endDate,
                updatedAt: new Date()
            },
            { new: true }
        ).populate('employeeId', 'email');

        // Gửi thông báo cho người dùng
        try {
            await sendNotificationToUser(
                userId,
                'Yêu cầu xin nghỉ đã được cập nhật',
                `Yêu cầu xin nghỉ từ ${startDate} đến ${endDate} đã được cập nhật thành công.`,
                {
                    requestId: requestId,
                    type: 'leave_request_updated',
                    status: 'pending'
                }
            );
        } catch (notificationError) {
            console.error('Lỗi khi gửi thông báo cập nhật:', notificationError);
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật yêu cầu xin nghỉ thành công',
            data: updatedRequest
        });

    } catch (err) {
        console.error('Lỗi khi cập nhật yêu cầu xin nghỉ:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

exports.getAllEmployeeLeaveRequests = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            startDate,
            endDate,
            type,
            employeeEmail
        } = req.query;

        const filter = {};

        // Add filters if provided
        if (status) filter.status = status;
        if (type) filter.type = type;

        // Date range filter
        if (startDate || endDate) {
            filter.startDate = {};
            if (startDate) filter.startDate.$gte = new Date(startDate);
            if (endDate) filter.startDate.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Create aggregation pipeline
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

        // Add email filter if provided
        if (employeeEmail) {
            aggregationPipeline.push({
                $match: {
                    'employee.email': { $regex: employeeEmail, $options: 'i' }
                }
            });
        }

        // Add other filters
        if (Object.keys(filter).length > 0) {
            aggregationPipeline.push({ $match: filter });
        }

        // Get total count
        const totalDocs = await LeaveRequest.aggregate([
            ...aggregationPipeline,
            { $count: 'total' }
        ]);

        // Add pagination
        aggregationPipeline.push(
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
        );

        // Execute query
        const requests = await LeaveRequest.aggregate(aggregationPipeline);

        const total = totalDocs[0]?.total || 0;

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách yêu cầu xin nghỉ thành công',
            data: {
                requests: requests.map(request => ({
                    ...request,
                    employeeEmail: request.employee.email,
                    employeeId: request.employee._id
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
        console.error('Lỗi khi lấy danh sách yêu cầu xin nghỉ:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

exports.getLeaveRequestDetailAdmin = async (req, res) => {
    try {
        const requestId = req.params.id;

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: 'ID yêu cầu xin nghỉ không được cung cấp'
            });
        }
        const leaveRequest = await LeaveRequest.findById(requestId)
            .populate({
                path: 'employeeId',
                select: 'email name role fcmToken createdAt'
            })
            .exec();

        if (!leaveRequest) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu xin nghỉ'
            });
        }
        const response = {
            success: true,
            message: 'Lấy chi tiết yêu cầu xin nghỉ thành công',
            data: {
                ...leaveRequest.toObject(),
                canApprove: leaveRequest.status === 'pending',
                requestAge: Math.floor((Date.now() - leaveRequest.createdAt) / (1000 * 60 * 60 * 24)), // Days since creation
                totalDays: Math.ceil((new Date(leaveRequest.endDate) - new Date(leaveRequest.startDate)) / (1000 * 60 * 60 * 24)),
                employee: {
                    id: leaveRequest.employeeId._id,
                    email: leaveRequest.employeeId.email,
                    name: leaveRequest.employeeId.name,
                    role: leaveRequest.employeeId.role,
                    accountCreated: leaveRequest.employeeId.createdAt
                }
            }
        };

        return res.status(200).json(response);

    } catch (err) {
        console.error('Lỗi khi lấy chi tiết yêu cầu xin nghỉ:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};
