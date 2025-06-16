const WeeklySchedule = require('../../models/schedule/WeeklySchedule');
const { sendNotificationToUser } = require('../../routes/notifications/notification.fun');

// // Get schedule for current week
// exports.getCurrentWeekSchedule = async (req, res) => {
//     try {
//         const today = new Date();
//         const todayDate = today.toISOString().split('T')[0]; // Lấy chỉ phần ngày

//         console.log('Searching for schedule with date:', todayDate);

//         const schedule = await WeeklySchedule.findOne({
//             weekStart: {
//                 $lte: new Date(todayDate + 'T23:59:59.999Z')
//             },
//             weekEnd: {
//                 $gte: new Date(todayDate + 'T00:00:00.000Z')
//             }
//         }).populate('days.shifts.morning.employeeId days.shifts.afternoon.employeeId', 'email name');

//         if (!schedule) {
//             return res.status(200).json({
//                 success: true,
//                 message: 'Không tìm thấy lịch làm việc cho ngày hiện tại',
//                 data: null,
//                 currentDate: todayDate
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: 'Lấy lịch làm việc thành công',
//             data: schedule,
//             currentDate: todayDate
//         });
//     } catch (error) {
//         console.error('Lỗi khi lấy lịch làm việc:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Lỗi server'
//         });
//     }
// };
exports.getCurrentWeekSchedule = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time part

        console.log('Debug dates:', {
            searchDate: today,
            searchDateISO: today.toISOString()
        });

        const schedule = await WeeklySchedule.findOne({
            weekStart: { $lte: today },
            weekEnd: { $gte: today }
        }).populate({
            path: 'days.shifts.morning.employeeId days.shifts.afternoon.employeeId',
            select: 'email name'
        });

        console.log('Found schedule:', schedule);

        const response = {
            success: true,
            currentDate: today.toISOString().split('T')[0],
            data: schedule
        };

        if (!schedule) {
            response.message = 'Không tìm thấy lịch làm việc cho tuần hiện tại';
        } else {
            response.message = 'Lấy lịch làm việc thành công';
            response.weekInfo = {
                weekStart: schedule.weekStart,
                weekEnd: schedule.weekEnd,
                isCurrentWeek: true
            };
        }

        return res.status(200).json(response);

    } catch (error) {
        console.error('Lỗi khi lấy lịch làm việc:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
exports.createSchedule = async (req, res) => {
    try {
        const { weekStart, weekEnd, days } = req.body;
        const createdBy = req.user.userId;

        if (!weekStart || !weekEnd || !days || !Array.isArray(days)) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }
        const startDate = new Date(weekStart);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(weekEnd);
        endDate.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (endDate < startDate || diffDays !== 6) {
            return res.status(400).json({
                success: false,
                message: 'Ngày bắt đầu và kết thúc phải cách nhau đúng 7 ngày'
            });
        }

        // Make sure we have 7 days
        if (days.length !== 7) {
            return res.status(400).json({
                success: false,
                message: 'Phải có đúng 7 ngày trong tuần'
            });
        }

        const schedule = new WeeklySchedule({
            weekStart: startDate,
            weekEnd: endDate,
            days,
            createdBy
        });

        await schedule.save();

        // Collect employee IDs from all shifts
        const employeeIds = new Set();
        days.forEach(day => {
            if (day.shifts) {
                if (day.shifts.morning) {
                    day.shifts.morning.forEach(shift => {
                        if (shift.employeeId) employeeIds.add(shift.employeeId);
                    });
                }
                if (day.shifts.afternoon) {
                    day.shifts.afternoon.forEach(shift => {
                        if (shift.employeeId) employeeIds.add(shift.employeeId);
                    });
                }
            }
        });

        // Send notifications only if there are employees
        if (employeeIds.size > 0) {
            const notificationPromises = Array.from(employeeIds).map(async employeeId => {
                try {
                    await sendNotificationToUser(
                        employeeId,
                        'Lịch làm việc mới',
                        `Lịch làm việc tuần ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()} đã được tạo`,
                        {
                            type: 'schedule',
                            action: 'created',
                            weekStart: startDate.toISOString(),
                            weekEnd: endDate.toISOString()
                        }
                    );
                } catch (notifyError) {
                    if (notifyError?.errorInfo?.code === 'messaging/registration-token-not-registered') {
                        console.log(`Không tìm thấy token thông báo cho user ${employeeId}`);
                    } else {
                        console.error('Lỗi gửi thông báo:', notifyError);
                    }
                    return null;
                }
            });

            // Process notifications asynchronously
            Promise.allSettled(notificationPromises)
                .then(results => {
                    const failed = results.filter(r => r.status === 'rejected');
                    if (failed.length > 0) {
                        console.log(`${failed.length} thông báo không gửi được`);
                    }
                })
                .catch(error => {
                    console.error('Lỗi xử lý thông báo:', error);
                });
        }

        return res.status(201).json({
            success: true,
            message: 'Tạo lịch làm việc thành công',
            data: schedule
        });

    } catch (error) {
        console.error('Lỗi khi tạo lịch làm việc:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Update schedule
exports.updateSchedule = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { days } = req.body;

        if (!days || !Array.isArray(days)) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu cập nhật không hợp lệ'
            });
        }

        const schedule = await WeeklySchedule.findByIdAndUpdate(
            scheduleId,
            { days },
            { new: true }
        );

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch làm việc'
            });
        }

        // Notify affected employees
        const employeeIds = new Set();
        days.forEach(day => {
            day.shifts.morning.forEach(shift => employeeIds.add(shift.employeeId));
            day.shifts.afternoon.forEach(shift => employeeIds.add(shift.employeeId));
        });

        const notificationPromises = Array.from(employeeIds).map(async employeeId => {
            try {
                await sendNotificationToUser(
                    employeeId,
                    'Cập nhật lịch làm việc',
                    `Lịch làm việc tuần ${schedule.weekStart.toLocaleDateString()} - ${schedule.weekEnd.toLocaleDateString()} đã được cập nhật`,
                    {
                        type: 'schedule',
                        action: 'updated',
                        weekStart: schedule.weekStart.toISOString(),
                        weekEnd: schedule.weekEnd.toISOString()
                    }
                );
            } catch (notifyError) {
                if (notifyError?.errorInfo?.code === 'messaging/registration-token-not-registered') {
                    console.log(`Không tìm thấy token thông báo cho user ${employeeId}`);
                } else {
                    console.error('Lỗi gửi thông báo:', notifyError);
                }
            }
        });

        // Process notifications asynchronously
        Promise.allSettled(notificationPromises).catch(error => {
            console.error('Lỗi xử lý thông báo:', error);
        });

        return res.status(200).json({
            success: true,
            message: 'Cập nhật lịch làm việc thành công',
            data: schedule
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật lịch làm việc:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Get all schedules with optional filters and pagination
exports.getAllSchedules = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            startDate,
            endDate,
            employeeId
        } = req.query;

        // Build filter object
        const filter = {};

        // Date range filter
        if (startDate || endDate) {
            if (startDate) filter.weekStart = { $gte: new Date(startDate) };
            if (endDate) filter.weekEnd = { $lte: new Date(endDate) };
        }

        // Employee filter
        if (employeeId) {
            filter.$or = [
                { 'days.shifts.morning.employeeId': employeeId },
                { 'days.shifts.afternoon.employeeId': employeeId }
            ];
        }

        // Calculate skip for pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get total count
        const total = await WeeklySchedule.countDocuments(filter);

        // Get schedules with pagination
        const schedules = await WeeklySchedule.find(filter)
            .populate('createdBy', 'email name')
            .populate('days.shifts.morning.employeeId days.shifts.afternoon.employeeId', 'email name')
            .sort({ weekStart: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách lịch làm việc thành công',
            data: {
                schedules: schedules.map(schedule => ({
                    _id: schedule._id,
                    weekStart: schedule.weekStart,
                    weekEnd: schedule.weekEnd,
                    days: schedule.days,
                    createdBy: schedule.createdBy,
                    createdAt: schedule.createdAt,
                    employeeCount: schedule.days.reduce((count, day) => {
                        return count +
                            (day.shifts.morning?.length || 0) +
                            (day.shifts.afternoon?.length || 0);
                    }, 0)
                })),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalRecords: total,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Lỗi khi lấy danh sách lịch làm việc:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};