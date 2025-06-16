const Attendance = require('../../models/attendance/Attendance');
const { sendNotificationToUser } = require('../../routes/notifications/notification.fun');

exports.checkInOut = async (req, res) => {
    try {
        const userId = req.user.userId;
        const now = new Date();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({
            employeeId: userId,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (!attendance) {
            attendance = new Attendance({
                employeeId: userId,
                date: today,
                timeLogs: [{
                    checkIn: now
                }]
            });

            await attendance.save();
            // Send notification...
            try {
                await sendNotificationToUser(userId, 'Chấm công thành công',
                    `Bạn đã check in lúc ${now.toLocaleTimeString()}`,
                    {
                        type: 'attendance',
                        action: 'check_in',
                        time: now.toISOString(), // Convert Date to string
                        timestamp: Date.now().toString() // Convert number to string
                    }
                );
            } catch (notifyError) {
                console.error('Lỗi gửi thông báo check in:', notifyError);
            }

            return res.status(200).json({
                success: true,
                message: 'Check in thành công',
                data: attendance
            });
        }

        // Ensure timeLogs array exists
        if (!attendance.timeLogs) {
            attendance.timeLogs = [];
        }

        // Get the last time log or create first one
        const lastLog = attendance.timeLogs.length > 0
            ? attendance.timeLogs[attendance.timeLogs.length - 1]
            : null;

        if (!lastLog || lastLog.checkOut) {
            // Create new check-in if no logs exist or last log is completed
            attendance.timeLogs.push({
                checkIn: now
            });

            await attendance.save();

            // Send notification...
            try {
                await sendNotificationToUser(userId, 'Chấm công thành công',
                    `Bạn đã check in ca mới lúc ${now.toLocaleTimeString()}`,
                    {
                        type: 'attendance',
                        action: 'check_in',
                        time: now.toISOString(), // Convert Date to string
                        timestamp: Date.now().toString() // Convert number to string
                    }
                );
            } catch (notifyError) {
                console.error('Lỗi gửi thông báo check in:', notifyError);
            }

            return res.status(200).json({
                success: true,
                message: 'Check in thành công',
                data: attendance
            });
        } else {
            // Add check-out to existing log
            lastLog.checkOut = now;
            const diffInMs = lastLog.checkOut - lastLog.checkIn;
            lastLog.duration = Math.round((diffInMs / (1000 * 60 * 60)) * 100) / 100;

            // Update total hours
            attendance.totalHours = attendance.timeLogs.reduce(
                (acc, log) => acc + (log.duration || 0), 0
            );

            await attendance.save();

            // Send notification...
            try {
                await sendNotificationToUser(userId, 'Chấm công thành công',
                    `Bạn đã check out lúc ${now.toLocaleTimeString()}. Thời gian ca làm việc: ${lastLog.duration} giờ`,
                    {
                        type: 'attendance',
                        action: 'check_out',
                        time: now.toISOString(), // Convert Date to string
                        duration: lastLog.duration.toString(), // Convert number to string
                        timestamp: Date.now().toString() // Convert number to string
                    }
                );
            } catch (notifyError) {
                console.error('Lỗi gửi thông báo check out:', notifyError);
            }

            return res.status(200).json({
                success: true,
                message: 'Check out thành công',
                data: attendance
            });
        }
    } catch (error) {
        console.error('Lỗi chấm công:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

exports.getAttendanceHistory = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            startDate,
            endDate,
            status
        } = req.query;

        const filter = {
            employeeId: req.user.userId
        };

        // Add date range filter if provided
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Add status filter if provided
        if (status) {
            filter.status = status;
        }

        // Calculate skip value for pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get attendance records with pagination
        const [attendances, total] = await Promise.all([
            Attendance.find(filter)
                .sort({ date: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('employeeId', 'email'),
            Attendance.countDocuments(filter)
        ]);

        // Calculate statistics
        const statistics = {
            totalDays: attendances.length,
            completedDays: attendances.filter(a => a.status === 'completed').length,
            averageHours: attendances.reduce((acc, curr) => acc + (curr.totalHours || 0), 0) / attendances.length || 0
        };

        return res.status(200).json({
            success: true,
            data: {
                records: attendances,
                statistics,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalRecords: total,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch sử chấm công:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

exports.getAllEmployeesAttendance = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            startDate,
            endDate,
            employeeEmail,
            status
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
        const matchStage = {};

        // Date range filter
        if (startDate || endDate) {
            matchStage.date = {};
            if (startDate) matchStage.date.$gte = new Date(startDate);
            if (endDate) matchStage.date.$lte = new Date(endDate);
        }

        // Status filter
        if (status) {
            matchStage.status = status;
        }

        // Employee email filter
        if (employeeEmail) {
            aggregationPipeline.push({
                $match: {
                    'employee.email': { $regex: employeeEmail, $options: 'i' }
                }
            });
        }

        if (Object.keys(matchStage).length > 0) {
            aggregationPipeline.push({ $match: matchStage });
        }

        // Get total count
        const totalDocs = await Attendance.aggregate([
            ...aggregationPipeline,
            { $count: 'total' }
        ]);

        // Add pagination and sorting
        aggregationPipeline.push(
            { $sort: { date: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        );

        // Execute query
        const attendances = await Attendance.aggregate(aggregationPipeline);

        // Calculate statistics
        const statistics = {
            totalEmployees: new Set(attendances.map(a => a.employee._id.toString())).size,
            averageHoursPerDay: attendances.reduce((acc, curr) => acc + (curr.totalHours || 0), 0) / attendances.length || 0,
            presentToday: await Attendance.countDocuments({
                date: {
                    $gte: new Date().setHours(0, 0, 0, 0),
                    $lt: new Date().setHours(23, 59, 59, 999)
                }
            })
        };

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách chấm công thành công',
            data: {
                records: attendances.map(record => ({
                    _id: record._id,
                    date: record.date,
                    timeLogs: record.timeLogs,
                    totalHours: record.totalHours,
                    status: record.status,
                    employee: {
                        _id: record.employee._id,
                        email: record.employee.email,
                        name: record.employee.name
                    }
                })),
                statistics,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil((totalDocs[0]?.total || 0) / parseInt(limit)),
                    totalRecords: totalDocs[0]?.total || 0,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Lỗi khi lấy danh sách chấm công:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};